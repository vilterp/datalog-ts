import React from "react";
import { Res, VarMappings, RulePath } from "../types";
import { Term, VarC, HighlightProps } from "./term";
import { makeTermWithBindings } from "../traceTree";
import { mapObjToList, intersperse } from "../util";

export function TraceNode(props: {
  res: Res;
  rulePath: RulePath;
  highlight: HighlightProps;
}) {
  const res = props.res;

  const term = (
    <Term
      term={makeTermWithBindings(res.term, res.bindings)}
      highlight={props.highlight}
      rulePath={props.rulePath}
    />
  );
  switch (res.trace.type) {
    case "AndTrace":
      return <>And</>;
    case "MatchTrace":
      return <>Fact: {term}</>;
    case "RefTrace":
      return (
        <>
          Rule:{" "}
          <Term
            term={makeTermWithBindings(res.term, res.bindings)}
            highlight={props.highlight}
            rulePath={props.rulePath.slice(0, props.rulePath.length - 1)}
          />{" "}
          <VarMappingsC
            mappings={res.trace.mappings}
            highlight={props.highlight}
            innerRulePath={props.rulePath}
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
  innerRulePath: RulePath;
}) {
  const innerPath = props.innerRulePath;
  const outerPath = props.innerRulePath.slice(
    0,
    props.innerRulePath.length - 1
  );
  return (
    <>
      {"{"}
      {intersperse<React.ReactNode>(
        ", ",
        mapObjToList(props.mappings, (key, value) => (
          <React.Fragment key={key}>
            <VarC name={key} rulePath={innerPath} highlight={props.highlight} />
            :{" "}
            <VarC
              name={value}
              rulePath={outerPath}
              highlight={props.highlight}
            />
          </React.Fragment>
        ))
      )}
      {"}"}
    </>
  );
}
