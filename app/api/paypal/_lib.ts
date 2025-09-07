// app/api/paypal/_lib.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function reqEnv(name: string) {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(`Missing env ${name}`);
  }
  return v.trim();
}

export const PP = {
  base: reqEnv("PAYPAL_API_BASE"), // p.ej. https://api-m.sandbox.paypal.com
  id: reqEnv("PAYPAL_CLIENT_ID"),
  secret: reqEnv("PAYPAL_CLIENT_SECRET"),
};

export async function ppFetch<T = any>(
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T }> {
  const url = `${PP.base}${path}`;
  const res = await fetch(url, init);
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

export function basicAuthHeader() {
  const token = Buffer.from(`${PP.id}:${PP.secret}`).toString("base64");
  return `Basic ${token}`;
}

// Pequeño helper para respuestas de error con detalle
export function jsonError(detail: any, status = 400) {
  console.error("PAYPAL API ERROR", status, detail);
  return NextResponse.json(
    { ok: false, error: "PAYPAL_ERROR", detail },
    { status }
  );
}