import React from "react";
import { Tree } from "../treePrinter";
import { updateAtIdx } from "../util";

export type TreeCollapseState = {
  collapsed: boolean;
  childStates: TreeCollapseState[];
};

export function TreeView(props: {
  tree: Tree;
  collapseState: TreeCollapseState;
  setCollapseState: (c: TreeCollapseState) => void;
}) {
  return (
    <ul>
      <NodeView
        collapseState={props.collapseState}
        setCollapseState={props.setCollapseState}
        tree={props.tree}
      />
    </ul>
  );
}

function NodeView(props: {
  tree: Tree;
  collapseState: TreeCollapseState;
  setCollapseState: (c: TreeCollapseState) => void;
}) {
  return (
    <li>
      <span
        onClick={() =>
          props.setCollapseState({
            ...props.collapseState,
            collapsed: !props.collapseState.collapsed,
          })
        }
      >
        {props.collapseState.collapsed ? ">" : ":"} {props.tree.body}
      </span>
      {props.collapseState.collapsed ? null : (
        <ul>
          {props.tree.children.map((child, idx) => (
            <NodeView
              tree={child}
              collapseState={props.collapseState[idx]}
              setCollapseState={(childState) =>
                props.setCollapseState({
                  ...props.collapseState,
                  childStates: updateAtIdx(
                    props.collapseState.childStates,
                    idx,
                    (_) => childState
                  ),
                })
              }
            />
          ))}
        </ul>
      )}
    </li>
  );
}
