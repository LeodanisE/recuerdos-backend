import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.B2_REGION || "us-east-005";
const ENDPOINT = (process.env.B2_ENDPOINT_URL || "https://s3.us-east-005.backblazeb2.com").replace(/\/+$/, "");
const BUCKET = process.env.B2_BUCKET_NAME; // <- tu nombre
const ACCESS_KEY = process.env.B2_KEY_ID;
const SECRET_KEY = process.env.B2_APPLICATION_KEY;

function s3() {
  if (!BUCKET) throw new Error("Missing env B2_BUCKET_NAME");
  if (!ACCESS_KEY || !SECRET_KEY) throw new Error("Missing B2 credentials");

  return new S3Client({
    region: REGION,
    endpoint: ENDPOINT,
    credentials: { accessKeyId: ACCESS_KEY!, secretAccessKey: SECRET_KEY! },
    // Backblaze funciona con virtual-host; si tu bucket tiene puntos,
    // y ves problemas de SSL, pon forcePathStyle: true
    forcePathStyle: false,
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("filename") || "file.bin";
    const contentType = searchParams.get("contentType") || "application/octet-stream";
    const parts = Math.max(1, Number(searchParams.get("parts") || "1"));

    const key = `uploads/${Date.now()}-${filename.replace(/\s+/g, "_")}`;

    const client = s3();

    const created = await client.send(
      new CreateMultipartUploadCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType,
      })
    );

    const uploadId = created.UploadId!;
    const urls: Array<{ partNumber: number; url: string }> = [];

    for (let i = 1; i <= parts; i++) {
      const url = await getSignedUrl(
        client,
        new UploadPartCommand({
          Bucket: BUCKET,
          Key: key,
          PartNumber: i,
          UploadId: uploadId,
        }),
        { expiresIn: 900 } // 15 min
      );
      urls.push({ partNumber: i, url });
    }

    return NextResponse.json({
      ok: true,
      bucket: BUCKET,
      key,
      uploadId,
      urls,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "init failed" },
      { status: 500 }
    );
  }
}