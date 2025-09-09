// app/api/multipart/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  CompleteMultipartUploadCommand,
  type CompletedPart,
} from "@aws-sdk/client-s3";

export const runtime = "nodejs";

const s3 = new S3Client({
  region: "us-east-005",
  endpoint: process.env.B2_ENDPOINT_URL, // https://s3.us-east-005.backblazeb2.com
  credentials: {
    accessKeyId: process.env.B2_KEY_ID as string,
    secretAccessKey: process.env.B2_APPLICATION_KEY as string,
  },
  forcePathStyle: false,
});

type Body = {
  uploadId?: string;
  key?: string;
  bucket?: string;
  parts?: CompletedPart[];
};

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);

    // Acepta datos por query o por body (para ser compatible con tu frontend)
    const qsUploadId = url.searchParams.get("uploadId") || undefined;
    const qsKey = url.searchParams.get("key") || undefined;
    const qsBucket = url.searchParams.get("bucket") || undefined;

    let body: Body = {};
    if (req.headers.get("content-type")?.includes("application/json")) {
      body = await req.json();
    }

    const uploadId = body.uploadId ?? qsUploadId;
    const key = body.key ?? qsKey;
    const bucket = body.bucket ?? qsBucket ?? process.env.B2_BUCKET_NAME;
    const parts = (body.parts ?? []).slice().sort((a, b) => (a.PartNumber! - b.PartNumber!));

    if (!uploadId || !key || !bucket || parts.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Missing uploadId/key/bucket/parts" },
        { status: 400 }
      );
    }

    const out = await s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
      })
    );

    return NextResponse.json({
      ok: true,
      key,
      bucket,
      etag: out.ETag,
      location: out.Location,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "complete failed" },
      { status: 500 }
    );
  }
}

// GET simple para verificar que la ruta existe (útil en dev)
export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/multipart/complete" });
}