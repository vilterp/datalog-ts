import { datalogOut, plainTextOut, TestOutput } from "../../util/ddTest/types";
import { Suite } from "../../util/testBench/testing";
import { generateRule, prettyPrintJS } from "./jsGen";
import { language } from "../parser";
import { DB, rec, Rule, str } from "../types";
import { suiteFromDDTestsInDir } from "../../util/ddTest/runner";
import { evaluateRule } from "./eval";
import { ppt } from "../pretty";

export function jsGenTests(writeResults: boolean): Suite {
  return suiteFromDDTestsInDir("core/jsGen/testData", writeResults, {
    generate: generateTest,
    eval: evalTest,
  });
}

function generateTest(test: string[]): TestOutput[] {
  return test.map((input) => {
    const rule = language.rule.tryParse(input).rule as Rule;
    return plainTextOut(prettyPrintJS(generateRule(rule)));
  });
}

function evalTest(test: string[]): TestOutput[] {
  return test.map((input) => {
    const rule = language.rule.tryParse(input).rule as Rule;
    const result = evaluateRule(TEST_DB, rule);
    return datalogOut(result.map((rec) => `${ppt(rec)}.`).join("\n"));
  });
}

const TEST_DB: DB = {
  rules: {},
  virtualTables: {},
  tables: {
    // TODO: this should be a rule
    parent: [
      rec("parent", { child: str("Pete"), parent: str("Paul") }),
      rec("parent", { child: str("Paul"), parent: str("Peter") }),
      rec("parent", { child: str("Peter"), parent: str("Emil") }),
    ],
    father: [
      rec("father", { child: str("Pete"), parent: str("Paul") }),
      rec("father", { child: str("Paul"), parent: str("Peter") }),
      rec("father", { child: str("Peter"), parent: str("Emil") }),
    ],
  },
};
