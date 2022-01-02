import Airtable from "airtable";
import { uploadProfileToS3 } from "./s3";
import { BenchmarkResult } from "./testBench/benchmark";

export async function postResultToAirtable(
  name: string,
  result: BenchmarkResult
) {
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
    process.env.AIRTABLE_BASE_ID
  );
  const record = await getRecord(name, result);
  return await base("Benchmark Runs").create([{ fields: record }]);
}

async function getRecord(name: string, result: BenchmarkResult) {
  const common = {
    "benchmark name": name,
    "commit sha": process.env.GIT_SHA || process.env.GITHUB_SHA,
    "git branch": process.env.GIT_BRANCH || process.env.GITHUB_REF,
    environment: process.env.BENCHMARK_ENV,
  };
  if (result.type === "Errored") {
    return Promise.resolve({
      ...common,
      error: result.error.toString(),
    });
  }
  const profileURL = await uploadProfileToS3(result.profilePath);
  return {
    ...common,
    repetitions: result.repetitions,
    "total time ms": result.totalTimeMS,
    profiling: !!result.profilePath,
    "profile URL": result.profilePath ? profileURL : null,
  };
}
