import React from "react";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Rec, StringLit, Term } from "../../core/types";
import { CollapsibleWithHeading } from "../generic/collapsible";
import { VIZ_REGISTRY } from "../visualizations";

export function VizArea(props: {
  interp: AbstractInterpreter;
  setHighlightedTerm: (t: Term | null) => void;
}) {
  const interp = ensureVizTable(props.interp);
  const specs = interp.queryStr(
    "internal.visualization{name: Name, spec: Spec}"
  );

  const description = XXX;

  return (
    <>
      <h3>Visualizations</h3>

      {specs.map((result, idx) => (
        <IndividualViz
          key={idx}
          interp={props.interp}
          name={(result.bindings.Name as StringLit).val}
          description={()}
          spec={result.bindings.Spec as Rec}
          setHighlightedTerm={props.setHighlightedTerm}
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
}) {
  const viz = VIZ_REGISTRY[props.spec.relation];
  return (
    <CollapsibleWithHeading
      heading={props.name}
      storageKey={`viz-${props.name}`}
      content={
        <div>
          {props.spec.attrs.description ? (
            <p>{(props.spec.attrs.description as StringLit).val}</p>
          ) : null}
          {viz ? (
            <viz.component
              interp={props.interp}
              spec={props.spec}
              setHighlightedTerm={props.setHighlightedTerm}
            />
          ) : (
            <pre>viz {props.spec.relation} not found</pre>
          )}
        </div>
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
