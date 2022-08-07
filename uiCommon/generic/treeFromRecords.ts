import { ppt } from "../../core/pretty";
import { Int, Rec, Res, Term } from "../../core/types";
import { termCmp, termLT } from "../../core/unify";
import { Tree } from "../../util/tree";

type TermGraph = { [parentTerm: string]: Res[] };

export function treeFromRecords(
  records: Res[],
  rootTerm: Term,
  sortChildren: boolean
): Tree<Res> {
  const graph: TermGraph = {};
  records.forEach((res) => {
    const parentID = ppt(res.bindings.ParentID);
    const newChildren = [...(graph[parentID] || []), res];
    graph[parentID] = newChildren;
  });
  return mkTree(graph, rootTerm, null, sortChildren);
}

function mkTree(
  termGraph: TermGraph,
  curID: Term,
  curRes: Res | null,
  sortChildren: boolean
): Tree<Res> {
  const childTerms = termGraph[ppt(curID)] || [];
  const sortedChildTerms = sortChildren
    ? childTerms.sort((a, b) => {
        const aDisplay = getDisplay(a.term);
        const bDisplay = getDisplay(b.term);
        return termCmp(aDisplay, bDisplay);
      })
    : childTerms;
  return {
    key: ppt(curID),
    item: curRes,
    // TODO: figure out hwo to sort again
    children: sortedChildTerms.map((child) =>
      mkTree(termGraph, child.bindings.ID, child, sortChildren)
    ),
  };
}

function getDisplay(t: Term) {
  const rec = t as Rec;
  return rec.attrs.display;
}
