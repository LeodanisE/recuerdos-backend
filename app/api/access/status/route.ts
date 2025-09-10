// app/api/access/status/route.ts
import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const vx_user = req.cookies.get("vx_user")?.value ?? null;
  const vx_order = req.cookies.get("vx_order")?.value ?? null;
  const hasAccess = Boolean(vx_user || vx_order);
  const res = NextResponse.json({ ok: true, hasAccess, cookies: { vx_user, vx_order } });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}