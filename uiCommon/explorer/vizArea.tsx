import React from "react";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Rec, Statement, StringLit, Value } from "../../core/types";
import { CollapsibleWithHeading } from "../generic/collapsible";
import { IndividualViz } from "../visualizations";

export function VizArea(props: {
  interp: AbstractInterpreter;
  highlightedTerm: Value | null;
  setHighlightedTerm: (t: Value | null) => void;
  runStatements: (stmts: Statement[]) => void;
}) {
  const interp = ensureVizTable(props.interp);
  const specs = interp.queryStr(
    "internal.visualization{name: Name, spec: Spec}"
  );

  return (
    <>
      <h3>Visualizations</h3>

      {specs.map((result, idx) => {
        const name = (result.bindings.Name as StringLit).val;
        return (
          <CollapsibleWithHeading
            key={`viz-${name}`}
            heading={name}
            storageKey={`viz-${name}`}
            content={
              <IndividualViz
                interp={props.interp}
                name={name}
                spec={result.bindings.Spec as Rec}
                highlightedTerm={props.highlightedTerm}
                setHighlightedTerm={props.setHighlightedTerm}
                runStatements={props.runStatements}
              />
            }
          />
        );
      })}
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
