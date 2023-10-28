import { Suite, assertDeepEqual } from "../../util/testBench/testing";
import { SimplexResult, SimplexSolver } from "./simplex";

export const optTests: Suite = [
  {
    name: "simplex",
    test() {
      // Profit = 20*Chairs + 30*Tables
      // Constraints:
      //  1*Chairs + 3*Tables <= 10 // wood
      //  2*Chairs + 1*Tables <= 8  // labor

      const A = [
        [1, 3, 1, 0],
        [2, 1, 0, 1],
      ]; // Coefficients matrix
      const b = [10, 8]; // Constants vector
      const c = [20, 30, 0, 0]; // Objective function coefficients

      const solver = new SimplexSolver(A, b, c);
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
