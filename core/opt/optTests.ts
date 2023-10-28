import { Suite, assertDeepEqual } from "../../util/testBench/testing";
import { SimplexResult, SimplexSolver } from "./simplex";

export const optTests: Suite = [
  {
    name: "simplex",
    test() {
      const A = [
        [1, 3, 1, 0],
        [2, 1, 0, 1],
      ]; // Coefficients matrix
      const b = [10, 8]; // Constants vector
      const c = [-20, -30, 0, 0]; // Objective function coefficients (Note: they're usually given as negatives)

      const solver = new SimplexSolver(A, b, c);
      const actual = solver.solve();

      const expected: SimplexResult = {
        result: "optimal",
        solution: [0, 0, 10, 8],
        objectiveValue: 0,
      };

      assertDeepEqual(expected, actual);
    },
  },
];
