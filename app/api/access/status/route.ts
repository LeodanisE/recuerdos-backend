import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const has =
    req.cookies.get("vx_order")?.value ||
    req.cookies.get("vx_user")?.value ||
    "";
  if (!has) return NextResponse.json({ ok: false }, { status: 402 });
  return NextResponse.json({ ok: true });
}