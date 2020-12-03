import {
  BenchmarkResult,
  BenchmarkSpec,
  runDDBenchmark,
  runDDBenchmarkManual,
} from "../util/benchmark";
import { evalTest } from "./ddTests";
import { clearCaches, getJoinStats } from "./eval";
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
import { Performance } from "w3c-hr-time";

const performance = new Performance();

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
      return res;
    },
  },
  {
    name: "fp4",
    run(): BenchmarkResult {
      return runDDBenchmarkManual(
        "incremental/testdata/fp4.dd.txt",
        fpTest,
        1000
      );
    },
  },
];

function fpTest(repetitions: number, inputs: string[]): BenchmarkResult {
  const interp = newInterpreter(fsLoader); // hmmm
  processStmt(interp, {
    type: "LoadStmt",
    path: "fp/dl/main.dl",
  });

  const parsed = language.expr.tryParse(inputs[0]); // TODO: more inputs...
  const flattened = flatten(parsed);

  const before = performance.now();

  for (let i = 0; i < repetitions; i++) {
    if (i % 10 === 0) {
      console.log("  ", i);
    }
    for (let record of flattened) {
      processStmt(interp, { type: "Insert", record: record as Rec });
    }
    clearCaches(interp.graph);
  }

  const after = performance.now();

  console.log(getJoinStats());

  return {
    repetitions,
    totalTimeMS: after - before,
  };
}
