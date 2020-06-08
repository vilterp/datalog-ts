import React from "react";
import { Tree } from "../treePrinter";
import { updateAtIdx } from "../util";

export type TreeCollapseState = {
  collapsed: boolean;
  childStates: { [key: string]: TreeCollapseState };
};

export function TreeView(props: {
  tree: Tree;
  collapseState: TreeCollapseState;
  setCollapseState: (c: TreeCollapseState) => void;
}) {
  return (
    <ul style={listStyle}>
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
  collapseState: TreeCollapseState | undefined;
  setCollapseState: (c: TreeCollapseState) => void;
}) {
  const collapseState: TreeCollapseState = props.collapseState || {
    collapsed: true,
    childStates: {},
  };

  return (
    <li>
      <span
        onClick={() =>
          props.setCollapseState({
            ...collapseState,
            collapsed: !collapseState.collapsed,
          })
        }
      >
        {collapseState.collapsed ? ">" : "v"}&nbsp;{props.tree.body}
      </span>
      {collapseState.collapsed ? null : (
        <ul style={listStyle}>
          {props.tree.children.map((child) => (
            <NodeView
              tree={child}
              collapseState={collapseState[child.body]}
              setCollapseState={(childState) =>
                props.setCollapseState({
                  ...collapseState,
                  childStates: {
                    ...collapseState.childStates,
                    [child.body]: childState,
                  },
                })
              }
            />
          ))}
        </ul>
      )}
    </li>
  );
}

const listStyle = {
  fontFamily: "monospace",
  listStyle: "none",
  paddingLeft: 15,
};
