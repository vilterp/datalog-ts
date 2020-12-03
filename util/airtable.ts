import Airtable from "airtable";
import { BenchmarkResult } from "./benchmark";

export async function uploadResultToAirtable(
  name: string,
  result: BenchmarkResult
) {
  // TODO: upload profile
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
    process.env.AIRTABLE_BASE_ID
  );
  await base("Benchmark Runs").create([
    {
      fields: {
        "benchmark name": name,
        repetitions: result.repetitions,
        "total time ms": result.totalTimeMS,
        "commit sha": process.env.GIT_SHA || process.env.GITHUB_SHA,
        "git branch": process.env.GIT_BRANCH || process.env.GITHUB_REF,
        environment: process.env.BENCHMARK_ENV,
        profiling: result.profiling || false,
      },
    },
  ]);
}
