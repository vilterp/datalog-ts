import React from "react";
import { Tree } from "../treePrinter";

export type TreeCollapseState = {
  collapsed: boolean;
  childStates: { [key: string]: TreeCollapseState };
};

export function TreeView<T>(props: {
  tree: Tree<T>;
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

function NodeView<T>(props: {
  tree: Tree<T>;
  collapseState: TreeCollapseState | undefined;
  setCollapseState: (c: TreeCollapseState) => void;
}) {
  const collapseState: TreeCollapseState = props.collapseState || {
    collapsed: true,
    childStates: {},
  };

  const icon =
    props.tree.children.length === 0
      ? "o"
      : collapseState.collapsed
      ? ">"
      : "v";

  return (
    <li>
      <span
        style={{ cursor: "pointer" }}
        onClick={() =>
          props.setCollapseState({
            ...collapseState,
            collapsed: !collapseState.collapsed,
          })
        }
      >
        {icon}&nbsp;{props.tree.key}
      </span>
      {collapseState.collapsed ? null : (
        <ul style={listStyle}>
          {props.tree.children.map((child) => (
            <NodeView
              key={child.key}
              tree={child}
              collapseState={collapseState.childStates[child.key]}
              setCollapseState={(childState) => {
                console.log("set state for child", {
                  childState,
                  key: child.key,
                });
                props.setCollapseState({
                  ...collapseState,
                  childStates: {
                    ...collapseState.childStates,
                    [child.key]: childState,
                  },
                });
              }}
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
