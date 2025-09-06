// lib/b2.ts
import { S3Client } from "@aws-sdk/client-s3";

function clean(v?: string) {
  return (v ?? "").trim();
}

export const s3 = new S3Client({
  region: "us-east-005",
  endpoint: clean(process.env.B2_ENDPOINT_URL),
  forcePathStyle: true, // Backblaze lo prefiere
  credentials: {
    accessKeyId: clean(process.env.B2_KEY_ID),
    secretAccessKey: clean(process.env.B2_APPLICATION_KEY),
  },
});