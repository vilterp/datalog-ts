import { rec, str, varr } from "./types";
import { unify, unifyVars } from "./unify";
import * as assert from "assert";
import { assertDeepEqual } from "./testing";

export const unifyTests = [
  {
    name: "unifyVars",
    test() {
      const res = unifyVars(
        { A: str("Pete"), B: str("Paul") },
        { B: str("Paul"), C: str("Peter") }
      );
      assertDeepEqual({ A: str("Pete"), B: str("Paul"), C: str("Peter") }, res);
    },
  },
  {
    name: "unify_basic",
    test() {
      const unifyRes = unify({}, varr("X"), str("B"));
      assertDeepEqual({ X: str("B") }, unifyRes);
    },
  },
  {
    name: "unify_prior",
    test() {
      const unifyRes = unify({ X: str("A") }, varr("X"), str("B"));
      assertDeepEqual(null, unifyRes);
    },
  },
  {
    name: "unify_records",
    test() {
      const unifyRes = unify(
        { X: str("A") },
        rec("edge", { from: varr("X"), to: varr("Y") }),
        rec("edge", { from: str("A"), to: str("B") })
      );
      assertDeepEqual({ X: str("A"), Y: str("B") }, unifyRes);

      const unifyRes2 = unify(
        { X: str("A") },
        rec("edge", { from: varr("X"), to: varr("Y") }),
        rec("edge", { from: str("B"), to: str("B") })
      );
      assertDeepEqual(null, unifyRes2);

      const unifyRes3 = unify(
        { X: str("A"), Y: varr("B") },
        rec("edge", { from: varr("X"), to: varr("Y") }),
        rec("edge", { from: str("A"), to: str("B") })
      );
      assertDeepEqual({ X: str("A"), Y: str("B") }, unifyRes3);
    },
  },
];
