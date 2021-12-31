import { ProcessFn } from "./ddTest";
import fs from "fs";
import { parseDDTest } from "./ddTest/parser";
import { Performance } from "w3c-hr-time";
import v8profiler from "v8-profiler-node8";

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
    const profilePath = `profile-${Math.random()}.cpuprofile`;
    const file = fs.createWriteStream(profilePath);
    profile
      .export()
      .pipe(file)
      .on("finish", () => {
        console.log("wrote profile to", profilePath);
      });
    return {
      type: "Finished",
      repetitions,
      totalTimeMS: after - before,
      profilePath,
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
