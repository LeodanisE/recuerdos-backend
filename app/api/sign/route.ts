// app/api/sign/route.ts
import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const KEY_ID   = process.env.B2_KEY_ID || "";
const KEY      = process.env.B2_APPLICATION_KEY || "";
const BUCKET   = process.env.B2_BUCKET_NAME || "";
const ENDPOINT = process.env.B2_ENDPOINT_URL || "https://s3.us-east-005.backblazeb2.com";

function normalizeKey(raw: string, bucket: string) {
  if (!raw) return "";
  let key = raw.trim();
  try {
    if (/^https?:\/\//i.test(key)) {
      const u = new URL(key);
      key = u.pathname.replace(/^\/+/, "");
    }
  } catch {}
  if (key.startsWith(bucket + "/")) key = key.slice(bucket.length + 1);
  return key.replace(/^\/+/, "");
}

const s3 = new S3Client({
  region: "us-east-005",
  endpoint: ENDPOINT,
  forcePathStyle: true,
  credentials: { accessKeyId: KEY_ID, secretAccessKey: KEY },
});

export async function GET(req: NextRequest) {
  try {
    if (!KEY_ID || !KEY || !BUCKET) {
      return NextResponse.json(
        { ok: false, error: "Faltan B2_KEY_ID / B2_APPLICATION_KEY / B2_BUCKET_NAME" },
        { status: 500 }
      );
    }
    const keyParam = req.nextUrl.searchParams.get("key") || "";
    const ttl = Number(req.nextUrl.searchParams.get("ttl") || 86400);
    const redirect = req.nextUrl.searchParams.get("redirect");

    const Key = normalizeKey(keyParam, BUCKET);
    if (!Key) return NextResponse.json({ ok: false, error: "Falta ?key" }, { status: 400 });

    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key, ResponseContentDisposition: "inline" });
    const url = await getSignedUrl(s3, cmd, { expiresIn: ttl });

    if (redirect) return NextResponse.redirect(url, 302);
    return NextResponse.json({ ok: true, url, expiresIn: ttl }, { headers: { "cache-control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "URL firmada inválida" },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }
}