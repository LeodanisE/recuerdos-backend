// app/api/paypal/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, ppFetch, jsonError } from "../_lib";

export const runtime = "nodejs";

type Body = { orderId?: string };

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const orderId = body?.orderId?.trim();

    if (!orderId) {
      return jsonError(400, "orderId required");
    }

    const token = await getAccessToken();

    // Capturar la orden
    const res = await ppFetch(`/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      bearer: token,
      json: {}, // requerido por PayPal en algunos entornos
    });

    if (!res.ok) {
      const txt = await res.text();
      return jsonError(res.status, "Capture failed", txt);
    }

    const data = await res.json();
    // Puedes verificar estados aquí (COMPLETED, etc.)
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return jsonError(500, err?.message || "verify failed", err);
  }
}