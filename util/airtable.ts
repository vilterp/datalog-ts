import Airtable from "airtable";
import { BenchmarkResult } from "./benchmark";
import AWS from "aws-sdk";
import * as fs from "fs";
import path from "path";

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
        profiling: !!result.profilePath,
        "profile URL": result.profilePath
          ? await uploadProfileToS3(result.profilePath)
          : null,
      },
    },
  ]);
}

// gievn FS path, return S3 path
async function uploadProfileToS3(profilePath: string): Promise<string> {
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
  });
  const params = {
    Bucket: process.env.PROFILES_S3_BUCKET_NAME,
    Key: path.basename(profilePath), // File name you want to save as in S3
    Body: fs.createReadStream(profilePath),
  };

  // Uploading files to the bucket
  const uploaded = await s3.upload(params).promise();

  console.log("uploaded profile to", uploaded.Location);

  return uploaded.Location;
}
