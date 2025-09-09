import { NextRequest, NextResponse } from "next/server";

// Util para leer en Upstash por REST
async function redisGet(key: string) {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  // Upstash devuelve { result: "valor" } o { result: null }
  return data?.result ?? null;
}

export async function GET(req: NextRequest, ctx: { params: { code: string } }) {
  const code = ctx.params.code;

  // 1) intenta resolver el "code" a la key real en Redis
  let key =
    (await redisGet(`short:${code}`)) ??
    (await redisGet(`file:${code}`)) ??
    null;

  // 2) si no hay mapping, asume que el "code" ya ES la key URL-encoded
  if (!key) {
    try {
      key = decodeURIComponent(code);
    } catch {
      key = code;
    }
  }

  // 3) redirige SIEMPRE al signer con redirect=1
  const target = new URL(`/api/sign`, req.url);
  target.searchParams.set("key", key);
  target.searchParams.set("redirect", "1"); // <- hace 302 a la URL firmada

  return NextResponse.redirect(target, 302);
}