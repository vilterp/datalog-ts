import React from "react";
import { VizTypeSpec } from "./typeSpec";
import { sequence } from "./sequence";
import { tree } from "./tree";
import { vegalite } from "./vegalite";
import { tableEditor } from "./tableEditor";
import { dagEditor } from "./dagEditor/dagEditor";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Rec, Statement, Term } from "../../core/types";
import { paramSlider } from "./paramSlider";
import { ticker } from "./ticker";

export const VIZ_REGISTRY: { [id: string]: VizTypeSpec } = {
  sequence,
  tree,
  vegalite,
  tableEditor,
  dagEditor,
  paramSlider,
  ticker,
};

export function IndividualViz(props: {
  interp: AbstractInterpreter;
  name: string;
  spec: Rec;
  highlightedTerm: Term | null;
  setHighlightedTerm: (t: Term | null) => void;
  runStatements: (stmts: Statement[]) => void;
}) {
  const viz = VIZ_REGISTRY[props.spec.relation];
  return viz ? (
    <viz.component
      interp={props.interp}
      spec={props.spec}
      highlightedTerm={props.highlightedTerm}
      setHighlightedTerm={props.setHighlightedTerm}
      runStatements={props.runStatements}
      id={props.name}
    />
  ) : (
    <pre>viz {props.spec.relation} not found</pre>
  );
}
