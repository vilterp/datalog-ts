import { runDDTestAtPath, ProcessFn } from "../util/ddTest";
import { Suite } from "../util/testing";
import { language } from "../parser";
import { prettyPrintGraph } from "../util/graphviz";
import { toGraphviz } from "./graphviz";
import { Rec, Statement } from "../types";
import { formatOutput, Interpreter } from "./interpreter";
import { graphvizOut, jsonOut, TestOutput } from "../util/ddTest/types";
import { fsLoader } from "../repl";
import { getJoinInfo } from "./build";

export function incrTests(writeResults: boolean): Suite {
  const tests: [string, ProcessFn][] = [
    ["build", buildTest],
    ["buildBinExpr", buildTest],
    ["matgramp", evalTest],
    ["eval2", evalTest],
    ["eval3", evalTest],
    ["indexes", evalTest],
    ["siblings", evalTest],
    ["cycles", evalTest],
    ["replay", evalTest],
    ["cyclesReplay", evalTest],
    ["fp", evalTest],
    ["fp2", evalTest],
    ["fpIde", evalTest],
    ["findJoinInfo", joinInfoTest],
    ["parse", evalTest],
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
    const interp = new Interpreter(fsLoader);
    for (let stmt of statements) {
      interp.processStmt(stmt);
    }
    return graphvizOut(prettyPrintGraph(toGraphviz(interp.graph)));
  });
}

export function evalTest(inputs: string[]): TestOutput[] {
  const out: TestOutput[] = [];
  const interp = new Interpreter(fsLoader);
  for (let input of inputs) {
    try {
      const stmt = parseStatement(input);
      // const before = Date.now();
      const output = interp.processStmt(stmt);
      // const after = Date.now();
      // console.log(after - before, "ms", stmt);
      out.push(
        formatOutput(interp.graph, output, {
          propagationLogMode: "test",
          showBindings: true,
        })
      );
    } catch (err) {
      throw new Error(`processing "${input}": ${err.stack}`);
    }
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
