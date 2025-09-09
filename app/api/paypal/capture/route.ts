import { NextRequest, NextResponse } from "next/server";
const PAYPAL_BASE = process.env.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com";
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!;

async function token() {
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const r = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`oauth ${r.status}`); const j = await r.json();
  return j.access_token as string;
}

export async function POST(req: NextRequest) {
  try {
    const { orderID } = await req.json();
    if (!orderID) return NextResponse.json({ ok: false, error: "Missing orderID" }, { status: 400 });

    const tk = await token();
    const r = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderID}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" },
      cache: "no-store",
    });
    const j = await r.json();
    const completed =
      j?.status === "COMPLETED" ||
      j?.purchase_units?.[0]?.payments?.captures?.[0]?.status === "COMPLETED";
    if (!r.ok || !completed) {
      return NextResponse.json({ ok: false, error: "Capture failed", detail: JSON.stringify(j) }, { status: 500 });
    }

    // Acceso 30 días
    const maxAge = 30 * 24 * 60 * 60;
    const res = NextResponse.json({ ok: true, status: j.status });
    res.cookies.set("vx_order", `paid-${Date.now()}`, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
      path: "/", maxAge,
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "paypal capture failed" }, { status: 500 });
  }
}