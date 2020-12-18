import { assertDeepEqual, Suite } from "../util/testing";
import { Res, Term } from "./types";
import { MatGramp } from "./matGramp";

export const genTests: Suite = [
  // TODO: dry up the testing of different permutations
  // use ddtest for this?
  {
    name: "matGramp1",
    test() {
      const mg = new MatGramp();
      const o1 = mg.insertFact({
        relation: "mother",
        attrs: { child: "Pete", mother: "Mary" },
      });
      assertDeepEqual([], o1);
      const o2 = mg.insertFact({
        relation: "father",
        attrs: { child: "Mary", father: "Mark" },
      });
      const bindings = new Map<string, Term>();
      bindings.set("A", "Pete");
      bindings.set("B", "Mary");
      bindings.set("C", "Mark");
      assertDeepEqual<Res[]>(
        [
          {
            rec: {
              relation: "matGramp",
              attrs: { child: "Pete", grandfather: "Mark" },
            },
            bindings,
          },
        ],
        o2
      );
    },
  },
  {
    name: "matGramp2",
    test() {
      const mg = new MatGramp();
      const o1 = mg.insertFact({
        relation: "father",
        attrs: { child: "Mary", father: "Mark" },
      });
      assertDeepEqual([], o1);
      const o2 = mg.insertFact({
        relation: "mother",
        attrs: { child: "Pete", mother: "Mary" },
      });
      const bindings = new Map<string, Term>();
      bindings.set("A", "Pete");
      bindings.set("B", "Mary");
      bindings.set("C", "Mark");
      assertDeepEqual<Res[]>(
        [
          {
            rec: {
              relation: "matGramp",
              attrs: { child: "Pete", grandfather: "Mark" },
            },
            bindings,
          },
        ],
        o2
      );
    },
  },
];
