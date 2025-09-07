// app/pricing/page.tsx
'use client';
import React from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

export const dynamic = 'force-dynamic';

const initialOptions = {
  'client-id': process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
  currency: 'USD',
  intent: 'capture',
};

type Duration =
  | { kind: 'hours'; value: number }
  | { kind: 'days'; value: number }
  | { kind: 'years'; value: number }
  | { kind: 'forever' };

type Plan = {
  id: 'free24' | 'month1' | 'tenYears' | 'forever';
  title: string;
  desc: string;
  price: number; // USD
  duration: Duration;
};

const PLANS: Plan[] = [
  {
    id: 'free24',
    title: 'Gratis 24h',
    desc: 'Una sola carga. El enlace/QR caduca en 24 horas.',
    price: 0,
    duration: { kind: 'hours', value: 24 },
  },
  {
    id: 'month1',
    title: '$1 por 30 días',
    desc: 'Acceso durante 30 días. Sin suscripción.',
    price: 1,
    duration: { kind: 'days', value: 30 },
  },
  {
    id: 'tenYears',
    title: '$5 por 10 años',
    desc: 'Acceso por 10 años (≈3650 días).',
    price: 5,
    duration: { kind: 'years', value: 10 },
  },
  {
    id: 'forever',
    title: '$9 para siempre',
    desc: 'Compra única. Enlace permanente.',
    price: 9,
    duration: { kind: 'forever' },
  },
];

export default function PricingPage() {
  const [selected, setSelected] = React.useState<Plan>(PLANS[0]);

  return (
    <div style={{ maxWidth: 980, margin: '40px auto', padding: 16, fontFamily: 'system-ui' }}>
      <h1 style={{ marginBottom: 16 }}>Precios</h1>
      <p style={{ marginBottom: 24 }}>
        Paga una vez. Recibe un código QR que te redirige a tu archivo. Sin suscripción.
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

      {/* Pago / uso de plan */}
      <div style={{ marginTop: 24 }}>
        <PayPalScriptProvider options={initialOptions}>
          <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
            {selected.price === 0 ? (
              <>
                <p style={{ marginBottom: 8 }}>
                  Este plan es <b>gratis</b>. Te crearemos un enlace/QR que caduca en 24 horas.
                </p>
                <a
                  href="/upload-qr"
                  style={{
                    display: 'inline-block',
                    background: '#111',
                    color: '#fff',
                    padding: '10px 16px',
                    borderRadius: 6,
                    textDecoration: 'none',
                  }}
                >
                  Usar plan gratis 24h
                </a>
              </>
            ) : (
              <>
                <p style={{ marginBottom: 16 }}>
                  Pagar <b>${selected.price.toFixed(2)}</b> (USD).
                </p>
                <PayPalButtons
                  style={{ layout: 'vertical' }}
                  createOrder={async () => {
                    const res = await fetch('/api/paypal/create-order', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        planId: selected.id,
                        amount: selected.price,
                        currency: 'USD',
                        // Envia duración al backend para registrar la expiración:
                        duration: selected.duration,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok || !data.id) throw new Error(data.error || 'No se pudo crear la orden');
                    return data.id;
                  }}
                  onApprove={async (data) => {
                    const res = await fetch('/api/paypal/capture-order', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ orderId: data.orderID }),
                    });
                    const out = await res.json();
                    if (!res.ok) {
                      alert('Error al capturar pago: ' + (out.error || ''));
                      return;
                    }
                    // Después de capturar, redirige a “gracias”.
                    window.location.href = '/thanks';
                  }}
                />
              </>
            )}
          </div>
        </PayPalScriptProvider>
      </div>
    </div>
  );
}