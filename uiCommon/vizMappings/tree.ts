import { Tree } from "../../tree";
import { Rec } from "../../types";
import { ppt } from "../../pretty";

type ParentToChildren = { [parentTerm: string]: Rec[] };

export function canTreeViz(rec: Rec): boolean {
  const fields = Object.keys(rec.attrs);
  return fields.includes("id") && fields.includes("parent");
}

// query: something{id: C, parent: P}.
// TODO: maybe specify a variable, and grab that binding?
//   showing whole record is a bit noisy
export function treeFromRecords(records: Rec[], rootTerm: string): Tree<Rec> {
  const graph: ParentToChildren = {};
  records.forEach((rec) => {
    const parentID = ppt(rec.attrs.parent);
    const newChildren = [...(graph[parentID] || []), rec];
    graph[parentID] = newChildren;
  });
  console.log(graph);
  const tree = mkTree(graph, rootTerm, null);
  console.log(tree);
  return tree;
}

function mkTree(
  termGraph: ParentToChildren,
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
