// app/api/debug/grant/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function j(status: number, body: any) {
  return NextResponse.json(body, { status });
}

const UP_URL = process.env.UPSTASH_REDIS_REST_URL || "";
const UP_TKN = process.env.UPSTASH_REDIS_REST_TOKEN || "";

type UpstashResp = { result?: string; success?: boolean; error?: string };

async function upstashSetEx(key: string, ttl: number, value: string): Promise<boolean> {
  if (!UP_URL || !UP_TKN) return false;
  const url = `${UP_URL.replace(/\/+$/, "")}/setex/${encodeURIComponent(key)}/${ttl}/${encodeURIComponent(value)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${UP_TKN}` },
    cache: "no-store",
  });
  const data: UpstashResp | null = await res.json().catch(() => null);
  return res.ok && (data?.result === "OK" || data?.success === true);
}

export async function POST(req: NextRequest) {
  try {
    const { email, order, ttl } = await req.json().catch(() => ({} as any));
    if (!email && !order) {
      return j(400, { ok: false, error: "Falta 'email' o 'order'." });
    }
    const ttlNum = Number.isFinite(+ttl) && +ttl > 0 ? Math.floor(+ttl) : 24 * 60 * 60;
    const payload = "1";

    let wroteEmail: boolean = false;
    let wroteOrder: boolean = false;

    if (email) {
      wroteEmail = await upstashSetEx(`entitlement:${String(email)}`, ttlNum, payload);
    }
    if (order) {
      wroteOrder = await upstashSetEx(`entitlement:order:${String(order)}`, ttlNum, payload);
    }

    return j(200, { ok: true, wroteEmail, wroteOrder, ttl: ttlNum });
  } catch (e: any) {
    return j(500, { ok: false, error: e?.message || "grant failed" });
  }
}