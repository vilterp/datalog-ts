import React from "react";
import { Res, VarMappings, ScopePath } from "../../core/types";
import { VarC, HighlightProps } from "./term";
import { traceToTree, getRelatedPaths } from "../../core/traceTree";
import { intersperse, mapObjToListUnordered } from "../../util/util";
import { TreeView, TreeCollapseState } from "../generic/treeView";
import { BareTerm } from "./replViews";
import { pathToScopePath } from "../../core/termWithBindings";

export function TraceTreeView(props: {
  result: Res;
  highlight: HighlightProps;
  collapseState: TreeCollapseState;
  setCollapseState: (c: TreeCollapseState) => void;
}) {
  const tree = traceToTree(props.result);
  return (
    <TreeView<Res>
      tree={tree}
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

  const term = <BareTerm term={res.term} />;
  switch (res.trace.type) {
    case "AndTrace":
      return <>And</>;
    case "NegationTrace":
      return (
        <>
          !<BareTerm term={res.trace.negatedTerm} />
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
        mapObjToListUnordered(props.mappings, (key, value) => (
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
