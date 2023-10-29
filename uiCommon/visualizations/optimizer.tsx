import * as React from "react";
import { VizArgs, VizTypeSpec } from "./typeSpec";
import { SimplexSolver } from "../../core/opt/simplex";
import { Int } from "../../core/types";

export const optimizer: VizTypeSpec = {
  name: "Optimizer",
  description: "optimize stuff",
  component: (props: VizArgs) => {
    const problemID = (props.spec.attrs.problem as Int).val;
    const constraintCoefficients = props.interp.queryStr(
      `coefficientValue{problem: ${problemID}}`
    );
    const objectiveCoefficients = props.interp.queryStr(
      `objectiveCoefficient{problem: ${problemID}}`
    );

    console.log("opt", { constraintCoefficients, objectiveCoefficients });

    // Usage
    const A = [
      [2, 1],
      [1, 1],
    ]; // Coefficients matrix
    const b = [6, 4]; // Constants vector
    const c = [-3, -2]; // Objective function coefficients (Note: they're usually given as negatives)

    const solver = new SimplexSolver(A, b, c);
    const result = solver.solve();

    return <pre>{JSON.stringify(result, null, 2)}</pre>;
  },
};
