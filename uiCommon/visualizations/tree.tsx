import React, { useState } from "react";
import { Rec, StringLit, Term } from "../../core/types";
import { VizTypeSpec } from "./typeSpec";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { emptyCollapseState, TreeView } from "../generic/treeView";
import { BareTerm } from "../dl/replViews";
import { treeFromRecords } from "../dl/treeFromRecords";

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
    const rootTerm = props.spec.attrs.rootTerm;
    const tree = treeFromRecords(nodesRes, rootTerm);
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

// currently dead
// TODO: use this for "viz suggestions"
export function canTreeViz(rec: Rec): boolean {
  const fields = Object.keys(rec.attrs);
  return fields.includes("id") && fields.includes("parent");
}
