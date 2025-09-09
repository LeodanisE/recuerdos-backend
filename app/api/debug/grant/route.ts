// app/api/debug/grant/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Uso:
// /api/debug/grant?email=leopruebaslocas%40gmail.com&order=88H98898AG2442728&plan=30d&ttl=600
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = (searchParams.get("email") || "").trim().toLowerCase();
  const order = (searchParams.get("order") || "").trim();
  const plan = (searchParams.get("plan") || "30d").trim().toLowerCase();
  const ttl = Number(searchParams.get("ttl") || 600); // 10 min default

  if (!email && !order) {
    return NextResponse.json({ ok: false, error: "email or order required" }, { status: 400 });
  }

  const RURL = (process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/$/, "");
  const RTOK = process.env.UPSTASH_REDIS_REST_TOKEN || "";
  if (!RURL || !RTOK) {
    return NextResponse.json({ ok: false, error: "redis not configured" }, { status: 500 });
  }

  const payload = encodeURIComponent(
    JSON.stringify({
      ok: true,
      plan,
      orderId: order || null,
      payerEmail: email || null,
      grantedBy: "/api/debug/grant",
      at: new Date().toISOString(),
    })
  );

  async function upstash(path: string) {
    const r = await fetch(`${RURL}${path}`, {
      headers: { Authorization: `Bearer ${RTOK}` },
      cache: "no-store",
    }).catch(() => null);
    return r?.ok;
  }

  let wrote_email: boolean | null = null;
  let wrote_order: boolean | null = null;

  if (email) {
    const ek = encodeURIComponent(`entitlement:${email}`);
    wrote_email = await upstash(`/setex/${ek}/${ttl}/${payload}`);
  }
  if (order) {
    const ok = await upstash(`/setex/${encodeURIComponent(`entitlement:order:${order}`)}/${ttl}/${payload}`);
    wrote_order = !!ok;
  }

  return NextResponse.json({ ok: true, ttl, wrote_email, wrote_order });
}