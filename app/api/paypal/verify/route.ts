// app/api/paypal/verify/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.json({ ok: false, msg: "Missing orderId" }, { status: 400 });
  }

  try {
    const BASE = process.env.PAYPAL_BASE || "https://api-m.paypal.com"; // LIVE
    const client = process.env.PAYPAL_CLIENT_ID || "";
    const secret = process.env.PAYPAL_CLIENT_SECRET || "";

    // 1) Access token
    const auth = Buffer.from(`${client}:${secret}`).toString("base64");
    const tokenRes = await fetch(`${BASE}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
    });
    if (!tokenRes.ok) {
      const t = await tokenRes.text();
      return NextResponse.json({ ok: false, step: "token", detail: t }, { status: 500 });
    }
    const { access_token } = await tokenRes.json();

    // 2) Consultar la orden
    const orderRes = await fetch(`${BASE}/v2/checkout/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${access_token}` },
      cache: "no-store",
    });
    const order = await orderRes.json();

    const status = order?.status;
    const paid = status === "COMPLETED"; // si capturaste con el botón, queda COMPLETED
    return NextResponse.json({ ok: paid, status, orderId, id: order?.id || null });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "VerifyError" }, { status: 500 });
  }
}