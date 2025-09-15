// app/api/sign/route.ts  — REEMPLAZO COMPLETO
import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// B2
const KEY_ID   = process.env.B2_KEY_ID || "";
const KEY      = process.env.B2_APPLICATION_KEY || "";
const BUCKET   = process.env.B2_BUCKET_NAME || process.env.B2_BUCKET || "";
const ENDPOINT = process.env.B2_ENDPOINT_URL || "https://s3.us-east-005.backblazeb2.com";

// Upstash (para resolver/auto-reparar códigos viejos)
const UP_URL   = process.env.UPSTASH_REDIS_REST_URL!;
const UP_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

const s3 = new S3Client({
  region: "us-east-005",
  endpoint: ENDPOINT,
  forcePathStyle: true,
  credentials: { accessKeyId: KEY_ID, secretAccessKey: KEY },
});

function normalizeKey(raw: string, bucket: string) {
  if (!raw) return "";
  let key = raw.trim();
  try {
    if (/^https?:\/\//i.test(key)) {
      const u = new URL(key);
      key = u.pathname.replace(/^\/+/, "");
    }
  } catch {}
  if (key.startsWith("file/")) key = key.slice(5);
  if (bucket && key.startsWith(bucket + "/")) key = key.slice(bucket.length + 1);
  return key.replace(/^\/+/, "");
}

async function redisGet(k: string) {
  const r = await fetch(`${UP_URL}/get/${encodeURIComponent(k)}`, {
    headers: { Authorization: `Bearer ${UP_TOKEN}` },
    cache: "no-store",
  });
  if (!r.ok) return null;
  const j = await r.json().catch(() => null);
  return j?.result ?? null;
}
async function redisSet(k: string, v: string) {
  await fetch(`${UP_URL}/set/${encodeURIComponent(k)}/${encodeURIComponent(v)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${UP_TOKEN}` },
    cache: "no-store",
  });
}
function extractKeyFromTarget(t: string): string | null {
  try {
    const u = new URL(t, "http://x");
    const k = u.searchParams.get("key");
    return k ? decodeURIComponent(k) : null;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  try {
    const rawParam = (req.nextUrl.searchParams.get("key") || "").trim();
    const ttl = Number(req.nextUrl.searchParams.get("ttl") || 3600);
    const doRedirect = req.nextUrl.searchParams.get("redirect");

    if (!rawParam) return NextResponse.json({ ok: false, error: "Falta ?key" }, { status: 400 });

    // Resolver códigos viejos: admitir key="l/<code>" y encadenados y auto-reparar en Redis
    let candidate = rawParam;
    for (let i = 0; i < 6; i++) {
      const m = candidate.match(/^l\/([0-9a-f]{64})$/i);
      if (!m) break;
      const code = m[1].toLowerCase();

      const stored = await redisGet(`map:${code}`);
      if (!stored) break;

      const k = extractKeyFromTarget(stored);
      if (!k) break;

      candidate = k;

      // si ya no es "l/<code>", reescribir el mapeo a la forma correcta
      if (!/^l\/[0-9a-f]{64}$/i.test(candidate)) {
        const fixed = `/api/sign?key=${encodeURIComponent(candidate)}&redirect=1`;
        await redisSet(`map:${code}`, fixed);
      }
    }

    const Key = normalizeKey(candidate, BUCKET);
    if (!Key) return NextResponse.json({ ok: false, error: "Key inválida" }, { status: 400 });

    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key, ResponseContentDisposition: "inline" });
    const url = await getSignedUrl(s3, cmd, { expiresIn: ttl });

    if (doRedirect) return NextResponse.redirect(url, 302);
    return NextResponse.json({ ok: true, url, key: Key, expiresIn: ttl }, { headers: { "cache-control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "URL firmada inválida" }, { status: 500 });
  }
}