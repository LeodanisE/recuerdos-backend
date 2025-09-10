// app/api/auth/start/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Stub seguro para build: no usa env ni importa SDKs.
 * Implementa aquí tu inicio de auth real más adelante.
 */

function resp(status: number, body: any) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(_req: NextRequest) {
  return resp(501, { ok: false, error: "Auth start not implemented" });
}

export async function POST(_req: NextRequest) {
  return resp(501, { ok: false, error: "Auth start not implemented" });
}