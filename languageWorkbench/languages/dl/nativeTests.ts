import { generatorIsEmpty } from "../../../util/generator";
import { Suite, assert } from "../../../util/testBench/testing";
import { getFlattened } from "../../common/testHelpers";
import { datalogLangImpl } from "./dl";

export const nativeTests: Suite = [
  {
    name: "foo",
    test() {
      const input = `
        foo{var: V} :-
          bar{x: bar{v: V}}.
      `;
      const db = getFlattened(datalogLangImpl, input);
      const problems = datalogLangImpl.tcProblem(db);
      assert(generatorIsEmpty(problems), "no problems");
    },
  },
];
