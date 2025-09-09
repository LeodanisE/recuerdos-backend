// app/api/access/free/route.ts
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

export async function POST(_req: NextRequest) {
  try {
    const maxAge = 24 * 60 * 60; // 24h
    const res = NextResponse.json({
      ok: true,
      plan: "trial",
      expiresAt: new Date(Date.now() + maxAge * 1000).toISOString(),
    });
    res.cookies.set("vx_order", `trial-${Date.now()}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge,
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "free-access failed" }, { status: 500 });
  }
}