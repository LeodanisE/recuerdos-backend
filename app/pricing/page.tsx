// app/pricing/page.tsx
'use client';
import * as React from 'react';

export const dynamic = 'force-dynamic';

type PlanId = 'free24' | 'month1' | 'tenYears' | 'forever';

type Plan = {
  id: PlanId;
  title: string;
  desc: string;
  price: number; // USD
};

const PLANS: Plan[] = [
  { id: 'free24',  title: 'Free 24h',         desc: 'One upload. Link/QR expires in 24 hours.', price: 0 },
  { id: 'month1',  title: '$1 for 30 days',   desc: 'Access for 30 days. No subscription.',     price: 1 },
  { id: 'tenYears',title: '$5 for 10 years',  desc: 'Access for 10 years (~3650 days).',        price: 5 },
  { id: 'forever', title: '$9 lifetime',      desc: 'One-time purchase. Permanent link.',       price: 9 },
];

const CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';

export default function PricingPage() {
  const [selected, setSelected] = React.useState<Plan>(PLANS[0]);
  const btnRef = React.useRef<HTMLDivElement>(null);
  const [sdkReady, setSdkReady] = React.useState(false);

  // Cargar SDK de PayPal una sola vez (sin paquetes externos)
  React.useEffect(() => {
    if (!CLIENT_ID) return;
    if (document.getElementById('paypal-sdk')) { setSdkReady(true); return; }
    const s = document.createElement('script');
    s.id = 'paypal-sdk';
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(CLIENT_ID)}&intent=capture&currency=USD&components=buttons`;
    s.onload = () => setSdkReady(true);
    document.body.appendChild(s);
  }, []);

  // Pintar botón solo para planes de pago
  React.useEffect(() => {
    if (selected.price === 0) return; // gratis → no PayPal
    // @ts-ignore
    const paypal = (window as any).paypal;
    if (!sdkReady || !paypal || !btnRef.current) return;

    btnRef.current.innerHTML = ''; // limpiar al cambiar plan
    paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },

      // Crear orden en el servidor (el servidor decide el precio real)
      createOrder: async () => {
        const r = await fetch('/api/paypal/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: selected.id }),
        });
        const j = await r.json();
        if (!j.ok) throw new Error(j.error || 'create failed');
        return j.orderID;
      },

      // Capturar/verificar en servidor y redirigir
      onApprove: async (data: any) => {
        const r = await fetch('/api/paypal/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderID: data.orderID }),
        });
        const j = await r.json();
        if (!j.ok) return alert('Payment failed: ' + (j.error || 'Unknown'));
        window.location.href = '/thanks?order=' + encodeURIComponent(j.orderID);
      },

      onError: (err: any) => {
        console.error(err);
        alert('PayPal error');
      },
    }).render(btnRef.current);
  }, [sdkReady, selected]);

  return (
    <div style={{ maxWidth: 980, margin: '40px auto', padding: 16, fontFamily: 'system-ui' }}>
      <h1 style={{ marginBottom: 16 }}>Plans</h1>
      <p style={{ marginBottom: 24 }}>
        Pay once. Get a QR that redirects to your file. No subscription.
      </p>

      {/* Selector de planes */}
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
        {PLANS.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p)}
            style={{
              textAlign: 'left',
              padding: 16,
              border: p.id === selected.id ? '2px solid #111' : '1px solid #ddd',
              borderRadius: 8,
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontWeight: 700 }}>{p.title}</div>
            <div style={{ color: '#555', marginTop: 6 }}>{p.desc}</div>
          </button>
        ))}
      </div>

      {/* Acción según plan */}
      <div style={{ marginTop: 24, border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
        {selected.price === 0 ? (
          <>
            <p style={{ marginBottom: 8 }}>
              This plan is <b>free</b>. We’ll create a link/QR that expires in 24 hours.
            </p>
            <a
              href="/upload-qr?trial=24h"
              style={{
                display: 'inline-block',
                background: '#111',
                color: '#fff',
                padding: '10px 16px',
                borderRadius: 6,
                textDecoration: 'none',
              }}
            >
              Use free 24h plan
            </a>
          </>
        ) : (
          <>
            {!CLIENT_ID && (
              <p style={{ color: 'tomato', marginBottom: 8 }}>
                Missing <code>NEXT_PUBLIC_PAYPAL_CLIENT_ID</code>.
              </p>
            )}
            <div ref={btnRef} />
          </>
        )}
      </div>
    </div>
  );
}