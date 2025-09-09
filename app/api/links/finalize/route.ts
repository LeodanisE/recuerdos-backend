// app/api/links/finalize/route.ts
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

/** Stub temporal para evitar imports faltantes. */
export async function POST(_req: NextRequest) {
  return NextResponse.json({ ok: true, note: "finalize stub" });
}