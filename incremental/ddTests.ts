import { runDDTestAtPath, DDTest, ProcessFn } from "../util/dataDrivenTests";
import { Suite } from "../testing";
import { language } from "../parser";
import { emptyRuleGraph, formatRes } from "./types";
import { prettyPrintGraph } from "../graphviz";
import { toGraphviz } from "./graphviz";
import { Statement } from "../types";
import { scan } from "../util";
import { ppb, ppt } from "../pretty";
import { formatOutput, processStmt } from "./interpreter";

export function incrTests(writeResults: boolean): Suite {
  const tests: [string, ProcessFn][] = [
    ["build", buildTest],
    ["buildBinExpr", buildTest],
    ["eval", evalTest],
    ["eval2", evalTest],
    ["eval3", evalTest],
    ["siblings", evalTest],
    ["cycles", evalTest],
    ["replay", evalTest],
    ["cyclesReplay", evalTest],
  ];
  return tests.map(([name, func]) => ({
    name,
    test() {
      runDDTestAtPath(
        `incremental/testdata/${name}.dd.txt`,
        func,
        writeResults
      );
    },
  }));
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
          `processing "${pair.input}" at line ${pair.lineNo}: ${err.stack}\n`
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
        const { newGraph, output } = processStmt(accum, stmt);
        return {
          newState: newGraph,
          output: formatOutput(newGraph, output, {
            emissionLogMode: "test",
            showBindings: true,
          }),
        };
      } catch (err) {
        throw new Error(
          `processing "${pair.input}" at line ${pair.lineNo}: ${err.stack}\n`
        );
      }
    },
    test
  );
}

// kind of reimplementing the repl here; lol

function parseStatement(str: string): Statement {
  return language.statement.tryParse(str);
}
