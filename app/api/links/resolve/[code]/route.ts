// app/api/links/resolve/[code]/route.ts
import { NextResponse } from "next/server";
export const runtime = "nodejs";

/**
 * Stub temporal para compilar correctamente en Next 15.
 * Nota: no resuelve códigos reales; ajusta la lógica luego si la necesitas.
 */
export async function GET(_req: Request, ctx: any) {
  const code = ctx?.params?.code as string | undefined;
  if (!code) {
    return NextResponse.json({ ok: false, error: "Missing code" }, { status: 400 });
  }
  // TODO: implementar resolución real del código -> key/URL
  return NextResponse.json({ ok: false, error: "Not implemented for this endpoint" }, { status: 501 });
}