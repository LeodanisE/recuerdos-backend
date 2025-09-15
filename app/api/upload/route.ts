// app/api/upload/route.ts — REEMPLAZO COMPLETO (QR estable por archivo)
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY_ID   = process.env.B2_KEY_ID || "";
const KEY      = process.env.B2_APPLICATION_KEY || "";
const BUCKET   = process.env.B2_BUCKET_NAME || process.env.B2_BUCKET || "";
const ENDPOINT = process.env.B2_ENDPOINT_URL || "https://s3.us-east-005.backblazeb2.com";

const UP_URL   = process.env.UPSTASH_REDIS_REST_URL!;
const UP_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

const s3 = new S3Client({
  region: "us-east-005",
  endpoint: ENDPOINT,
  forcePathStyle: true,
  credentials: { accessKeyId: KEY_ID, secretAccessKey: KEY },
});

async function redisGet(key: string) {
  const r = await fetch(`${UP_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${UP_TOKEN}` },
    cache: "no-store",
  });
  if (!r.ok) return null;
  const j = await r.json().catch(() => null);
  return j?.result ?? null;
}
async function redisSet(key: string, value: string) {
  const r = await fetch(`${UP_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${UP_TOKEN}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(await r.text());
}

function cleanName(n: string) {
  return (n || "file").replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 120);
}
const sha256 = (input: string | Buffer) => crypto.createHash("sha256").update(input).digest("hex");

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const f = form.get("file") as File | null;
    if (!f) return NextResponse.json({ ok: false, error: "Falta file" }, { status: 400 });

    // Hash del contenido → KEY determinística
    const buf = Buffer.from(await f.arrayBuffer());
    const digest = sha256(buf);
    const filename = cleanName(f.name || "file");
    const key = `uploads/${digest}-${filename}`;

    // Código corto estable basado en la KEY (coincide con /api/email)
    const code = sha256(key);
    const mapKey = `map:${code}`;
    const target = `/api/sign?key=${encodeURIComponent(key)}&redirect=1`;

    // Si el mapeo ya existe, NO cambiamos el QR
    const existed = !!(await redisGet(mapKey));
    if (!existed) {
      // Subimos (idempotente: misma KEY) y guardamos mapeo
      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: buf,
          ContentType: f.type || "application/octet-stream",
        })
      );
      await redisSet(mapKey, target);
    } else {
      // Aun si existe, garantizamos que apunte al signer correcto
      await redisSet(mapKey, target);
    }

    const origin = `http${req.headers.get("x-forwarded-proto") === "https" ? "s" : ""}://${req.headers.get("host")}`;
    return NextResponse.json({
      ok: true,
      existed,
      key,
      code,
      url: `${origin}/l/${code}`,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "upload fail" }, { status: 500 });
  }
}