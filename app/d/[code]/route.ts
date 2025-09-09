// app/d/[code]/route.ts
import { NextResponse } from "next/server";
export const runtime = "nodejs";

/**
 * Stub temporal para que compile en Next 15.
 * Ajusta la lógica real más adelante si necesitas este endpoint.
 */
export async function GET(_req: Request, ctx: any) {
  const code = ctx?.params?.code as string | undefined;
  if (!code) {
    return NextResponse.json({ ok: false, error: "Missing code" }, { status: 400 });
  }
  // TODO: implementar resolución real del código
  return NextResponse.json({ ok: false, error: "Not implemented for /d" }, { status: 501 });
}