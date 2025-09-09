// app/api/links/email/route.ts
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

function j(status: number, body: any) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Stub seguro para build; implementa tu envío real más adelante. */
export async function POST(_req: NextRequest) {
  return j(501, { ok: false, error: "links/email not implemented (stub)" });
}