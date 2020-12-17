import React from "react";
import { Res, VarMappings, ScopePath } from "../types";
import { TermView, VarC, HighlightProps } from "./term";
import {
  makeTermWithBindings,
  traceToTree,
  getRelatedPaths,
  pathToScopePath,
} from "../traceTree";
import { mapObjToList, intersperse } from "../util/util";
import { TreeView, TreeCollapseState } from "./treeView";

export function TraceView(props: {
  result: Res;
  highlight: HighlightProps;
  collapseState: TreeCollapseState;
  setCollapseState: (c: TreeCollapseState) => void;
}) {
  return (
    <TreeView<Res>
      tree={traceToTree(props.result)}
      render={({ item, path }) => {
        const { children, parents } =
          props.highlight.highlight.type === "Binding"
            ? getRelatedPaths(props.result, props.highlight.highlight.binding)
            : { children: [], parents: [] };
        return (
          <TraceNode
            res={item}
            highlight={{
              ...props.highlight,
              childPaths: children,
              parentPaths: parents,
            }}
            scopePath={pathToScopePath(path)}
          />
        );
      }}
      collapseState={props.collapseState}
      setCollapseState={props.setCollapseState}
    />
  );
}

export function TraceNode(props: {
  res: Res;
  scopePath: ScopePath;
  highlight: HighlightProps;
}) {
  const res = props.res;

  const term = (
    <TermView
      term={makeTermWithBindings(res.term, res.bindings)}
      highlight={props.highlight}
      scopePath={props.scopePath}
    />
  );
  switch (res.trace.type) {
    case "AndTrace":
      return <>And</>;
    case "MatchTrace":
      return <>{term}</>;
    case "RefTrace":
      return (
        <>
          <TermView
            term={makeTermWithBindings(res.term, res.bindings)}
            highlight={props.highlight}
            scopePath={props.scopePath.slice(0, props.scopePath.length - 1)}
          />{" "}
          <VarMappingsView
            mappings={res.trace.mappings}
            highlight={props.highlight}
            innerScopePath={props.scopePath}
          />
        </>
      );
    default:
      return term;
  }
}

export function VarMappingsView(props: {
  mappings: VarMappings;
  highlight: HighlightProps;
  innerScopePath: ScopePath;
}) {
  const innerPath = props.innerScopePath;
  const outerPath = props.innerScopePath.slice(
    0,
    props.innerScopePath.length - 1
  );
  return (
    <>
      {"{"}
      {intersperse<React.ReactNode>(
        ", ",
        mapObjToList(props.mappings, (key, value) => (
          <React.Fragment key={key}>
            <VarC
              name={key}
              scopePath={innerPath}
              highlight={props.highlight}
            />
            :{" "}
            <VarC
              name={value}
              scopePath={outerPath}
              highlight={props.highlight}
            />
          </React.Fragment>
        ))
      )}
      {"}"}
    </>
  );
}
