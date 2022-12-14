import { parseRule } from "../../languageWorkbench/languages/dl/parser";
import { runDDTestAtPath } from "../../util/ddTest";
import { jsonOut, TestOutput } from "../../util/ddTest/types";
import { Suite } from "../../util/testBench/testing";
import { parserRuleToInternal } from "../translateAST";
import { plan } from "./planner";

export function plannerTests(writeResults: boolean): Suite {
  return [
    {
      name: "Planner",
      test() {
        runDDTestAtPath(
          "core/simple/testdata/planner.dd.txt",
          testPlanner,
          writeResults
        );
      },
    },
  ];
}

function testPlanner(test: string[]): TestOutput[] {
  return test.map((input) => {
    const rawRule = parseRule(input);
    const rule = parserRuleToInternal(rawRule);
    const rulePlan = plan(rule);
    return jsonOut(rulePlan);
  });
}
