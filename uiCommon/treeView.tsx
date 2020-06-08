import React from "react";
import { Tree } from "../treePrinter";
import { updateAtIdx } from "../util";

type CollapseState = { collapsed: boolean; childStates: CollapseState[] };

export function TreeView(props: {
  tree: Tree;
  collapseState: CollapseState;
  setCollapseState: (c: CollapseState) => void;
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
  collapseState: CollapseState;
  setCollapseState: (c: CollapseState) => void;
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
