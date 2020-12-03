import {
  BenchmarkResult,
  BenchmarkSpec,
  runDDBenchmark,
} from "../util/benchmark";
import { evalTest } from "./ddTests";
import { clearJoinStats, getJoinStats } from "./eval";
import { language } from "../fp/parser";
import { flatten } from "../fp/flatten";
import { ppt } from "../pretty";
import {
  Interpreter,
  newInterpreter,
  processStmt,
  queryStr,
} from "./interpreter";
import { fsLoader } from "../repl";
import { Rec } from "../types";
import { datalogOut, TestOutput } from "../util/ddTest/types";
import * as fs from "fs";

export const incrBenchmarks: BenchmarkSpec[] = [
  {
    name: "fp2",
    run(): BenchmarkResult {
      const res = runDDBenchmark(
        "incremental/testdata/fp2.dd.txt",
        evalTest,
        2000
      );
      console.log(getJoinStats());
      clearJoinStats();
      return res;
    },
  },
  {
    name: "fp4",
    run(): BenchmarkResult {
      return runDDBenchmark("incremental/testdata/fp4.dd.txt", fpTest, 1000);
    },
  },
];

function fpTest(inputs: string[]): TestOutput[] {
  return inputs.map((input) => {
    const parsed = language.expr.tryParse(input);
    const flattened = flatten(parsed);
    const rendered = flattened.map((t) => ppt(t) + ".");

    const interp = newInterpreter(fsLoader); // hmmm
    const interp2 = processStmt(interp, {
      type: "LoadStmt",
      path: "fp/dl/main.dl",
    }).newInterp;
    const interp3 = flattened.reduce<Interpreter>(
      (interp, t) =>
        processStmt(interp, { type: "Insert", record: t as Rec }).newInterp,
      interp2
    );
    const scopeResults = queryStr(
      interp3,
      "tc.ScopeItem{id: I, name: N, type: T}"
    );
    const typeResults = queryStr(interp3, "tc.Type{id: I, type: T}");
    return datalogOut(
      [
        ...rendered,
        ...scopeResults.map((r) => ppt(r.term) + ".").sort(),
        ...typeResults.map((r) => ppt(r.term) + ".").sort(),
      ].join("\n")
    );
  });
}
