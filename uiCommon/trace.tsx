import React from "react";
import { Res, VarMappings, ScopePath } from "../types";
import { Term, VarC, HighlightProps } from "./term";
import { makeTermWithBindings } from "../traceTree";
import { mapObjToList, intersperse } from "../util";

export function TraceNode(props: {
  res: Res;
  scopePath: ScopePath;
  highlight: HighlightProps;
}) {
  const res = props.res;

  const term = (
    <Term
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
          <Term
            term={makeTermWithBindings(res.term, res.bindings)}
            highlight={props.highlight}
            scopePath={props.scopePath.slice(0, props.scopePath.length - 1)}
          />{" "}
          <VarMappingsC
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

export function VarMappingsC(props: {
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
