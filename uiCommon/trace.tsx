import React from "react";
import { Res, VarMappings } from "../types";
import { Term, VarC, HighlightProps } from "./term";
import { makeTermWithBindings } from "../traceTree";
import { mapObjToList, intersperse } from "../util";

export function TraceNode(props: { res: Res; highlight: HighlightProps }) {
  const res = props.res;

  const term = (
    <Term
      term={makeTermWithBindings(res.term, res.bindings)}
      highlight={props.highlight}
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
          {/* TODO: XXX */}
          Rule: {term}{" "}
          <VarMappingsC
            mappings={res.trace.mappings}
            highlight={props.highlight}
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
}) {
  return (
    <>
      {"{"}
      {intersperse<React.ReactNode>(
        ", ",
        mapObjToList(props.mappings, (key, value) => (
          <React.Fragment key={key}>
            <VarC name={key} highlight={props.highlight} />:{" "}
            <VarC name={value} highlight={props.highlight} />
          </React.Fragment>
        ))
      )}
      {"}"}
    </>
  );
}
