// app/api/access/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// GET /api/access?email=usuario@dominio.com
// ó   /api/access?order=ORDER_ID
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email")?.trim().toLowerCase();
    const order = searchParams.get("order")?.trim();

    if (!email && !order) {
      return NextResponse.json({ ok: false, error: "email or order required" }, { status: 400 });
    }

    const RURL = (process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/$/, "");
    const RTOK = process.env.UPSTASH_REDIS_REST_TOKEN || "";
    if (!RURL || !RTOK) {
      return NextResponse.json({ ok: false, error: "redis not configured" }, { status: 500 });
    }

    const key = email ? `entitlement:${email}` : `entitlement:order:${order}`;

    const getRes = await fetch(`${RURL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${RTOK}` },
      cache: "no-store",
    });

    const getJson = await getRes.json().catch(() => null);
    const raw = getJson?.result as string | undefined;
    if (!raw) return NextResponse.json({ ok: false, found: false }, { status: 404 });

    let value: any;
    try { value = JSON.parse(raw); } catch { value = { raw }; }

    const ttlRes = await fetch(`${RURL}/ttl/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${RTOK}` },
      cache: "no-store",
    }).catch(() => null);

    let ttl: number | null = null;
    if (ttlRes && ttlRes.ok) {
      const ttlJson = await ttlRes.json().catch(() => null);
      ttl = typeof ttlJson?.result === "number" ? ttlJson.result : null; // -1 = sin expiración
    }

    return NextResponse.json({ ok: true, key, ttl, value });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}