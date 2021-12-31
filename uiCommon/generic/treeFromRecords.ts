import { ppt } from "../../core/pretty";
import { Int, Res, Term } from "../../core/types";
import { Tree } from "../../util/tree";

type TermGraph = { [parentTerm: string]: Res[] };

export function treeFromRecords(records: Res[], rootTerm: Term): Tree<Res> {
  const graph: TermGraph = {};
  records.forEach((res) => {
    const parentID = (res.bindings.ParentID as Int).val;
    const newChildren = [...(graph[parentID] || []), res];
    graph[parentID] = newChildren;
  });
  return mkTree(graph, rootTerm, null);
}

function mkTree(
  termGraph: TermGraph,
  curID: Term,
  curRes: Res | null
): Tree<Res> {
  return {
    key: ppt(curID),
    item: curRes,
    children: (termGraph[ppt(curID)] || []).map((child) =>
      mkTree(termGraph, child.bindings.ID, child)
    ),
  };
}
