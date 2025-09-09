// /app/api/auth/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { kvSetJSON } from "@/lib/kv";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email?: string };
    const e = email?.trim().toLowerCase();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      return NextResponse.json({ ok: false, error: "Email inválido" }, { status: 400 });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await kvSetJSON(`login:${e}`, { code, attempts: 0 }, 600);

    const html = `<p>Tu código de acceso:</p>
      <p style="font-size:24px;font-weight:700;letter-spacing:4px">${code}</p>
      <p>Vence en 10 minutos.</p>`;
    await sendEmail(e, "Tu código de acceso", html);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "error" }, { status: 500 });
  }
}