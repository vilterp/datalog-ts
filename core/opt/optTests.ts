import { TestOutput, runDDTestAtPath } from "../../util/ddTest";
import { datalogOut, jsonOut } from "../../util/ddTest/types";
import { Suite, assertDeepEqual } from "../../util/testBench/testing";
import { AbstractInterpreter } from "../abstractInterpreter";
import { fsLoader } from "../fsLoader";
import { IncrementalInterpreter } from "../incremental/interpreter";
import {
  ProblemAndMapping,
  extractSolution,
  getProblem as getProblemAndMapping,
} from "./convert";
import { SimplexProblem, SimplexResult, SimplexSolver } from "./simplex";

export function optTests(writeResults: boolean): Suite {
  return [
    {
      name: "simplex",
      test() {
        // Profit = 20*Chairs + 30*Tables
        // Constraints:
        //  1*Chairs + 3*Tables <= 10 // wood
        //  2*Chairs + 1*Tables <= 8  // labor

        const problem: SimplexProblem = {
          constraintMatrix: [
            [1, 3, 1, 0],
            [2, 1, 0, 1],
          ],
          constants: [10, 8],
          objective: [20, 30, 0, 0],
        };

        const solver = new SimplexSolver(problem);
        const actual = solver.solve();

        const expected: SimplexResult = {
          result: "optimal",
          // TODO: mixed-integer programming :P
          solution: [2.8, 2.4, 0, 0],
          objectiveValue: 128,
        };

        assertDeepEqual(expected, actual);
      },
    },
    {
      name: "convert",
      test() {
        runDDTestAtPath(
          "core/opt/testdata/convert.dd.txt",
          convertTest,
          writeResults
        );
      },
    },
    {
      name: "extract",
      test() {
        runDDTestAtPath(
          "core/opt/testdata/extract.dd.txt",
          extractTest,
          writeResults
        );
      },
    },
  ];
}

function problemFromDL(dl: string): ProblemAndMapping {
  let interp: AbstractInterpreter = new IncrementalInterpreter(
    "core/opt",
    fsLoader
  );
  interp = interp.doLoad("opt.dl");
  interp = interp.evalStr(dl)[1];
  return getProblemAndMapping(1, interp);
}

function convertTest(test: string[]): TestOutput[] {
  return test.map((input) => {
    const problemAndMapping = problemFromDL(input);
    const problem = problemAndMapping.problem;
    const solver = new SimplexSolver(problem);
    const result = solver.solve();
    return jsonOut({ problem, result });
  });
}

function extractTest(test: string[]): TestOutput[] {
  return test.map((input) => {
    const problemAndMapping = problemFromDL(input);
    const problem = problemAndMapping.problem;
    const solver = new SimplexSolver(problem);
    const result = solver.solve();
    const extracted = extractSolution(result, problemAndMapping.varIndex);
    return datalogOut(extracted);
  });
}
