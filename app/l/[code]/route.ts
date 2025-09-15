// app/l/[code]/route.ts  ⬅️ REEMPLAZO COMPLETO
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UP_URL = process.env.UPSTASH_REDIS_REST_URL!;
const UP_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

async function redisGet(key: string) {
  const res = await fetch(`${UP_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${UP_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.result ?? null;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> }
) {
  const { code } = await ctx.params;

  const target = await redisGet(`map:${code}`);
  if (!target) {
    return NextResponse.json({ ok: false, error: "No se configuró ningún mapeo de enlaces." }, { status: 404 });
  }

  const origin = new URL(req.url).origin;
  const absolute = /^https?:\/\//i.test(target) ? target : new URL(target, origin).toString();
  return NextResponse.redirect(absolute, 302);
}