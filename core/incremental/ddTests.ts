import { Suite } from "../../util/testing";
import { language } from "../parser";
import { prettyPrintGraph } from "../../util/graphviz";
import { toGraphviz } from "./graphviz";
import { Rec, Statement } from "../types";
import { formatOutput, IncrementalInterpreter } from "./interpreter";
import { graphvizOut, jsonOut, TestOutput } from "../../util/ddTest/types";
import { getJoinInfo } from "./build";
import { suiteFromDDTestsInDir } from "../../util/ddTest/runner";
import { fsLoader } from "../fsLoader";

export function incrTests(writeResults: boolean): Suite {
  return suiteFromDDTestsInDir("core/incremental/testdata", writeResults, [
    ["family", evalTest],
  ]);
}

export function evalTest(inputs: string[]): TestOutput[] {
  const out: TestOutput[] = [];
  let interp = new IncrementalInterpreter(
    "core/incremental/testdata",
    fsLoader
  );
  for (let input of inputs) {
    try {
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
