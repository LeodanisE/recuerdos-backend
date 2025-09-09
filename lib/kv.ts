// /lib/kv.ts
const KV_URL = process.env.UPSTASH_REDIS_REST_URL!;
const KV_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;
if (!KV_URL || !KV_TOKEN) throw new Error("Upstash env missing");

function kvFetch(path: string, init?: RequestInit) {
  return fetch(`${KV_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    cache: "no-store",
  });
}

export async function kvSetJSON(key: string, value: unknown, exSeconds?: number) {
  const body = encodeURIComponent(JSON.stringify(value));
  const ttl = exSeconds ? `?EX=${exSeconds}` : "";
  const res = await kvFetch(`/set/${encodeURIComponent(key)}/${body}${ttl}`, { method: "POST" });
  return res.json();
}

export async function kvGetJSON<T>(key: string): Promise<T | null> {
  const res = await kvFetch(`/get/${encodeURIComponent(key)}`);
  const data = (await res.json().catch(() => null)) as any;
  const raw = data?.result;
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export async function kvDel(key: string) {
  const res = await kvFetch(`/del/${encodeURIComponent(key)}`, { method: "POST" });
  return res.json();
}