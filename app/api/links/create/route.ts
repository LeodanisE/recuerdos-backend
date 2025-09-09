// app/api/links/create/route.ts
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

function j(status: number, body: any) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Stub seguro para build; implementa la creación real más adelante. */
export async function POST(_req: NextRequest) {
  return j(501, { ok: false, error: "links/create not implemented (stub)" });
}