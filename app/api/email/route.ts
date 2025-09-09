// app/api/email/route.ts
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs"; // asegura compatibilidad con nodemailer (sockets)

function resp(status: number, body: any) {
  return NextResponse.json(body, { status });
}

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
}

export async function POST(req: NextRequest) {
  try {
    const { to, key } = await req.json();

    if (!to || !key) {
      return resp(400, { ok: false, error: "Faltan parámetros: 'to' y/o 'key'." });
    }
    if (!isValidEmail(to)) {
      return resp(400, { ok: false, error: "Correo inválido." });
    }

    // 1) URL firmada para acceso directo (reutiliza tu endpoint interno)
    const signURL = new URL(`/api/sign?key=${encodeURIComponent(String(key))}`, req.url);
    const signRes = await fetch(signURL.toString(), { cache: "no-store" });
    const signData = await signRes.json().catch(() => null);
    if (!signRes.ok || !signData?.ok || !signData?.url) {
      return resp(500, { ok: false, error: "No se pudo firmar la URL del archivo." });
    }
    const signedUrl: string = String(signData.url);

    // 2) Construye el enlace corto (TU app usa la key COMPLETA en /l/:key)
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
      new URL(req.url).origin.replace(/\/+$/, "");
    const shortUrl = `${origin}/l/${encodeURIComponent(String(key))}`;

    // 3) Config SMTP (PrivateEmail)
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || "465");
    const secure = String(process.env.SMTP_SECURE || "true") === "true"; // 465 => true
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || "SaveInQR <no-reply@saveinqr.com>";
    const bcc = process.env.EMAIL_BCC || undefined;

    if (!host || !user || !pass) {
      return resp(500, {
        ok: false,
        error: "SMTP no configurado (faltan SMTP_HOST/SMTP_USER/SMTP_PASS).",
      });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    // 4) Contenido del correo
    const subject = "Tu archivo y QR — SaveInQR";
    const html = `
      <div style="font-family:system-ui,Segoe UI,Arial,sans-serif; line-height:1.5">
        <p>¡Listo! Aquí tienes tu archivo:</p>
        <p><a href="${signedUrl}" target="_blank" rel="noreferrer">Abrir archivo (enlace temporal)</a></p>
        <p style="margin-top:12px">Enlace corto (renovable):<br/>
          <a href="${shortUrl}" target="_blank" rel="noreferrer">${shortUrl}</a>
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />
        <p style="color:#6b7280;font-size:12px">Si el enlace corto expira, al abrirlo desde la app se renovará automáticamente.</p>
      </div>
    `.trim();

    const text =
      `¡Listo! Aquí tienes tu archivo:\n` +
      `Enlace temporal: ${signedUrl}\n` +
      `Enlace corto: ${shortUrl}\n\n` +
      `Si el enlace corto expira, ábrelo desde la app para renovarlo automáticamente.\n`;

    // 5) Envío
    await transporter.sendMail({
      from,
      to,
      bcc, // opcional
      subject,
      html,
      text,
    });

    return resp(200, { ok: true });
  } catch (e: any) {
    return resp(500, { ok: false, error: e?.message || "Error enviando correo" });
  }
}