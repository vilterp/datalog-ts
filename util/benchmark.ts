import { ProcessFn } from "./ddTest";
import fs from "fs";
import { parseDDTest } from "./ddTest/parser";
import { Performance } from "w3c-hr-time";
import v8profiler from "v8-profiler-node8";
import tmp from "tmp";

const performance = new Performance();

export type BenchmarkSpec = {
  name: string;
  run: () => BenchmarkResult;
};

export type BenchmarkResult =
  | {
      type: "Finished";
      repetitions: number;
      totalTimeMS: number;
      profilePath?: string;
    }
  | { type: "Errored"; error: Error };

export function doBenchmark(
  repetitions: number,
  op: () => void
): BenchmarkResult {
  try {
    v8profiler.startProfiling();
    const before = performance.now();
    for (let i = 0; i < repetitions; i++) {
      op();
      if (i % 10 === 0) {
        console.log(i);
      }
    }
    const after = performance.now();
    const profile = v8profiler.stopProfiling();
    v8profiler.deleteAllProfiles();
    const profileName = `profile-${Math.random()}.cpuprofile`;
    const tmpFile = tmp.tmpNameSync({ name: profileName });
    console.log(tmpFile);

    const file = fs.createWriteStream(tmpFile);
    profile
      .export()
      .pipe(file)
      .on("finish", () => {
        console.log("wrote profile to", tmpFile);
      });
    return {
      type: "Finished",
      repetitions,
      totalTimeMS: after - before,
      profilePath: tmpFile,
    };
  } catch (error) {
    return { type: "Errored", error };
  }
}

export function runDDBenchmark(
  path: string,
  getResults: ProcessFn,
  repetitions: number
): BenchmarkResult {
  const contents = fs.readFileSync(path);
  const test = parseDDTest(contents.toString());
  return doBenchmark(repetitions, () => {
    getResults(test.map((t) => t.input));
  });
}

export function runDDBenchmarkManual(
  path: string,
  getTiming: (repetitions: number, inputs: string[]) => BenchmarkResult,
  repetitions: number
): BenchmarkResult {
  const contents = fs.readFileSync(path);
  const inputs = parseDDTest(contents.toString());
  return getTiming(
    repetitions,
    inputs.map((pair) => pair.input)
  );
}
