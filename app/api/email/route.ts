// app/api/email/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function err(status: number, message: string) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const { to, key } = await req.json();
    if (!to || !key) return err(400, "Faltan 'to' o 'key'.");

    // Reenvía cookies al firmar (middleware protege /api/sign en prod)
    const cookieHeader = req.headers.get("cookie") ?? "";
    const signUrl = new URL(`/api/sign?key=${encodeURIComponent(key)}`, req.url);
    const signRes = await fetch(signUrl, {
      cache: "no-store",
      headers: { cookie: cookieHeader },
    });
    const signData = await signRes.json().catch(() => null);

    if (signRes.status === 402) return err(402, "NEED_PAYMENT");
    if (!signRes.ok || !signData?.ok || !signData?.url) return err(500, "No se pudo firmar la URL.");

    const signedUrl: string = signData.url;
    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
    const fallbackCode = (key.split("/").pop() || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
    const shortUrl = `${origin}/l/${encodeURIComponent(fallbackCode)}`;

    const from = process.env.EMAIL_FROM || "no-reply@saveinqr.com";
    const subject = "Tu archivo y QR — SaveInQR";
    const html = `
      <div style="font-family:system-ui,Segoe UI,Arial,sans-serif; line-height:1.4">
        <p>¡Listo! Aquí tienes tu archivo:</p>
        <p><a href="${signedUrl}">Abrir archivo (enlace temporal)</a></p>
        <p>Enlace corto (opcional): <a href="${shortUrl}">${shortUrl}</a></p>
        <hr/>
        <p>Si el enlace corto expira, ábrelo desde la app y se renovará automáticamente.</p>
      </div>
    `;

    if (!process.env.RESEND_API_KEY) return err(501, "Email no configurado: falta RESEND_API_KEY.");

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      bcc: process.env.EMAIL_BCC,
    });
    if (error) return err(500, String(error));

    return NextResponse.json({ ok: true, id: data?.id, via: "resend" });
  } catch (e: any) {
    return err(500, e?.message || "Error de servidor");
  }
}