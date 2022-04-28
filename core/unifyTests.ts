import { array, int, rec, str, varr } from "./types";
import { unify, unifyBindings } from "./unify";
import { assertDeepEqual } from "../util/testBench/testing";

export const unifyTests = [
  {
    name: "unifyBindings",
    test() {
      const res = unifyBindings(
        { A: str("Pete"), B: str("Paul") },
        { B: str("Paul"), C: str("Peter") }
      );
      assertDeepEqual({ A: str("Pete"), B: str("Paul"), C: str("Peter") }, res);

      const res2 = unifyBindings(
        { X: str("Paul"), Y: str("Peter") },
        { X: varr("X"), Z: str("Peter") }
      );
      assertDeepEqual(
        { X: str("Paul"), Y: str("Peter"), Z: str("Peter") },
        res2
      );

      const res3 = unifyBindings({ X: varr("X") }, { X: int(1) });
      assertDeepEqual({ X: int(1) }, res3);
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
    name: "unify_literals",
    test() {
      const unifyRes = unify({}, int(1), int(2));
      assertDeepEqual(null, unifyRes);

      const unifyRes2 = unify({}, int(1), int(1));
      assertDeepEqual({}, unifyRes2);
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
  // {
  //   name: "recordsAndVars",
  //   test() {
  //     // type_lambda{id: I, type: tapp{to: T}} :-
  //     //   lambda{id: I, retType: T}.
  //     const unifyRes = unify(
  //       { I: int(5), T: str("int") },
  //       rec("type_lambda", {
  //         id: varr("I"),
  //         type: rec("tapp", { to: varr("T") }),
  //       }),
  //       rec("lambda", {})
  //     );
  //   },
  // },
  {
    name: "scope",
    test() {
      const unifyRes = unify(
        {},
        rec("trans_edge", {
          from: varr("X"),
          to: varr("Z"),
        }),
        rec("trans_edge", {
          from: str("D"),
          to: varr("Z"),
        })
      );
      assertDeepEqual({ X: str("D"), Z: varr("Z") }, unifyRes);
    },
  },
  {
    name: "array",
    test() {
      const unifyRes = unify(
        {},
        array([str("foo"), varr("X"), int(2)]),
        array([str("foo"), str("bar"), int(2)])
      );
      assertDeepEqual({ X: str("bar") }, unifyRes);

      const unifyRes2 = unify(
        {},
        array([str("foo"), str("notbar"), int(2)]),
        array([str("foo"), str("bar"), int(2)])
      );
      assertDeepEqual(null, unifyRes2);

      const unifyRes3 = unify(
        {},
        array([str("foo"), varr("X"), int(2)]),
        array([str("foo"), str("bar")])
      );
      assertDeepEqual(null, unifyRes3);
    },
  },
  {
    name: "incomplete record",
    test() {
      const unifyRes = unify(
        {},
        rec("span", {
          from: rec("pos", { idx: int(1) }),
          to: rec("pos", { idx: int(2) }),
        }),
        rec("span", { from: rec("pos", { idx: int(1) }) })
      );
      assertDeepEqual(unifyRes, {});
    },
  },
  {
    name: "different relations",
    test() {
      const unifyRes = unify(
        {},
        rec("foo", {
          from: rec("pos", { idx: int(1) }),
          to: rec("pos", { idx: int(2) }),
        }),
        rec("bar", {
          from: rec("pos", { idx: int(1) }),
          to: rec("pos", { idx: int(2) }),
        })
      );
      assertDeepEqual(unifyRes, null);
    },
  },
];
