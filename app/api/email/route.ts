// app/api/email/route.ts
import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

function baseUrl(req: NextRequest) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    `http${req.headers.get("x-forwarded-proto") === "https" ? "s" : ""}://${req.headers.get("host")}`
  );
}
function pickFrom() {
  const name = "recuerdos";
  const emailFrom = process.env.SMTP_FROM || process.env.FROM_EMAIL || process.env.EMAIL_FROM || "recuerdos@saveinqr.com";
  return `${name} <${emailFrom}>`;
}
function pickBcc() {
  return process.env.BCC_EMAIL || process.env.EMAIL_BCC || undefined;
}
function normalizeKey(raw: string, bucket: string) {
  if (!raw) return "";
  let key = raw.trim();
  try {
    if (/^https?:\/\//i.test(key)) {
      const u = new URL(key);
      key = u.pathname.replace(/^\/+/, "");
    }
  } catch {}
  if (key.startsWith("file/")) key = key.slice(5);
  if (bucket && key.startsWith(bucket + "/")) key = key.slice(bucket.length + 1);
  return key.replace(/^\/+/, "");
}

type Body = { to: string; key?: string; url?: string };

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const to = body.to?.trim?.();
    if (!to) return NextResponse.json({ ok: false, error: "Falta 'to'" }, { status: 400 });

    const BUCKET = process.env.B2_BUCKET_NAME || process.env.B2_BUCKET || "";

    // Usar KEY directa o derivarla desde url
    const raw = body.key || body.url || "";
    const objectKey = normalizeKey(raw, BUCKET);
    if (!objectKey) return NextResponse.json({ ok: false, error: "No se pudo derivar key válida" }, { status: 400 });

    // Short URL que ya usa tu backend (/l/<hash(key)>)
    const code = sha256(objectKey);
    const shortUrl = `${baseUrl(req)}/l/${code}`;

    // PNG del QR
    const png = await QRCode.toBuffer(shortUrl, { width: 600, margin: 2, errorCorrectionLevel: "M", type: "png" });
    const subject = "Tu enlace y QR";
    const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; line-height:1.5">
        <h2>Tu QR está listo</h2>
        <p>Enlace permanente:</p>
        <p><a href="${shortUrl}" target="_blank" rel="noreferrer">${shortUrl}</a></p>
        <p>Adjuntamos el código QR como imagen PNG.</p>
      </div>
    `;

    // 🔷 1) Preferir SMTP (más fiable en local)
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const nodemailer = (await import("nodemailer")).default;
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 465),
        secure: String(process.env.SMTP_SECURE || "true").toLowerCase() === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        // Evita fallos locales por certificados
        tls: { rejectUnauthorized: false },
      });

      const info = await transporter.sendMail({
        from: pickFrom(),
        to,
        bcc: pickBcc(),
        subject,
        html,
        attachments: [{ filename: "qr.png", content: png }],
      });

      return NextResponse.json({ ok: true, provider: "smtp", messageId: info?.messageId || null, shortUrl });
    }

    // 🔸 2) Fallback a Resend SOLO si no hay SMTP
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const result = await resend.emails.send({
        from: pickFrom(),
        to,
        bcc: pickBcc(),
        subject,
        html,
        attachments: [{ filename: "qr.png", content: png.toString("base64") }],
      });

      if ((result as any)?.error) throw new Error((result as any).error.message || "Error Resend");
      return NextResponse.json({ ok: true, provider: "resend", shortUrl });
    }

    return NextResponse.json({ ok: false, error: "Sin proveedor de email (configura SMTP_* o RESEND_API_KEY)." }, { status: 500 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error enviando correo" }, { status: 500 });
  }
}