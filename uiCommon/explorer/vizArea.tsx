import React from "react";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Rec, StringLit } from "../../core/types";
import { VIZ_REGISTRY } from "../visualizations";

export function VizArea(props: { interp: AbstractInterpreter }) {
  const interp = ensureVizTable(props.interp);
  const specs = interp.queryStr(
    "internal.visualization{name: Name, spec: Spec}"
  );

  return (
    <>
      <h3>Visualizations</h3>

      {specs.map((result) => (
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
  interp: AbstractInterpreter;
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

function ensureVizTable(interp: AbstractInterpreter): AbstractInterpreter {
  const [_, newInterp] = interp.evalStmt({
    type: "TableDecl",
    name: "internal.visualization",
  });
  return newInterp;
}
