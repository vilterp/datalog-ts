import { runDDTestAtPath, DDTest } from "../util/dataDrivenTests";
import { Suite } from "../testing";
import { language } from "../parser";
import { emptyRuleGraph } from "./types";
import { prettyPrintGraph } from "../graphviz";
import { toGraphviz } from "./graphviz";
import { Statement } from "../types";
import { scan } from "../util";
import { processStmt } from "./eval";
import { ppt } from "../pretty";

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
      const { newGraph, propagationLog } = processStmt(accum, stmt);
      return { newState: newGraph, output: { propagationLog, newGraph } };
    },
    test
  ).map(({ propagationLog, newGraph }) =>
    propagationLog
      .map(
        (insertion) =>
          `${insertion.dest.toID}${insertion.dest.joinSide || ""}: ${ppt(
            insertion.rec
          )}`
      )
      .join("\n")
  );
}

// kind of reimplementing the repl here; lol

function parseStatement(str: string): Statement {
  return language.statement.tryParse(str);
}
