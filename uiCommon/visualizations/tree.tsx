import React, { useState } from "react";
import { Tree } from "../../util/tree";
import { Int, Rec, Res, StringLit, Term } from "../../core/types";
import { VizTypeSpec } from "./typeSpec";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { emptyCollapseState, TreeView } from "../generic/treeView";
import { BareTerm } from "../dl/replViews";

export const tree: VizTypeSpec = {
  name: "Tree",
  description: "visualize a tree",
  component: TreeViz,
};

function TreeViz(props: {
  interp: AbstractInterpreter;
  spec: Rec;
  setHighlightedTerm: (t: Term | null) => void;
}) {
  const [collapseState, setCollapseState] = useState(emptyCollapseState);
  try {
    const nodesQuery = (props.spec.attrs.nodes as StringLit).val;
    const nodesRes = props.interp.queryStr(nodesQuery);
    const tree = treeFromRecords(nodesRes, -1);
    console.log({ tree });
    return (
      <TreeView
        collapseState={collapseState}
        setCollapseState={setCollapseState}
        hideRoot={true}
        tree={tree}
        render={({ item }) =>
          item.bindings.Display ? (
            <BareTerm term={item.bindings.Display} />
          ) : (
            <BareTerm term={item.term} />
          )
        }
      />
    );
  } catch (e) {
    // TODO: use error boundary in VizArea instead of duplicating this
    console.error(e);
    return <pre style={{ color: "red" }}>{e.toString()}</pre>;
  }
}

type TermGraph = { [parentTerm: string]: Res[] };

// currently dead
// TODO: use this for "viz suggestions"
export function canTreeViz(rec: Rec): boolean {
  const fields = Object.keys(rec.attrs);
  return fields.includes("id") && fields.includes("parent");
}

// query: something{id: C, parent: P}.
// TODO: maybe specify a variable, and grab that binding?
//   showing whole record is a bit noisy
export function treeFromRecords(records: Res[], rootTerm: number): Tree<Res> {
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
  curID: number,
  curRes: Res | null
): Tree<Res> {
  return {
    key: curID.toString(),
    item: curRes,
    children: (termGraph[curID] || []).map((child) =>
      mkTree(termGraph, (child.bindings.ID as Int).val, child)
    ),
  };
}
