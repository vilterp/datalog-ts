import { language } from "../../core/parser";
import { Rule } from "../../core/types";
import { TestOutput } from "../../util/ddTest";
import { suiteFromDDTestsInDir } from "../../util/ddTest/runner";
import { graphvizOut } from "../../util/ddTest/types";
import { prettyPrintGraph } from "../../util/graphviz";
import { Suite } from "../../util/testBench/testing";
import { ruleToGraph } from "./ruleGraph";

export function uiCommonTests(writeResults: boolean): Suite {
  return suiteFromDDTestsInDir("uiCommon/dl/testdata", writeResults, [
    ["ruleGraph", ruleGraphTest],
  ]);
}

function ruleGraphTest(test: string[]): TestOutput[] {
  return test.map((input) => {
    const rule = language.rule.tryParse(input).rule as Rule;
    const graph = ruleToGraph(rule);
    return graphvizOut(prettyPrintGraph(graph));
  });
}
