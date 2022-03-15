import { Suite } from "../util/testBench/testing";
import { language } from "./parser";
import { runDDTestAtPath } from "../util/ddTest";
import { jsonOut, TestOutput } from "../util/ddTest/types";

export function parserTests(writeResults: boolean): Suite {
  return [
    {
      name: "parser",
      test() {
        runDDTestAtPath("core/testdata/parser.dd.txt", testParse, writeResults);
      },
    },
  ];
}

function testParse(test: string[]): TestOutput[] {
  return test.map((input) => {
    const lines = input.split("\n");
    const ruleName = lines[0];
    const rest = lines.slice(1).join("\n");
    const output = language[ruleName].tryParse(rest);
    return jsonOut(output);
  });
}
