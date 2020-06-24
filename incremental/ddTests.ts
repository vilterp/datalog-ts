import { runDDTestAtPath, DDTest, Result } from "../util/dataDrivenTests";
import { Suite } from "../testing";
import { addRule, declareTable } from "./build";
import { language } from "../parser";
import { emptyRuleGraph } from "./types";

export function incrTests(writeResults: boolean): Suite {
  return [
    {
      name: "build",
      test() {
        runDDTestAtPath(
          "incremental/testdata/build.dd.txt",
          buildTest,
          writeResults
        );
      },
    },
  ];
}

function buildTest(test: DDTest): Result[] {
  let curGraph = emptyRuleGraph;
  const out: Result[] = [];
  test.forEach((pair) => {
    if (pair.input.startsWith(".table ")) {
      curGraph = declareTable(curGraph, pair.input.split(".table ")[1]);
    } else {
      const rule = language.rule.tryParse(pair.input).rule;
      curGraph = addRule(curGraph, rule);
    }
    out.push({
      pair,
      actual: JSON.stringify(curGraph, null, 2) + "\n",
    });
  });
  return out;
}
