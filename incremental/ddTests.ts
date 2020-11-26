import { runDDTestAtPath, DDTest, Result } from "../util/dataDrivenTests";
import { Suite } from "../testing";
import { addRule, declareTable } from "./build";
import { language } from "../parser";
import { emptyRuleGraph, RuleGraph } from "./types";
import { prettyPrintGraph } from "../graphviz";
import { toGraphviz } from "./graphviz";
import { Rec, Rule, Statement } from "../types";
import { scan } from "../util";
import { insertFact } from "./eval";
import { ppt, prettyPrintTerm } from "../pretty";

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
    {
      name: "eval",
      test() {
        runDDTestAtPath(
          "incremental/testdata/eval.dd.txt",
          evalTest,
          writeResults
        );
      },
    },
  ];
}

function buildTest(test: DDTest): string[] {
  return test.map((pair) => {
    const commands = pair.input
      .split(";")
      .map((s) => s.trim())
      .map(parseStatement);
    const curGraph = commands.reduce(
      (accum, stmt) => processStmt(accum, stmt).newGraph,
      emptyRuleGraph
    );
    return prettyPrintGraph(toGraphviz(curGraph));
  });
}

function evalTest(test: DDTest): string[] {
  // TODO: get rid of all these `+ "\n"`s.
  return scan(
    emptyRuleGraph,
    (accum, pair) => {
      const stmt = parseStatement(pair.input);
      const { newGraph, newFacts } = processStmt(accum, stmt);
      return { newState: newGraph, output: newFacts };
    },
    test
  ).map((newFacts) => newFacts.map(ppt).join("\n") + "\n");
}

// kind of reimplementing the repl here; lol

function parseStatement(str: string): Statement {
  return language.statement.tryParse(str);
}

function processStmt(
  graph: RuleGraph,
  stmt: Statement
): { newGraph: RuleGraph; newFacts: Rec[] } {
  switch (stmt.type) {
    case "TableDecl": {
      const newGraph = declareTable(graph, stmt.name);
      return { newGraph, newFacts: [] };
    }
    case "Rule": {
      const newGraph = addRule(graph, stmt.rule);
      return { newGraph, newFacts: [] };
    }
    case "Insert":
      return insertFact(graph, stmt.record);
  }
}
