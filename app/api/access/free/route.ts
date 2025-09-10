// app/api/access/free/route.ts
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

function noStore(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

export async function POST(req: NextRequest) {
  try {
    // TTL por defecto: 24h. Para pruebas, acepta ?ttl=segundos o ?minutes=minutos.
    const url = new URL(req.url);
    const ttlParam = url.searchParams.get("ttl");
    const minParam = url.searchParams.get("minutes");

    let maxAge = 24 * 60 * 60; // 24h
    if (ttlParam && /^\d+$/.test(ttlParam)) {
      maxAge = Math.max(60, Math.min(24 * 60 * 60, parseInt(ttlParam, 10)));
    } else if (minParam && /^\d+$/.test(minParam)) {
      const mins = parseInt(minParam, 10);
      maxAge = Math.max(60, Math.min(24 * 60 * 60, mins * 60));
    }

    const res = NextResponse.json({
      ok: true,
      plan: "trial",
      maxAge,
      expiresAt: new Date(Date.now() + maxAge * 1000).toISOString(),
    });

    res.cookies.set("vx_order", `trial-${Date.now()}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge,
    });

    return noStore(res);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "free-access failed" }, { status: 500 });
  }
}