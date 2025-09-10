import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const {
  B2_KEY_ID,
  B2_APPLICATION_KEY,
  B2_BUCKET_NAME,
  B2_ENDPOINT_URL,
  B2_REGION = "us-east-005",
} = process.env;

function s3() {
  if (!B2_KEY_ID || !B2_APPLICATION_KEY || !B2_BUCKET_NAME || !B2_ENDPOINT_URL) {
    throw new Error("Faltan variables B2_* en el entorno");
  }
  return new S3Client({
    region: B2_REGION,
    endpoint: B2_ENDPOINT_URL,
    credentials: { accessKeyId: B2_KEY_ID, secretAccessKey: B2_APPLICATION_KEY },
  });
}

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ ok: false, error: "No hay archivo" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const safeName = (file.name || "archivo").replace(/[^\w.\-]+/g, "_");
    const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;

    const client = s3();
    await client.send(
      new PutObjectCommand({
        Bucket: B2_BUCKET_NAME!,
        Key: key,
        Body: buf,
        ContentType: file.type || "application/octet-stream",
      })
    );

    const u = new URL(req.url);
    const origin = `${u.protocol}//${u.host}`;
    const url = `${origin}/api/v/${encodeURIComponent(key)}`; // enlace permanente vía nuestro dominio

    return NextResponse.json({
      ok: true,
      key,
      url,
      msg: `Archivo ${safeName} subido 🚀`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Error subiendo archivo" },
      { status: 500 }
    );
  }
}