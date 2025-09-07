// app/api/dev/test-email/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get("to");
  if (!to) {
    return NextResponse.json({ ok: false, error: "Missing ?to=email@dominio.com" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return NextResponse.json({
      ok: false,
      error: "RESEND_API_KEY o EMAIL_FROM no definidos en producción",
    }, { status: 500 });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to,
        subject: "Prueba desde producción",
        html: `<p>Hola 👋<br>Este es un correo de prueba enviado desde producción a las ${new Date().toISOString()}.</p>`
      }),
    });
    const data = await res.json();
    return NextResponse.json({ ok: res.ok, status: res.status, data });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
