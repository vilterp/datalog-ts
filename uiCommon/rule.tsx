import React from "react";
import { Rule } from "../types";
import { HighlightProps, TermView } from "./term";
import { makeTermWithBindings } from "../traceTree";
import { intersperseIdx } from "../util/util";
import { ppt } from "../pretty";

export function RuleC(props: { rule: Rule; highlight: HighlightProps }) {
  return (
    <div
      style={{ fontFamily: "monospace", paddingBottom: 10, cursor: "default" }}
    >
      <TermView
        term={makeTermWithBindings(props.rule.head, {})}
        scopePath={[]}
        highlight={props.highlight}
      />{" "}
      :-
      <br />
      <div style={{ paddingLeft: 15 }}>
        {intersperseIdx(
          (idx) => (
            <React.Fragment key={`or-sep-${idx}`}>
              {" | "}
              <br />
            </React.Fragment>
          ),
          props.rule.defn.opts.map((opt, idx) => (
            <React.Fragment key={idx}>
              {intersperseIdx(
                (idx) => (
                  <React.Fragment key={`and-sep-${idx}`}>
                    {" & "}
                    <br />
                  </React.Fragment>
                ),
                opt.clauses.map((clause) => (
                  <TermView
                    key={ppt(clause)}
                    highlight={props.highlight}
                    scopePath={[]}
                    term={makeTermWithBindings(clause, {})}
                  />
                ))
              )}
            </React.Fragment>
          ))
        )}
        .
      </div>
    </div>
  );
}
