// app/api/paypal/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPaypalToken } from "../../../../lib/paypal";

export const runtime = "nodejs";

const DAY = 86400;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = (searchParams.get("token") || searchParams.get("order_id") || "").trim();
    if (!orderId) {
      return NextResponse.json({ ok: false, error: "missing orderId (token)" }, { status: 400 });
    }

    // 1) Captura en PayPal
    const token = await getPaypalToken();
    const base = (process.env.PAYPAL_BASE || process.env.PAYPAL_API_BASE || "").replace(/\/$/, "");
    const capRes = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const capData = await capRes.json();
    if (!capRes.ok) {
      return NextResponse.json({ ok: false, error: "capture_failed", detail: capData }, { status: 500 });
    }

    // 2) Deducción de plan + email
    const capture = capData?.purchase_units?.[0]?.payments?.captures?.[0];
    const amount = capture?.amount?.value ?? null; // "1.00" | "5.00" | "9.00"
    const payerEmail = (capData?.payer?.email_address || "").trim().toLowerCase();

    let plan: "30d" | "10y" | "forever" | "unknown" = "unknown";
    let ttl: number | null = null;
    if (amount === "1.00") { plan = "30d"; ttl = 30 * DAY; }
    else if (amount === "5.00") { plan = "10y"; ttl = 3650 * DAY; }
    else if (amount === "9.00") { plan = "forever"; ttl = null; }

    // 3) Guarda en Upstash (por email y por orderId)
    const RURL = (process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/$/, "");
    const RTOK = process.env.UPSTASH_REDIS_REST_TOKEN || "";
    if (RURL && RTOK) {
      const value = encodeURIComponent(JSON.stringify({
        ok: true,
        plan,
        orderId,
        payerEmail,
        amount,
        capturedAt: new Date().toISOString(),
      }));

      const keys: string[] = [];
      if (payerEmail) keys.push(`entitlement:${payerEmail}`);
      keys.push(`entitlement:order:${orderId}`);

      async function upstash(path: string) {
        const url = `${RURL}${path}`;
        return fetch(url, {
          method: "GET",
          headers: { Authorization: `Bearer ${RTOK}` },
          cache: "no-store",
        }).catch(() => null);
      }

      for (const k of keys) {
        const ek = encodeURIComponent(k);
        if (ttl) await upstash(`/setex/${ek}/${ttl}/${value}`);
        else await upstash(`/set/${ek}/${value}`);
      }
    }

    // 4) Setear cookies y redirigir a /success
    const resp = NextResponse.redirect(new URL("/success", req.url));
    // Nota: maxAge en segundos
    const cookieTtl = ttl ?? 10 * 365 * DAY; // forever ≈ 10 años
    if (payerEmail) {
      resp.cookies.set("vx_user", payerEmail, {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
        maxAge: cookieTtl,
      });
    }
    resp.cookies.set("vx_plan", plan, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: cookieTtl,
    });
    resp.cookies.set("vx_order", orderId, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: cookieTtl,
    });

    return resp;
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}