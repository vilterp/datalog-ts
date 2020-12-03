import { runDDTestAtPath, ProcessFn } from "../util/ddTest";
import { Suite } from "../testing";
import { language } from "../parser";
import { prettyPrintGraph } from "../graphviz";
import { toGraphviz } from "./graphviz";
import { Rec, Statement } from "../types";
import { scan } from "../util";
import { formatOutput, newInterpreter, processStmt } from "./interpreter";
import {
  graphvizOut,
  jsonOut,
  plainTextOut,
  TestOutput,
} from "../util/ddTest/types";
import { fsLoader } from "../repl";
import { getJoinInfo } from "./build";
import { clearJoinStats, getJoinStats } from "./eval";

export function incrTests(writeResults: boolean): Suite {
  const tests: [string, ProcessFn][] = [
    // ["build", buildTest],
    // ["buildBinExpr", buildTest],
    // ["eval", evalTest],
    // ["eval2", evalTest],
    // ["eval3", evalTest],
    // ["siblings", evalTest],
    ["indexes", evalTest],
    // ["cycles", evalTest],
    // ["replay", evalTest],
    // ["cyclesReplay", evalTest],
    // ["fp", evalTest],
    // ["fp2", evalTest],
    // ["fp3", evalTest],
    // ["findJoinInfo", joinInfoTest],
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

function joinInfoTest(test: string[]): TestOutput[] {
  return test.map((input) => {
    const [left, right] = input.split("\n");
    const leftStmt = parseRecord(left);
    const rightStmt = parseRecord(right);
    const res = getJoinInfo(leftStmt, rightStmt);
    return jsonOut(JSON.stringify(res, null, 2));
  });
}

// TODO: deprecate this since we have .rulegraph now?
function buildTest(test: string[]): TestOutput[] {
  return test.map((input) => {
    const commands = input
      .split(";")
      .map((s) => s.trim())
      .map(parseStatement);
    const curInterp = commands.reduce((accum, stmt) => {
      return processStmt(accum, stmt).newInterp;
    }, newInterpreter(fsLoader));
    return graphvizOut(prettyPrintGraph(toGraphviz(curInterp.graph)));
  });
}

export function evalTest(inputs: string[]): TestOutput[] {
  const res = scan(
    newInterpreter(fsLoader),
    (interp, input) => {
      try {
        const stmt = parseStatement(input);
        // const before = Date.now();
        const { newInterp, output } = processStmt(interp, stmt);
        // const after = Date.now();
        // console.log(after - before, "ms", stmt);
        return {
          newState: newInterp,
          output: formatOutput(newInterp.graph, output, {
            emissionLogMode: "test",
            showBindings: true,
          }),
        };
      } catch (err) {
        throw new Error(`processing "${input}": ${err.stack}\n`);
      }
    },
    inputs
  );
  // console.log({ joinStats: getJoinStats() });
  // clearJoinStats();
  return res;
}

// kind of reimplementing the repl here; lol

function parseRecord(str: string): Rec {
  return language.record.tryParse(str);
}

function parseStatement(str: string): Statement {
  return language.statement.tryParse(str);
}
