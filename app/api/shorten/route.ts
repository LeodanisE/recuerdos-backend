import { NextRequest, NextResponse } from "next/server";

const RURL = process.env.UPSTASH_REDIS_REST_URL!;
const RTOK = process.env.UPSTASH_REDIS_REST_TOKEN!;

async function upstash(path: string) {
  const r = await fetch(`${RURL}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${RTOK}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Upstash ${path} -> ${r.status}`);
  return r.json().catch(() => ({}));
}

export async function POST(req: NextRequest) {
  try {
    const { code, key, ttl } = await req.json();
    if (!code || !key) {
      return NextResponse.json({ ok: false, error: "code & key required" }, { status: 400 });
    }
    const seconds = Number(ttl ?? 60 * 60 * 24 * 365); // 1 año por defecto

    // short:{code} -> {key}
    await upstash(
      `setex/${encodeURIComponent(`short:${code}`)}/${seconds}/${encodeURIComponent(String(key))}`
    );
    // file:{key} -> {code} (opcional, útil para auditoría)
    await upstash(
      `setex/${encodeURIComponent(`file:${String(key)}`)}/${seconds}/${encodeURIComponent(code)}`
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "shorten failed" }, { status: 500 });
  }
}