// app/api/paypal/verify/route.ts
import { NextResponse } from 'next/server';
import { getAccessToken, PAYPAL_BASE } from '../_lib';

export const runtime = 'nodejs';

// Precios esperados (deben coincidir con create)
const EXPECTED = new Map<string, { amount: string; currency: string }>([
  ['month1_30d',      { amount: '1.00', currency: 'USD' }],
  ['tenYears_10y',    { amount: '5.00', currency: 'USD' }],
  ['forever_lifetime',{ amount: '9.00', currency: 'USD' }],
]);

export async function POST(req: Request) {
  try {
    const { orderID } = await req.json();
    if (!orderID) return NextResponse.json({ ok: false, error: 'orderID required' }, { status: 400 });

    const token = await getAccessToken();

    // Capturar en servidor (idempotente si ya estaba capturado)
    const cap = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const capData = await cap.json();
    if (!cap.ok) return NextResponse.json({ ok: false, error: capData }, { status: 400 });

    // Leer orden para validar
    const ordRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderID}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const order = await ordRes.json();
    if (!ordRes.ok) return NextResponse.json({ ok: false, error: order }, { status: 400 });

    const status = order?.status;
    const pu = order?.purchase_units?.[0];
    const ref: string | undefined = pu?.reference_id;
    const amt = pu?.amount?.value;
    const curr = pu?.amount?.currency_code;

    if (status !== 'COMPLETED') {
      return NextResponse.json({ ok: false, error: `status=${status}` }, { status: 400 });
    }

    const expected = ref ? EXPECTED.get(ref) : undefined;
    if (!expected || expected.amount !== amt || expected.currency !== curr) {
      return NextResponse.json(
        { ok: false, error: 'amount/currency mismatch', ref, amt, curr },
        { status: 400 }
      );
    }

    // (Aquí podrías guardar en BD: orderID, ref, buyer, expiración según ref, etc.)
    const buyer = order?.payer?.email_address ?? null;
    return NextResponse.json({ ok: true, orderID, ref, buyer });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'VerifyError' }, { status: 500 });
  }
}