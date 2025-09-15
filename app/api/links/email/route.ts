// app/api/email/route.ts
import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { RESEND_API_KEY, FROM_EMAIL, BCC_EMAIL } = process.env;

  if (!RESEND_API_KEY || !FROM_EMAIL) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Falta configurar RESEND_API_KEY o FROM_EMAIL en el servidor. Sin eso no se puede enviar el correo.",
      },
      { status: 500 }
    );
  }

  try {
    const { url, to } = await req.json();
    if (!url || !to) {
      return NextResponse.json({ ok: false, error: "Faltan campos: url y to" }, { status: 400 });
    }

    const pngBuffer = await QRCode.toBuffer(url, {
      width: 600,
      margin: 2,
      errorCorrectionLevel: "M",
      type: "png",
    });

    const { Resend } = await import("resend");
    const resend = new Resend(RESEND_API_KEY as string);

    const subject = "Tu enlace y QR";
    const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; line-height:1.5">
        <h2>Tu QR está listo</h2>
        <p>Enlace permanente:</p>
        <p><a href="${url}" target="_blank">${url}</a></p>
        <p>Adjuntamos el código QR como imagen PNG.</p>
      </div>
    `;

    const result = await resend.emails.send({
      from: FROM_EMAIL as string,
      to,
      bcc: BCC_EMAIL || undefined,
      subject,
      html,
      attachments: [{ filename: "qr.png", content: pngBuffer.toString("base64") }],
    });

    if ((result as any)?.error) {
      throw new Error((result as any).error.message || "Error de Resend");
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Error enviando correo" },
      { status: 500 }
    );
  }
}