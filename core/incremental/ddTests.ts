import { language } from "../parser";
import { toGraphviz } from "./graphviz";
import { Rec, Statement } from "../types";
import { formatOutput, IncrementalInterpreter } from "./interpreter";
import { getJoinInfo } from "./build";
import { fsLoader } from "../fsLoader";
import { Suite } from "../../util/testing";
import { ProcessFn, runDDTestAtPath, TestOutput } from "../../util/ddTest";
import { graphvizOut, jsonOut } from "../../util/ddTest/types";
import { prettyPrintGraph } from "../../util/graphviz";

export function incrTests(writeResults: boolean): Suite {
  const tests: [string, ProcessFn][] = [
    ["build", buildTest],
    ["buildBinExpr", buildTest],
    ["eval", evalTest],
    ["eval2", evalTest],
    ["eval3", evalTest],
    ["family", evalTest],
    ["indexes", evalTest],
    ["siblings", evalTest],
    ["cycles", evalTest],
    ["replay", evalTest],
    ["cyclesReplay", evalTest],
    // ["fp", evalTest],
    ["fp2", evalTest],
    // ["fp3", evalTest],
    ["findJoinInfo", joinInfoTest],
  ];
  return tests.map(([name, func]) => ({
    name,
    test() {
      runDDTestAtPath(
        `core/incremental/testdata/${name}.dd.txt`,
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
    return jsonOut(res);
  });
}

// TODO: deprecate this since we have .rulegraph now?
function buildTest(test: string[]): TestOutput[] {
  return test.map((input) => {
    const statements = input
      .split(";")
      .map((s) => s.trim())
      .map(parseStatement);
    let interp = new IncrementalInterpreter(".", fsLoader);
    for (let stmt of statements) {
      interp = interp.processStmt(stmt).newInterp as IncrementalInterpreter;
    }
    return graphvizOut(prettyPrintGraph(toGraphviz(interp.graph)));
  });
}

export function evalTest(inputs: string[]): TestOutput[] {
  const out: TestOutput[] = [];
  let interp = new IncrementalInterpreter(".", fsLoader);
  for (let input of inputs) {
    const stmt = parseStatement(input);
    // const before = Date.now();
    const { newInterp, output } = interp.processStmt(stmt);
    interp = newInterp as IncrementalInterpreter;
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
