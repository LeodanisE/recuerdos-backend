import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function ensureEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

async function kvGet<T = any>(key: string): Promise<T | null> {
  const url = ensureEnv("UPSTASH_REDIS_REST_URL");
  const token = ensureEnv("UPSTASH_REDIS_REST_TOKEN");
  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as any;
  if (!data || typeof data.result !== "string") return null;
  try {
    return JSON.parse(data.result);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, ctx: { params: { code: string } }) {
  try {
    const code = (ctx.params?.code ?? "").toUpperCase();
    const origin = new URL(req.url).origin.replace(/\/+$/, "");

    const rec = await kvGet<any>(`link:${code}`);
    if (!rec) {
      // 404 directo
      return NextResponse.json({ ok: false, error: "code not found" }, { status: 404 });
    }
    if (rec.active === false) {
      // opción de recompra
      return NextResponse.redirect(`${origin}/pricing?need=renew&code=${encodeURIComponent(code)}`);
    }

    const key = rec.key as string;
    // pide URL firmada interna
    const sres = await fetch(`${origin}/api/sign?key=${encodeURIComponent(key)}`, { cache: "no-store" });
    const sdata = await sres.json().catch(() => ({} as any));
    const url = sdata?.url as string | undefined;
    if (!sres.ok || !url) {
      return NextResponse.json({ ok: false, error: "sign failed" }, { status: 500 });
    }

    // redirige al objeto (descarga/visualización)
    return NextResponse.redirect(url);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "resolve failed" }, { status: 500 });
  }
}