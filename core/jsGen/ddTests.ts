import { runDDTestAtPath } from "../../util/ddTest";
import { plainTextOut, TestOutput } from "../../util/ddTest/types";
import { Suite } from "../../util/testBench/testing";
import { generateJS, prettyPrintJS } from "./jsGen";
import { language } from "../parser";
import { Rule } from "../types";

export function jsGenTests(writeResults: boolean): Suite {
  return [
    {
      name: "simple",
      test() {
        runDDTestAtPath(
          "core/jsGen/testdata/simple.dd.txt",
          jsGenTest,
          writeResults
        );
      },
    },
  ];
}

function jsGenTest(test: string[]): TestOutput[] {
  return test.map((input) => {
    const rule = language.rule.tryParse(input).rule as Rule;
    return plainTextOut(prettyPrintJS(generateJS(rule)));
  });
}
