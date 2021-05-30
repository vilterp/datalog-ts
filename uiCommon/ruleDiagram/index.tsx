import React from "react";
import { Diagram, dimensions } from "../../util/diagrams/render";
import { InvocationLocation, Rec, Rule, Term } from "../../core/types";
import {
  AbsPos,
  Diag,
  Rect,
  Text,
  VLayout,
  ZLayout,
} from "../../util/diagrams/types";
import { mapObjToList } from "../../util/util";

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
    recordDiagram(rule.defn.opts[0].clauses[0] as Rec),
  ]);
}

// TODO: why does this need so many type arguments??
function recordDiagram(rec: Rec): Diag<InvocationLocation> {
  return ZLayout<InvocationLocation>([
    Rect({ topLeft: { x: 0, y: 0 }, width: 50, height: 50, fill: "blue" }),
    VLayout<InvocationLocation>([
      Text({ text: rec.relation, fontSize: 10 }),
      ...mapObjToList<Term, Diag<InvocationLocation>>(rec.attrs, (key, value) =>
        leftAlign(Text({ text: key, fontSize: 10 }))
      ),
    ]),
  ]);
}

function leftAlign<T>(d: Diag<T>): Diag<T> {
  const dims = dimensions(d);
  return AbsPos({ x: dims.width / 2, y: 0 }, d);
}
