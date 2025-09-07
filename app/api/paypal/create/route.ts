// app/api/paypal/create/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const BASE = process.env.PAYPAL_BASE?.trim() || "https://api-m.paypal.com"; // LIVE
const AMOUNT = "5.00";   // precio del plan "forever"
const CURRENCY = "USD";

async function getAccessToken() {
  const cid = process.env.PAYPAL_CLIENT_ID!;
  const secret = process.env.PAYPAL_CLIENT_SECRET!;
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${cid}:${secret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("token error");
  const j = await res.json();
  return j.access_token as string;
}

export async function POST(req: Request) {
  try {
    const token = await getAccessToken();

    const r = await fetch(`${BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: "forever_link",
            amount: { value: AMOUNT, currency_code: CURRENCY },
          },
        ],
        application_context: {
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
        },
      }),
      cache: "no-store",
    });

    const data = await r.json();
    if (!r.ok) return NextResponse.json({ ok: false, error: data }, { status: 400 });
    return NextResponse.json({ ok: true, orderID: data.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "CreateError" }, { status: 500 });
  }
}