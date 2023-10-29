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
      console.error("error in optimizer viz", e);
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
  // TODO: maybe relation names should be part of spec, not hardcoded here
  const constraints = interp
    .queryStr(`constraint{problem: ${problemID}}`)
    .map((res) => res.term as Rec);
  const constraintCoefficients = interp
    .queryStr(`coefficientValue{problem: ${problemID}}`)
    .map((res) => res.term as Rec);
  const objectiveCoefficients = interp
    .queryStr(`objectiveCoefficient{problem: ${problemID}}`)
    .map((res) => res.term as Rec);

  const varIndex = new StringTable();
  const constraintIndex = new StringTable();

  // Get constraint matrix
  const constraintMatrix: number[][] = [];
  for (const row of constraintCoefficients) {
    const varTerm = row.attrs.var;
    const constraintTerm = row.attrs.constraint;
    const value = (row.attrs.val as Int).val;

    const varID = varIndex.get(ppt(varTerm));
    const constraintID = constraintIndex.get(ppt(constraintTerm));

    constraintMatrix[constraintID] = constraintMatrix[constraintID] || [];
    constraintMatrix[constraintID][varID] = value;
  }
  // TODO: slack variables

  // Get constants
  const constants: number[] = [];
  for (const constraint of constraints) {
    const opTerm = constraint.attrs.op as Rec;
    // TODO: handle ops
    const constant = (constraint.attrs.constant as Int).val;

    const constraintID = constraintIndex.get(ppt(constraint));
    constants[constraintID] = constant;
  }

  // Get objective
  const objective: number[] = [];
  for (const objective of objectiveCoefficients) {
    const varTerm = objective.attrs.var;
    const coefficient = (objective.attrs.coefficient as Int).val;

    const varID = varIndex.get(ppt(varTerm));
    objective[varID] = coefficient;
  }

  return {
    constraintMatrix,
    constants,
    objective,
  };
}
