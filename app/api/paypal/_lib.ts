// app/api/paypal/_lib.ts
import "server-only";

export const PAYPAL_BASE =
  process.env.PAYPAL_API_BASE?.trim() || "https://api-m.sandbox.paypal.com";

const CLIENT = process.env.PAYPAL_CLIENT_ID;
const SECRET = process.env.PAYPAL_CLIENT_SECRET;

function assertEnv(name: string, val?: string) {
  if (!val) throw new Error(`Missing env ${name}`);
}
assertEnv("PAYPAL_CLIENT_ID", CLIENT);
assertEnv("PAYPAL_CLIENT_SECRET", SECRET);

/**
 * Devuelve un access_token de PayPal (OAuth2 client_credentials).
 */
export async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(`${CLIENT}:${SECRET}`).toString("base64");

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`PayPal token error ${res.status}: ${txt}`);
  }

  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("No access_token in PayPal response");
  return json.access_token;
}

/**
 * (Opcional) Crear una orden directamente desde el servidor.
 * Útil si algún endpoint tuyo llama a PayPal para crear la orden.
 */
export async function createOrder(
  accessToken: string,
  amount: string,
  description: string
) {
  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        { amount: { currency_code: "USD", value: amount }, description },
      ],
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Create order failed ${res.status}: ${txt}`);
  }
  return res.json();
}