import React, { useMemo } from "react";
import { Bool, Rec, Res, StringLit } from "../../core/types";
import { VizArgs, VizTypeSpec } from "./typeSpec";
import {
  emptyCollapseState,
  TreeCollapseState,
  TreeView,
} from "../generic/treeView";
import { BareTerm } from "../dl/replViews";
import { treeFromRecords } from "../generic/treeFromRecords";
import { useJSONLocalStorage } from "../generic/hooks";
import * as styles from "../explorer/styles";
import { termEq } from "../../core/unify";

export const tree: VizTypeSpec = {
  name: "Tree",
  description: "visualize a tree",
  component: TreeViz,
};

function TreeViz(props: VizArgs) {
  const [collapseState, setCollapseState] =
    useJSONLocalStorage<TreeCollapseState>(
      `tree-viz-${props.id}`,
      emptyCollapseState
    );
  try {
    const nodesQuery = props.spec.attrs.nodes as Rec;
    const sortChildren = (props.spec.attrs.sortChildren as Bool)?.val;
    const tree = useMemo(() => {
      const nodesRes = props.interp.queryRec(nodesQuery);
      const rootTerm = props.spec.attrs.rootTerm;
      return treeFromRecords(nodesRes, rootTerm, sortChildren);
    }, [props.interp]);
    return (
      <TreeView<Res>
        collapseState={collapseState}
        setCollapseState={setCollapseState}
        hideRoot={true}
        tree={tree}
        render={({ item }) => {
          const isHighlighted =
            props.highlightedTerm !== null &&
            termEq(item.term, props.highlightedTerm);
          return (
            <span
              onMouseEnter={() => props.setHighlightedTerm(item.term)}
              onMouseLeave={() => props.setHighlightedTerm(null)}
              style={{
                backgroundColor: isHighlighted ? styles.highlightColor : "",
              }}
            >
              {item.bindings.Display ? (
                <BareTerm term={item.bindings.Display} />
              ) : (
                <BareTerm term={item.term} />
              )}
            </span>
          );
        }}
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
