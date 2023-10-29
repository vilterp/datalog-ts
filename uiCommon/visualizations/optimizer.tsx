import * as React from "react";
import { VizArgs, VizTypeSpec } from "./typeSpec";
import { SimplexProblem, SimplexSolver } from "../../core/opt/simplex";
import { Int, Rec, StringLit } from "../../core/types";
import { StringTable } from "../../util/stringTable";
import { ppt } from "../../core/pretty";
import { AbstractInterpreter } from "../../core/abstractInterpreter";

export const optimizer: VizTypeSpec = {
  name: "Optimizer",
  description: "optimize stuff",
  component: (props: VizArgs) => {
    try {
      const problem = getProblem(
        (props.spec.attrs.problem as Int).val,
        props.interp
      );

      console.log("problem", problem);

      const solver = new SimplexSolver(problem);
      const result = solver.solve();

      return <pre>{JSON.stringify(result, null, 2)}</pre>;
    } catch (e) {
      console.error("optimization in optimizer viz", e);
      return (
        <pre style={{ color: "red" }}>Optimization error: {e.toString()}</pre>
      );
    }
  },
};

function getProblem(
  problemID: number,
  interp: AbstractInterpreter
): SimplexProblem {
  const constraintCoefficients = interp.queryStr(
    `coefficientValue{problem: ${problemID}}`
  );
  const objectiveCoefficients = interp.queryStr(
    `objectiveCoefficient{problem: ${problemID}}`
  );

  console.log("opt", { constraintCoefficients, objectiveCoefficients });

  const A = getMatrix(constraintCoefficients.map((res) => res.term as Rec));
  const constants = [6, 4]; // TODO: get
  const objective = [-3, -2]; // TODO: get

  return {
    constraints: A,
    constants: constants,
    objective: objective,
  };
}

function getMatrix(coefficients: Rec[]): number[][] {
  const out = [];

  const varIndex = new StringTable();
  const constraintIndex = new StringTable();

  for (const row of coefficients) {
    const varTerm = row.attrs.var;
    const constraintTerm = row.attrs.constraint;
    const value = (row.attrs.val as Int).val;

    const varID = varIndex.get(ppt(varTerm));
    const constraintID = constraintIndex.get(ppt(constraintTerm));

    out[constraintID] = out[constraintID] || [];
    out[constraintID][varID] = value;
  }

  return out;
}
