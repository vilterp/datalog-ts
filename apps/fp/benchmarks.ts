import { BenchmarkResult, BenchmarkSpec } from "../../util/benchmark";
import { language } from "./parser";
import { flatten } from "./flatten";
// import v8profiler from "v8-profiler-node8";
import { Interpreter } from "../../core/interpreter";
import { Performance } from "w3c-hr-time";
// import * as fs from "fs";
import { fsLoader } from "../../core/fsLoader";
import { ppt } from "../../core/pretty";
import { assertStringEqual } from "../../util/testing";

const performance = new Performance();

export const fpBenchmarks: BenchmarkSpec[] = [
  {
    name: "typeQuery1",
    run(): BenchmarkResult {
      return fpTest(
        1000,
        `let x = 2 in let y = 3 in let z = "hello world " in concat(z, intToString(plus(x, 3)))`
      );
    },
  },
];

function fpTest(repetitions: number, input): BenchmarkResult {
  let originalInterp = new Interpreter("apps/fp/dl", fsLoader); // hmmm
  const [_, newInterp] = originalInterp.evalStmt({
    type: "LoadStmt",
    path: "main.dl",
  });
  originalInterp = newInterp;

  // TODO: get these from a DD file
  const parsed = language.expr.tryParse(input);
  const flattened = flatten(parsed);

  const before = performance.now();

  // v8profiler.startProfiling();
  for (let i = 0; i < repetitions; i++) {
    let interp = originalInterp;
    if (i % 10 === 0) {
      console.log("  ", i);
    }
    for (let record of flattened) {
      const [_, newInterp] = interp.evalStmt({ type: "Insert", record });
      interp = newInterp;
    }
    const res = interp.queryStr("tc.Type{id: 0, type: T}");
    assertStringEqual(
      'tc.Type{id: 0, type: "string"}',
      res.results.map((res) => ppt(res.term)).join(".\n")
    );
  }

  const after = performance.now();
  // const profile = v8profiler.stopProfiling();
  // v8profiler.deleteAllProfiles();
  // const profilePath = `profile-${Math.random()}.cpuprofile`;
  // const file = fs.createWriteStream(profilePath);
  // profile
  //   .export()
  //   .pipe(file)
  //   .on("finish", () => {
  //     console.log("wrote profile to", profilePath);
  //   });

  return {
    repetitions,
    totalTimeMS: after - before,
    profilePath: null,
  };
}
