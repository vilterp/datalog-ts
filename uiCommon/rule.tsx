import React from "react";
import { Rule } from "../types";
import { HighlightProps, Term } from "./term";
import { makeTermWithBindings } from "../traceTree";

export function RuleC(props: { rule: Rule; highlight: HighlightProps }) {
  return (
    <>
      <Term
        term={makeTermWithBindings(props.rule.head, {})}
        scopePath={[]}
        highlight={props.highlight}
      />{" "}
      :-
    </>
  );
}
