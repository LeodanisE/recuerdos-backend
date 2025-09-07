// app/pricing/page.tsx
'use client';

import React from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useRouter } from 'next/navigation';

type PlanId = 'free-24h' | 'p1-30d' | 'p5-10y' | 'p9-life';

const PLANS: Record<
  PlanId,
  { title: string; subtitle: string; amount?: string }
> = {
  'free-24h': { title: 'Gratis 24h', subtitle: 'Una sola carga. El enlace/QR caduca en 24 horas.' },
  'p1-30d': { title: '$1 por 30 días', subtitle: 'Acceso por 30 días. Sin suscripción.', amount: '1.00' },
  'p5-10y': { title: '$5 por 10 años', subtitle: 'Acceso por 10 años (~3650 días).', amount: '5.00' },
  'p9-life': { title: '$9 de por vida', subtitle: 'Compra única. Enlace permanente.', amount: '9.00' },
};

export default function PricingPage() {
  const [selected, setSelected] = React.useState<PlanId>('p1-30d');
  const router = useRouter();

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';

  function Card({ id }: { id: PlanId }) {
    const plan = PLANS[id];
    const active = selected === id;
    return (
      <div
        onClick={() => setSelected(id)}
        style={{
          border: active ? '2px solid black' : '1px solid #ddd',
          borderRadius: 8,
          padding: 16,
          cursor: 'pointer',
          minWidth: 340,
        }}
      >
        <div style={{ fontWeight: 700 }}>{plan.title}</div>
        <div style={{ color: '#555', marginTop: 4 }}>{plan.subtitle}</div>
      </div>
    );
  }

  async function createOrderOnServer(planId: PlanId): Promise<string> {
    const res = await fetch('/api/paypal/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    });
    const data = await res.json();
    if (!res.ok || !data?.id) {
      const detail = typeof data === 'object' ? JSON.stringify(data) : String(data);
      throw new Error(detail);
    }
    return data.id as string;
  }

  async function onApproveServer(orderID: string) {
    // Aquí podrías llamar a /api/paypal/verify (si lo tienes) y luego redirigir
    // Por ahora redirigimos a la página de agradecimiento con el order id.
    router.push(`/thanks?order=${encodeURIComponent(orderID)}&plan=${selected}`);
  }

  const isFree = selected === 'free-24h';

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>Planes</h1>
      <p>Paga una vez. Recibe un código QR que te redirige a tu archivo. Sin suscripción.</p>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr', maxWidth: 900 }}>
        <Card id="free-24h" />
        <Card id="p1-30d" />
        <Card id="p5-10y" />
        <Card id="p9-life" />
      </div>

      <div style={{ marginTop: 24, maxWidth: 700 }}>
        {isFree ? (
          <div>
            <p>
              El plan gratis no usa PayPal. Haz clic para comenzar y te llevamos directamente al
              flujo de subida con caducidad de 24h.
            </p>
            <button
              onClick={() => router.push('/upload-qr?plan=free-24h')}
              style={{
                padding: '12px 16px',
                borderRadius: 8,
                border: '1px solid #333',
                background: 'black',
                color: 'white',
                fontWeight: 600,
              }}
            >
              Empezar gratis
            </button>
          </div>
        ) : (
          <PayPalScriptProvider options={{ clientId, currency: 'USD', intent: 'capture' }}>
            <PayPalButtons
              style={{ layout: 'vertical' }}
              createOrder={async () => {
                try {
                  return await createOrderOnServer(selected);
                } catch (err: any) {
                  alert(`PayPal SDK error: ${err?.message || err}`);
                  throw err;
                }
              }}
              onApprove={async (data, actions) => {
                try {
                  // Captura por el SDK
                  const details = await actions.order?.capture();
                  const orderID = data.orderID || details?.id || '';
                  await onApproveServer(orderID);
                } catch (err: any) {
                  alert(`PayPal approve error: ${err?.message || err}`);
                  throw err;
                }
              }}
              onError={(err) => {
                alert(`PayPal onError: ${typeof err === 'string' ? err : (err as any)?.message}`);
              }}
            />
          </PayPalScriptProvider>
        )}
      </div>

      <p style={{ marginTop: 12, color: '#666' }}>
        Sandbox: usa un comprador sandbox de PayPal (correo/contraseña) desde tu panel de
        desarrollador.
      </p>
    </div>
  );
}