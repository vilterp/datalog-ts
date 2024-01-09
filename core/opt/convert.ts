import { TermTable } from "../../util/termTable";
import { AbstractInterpreter } from "../abstractInterpreter";
import { Int, Rec, int, rec, str } from "../types";
import { SimplexProblem, SimplexResult } from "./simplex";

export type ProblemAndMapping = {
  problem: SimplexProblem;
  varIndex: TermTable;
  constraintIndex: TermTable;
};

export function getProblem(
  problemID: number,
  interp: AbstractInterpreter
): ProblemAndMapping {
  // TODO: maybe relation names should be part of spec, not hardcoded here
  const constraints = interp
    .queryStr(`constraint{problem: ${problemID}}?`)
    .map((res) => res.term as Rec);
  const constraintCoefficients = interp
    .queryStr(`coefficientValue{problem: ${problemID}}?`)
    .map((res) => res.term as Rec);
  const objectiveCoefficients = interp
    .queryStr(`objectiveCoefficient{problem: ${problemID}}?`)
    .map((res) => res.term as Rec);

  const varIndex = new TermTable();
  const constraintIndex = new TermTable();

  // Get constraint matrix
  const constraintMatrix: number[][] = [];
  for (const row of constraintCoefficients) {
    const varTerm = row.attrs.var;
    const constraintTerm = row.attrs.constraint;
    const value = (row.attrs.val as Int).val;

    const varID = varIndex.get(varTerm);
    const constraintID = constraintIndex.get(constraintTerm);

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

    const constraintID = constraintIndex.get(constraint.attrs.id);
    constants[constraintID] = constant;
  }

  // Get objective
  const objective: number[] = [];
  for (const objectiveRec of objectiveCoefficients) {
    const varTerm = objectiveRec.attrs.var;
    const coefficient = (objectiveRec.attrs.coefficient as Int).val;

    const varID = varIndex.get(varTerm);
    objective[varID] = coefficient;
  }
  // slack vars in objective
  for (let i = 0; i < constraintMatrix.length; i++) {
    objective.push(0);
  }

  const problem: SimplexProblem = {
    constraintMatrix,
    constants,
    objective,
  };

  return {
    problem,
    varIndex,
    constraintIndex,
  };
}

export function extractSolution(
  problemID: number,
  result: SimplexResult,
  varIndex: TermTable
): Rec[] {
  const out: Rec[] = [];
  out.push(
    rec("solution", {
      problem: int(problemID),
      outcome: str(result.result),
    })
  );

  if (result.result !== "optimal") {
    return out;
  }

  // get var vals
  for (const { term, val } of varIndex.entries()) {
    out.push(
      rec("solutionVarVal", {
        problem: int(problemID),
        var: term,
        val: int(result.solution[val]),
      })
    );
  }
  // get objective val
  out.push(
    rec("objectiveVal", {
      problem: int(problemID),
      val: int(result.objectiveValue),
    })
  );

  return out;
}
