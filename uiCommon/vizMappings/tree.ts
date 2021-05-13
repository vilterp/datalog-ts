import { Tree } from "../../util/tree";
import { Rec, StringLit } from "../../core/types";
import { ppt } from "../../core/pretty";

type TermGraph = { [parentTerm: string]: Rec[] };

export function canTreeViz(rec: Rec): boolean {
  const fields = Object.keys(rec.attrs);
  return fields.includes("id") && fields.includes("parent");
}

// query: something{id: C, parent: P}.
// TODO: maybe specify a variable, and grab that binding?
//   showing whole record is a bit noisy
export function treeFromRecords(records: Rec[], rootTerm: string): Tree<Rec> {
  const graph: TermGraph = {};
  records.forEach((rec) => {
    const parentID = (rec.attrs.parent as StringLit).val;
    const newChildren = [...(graph[parentID] || []), rec];
    graph[parentID] = newChildren;
  });
  return mkTree(graph, rootTerm, null);
}

function mkTree(
  termGraph: TermGraph,
  curID: string,
  curRec: Rec | null
): Tree<Rec> {
  return {
    key: curID,
    item: curRec,
    children: (termGraph[curID] || []).map((child) =>
      mkTree(termGraph, ppt(child.attrs.id), child)
    ),
  };
}
