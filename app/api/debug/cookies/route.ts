// app/api/debug/cookies/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const vx_user  = req.cookies.get("vx_user")?.value || null;
  const vx_order = req.cookies.get("vx_order")?.value || null;
  const vx_plan  = req.cookies.get("vx_plan")?.value || null;

  return NextResponse.json({ ok: true, vx_user, vx_order, vx_plan });
}