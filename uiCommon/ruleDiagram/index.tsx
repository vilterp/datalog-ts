import React from "react";
import { Diagram } from "../../util/diagrams/render";
import { InvocationLocation, Rule } from "../../core/types";
import { AbsPos, Diag, Rect, Text, ZLayout } from "../../util/diagrams/types";

export function RuleDiagram(props: { rule: Rule }) {
  const diag = diagramForRule(props.rule);

  return <Diagram diagram={diag} />;
}

function diagramForRule(rule: Rule): Diag<InvocationLocation> {
  if (rule.defn.opts.length !== 1) {
    throw new Error("only works for rules with one clause");
  }

  return ZLayout([
    Rect({
      topLeft: {
        x: 0,
        y: 0,
      },
      width: 100,
      height: 100,
      fill: "red",
    }),
    AbsPos({ x: 50, y: 50 }, Text({ text: "hello world", fontSize: 10 })),
  ]);
}
