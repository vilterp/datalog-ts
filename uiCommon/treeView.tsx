import React from "react";
import { Tree } from "../treePrinter";

export type TreeCollapseState = {
  collapsed: boolean;
  childStates: { [key: string]: TreeCollapseState };
};

export function TreeView<T>(props: {
  tree: Tree<T>;
  render: (props: { item: T; key: string }) => React.ReactNode;
  collapseState: TreeCollapseState;
  setCollapseState: (c: TreeCollapseState) => void;
}) {
  return (
    <ul style={listStyle}>
      <NodeView
        tree={props.tree}
        render={props.render}
        collapseState={props.collapseState}
        setCollapseState={props.setCollapseState}
      />
    </ul>
  );
}

function NodeView<T>(props: {
  tree: Tree<T>;
  render: ({ item: T, key: string }) => React.ReactNode;
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
        {icon}&nbsp;
        {props.render({ key: props.tree.key, item: props.tree.item })}
      </span>
      {collapseState.collapsed ? null : (
        <ul style={listStyle}>
          {props.tree.children.map((child) => (
            <NodeView
              key={child.key}
              tree={child}
              render={props.render}
              collapseState={collapseState.childStates[child.key]}
              setCollapseState={(childState) => {
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
