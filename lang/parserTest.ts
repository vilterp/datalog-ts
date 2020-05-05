import { Suite } from "../testing";
import { runDDTestAtPath } from "../util/dataDrivenTests";
import { DDTest, Result } from "../util/dataDrivenTests";
import { language } from "./parser";

export function langParserTests(writeResults: boolean): Suite {
  return [
    {
      name: "parse",
      test() {
        runDDTestAtPath("lang/testdata/parse.dd.txt", parseTest, writeResults);
      },
    },
  ];
}

function parseTest(test: DDTest): Result[] {
  return test.map((tc) => ({
    pair: tc,
    actual: JSON.stringify(language.expr.tryParse(tc.input), null, 2) + "\n",
  }));
}
