import { StringTable } from "../../util/stringTable";
import { AbstractInterpreter } from "../abstractInterpreter";
import { ppt } from "../pretty";
import { Int, Rec } from "../types";
import { SimplexProblem } from "./simplex";

export function getProblem(
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

  // add slack variables
  for (let i = 0; i < constraintMatrix.length; i++) {
    for (let j = 0; j < constraintMatrix.length; j++) {
      constraintMatrix[i].push(i === j ? 1 : 0);
    }
  }

  // Get constants
  const constants: number[] = [];
  for (const constraint of constraints) {
    const opTerm = constraint.attrs.op as Rec;
    // TODO: handle ops
    const constant = (constraint.attrs.constant as Int).val;

    const constraintID = constraintIndex.get(ppt(constraint.attrs.id));
    constants[constraintID] = constant;
  }

  // Get objective
  const objective: number[] = [];
  for (const objectiveRec of objectiveCoefficients) {
    const varTerm = objectiveRec.attrs.var;
    const coefficient = (objectiveRec.attrs.coefficient as Int).val;

    const varID = varIndex.get(ppt(varTerm));
    objective[varID] = coefficient;
  }
  // slack vars in objective
  for (let i = 0; i < constraintMatrix.length; i++) {
    objective.push(0);
  }

  return {
    constraintMatrix,
    constants,
    objective,
  };
}
