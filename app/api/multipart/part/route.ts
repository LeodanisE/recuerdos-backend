// app/api/multipart/part/route.ts
import { NextRequest, NextResponse } from "next/server";
import { S3Client, UploadPartCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // evita estático y asegura Node

function s3() {
  const accessKeyId = process.env.B2_KEY_ID!;
  const secretAccessKey = process.env.B2_APPLICATION_KEY!; // OJO: APPLICATION
  const endpoint = process.env.B2_ENDPOINT_URL!;
  return new S3Client({
    region: "us-east-005",
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });
}

// POST /api/multipart/part?key=...&uploadId=...&partNumber=1  (body = Blob de la parte)
export async function POST(req: NextRequest) {
  try {
    const u = new URL(req.url);
    const key = u.searchParams.get("key") || "";
    const uploadId = u.searchParams.get("uploadId") || "";
    const partNumber = Number(u.searchParams.get("partNumber") || "0");
    const Bucket = process.env.B2_BUCKET_NAME!;

    if (!Bucket || !key || !uploadId || !partNumber) {
      return NextResponse.json(
        { ok: false, error: "key, uploadId, partNumber y B2_BUCKET_NAME requeridos" },
        { status: 400 }
      );
    }

    const ab = await req.arrayBuffer();
    if (!ab || ab.byteLength === 0) {
      return NextResponse.json({ ok: false, error: "cuerpo vacío" }, { status: 400 });
    }
    const buf = Buffer.from(ab);

    const out = await s3().send(
      new UploadPartCommand({
        Bucket,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: buf,
        ContentLength: buf.length,
      })
    );

    const etag = out.ETag?.replace(/"/g, "");
    if (!etag) {
      return NextResponse.json({ ok: false, error: "sin ETag en respuesta de B2" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, etag, partNumber });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "upload_part_failed", message: String(err?.message || err) },
      { status: 500 }
    );
  }
}