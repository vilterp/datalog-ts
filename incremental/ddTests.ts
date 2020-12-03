import { runDDTestAtPath, ProcessFn } from "../util/ddTest";
import { Suite, Test } from "../testing";
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

export function incrTests(writeResults: boolean): Suite {
  const tests: [string, ProcessFn][] = [
    ["build", buildTest],
    ["buildBinExpr", buildTest],
    ["eval", evalTest],
    ["eval2", evalTest],
    ["eval3", evalTest],
    ["indexes", evalTest],
    ["siblings", evalTest],
    ["cycles", evalTest],
    // ["replay", evalTest],
    // ["cyclesReplay", evalTest],
    ["fp", evalTest],
    ["fp2", evalTest],
    // ["fp3", evalTest],
    ["findJoinInfo", joinInfoTest],
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
    const statements = input
      .split(";")
      .map((s) => s.trim())
      .map(parseStatement);
    const interp = newInterpreter(fsLoader);
    for (let stmt of statements) {
      processStmt(interp, stmt);
    }
    return graphvizOut(prettyPrintGraph(toGraphviz(interp.graph)));
  });
}

export function evalTest(inputs: string[]): TestOutput[] {
  const out: TestOutput[] = [];
  const interp = newInterpreter(fsLoader);
  for (let input of inputs) {
    const stmt = parseStatement(input);
    // const before = Date.now();
    const output = processStmt(interp, stmt);
    // const after = Date.now();
    // console.log(after - before, "ms", stmt);
    out.push(
      formatOutput(interp.graph, output, {
        emissionLogMode: "test",
        showBindings: true,
      })
    );
  }
  return out;
}

// kind of reimplementing the repl here; lol

function parseRecord(str: string): Rec {
  return language.record.tryParse(str);
}

function parseStatement(str: string): Statement {
  return language.statement.tryParse(str);
}
