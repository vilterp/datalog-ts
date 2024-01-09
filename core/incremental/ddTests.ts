import { toGraphviz } from "./graphviz";
import { Rec, Term, int, rec } from "../types";
import { IncrementalInterpreter } from "./interpreter";
import { fsLoader } from "../fsLoader";
import { Suite } from "../../util/testBench/testing";
import { ProcessFn, runDDTestAtPath, TestOutput } from "../../util/ddTest";
import { datalogOut, graphvizOut, jsonOut } from "../../util/ddTest/types";
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
import { ParseErrors } from "../../languageWorkbench/parserlib/types";

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
    ["transitiveClosureMultiSupport", evalTest],
    ["sccs", evalTest],
    ["parse", evalTest],
    ["aggregation", evalTest],
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
    const [leftParsed, leftErrors] = parseRecord(left);
    if (leftErrors.length > 0) {
      throw new ParseErrors(leftErrors);
    }
    const [rightParsed, rightErrors] = parseRecord(right);
    if (rightErrors.length > 0) {
      throw new ParseErrors(rightErrors);
    }
    const leftStmt = parserTermToInternal(leftParsed) as Rec;
    const rightStmt = parserTermToInternal(rightParsed) as Rec;
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
    } else if (input.startsWith(".multiplicities")) {
      const relation = input.split(" ")[1];
      const cache = interp.graph.nodes.get(relation).cache;
      const entries: Term[] = [];
      for (const entry of cache.all()) {
        // TODO: why are these in here at all
        if (entry.mult === 0) {
          continue;
        }
        entries.push(
          rec("entry", { term: entry.item.term, mult: int(entry.mult) })
        );
      }
      out.push(datalogOut(entries));
      continue;
    }
    const [rawStmt, errors] = parseStatement(input);
    if (errors.length > 0) {
      throw new ParseErrors(errors);
    }
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
