import { ProcessFn } from "../ddTest";
import fs from "fs";
import { parseDDTest } from "../ddTest/parser";
import { Performance } from "w3c-hr-time";
import v8profiler from "v8-profiler-node8";
import tmp from "tmp";
import { postResultToAirtable } from "../airtable";

const performance = new Performance();

export type BenchmarkSpec = {
  name: string;
  run: () => Promise<BenchmarkResult>;
};

export type BenchmarkResult =
  | {
      type: "Finished";
      repetitions: number;
      totalTimeMS: number;
      profilePath?: string;
    }
  | { type: "Errored"; error: Error };

export async function doBenchmark(
  repetitions: number,
  op: () => void
): Promise<BenchmarkResult> {
  let i = 0;
  return doBenchmarkInner(op, () => {
    const stillGoing = i < repetitions;
    i++;
    return stillGoing;
  });
}

export async function doBenchmarkTimeBudget(
  op: () => void,
  timeBudgetMS: number = 2000
) {
  const start = new Date().getTime();
  return doBenchmarkInner(op, () => {
    const now = new Date().getTime();
    const durationSoFar = now - start;
    const keepGoing = durationSoFar < timeBudgetMS;
    if (!keepGoing) {
      console.log("stopping after", durationSoFar, "ms");
    }
    return keepGoing;
  });
}

async function doBenchmarkInner(
  op: () => void,
  doAnother: () => boolean
): Promise<BenchmarkResult> {
  try {
    v8profiler.startProfiling();
    const before = performance.now();
    let i = 0;
    do {
      op();
      if (i % 10 === 0) {
        console.log(i);
      }
      i++;
    } while (doAnother());
    const after = performance.now();
    const profile = v8profiler.stopProfiling();

    const profilePath = await exportProfile(profile);

    return {
      type: "Finished",
      repetitions: i,
      totalTimeMS: after - before,
      profilePath: profilePath,
    };
  } catch (error) {
    return { type: "Errored", error };
  }
}

// returns promise with temp file path
async function exportProfile(profile): Promise<string> {
  const profileName = `profile-${Math.random()}.cpuprofile`;
  const fileName = tmp.tmpNameSync({ name: profileName });

  const file = fs.createWriteStream(fileName);

  return new Promise((resolve) => {
    profile
      .export()
      .pipe(file)
      .on("finish", () => {
        resolve(fileName);
      });
  });
}

export async function runDDBenchmark(
  path: string,
  getResults: ProcessFn
): Promise<BenchmarkResult> {
  const contents = fs.readFileSync(path);
  const test = parseDDTest(contents.toString());
  return doBenchmarkTimeBudget(() => {
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

export async function runAll(benchmarks: { [name: string]: BenchmarkSpec[] }) {
  for (let suiteName of Object.keys(benchmarks)) {
    console.group(suiteName);
    const suite = benchmarks[suiteName];
    for (let entry of suite) {
      console.group(entry.name);
      const res = await entry.run();
      console.log(res);
      const recordName = `${suiteName}/${entry.name}`;
      const airtableRecords = await postResultToAirtable(recordName, res);
      console.log(
        "posted to airtable:",
        airtableRecords.map((r) => r.id)
      );
      console.groupEnd();
    }
    console.groupEnd();
  }
}
