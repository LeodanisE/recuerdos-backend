// app/api/auth/start/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// STUB v2: no usa Upstash ni lee envs; seguro para build.
function resp(status: number, body: any) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(_req: NextRequest) {
  return resp(501, { ok: false, error: "Auth start not implemented (stub v2)" });
}

export async function POST(_req: NextRequest) {
  return resp(501, { ok: false, error: "Auth start not implemented (stub v2)" });
}