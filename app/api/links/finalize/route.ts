// app/api/links/finalize/route.ts
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

/** Stub temporal para compilar. Sustituye luego por la lógica real si lo usas. */
export async function POST(_req: NextRequest) {
  return NextResponse.json({ ok: true, note: "finalize stub" });
}