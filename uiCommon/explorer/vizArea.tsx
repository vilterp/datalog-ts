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

  return (
    <>
      <h3>Visualizations</h3>

      {specs.map((result, idx) => {
        const description = (result.term as Rec).attrs.description;

        return (
          <IndividualViz
            key={idx}
            interp={props.interp}
            name={(result.bindings.Name as StringLit).val}
            description={description ? (description as StringLit).val : null}
            spec={result.bindings.Spec as Rec}
            setHighlightedTerm={props.setHighlightedTerm}
          />
        );
      })}
    </>
  );
}

function IndividualViz(props: {
  interp: AbstractInterpreter;
  name: string;
  description: string | null;
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
          {props.description ? <p>{props.description}</p> : null}
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
