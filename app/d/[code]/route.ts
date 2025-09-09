import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const UP_URL   = process.env.UPSTASH_REDIS_REST_URL!;
const UP_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

async function redisGet(key: string) {
  const url = `${UP_URL.replace(/\/+$/,"")}/get/${encodeURIComponent(key)}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${UP_TOKEN}` }, cache: "no-store" });
  if (!r.ok) return null;
  const j = await r.json().catch(() => null);
  return j?.result ?? null;
}

export async function GET(_req: NextRequest, ctx: { params: { code: string } }) {
  try {
    const code = ctx.params?.code?.toUpperCase();
    if (!code) return NextResponse.redirect(new URL("/_not-found", _req.url));

    const raw = await redisGet(`link:${code}`);
    if (!raw) {
      return NextResponse.redirect(new URL(`/pricing?expired=1&code=${encodeURIComponent(code)}`, _req.url));
    }

    const obj = JSON.parse(raw);
    if (!obj?.active || !obj?.url) {
      return NextResponse.redirect(new URL(`/pricing?expired=1&code=${encodeURIComponent(code)}`, _req.url));
    }

    return NextResponse.redirect(obj.url, { status: 302 });
  } catch {
    return NextResponse.redirect(new URL(`/pricing?error=link`, _req.url));
  }
}