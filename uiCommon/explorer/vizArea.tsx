import React from "react";
import { Interpreter } from "../../core/interpreter";
import { Rec, StringLit } from "../../core/types";
import { VIZ_REGISTRY } from "../vizRegistry";

export function VizArea(props: { interp: Interpreter }) {
  const interp = ensureVizTable(props.interp);
  const specs = interp.queryStr(
    "internal.visualization{name: Name, spec: Spec}"
  );

  return (
    <>
      <h3>Visualizations</h3>

      {specs.results.map((result) => (
        <IndividualViz
          interp={props.interp}
          name={(result.bindings.Name as StringLit).val}
          spec={result.bindings.Spec as Rec}
        />
      ))}
    </>
  );
}

function IndividualViz(props: {
  interp: Interpreter;
  name: string;
  spec: Rec;
}) {
  const viz = VIZ_REGISTRY[props.spec.relation];
  return (
    <>
      <h4>{props.name}</h4>
      {viz ? (
        <viz.component interp={props.interp} spec={props.spec} />
      ) : (
        <pre>viz {props.spec.relation} not found</pre>
      )}
    </>
  );
}

function ensureVizTable(interp: Interpreter): Interpreter {
  const [_, newInterp] = interp.evalStmt({
    type: "TableDecl",
    name: "internal.visualization",
  });
  return newInterp;
}
