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
  if (!r.ok) throw new Error(`oauth ${r.status}`);
  const j = await r.json(); return j.access_token as string;
}

export async function POST(req: NextRequest) {
  try {
    const tk = await token();
    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
    const body = {
      intent: "CAPTURE",
      purchase_units: [{ reference_id: "default", amount: { currency_code: "USD", value: "1.00" } }],
      application_context: {
        brand_name: "SaveInQR",
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
        return_url: `${origin}/api/paypal/capture`,
        cancel_url: `${origin}/pricing?cancel=1`,
      },
    };
    const r = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const j = await r.json();
    if (!r.ok) return NextResponse.json({ ok: false, error: "Create order failed", detail: JSON.stringify(j) }, { status: 500 });
    return NextResponse.json({ ok: true, id: j.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "paypal create failed" }, { status: 500 });
  }
}