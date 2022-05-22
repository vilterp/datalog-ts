import React from "react";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Rec, Statement, StringLit, Term } from "../../core/types";
import { CollapsibleWithHeading } from "../generic/collapsible";
import { VIZ_REGISTRY } from "../visualizations";

export function VizArea(props: {
  interp: AbstractInterpreter;
  setHighlightedTerm: (t: Term | null) => void;
  runStatements: (stmts: Statement[]) => void;
}) {
  const interp = ensureVizTable(props.interp);
  const specs = interp.queryStr(
    "internal.visualization{name: Name, spec: Spec}"
  );

  return (
    <>
      <h3>Visualizations</h3>

      {specs.map((result, idx) => (
        <IndividualViz
          key={idx}
          interp={props.interp}
          name={(result.bindings.Name as StringLit).val}
          spec={result.bindings.Spec as Rec}
          setHighlightedTerm={props.setHighlightedTerm}
          runStatements={props.runStatements}
        />
      ))}
    </>
  );
}

function IndividualViz(props: {
  interp: AbstractInterpreter;
  name: string;
  spec: Rec;
  setHighlightedTerm: (t: Term | null) => void;
  runStatements: (stmts: Statement[]) => void;
}) {
  const viz = VIZ_REGISTRY[props.spec.relation];
  return (
    <CollapsibleWithHeading
      heading={props.name}
      storageKey={`viz-${props.name}`}
      content={
        viz ? (
          <viz.component
            interp={props.interp}
            spec={props.spec}
            setHighlightedTerm={props.setHighlightedTerm}
            runStatements={props.runStatements}
            id={props.name}
          />
        ) : (
          <pre>viz {props.spec.relation} not found</pre>
        )
      }
    />
  );
}

function ensureVizTable(interp: AbstractInterpreter): AbstractInterpreter {
  const [_, newInterp] = interp.evalStmt({
    type: "TableDecl",
    name: "internal.visualization",
  });
  return newInterp;
}
