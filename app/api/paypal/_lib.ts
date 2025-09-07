// app/api/paypal/_lib.ts
export const runtime = 'nodejs';

export const PAYPAL_BASE =
  process.env.PAYPAL_BASE?.trim() || 'https://api-m.paypal.com'; // LIVE por defecto

export async function getAccessToken() {
  const cid = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!cid || !secret) throw new Error('Missing PayPal credentials');

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${cid}:${secret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`Token error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.access_token as string;
}