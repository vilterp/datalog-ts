import { str } from "./types";
import { unifyVars } from "./unify";
import * as assert from "assert";
import { assertDeepEqual } from "./testing";

export const unifyTests = [
  {
    name: "unifyVars",
    test: () => {
      const res = unifyVars(
        { A: str("Pete"), B: str("Paul") },
        { B: str("Paul"), C: str("Peter") }
      );
      assertDeepEqual({ A: str("Pete"), B: str("Paul"), C: str("Peter") }, res);
    },
  },
];
