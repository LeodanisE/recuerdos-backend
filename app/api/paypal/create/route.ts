// app/api/paypal/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PP, ppFetch, basicAuthHeader, jsonError } from "../_lib";

export const runtime = "nodejs";

// Los planes que cobraremos con PayPal (no incluir el gratis)
const PLANS: Record<
  string,
  { value: string; currency: "USD"; description: string }
> = {
  "p1-30d": { value: "1.00", currency: "USD", description: "Access 30 days" },
  "p5-10y": { value: "5.00", currency: "USD", description: "Access ~10 years" },
  "p9-life": { value: "9.00", currency: "USD", description: "Lifetime access" },
};

export async function POST(req: NextRequest) {
  try {
    const { planId } = (await req.json().catch(() => ({}))) as {
      planId?: string;
    };

    if (!planId) {
      return jsonError({ msg: "planId required" }, 400);
    }
    if (planId === "free-24h") {
      // No se crea pedido PayPal para gratis
      return jsonError({ msg: "FREE_PLAN" }, 400);
    }

    const plan = PLANS[planId];
    if (!plan) {
      return jsonError({ msg: "Unknown planId", planId }, 400);
    }

    // Crea el pedido en PayPal
    const body = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: plan.currency,
            value: plan.value,
          },
          description: plan.description,
        },
      ],
      application_context: {
        brand_name: "Recuerdos",
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
      },
    };

    const { ok, status, data } = await ppFetch<{
      id?: string;
      name?: string;
      message?: string;
      details?: any[];
    }>("/v2/checkout/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: basicAuthHeader(),
      },
      body: JSON.stringify(body),
      // opcional: next: { revalidate: 0 }
    });

    if (!ok || !data?.id) {
      return jsonError({ msg: "CREATE_ORDER_FAILED", status, data }, 400);
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err: any) {
    return jsonError({ msg: err?.message || "UnexpectedError" }, 500);
  }
}