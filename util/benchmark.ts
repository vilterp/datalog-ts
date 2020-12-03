import { ProcessFn } from "./ddTest";
import fs from "fs";
import { parseDDTest } from "./ddTest/parser";
import { Performance } from "w3c-hr-time";
import Airtable from "airtable";

const performance = new Performance();

export type BenchmarkSpec = {
  name: string;
  run: () => BenchmarkResult;
};

export type BenchmarkResult = {
  repetitions: number;
  totalTimeMS: number;
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

export async function uploadResultToAirtable(
  name: string,
  result: BenchmarkResult
) {
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
    process.env.AIRTABLE_BASE_ID
  );
  return new Promise((resolve, reject) => {
    base("Benchmark Runs").create(
      [
        {
          fields: {
            "benchmark name": name,
            repetitions: result.repetitions,
            "total time ms": result.totalTimeMS,
            "commit sha": process.env.GIT_SHA || process.env.GITHUB_SHA,
            "git branch": process.env.GIT_BRANCH || process.env.GITHUB_REF,
          },
        },
      ],
      (err, records) => {
        if (err) {
          reject(err);
        }
        resolve(records);
        console.log("result uploaded to airtable");
      }
    );
  });
}
