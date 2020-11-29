import { runDDTestAtPath, DDTest, ProcessFn } from "../util/ddTest";
import { Suite } from "../testing";
import { language } from "../parser";
import { prettyPrintGraph } from "../graphviz";
import { toGraphviz } from "./graphviz";
import { Statement } from "../types";
import { scan } from "../util";
import { formatOutput, newInterpreter, processStmt } from "./interpreter";
import { fsLoader } from "../repl";
import { graphvizOut, plainTextOut, TestOutput } from "../util/ddTest/types";

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
    ["fp", evalTest],
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
function buildTest(test: DDTest): TestOutput[] {
  return test.map((pair) => {
    const commands = pair.input
      .split(";")
      .map((s) => s.trim())
      .map(parseStatement);
    const curInterp = commands.reduce((accum, stmt) => {
      try {
        return processStmt(accum, stmt).newInterp;
      } catch (err) {
        throw new Error(
          `processing "${pair.input}" at line ${pair.lineNo}: ${err.stack}\n`
        );
      }
    }, newInterpreter(fsLoader));
    return graphvizOut(prettyPrintGraph(toGraphviz(curInterp.graph)));
  });
}

function evalTest(test: DDTest): TestOutput[] {
  return scan(
    newInterpreter(fsLoader),
    (interp, pair) => {
      try {
        const stmt = parseStatement(pair.input);
        const { newInterp, output } = processStmt(interp, stmt);
        return {
          newState: newInterp,
          output: plainTextOut(
            formatOutput(newInterp.graph, output, {
              emissionLogMode: "test",
              showBindings: true,
            })
          ),
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
