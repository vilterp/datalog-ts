import AWS from "aws-sdk";
import * as fs from "fs";
import path from "path";

// gievn FS path, return S3 path
export async function uploadProfileToS3(profilePath: string): Promise<string> {
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
