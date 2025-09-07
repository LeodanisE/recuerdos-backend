// app/api/paypal/create/route.ts
import { NextResponse } from 'next/server';
import { getAccessToken, PAYPAL_BASE } from '../_lib';

export const runtime = 'nodejs';

// Map de planes de pago (el servidor define precios reales)
const PLANS = {
  month1:   { amount: '1.00', currency: 'USD', reference: 'month1_30d' },
  tenYears: { amount: '5.00', currency: 'USD', reference: 'tenYears_10y' },
  forever:  { amount: '9.00', currency: 'USD', reference: 'forever_lifetime' },
} as const;

export async function POST(req: Request) {
  try {
    const { planId } = await req.json().catch(() => ({}));
    if (!planId || !(planId in PLANS)) {
      return NextResponse.json({ ok: false, error: 'Invalid planId' }, { status: 400 });
    }
    const cfg = PLANS[planId as keyof typeof PLANS];
    const token = await getAccessToken();

    const r = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: cfg.reference,
            amount: { value: cfg.amount, currency_code: cfg.currency },
          },
        ],
        application_context: {
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
        },
      }),
      cache: 'no-store',
    });

    const data = await r.json();
    if (!r.ok) return NextResponse.json({ ok: false, error: data }, { status: 400 });

    return NextResponse.json({ ok: true, orderID: data.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'CreateError' }, { status: 500 });
  }
}