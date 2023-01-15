import { toGraphviz } from "./graphviz";
import { Rec } from "../types";
import { IncrementalInterpreter } from "./interpreter";
import { fsLoader } from "../fsLoader";
import { Suite } from "../../util/testBench/testing";
import { ProcessFn, runDDTestAtPath, TestOutput } from "../../util/ddTest";
import { graphvizOut, jsonOut } from "../../util/ddTest/types";
import { prettyPrintGraph } from "../../util/graphviz";
import {
  parseRecord,
  parseStatement,
} from "../../languageWorkbench/languages/dl/parser";
import {
  parserStatementToInternal,
  parserTermToInternal,
} from "../translateAST";
import { buildGraph, getJoinVars } from "./build";
import { formatOutput } from "./output";

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
    ["replay", evalTest],
    ["dlParser", evalTest],
    ["timeStep", evalTest],
    ["contracts", evalTest],
    ["transitiveClosure", evalTest],
    ["sccs", evalTest],
    ["parse", evalTest],
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
    const leftStmt = parserTermToInternal(parseRecord(left)) as Rec;
    const rightStmt = parserTermToInternal(parseRecord(right)) as Rec;
    const res = getJoinVars(leftStmt, rightStmt);
    return jsonOut(res.toArray());
  });
}

function buildTest(test: string[]): TestOutput[] {
  return test.map((input) => {
    let interp = new IncrementalInterpreter(".", fsLoader);
    interp = interp.evalStr(input)[1] as IncrementalInterpreter;
    return graphvizOut(
      prettyPrintGraph(toGraphviz(buildGraph(interp.catalog)))
    );
  });
}

function evalTest(inputs: string[]): TestOutput[] {
  const out: TestOutput[] = [];
  let interp = new IncrementalInterpreter(".", fsLoader);
  for (let input of inputs) {
    if (input === ".ruleGraph") {
      // TODO: query virtual relations instead?
      out.push(graphvizOut(prettyPrintGraph(toGraphviz(interp.graph))));
      continue;
    }
    const rawStmt = parseStatement(input);
    const stmt = parserStatementToInternal(rawStmt);
    // const before = Date.now();
    const { newInterp, output } = interp.processStmt(stmt);
    interp = newInterp as IncrementalInterpreter;
    // const after = Date.now();
    // console.log(after - before, "ms", stmt);
    out.push(
      formatOutput(interp.graph, output, {
        emissionLogMode: "test",
        filterInternal: false,
      })
    );
  }
  return out;
}
