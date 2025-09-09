// /app/api/links/renew/route.ts
import { NextRequest, NextResponse } from "next/server";
import { kvGetJSON } from "@/lib/kv";

export async function POST(req: NextRequest) {
  const email = req.cookies.get("vx_user")?.value || "";
  if (!email) return NextResponse.json({ ok: false, error: "No auth" }, { status: 401 });

  const { code } = (await req.json()) as { code?: string };
  if (!code) return NextResponse.json({ ok: false, error: "Falta code" }, { status: 400 });

  const rec = await kvGetJSON<{ owner: string }>(`code:${code}`);
  if (!rec) return NextResponse.json({ ok: false, error: "No existe" }, { status: 404 });
  if (rec.owner !== email) return NextResponse.json({ ok: false, error: "No permitido" }, { status: 403 });

  // Aquí no cobramos todavía, solo devolvemos URL de recompra.
  const url = `/pricing?code=${encodeURIComponent(code)}&action=recompra`;
  return NextResponse.json({ ok: true, url });
}