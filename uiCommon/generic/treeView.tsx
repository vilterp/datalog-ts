import React from "react";
import { Tree } from "../../util/tree";
import { pairsToObj } from "../../util/util";

export type TreeCollapseState = {
  collapsed: boolean;
  childStates: { [key: string]: TreeCollapseState };
};

export const emptyCollapseState: TreeCollapseState = {
  collapsed: false,
  childStates: {},
};

// TODO: default to all expanded?
export function makeCollapseStateAllCollapsed<T>(
  tree: Tree<T>
): TreeCollapseState {
  return {
    collapsed: true,
    childStates: pairsToObj(
      tree.children.map((child) => ({
        key: child.key,
        val: makeCollapseStateAllCollapsed(child),
      }))
    ),
  };
}

type NodeRenderProps<T> = {
  item: T;
  key: string;
  path: T[];
  isLeaf: boolean;
};

export function TreeView<T>(props: {
  tree: Tree<T>;
  render: (props: NodeRenderProps<T>) => React.ReactNode;
  collapseState: TreeCollapseState;
  setCollapseState: (c: TreeCollapseState) => void;
  hideRoot?: boolean;
}) {
  const node = (
    <NodeView
      showNode={!props.hideRoot}
      tree={props.tree}
      path={[props.tree.item]}
      render={props.render}
      collapseState={props.collapseState}
      setCollapseState={props.setCollapseState}
    />
  );
  return props.hideRoot ? node : <ul style={listStyle}>{node}</ul>;
}

function NodeView<T>(props: {
  showNode: boolean;
  tree: Tree<T>;
  path: T[];
  render: (props: NodeRenderProps<T>) => React.ReactNode;
  collapseState: TreeCollapseState | undefined;
  setCollapseState: (c: TreeCollapseState) => void;
}) {
  const collapseState: TreeCollapseState = props.collapseState || {
    collapsed: false,
    childStates: {},
  };

  const icon =
    props.tree.children.length === 0
      ? "o"
      : collapseState.collapsed
      ? ">"
      : "v";

  const children = !collapseState.collapsed ? (
    <ul style={listStyle}>
      {props.tree.children.map((child) => (
        <NodeView
          showNode={true}
          key={child.key}
          path={[...props.path, child.item]}
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
  ) : null;

  return props.showNode ? (
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
        <span style={{ userSelect: "none" }}>{icon}</span>&nbsp;
        {props.render({
          key: props.tree.key,
          item: props.tree.item,
          path: props.path,
          isLeaf: props.tree.children.length === 0,
        })}
      </span>
      {children}
    </li>
  ) : (
    children
  );
}

const listStyle = {
  fontFamily: "monospace",
  listStyle: "none",
  paddingLeft: 15,
  margin: 0,
};
