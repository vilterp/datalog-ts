import { Suite, assertDeepEqual } from "../../util/testBench/testing";
import { SimplexResult, SimplexSolver } from "./simplex";

export const optTests: Suite = [
  {
    name: "simplex",
    test() {
      const A = [
        [2, 1],
        [1, 1],
      ]; // Coefficients matrix
      const b = [6, 4]; // Constants vector
      const c = [-3, -2]; // Objective function coefficients (Note: they're usually given as negatives)

      const solver = new SimplexSolver(A, b, c);
      const actual = solver.solve();

      const expected: SimplexResult = {
        result: "optimal",
        solution: [0, 0],
        objectiveValue: 0,
      };

      assertDeepEqual(expected, actual);
    },
  },
];
