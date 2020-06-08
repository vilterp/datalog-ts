import React, { useState } from "react";
import { Res, VarMappings } from "../types";
import { Term, noHighlight, Highlight, VarC } from "./term";
import { makeTermWithBindings } from "../traceTree";
import { mapObjToList, intersperse } from "../util";

export function Trace(props: { res: Res }) {
  const res = props.res;
  const [highlight, setHighlight] = useState(noHighlight);

  const highlightProps = { highlight, setHighlight };

  const term = (
    <Term
      term={makeTermWithBindings(res.term, res.bindings)}
      {...highlightProps}
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
          <VarMappingsC mappings={res.trace.mappings} {...highlightProps} />
        </>
      );
    default:
      return term;
  }
}

export function VarMappingsC(props: {
  mappings: VarMappings;
  highlight: Highlight;
  setHighlight: (h: Highlight) => void;
}) {
  const highlightProps = {
    highlight: props.highlight,
    setHighlight: props.setHighlight,
  };
  return (
    <>
      {"{"}
      {intersperse<React.ReactNode>(
        ", ",
        mapObjToList(props.mappings, (key, value) => (
          <React.Fragment key={key}>
            <VarC name={key} {...highlightProps} />:{" "}
            <VarC name={value} {...highlightProps} />
          </React.Fragment>
        ))
      )}
      {"}"}
    </>
  );
}
