import { Suite, assertDeepEqual } from "../../util/testBench/testing";
import { SimplexProblem, SimplexResult, SimplexSolver } from "./simplex";

export const optTests: Suite = [
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
];
