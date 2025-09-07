// app/api/paypal/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, ppFetch, jsonError } from "../_lib";

export const runtime = "nodejs";

type Body = { planId?: string };

// Precios válidos (fuente de la verdad)
const KNOWN: Record<string, { amount: string; description: string }> = {
  // 30 días – $1
  "30d-1": { amount: "1.00", description: "Access for 30 days" },
  "p-30d": { amount: "1.00", description: "Access for 30 days" },
  "p1-30d": { amount: "1.00", description: "Access for 30 days" },

  // ~10 años – $5
  "10y-5": { amount: "5.00", description: "Access for ~10 years (~3650 days)" },
  "p-10y": { amount: "5.00", description: "Access for ~10 years (~3650 days)" },
  "p5-10y": { amount: "5.00", description: "Access for ~10 years (~3650 days)" },

  // De por vida – $9
  "forever-9": { amount: "9.00", description: "One-time purchase. Permanent link." },
  "p-forever": { amount: "9.00", description: "One-time purchase. Permanent link." },
  "p9-forever": { amount: "9.00", description: "One-time purchase. Permanent link." },
};

// Extra: intenta normalizar ids tipo "p{precio}-{term}" o "{precio}-{term}"
function planFromPattern(id: string) {
  const m = /^p?(\d+)-(30d|10y|forever)$/i.exec(id);
  if (!m) return undefined;
  const [, price, term] = m;
  if (term === "30d" && price === "1") return KNOWN["30d-1"];
  if (term === "10y" && price === "5") return KNOWN["10y-5"];
  if (term === "forever" && price === "9") return KNOWN["forever-9"];
  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const planId = body?.planId?.trim();

    if (!planId) return jsonError(400, "planId required");
    if (planId === "free-24h") {
      // Plan gratis: no se crea orden en PayPal
      return NextResponse.json({ ok: true, free: true });
    }

    const plan =
      KNOWN[planId] ??
      planFromPattern(planId);

    if (!plan) return jsonError(400, `Unknown planId: ${planId}`);

    // 1) OAuth
    const token = await getAccessToken();

    // 2) Crear orden en PayPal
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
    if (!orderId) return jsonError(500, "PayPal response without id", data);

    return NextResponse.json({ ok: true, id: orderId });
  } catch (err: any) {
    return jsonError(500, err?.message || "create failed", err);
  }
}