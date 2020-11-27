import { runDDTestAtPath, DDTest } from "../util/dataDrivenTests";
import { Suite } from "../testing";
import { language } from "../parser";
import { emptyRuleGraph, formatRes } from "./types";
import { prettyPrintGraph } from "../graphviz";
import { toGraphviz } from "./graphviz";
import { Statement } from "../types";
import { scan } from "../util";
import { EmissionBatch, Insertion, processStmt } from "./eval";
import { ppb, ppt } from "../pretty";

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
    {
      name: "eval2",
      test() {
        runDDTestAtPath(
          "incremental/testdata/eval2.dd.txt",
          evalTest,
          writeResults
        );
      },
    },
    {
      name: "eval3",
      test() {
        runDDTestAtPath(
          "incremental/testdata/eval3.dd.txt",
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
  return scan(
    emptyRuleGraph,
    (accum, pair) => {
      const stmt = parseStatement(pair.input);
      const { newGraph, emissionLog } = processStmt(accum, stmt);
      return { newState: newGraph, output: { emissionLog, newGraph } };
    },
    test
  ).map(({ emissionLog }) =>
    emissionLog
      .map(
        ({ fromID, output }) =>
          `${fromID}: [${output.map(formatRes).join(", ")}]`
      )
      .join("\n")
  );
}

// kind of reimplementing the repl here; lol

function parseStatement(str: string): Statement {
  return language.statement.tryParse(str);
}
