import { str } from "./types";
import { unifyVars } from "./unify";

export const unifyTests = [
  {
    name: "unifyVars",
    test: () => {
      const res = unifyVars(
        { A: str("Pete"), B: str("Paul") },
        { B: str("Paul"), C: str("Peter") }
      );
      console.log(res);
    },
  },
];
