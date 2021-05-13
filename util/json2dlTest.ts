import { assertStringEqual, Suite } from "./testing";
import { jsonToDL } from "./json2dl";
import { Rec } from "../types";
import { prettyPrintTerm } from "../pretty";
import * as pp from "prettier-printer";

export const json2DLTests: Suite = [
  {
    name: "json2dl",
    test() {
      const json = {
        foo: ["bar", "baz"],
        bar: 2,
        bleep: [
          {
            blorp: "bloop",
          },
          {
            blorp: "blop",
          },
        ],
      };
      const expected = `val{path: ["foo",0], val: "bar"}.
val{path: ["foo",1], val: "baz"}.
val{path: ["bar"], val: 2}.
val{path: ["bleep",0,"blorp"], val: "bloop"}.
val{path: ["bleep",1,"blorp"], val: "blop"}.`;
      const recs: Rec[] = [];
      jsonToDL(json, (rec) => recs.push(rec));
      assertStringEqual(
        expected,
        recs.map((r) => pp.render(200, prettyPrintTerm(r)) + ".").join("\n")
      );
    },
  },
];
