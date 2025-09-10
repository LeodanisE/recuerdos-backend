// app/api/access/trial/route.ts
import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const hours = Math.max(1, Math.min(24 * 30, Number(url.searchParams.get("hours")) || 24)); // 1..720
  const ttl = hours * 60 * 60;
  const res = NextResponse.json({ ok: true, granted: "vx_order", hours, ttlSeconds: ttl });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  res.cookies.set("vx_order", `trial-${Date.now()}`, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: ttl,
  });
  return res;
}