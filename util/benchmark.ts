import { ProcessFn } from "./ddTest";
import fs from "fs";
import { parseDDTest } from "./ddTest/parser";
import { Performance } from "w3c-hr-time";

const performance = new Performance();

export type BenchmarkSpec = {
  name: string;
  run: () => BenchmarkResult;
};

export type BenchmarkResult = {
  repetitions: number;
  totalTimeMS: number;
  profilePath?: string;
};

function doBenchmark<T>(repetitions: number, op: () => void): BenchmarkResult {
  const before = performance.now();
  for (let i = 0; i < repetitions; i++) {
    op();
    if (i % 10 === 0) {
      console.log(i);
    }
  }
  const after = performance.now();
  return {
    repetitions,
    totalTimeMS: after - before,
  };
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
