import { BenchmarkResult, BenchmarkSpec } from "../../util/benchmark";
import { language } from "./parser";
import { flatten } from "./flatten";
import v8profiler from "v8-profiler-node8";
import { AbstractInterpreter } from "../../core/abstractInterpreter";
import { Performance } from "w3c-hr-time";
import * as fs from "fs";
import { fsLoader } from "../../core/fsLoader";
import { ppt } from "../../core/pretty";
import { assertStringEqual } from "../../util/testing";
import { SimpleInterpreter } from "../../core/simple/interpreter";
import { IncrementalInterpreter } from "../../core/incremental/interpreter";

const performance = new Performance();

export const fpBenchmarks: BenchmarkSpec[] = [
  {
    name: "typeQuery1-simple",
    run(): BenchmarkResult {
      const originalInterp: AbstractInterpreter = new SimpleInterpreter(
        "apps/fp/dl",
        fsLoader
      );
      return fpTest(
        originalInterp,
        1000,
        `let x = 2 in let y = 3 in let z = "hello world " in concat(z, intToString(plus(x, 3)))`
      );
    },
  },
  {
    name: "typeQuery1-incr",
    run(): BenchmarkResult {
      const originalInterp: AbstractInterpreter = new IncrementalInterpreter(
        "apps/fp/dl",
        fsLoader
      );
      return fpTest(
        originalInterp,
        1000,
        `let x = 2 in let y = 3 in let z = "hello world " in concat(z, intToString(plus(x, 3)))`
      );
    },
  },
];

function fpTest(
  emptyInterp: AbstractInterpreter,
  repetitions: number,
  input
): BenchmarkResult {
  let loadedInterp = emptyInterp.evalStmt({
    type: "LoadStmt",
    path: "main.dl",
  })[1];

  // TODO: get these from a DD file
  const parsed = language.expr.tryParse(input);
  const flattened = flatten(parsed);

  const before = performance.now();

  v8profiler.startProfiling();
  for (let i = 0; i < repetitions; i++) {
    let interp = loadedInterp;
    if (i % 10 === 0) {
      console.log("  ", i);
    }
    for (let record of flattened) {
      interp = interp.insert(record);
    }
    interp.queryStr("tc.Type{}");
    interp.queryStr("hl.Segment{}");
    // assertStringEqual(
    //   'tc.Type{id: 0, type: "string"}',
    //   res.map((res) => ppt(res.term)).join(".\n")
    // );
  }

  const after = performance.now();
  const profile = v8profiler.stopProfiling();
  v8profiler.deleteAllProfiles();
  const profilePath = `profile-${Math.random()}.cpuprofile`;
  const file = fs.createWriteStream(profilePath);
  profile
    .export()
    .pipe(file)
    .on("finish", () => {
      console.log("wrote profile to", profilePath);
    });

  return {
    repetitions,
    totalTimeMS: after - before,
    profilePath,
  };
}
