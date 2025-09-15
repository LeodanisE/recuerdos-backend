// lib/redis.ts — REEMPLAZO COMPLETO
const BASE = process.env.UPSTASH_REDIS_REST_URL!;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

function u(x: string) {
  return encodeURIComponent(x);
}

async function upstash<T = any>(path: string): Promise<T> {
  if (!BASE || !TOKEN) throw new Error("Upstash env missing");
  const r = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    cache: "no-store",
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`Upstash ${r.status}: ${t}`);
  }
  return (await r.json()) as T;
}

export async function redisSetEx(key: string, value: string, ttlSeconds: number) {
  return upstash(`/setex/${u(key)}/${ttlSeconds}/${u(value)}`);
}
export async function redisGet(key: string) {
  return upstash<{ result: string | null }>(`/get/${u(key)}`);
}
export async function redisDel(key: string) {
  return upstash(`/del/${u(key)}`);
}