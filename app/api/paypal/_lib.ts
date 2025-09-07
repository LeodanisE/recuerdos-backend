// app/api/paypal/_lib.ts
import "server-only";
import { NextResponse } from "next/server";

/**
 * Base de la API de PayPal
 * - Primero usa PAYPAL_API_BASE (recomendado)
 * - Luego intenta PAYPAL_BASE (compat)
 * - Por defecto sandbox
 */
export const PAYPAL_BASE =
  (process.env.PAYPAL_API_BASE ||
    process.env.PAYPAL_BASE ||
    "https://api-m.sandbox.paypal.com").trim();

const CLIENT =
  (process.env.PAYPAL_CLIENT_ID ||
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
    "").trim();
const SECRET = (process.env.PAYPAL_CLIENT_SECRET || "").trim();

if (!CLIENT) throw new Error("Missing env PAYPAL_CLIENT_ID / NEXT_PUBLIC_PAYPAL_CLIENT_ID");
if (!SECRET) throw new Error("Missing env PAYPAL_CLIENT_SECRET");

/**
 * Objeto de configuración simple que tu ruta puede importar.
 */
export const PP = {
  BASE: PAYPAL_BASE,
  CLIENT,
  SECRET,
} as const;

/**
 * Cabecera Basic Auth (client:secret) para /v1/oauth2/token
 */
export function basicAuthHeader(): string {
  const b64 = Buffer.from(`${CLIENT}:${SECRET}`).toString("base64");
  return `Basic ${b64}`;
}

/**
 * Respuesta JSON de error consistente
 */
export function jsonError(status: number, message: string, detail?: any) {
  return NextResponse.json({ ok: false, error: message, detail }, { status });
}

/**
 * Obtener access_token (OAuth2 client_credentials)
 */
export async function getAccessToken(): Promise<string> {
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`PayPal token ${res.status}: ${txt}`);
  }

  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("No access_token in PayPal response");
  return json.access_token!;
}

/**
 * Wrapper de fetch hacia PayPal
 * - path: ruta absoluta después de la BASE (ej: "/v2/checkout/orders")
 * - bearer: si lo pasas, añade Authorization: Bearer
 * - json: si lo pasas, lo serializa como body y pone Content-Type: application/json
 */
export async function ppFetch(
  path: string,
  init: RequestInit & { bearer?: string; json?: any } = {}
) {
  const headers = new Headers(init.headers);
  if (init.json !== undefined) headers.set("Content-Type", "application/json");
  if (init.bearer) headers.set("Authorization", `Bearer ${init.bearer}`);

  const body =
    init.json !== undefined ? JSON.stringify(init.json) : (init.body as any);

  const res = await fetch(`${PAYPAL_BASE}${path}`, {
    ...init,
    headers,
    body,
    cache: "no-store",
  });

  return res;
}

/**
 * (Opcional) Crear orden desde el servidor con un bearer (access token)
 */
export async function createOrderServer(
  bearer: string,
  amount: string,
  description: string
) {
  const res = await ppFetch("/v2/checkout/orders", {
    method: "POST",
    bearer,
    json: {
      intent: "CAPTURE",
      purchase_units: [
        { amount: { currency_code: "USD", value: amount }, description },
      ],
    },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Create order failed ${res.status}: ${txt}`);
  }
  return res.json();
}