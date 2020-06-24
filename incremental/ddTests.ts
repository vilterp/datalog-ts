import { runDDTestAtPath, DDTest, Result } from "../util/dataDrivenTests";
import { Suite } from "../testing";
import { addRule, declareTable } from "./build";
import { language } from "../parser";
import { emptyRuleGraph, RuleGraph } from "./types";
import { prettyPrintGraph } from "../graphviz";
import { toGraphviz } from "./graphviz";
import { Rule } from "../types";

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
  return test.map((pair) => {
    const commands = pair.input
      .split(";")
      .map((s) => s.trim())
      .map(parseCmd);
    const curGraph = commands.reduce(processCmd, emptyRuleGraph);
    return {
      pair,
      actual: prettyPrintGraph(toGraphviz(curGraph)) + "\n",
    };
  });
}

// kind of reimplementing the repl here; lol

type Cmd = { type: "Table"; name: string } | { type: "Rule"; rule: Rule };

function parseCmd(str: string): Cmd {
  if (str.startsWith(".table")) {
    return { type: "Table", name: str.split(".table ")[1] };
  }
  const rule = language.rule.tryParse(str).rule;
  return { type: "Rule", rule };
}

function processCmd(graph: RuleGraph, cmd: Cmd): RuleGraph {
  switch (cmd.type) {
    case "Table":
      return declareTable(graph, cmd.name);
    case "Rule":
      return addRule(graph, cmd.rule);
  }
}
