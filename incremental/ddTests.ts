import { runDDTestAtPath, DDTest } from "../util/dataDrivenTests";
import { Suite } from "../testing";
import { language } from "../parser";
import { emptyRuleGraph, formatRes } from "./types";
import { prettyPrintGraph } from "../graphviz";
import { toGraphviz } from "./graphviz";
import { Statement } from "../types";
import { scan } from "../util";
import { ppb, ppt } from "../pretty";
import { processStmt } from "./interpreter";

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
      name: "buildBinExpr",
      test() {
        runDDTestAtPath(
          "incremental/testdata/buildBinExpr.dd.txt",
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
    {
      name: "siblings",
      test() {
        runDDTestAtPath(
          "incremental/testdata/siblings.dd.txt",
          evalTest,
          writeResults
        );
      },
    },
  ];
}

// TODO: deprecate this since we have .rulegraph now?
function buildTest(test: DDTest): string[] {
  return test.map((pair) => {
    const commands = pair.input
      .split(";")
      .map((s) => s.trim())
      .map(parseStatement);
    const curGraph = commands.reduce((accum, stmt) => {
      try {
        return processStmt(accum, stmt).newGraph;
      } catch (err) {
        throw new Error(
          `processing "${pair.input}" at line ${pair.lineNo}: ${err}`
        );
      }
    }, emptyRuleGraph);
    return prettyPrintGraph(toGraphviz(curGraph));
  });
}

function evalTest(test: DDTest): string[] {
  return scan(
    emptyRuleGraph,
    (accum, pair) => {
      try {
        const stmt = parseStatement(pair.input);
        const { newGraph, emissionLog, otherOutput } = processStmt(accum, stmt);
        return {
          newState: newGraph,
          output: { emissionLog, newGraph, otherOutput },
        };
      } catch (err) {
        throw new Error(
          `processing "${pair.input}" at line ${pair.lineNo}: ${err}`
        );
      }
    },
    test
  ).map(({ emissionLog, otherOutput }) =>
    [
      ...emissionLog.map(
        ({ fromID, output }) =>
          `${fromID}: [${output.map(formatRes).join(", ")}]`
      ),
      otherOutput || null,
    ]
      .filter((x) => x !== null)
      .join("\n")
  );
}

// kind of reimplementing the repl here; lol

function parseStatement(str: string): Statement {
  return language.statement.tryParse(str);
}
