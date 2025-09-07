// app/api/paypal/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PP, getAccessToken, ppFetch, jsonError } from "../_lib";

export const runtime = "nodejs";

type Body = { planId?: string };

const PLAN_MAP: Record<string, { amount: string; description: string }> = {
  "30d-1": { amount: "1.00", description: "Access for 30 days" },
  "10y-5": { amount: "5.00", description: "Access for ~10 years (~3650 days)" },
  "forever-9": { amount: "9.00", description: "One-time purchase. Permanent link." },
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const planId = body?.planId?.trim();

    if (!planId) {
      return jsonError(400, "planId required");
    }

    // Plan gratis: no creamos orden en PayPal
    if (planId === "free-24h") {
      return NextResponse.json({ ok: true, free: true });
    }

    const plan = PLAN_MAP[planId];
    if (!plan) {
      return jsonError(400, `Unknown planId: ${planId}`);
    }

    // Token de PayPal
    const token = await getAccessToken();

    // Crear orden
    const res = await ppFetch("/v2/checkout/orders", {
      method: "POST",
      bearer: token,
      json: {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: { currency_code: "USD", value: plan.amount },
            description: plan.description,
          },
        ],
      },
    });

    if (!res.ok) {
      const txt = await res.text();
      return jsonError(res.status, "Create order failed", txt);
    }

    const data = await res.json();
    const orderId = data?.id as string | undefined;

    if (!orderId) {
      return jsonError(500, "PayPal response without id", data);
    }

    return NextResponse.json({ ok: true, id: orderId });
  } catch (err: any) {
    return jsonError(500, err?.message || "create failed", err);
  }
}