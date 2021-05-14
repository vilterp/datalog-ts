import React from "react";
import { Interpreter } from "../../core/interpreter";

export function VizArea(props: { interp: Interpreter }) {
  const interp = ensureVizTable(props.interp);
  const specs = interp.queryStr(
    "internal.visualization{name: Name, spec: Spec}"
  );

  return (
    <>
      <h3>Visualizations</h3>
      <pre>{JSON.stringify(specs, null, 2)}</pre>
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
