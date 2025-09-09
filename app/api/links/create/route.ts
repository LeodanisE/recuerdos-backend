import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function jerr(status: number, msg: string, extra?: any) {
  return NextResponse.json({ ok: false, error: msg, ...extra }, { status });
}

function ensureEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

async function kvSet(key: string, value: unknown) {
  const url = ensureEnv("UPSTASH_REDIS_REST_URL");
  const token = ensureEnv("UPSTASH_REDIS_REST_TOKEN");
  const res = await fetch(
    `${url}/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(value))}`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`KV set failed: ${res.status} ${txt}`);
  }
}

function genCode(len = 6) {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // sin confusos
  let out = "";
  const cryptoObj = globalThis.crypto ?? (require("crypto") as any).webcrypto;
  const bytes = new Uint8Array(len);
  cryptoObj.getRandomValues(bytes);
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

async function sendEmail(to: string, shortUrl: string, previewUrl?: string) {
  const apiKey = ensureEnv("RESEND_API_KEY");
  const from = ensureEnv("EMAIL_FROM");
  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
      <h2>Tu QR está listo</h2>
      <p>Enlace corto:</p>
      <p><a href="${shortUrl}">${shortUrl}</a></p>
      ${
        previewUrl
          ? `<p>Vista previa directa (temporal): <a href="${previewUrl}">${previewUrl}</a></p>`
          : ""
      }
      <p>Consejo: imprime o guarda el QR del enlace corto. Si lo pierdes, escríbenos y te reenviamos tus códigos.</p>
      <p>— Recuerdos</p>
    </div>
  `;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Tu QR de Recuerdos",
      html,
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const origin = new URL(req.url).origin.replace(/\/+$/, "");
    const body = await req.json().catch(() => ({}));
    const key = (body?.key ?? "").toString();
    const email = (body?.email ?? "").toString().trim();

    if (!key) return jerr(400, "key required");

    // Genera código único (reintenta si colisiona)
    let code = genCode(6);
    // (si quisieras, podrías comprobar colisión leyendo de Redis antes)
    const record = {
      key,                 // p.ej. uploads/1234-foto.jpg
      email: email || null,
      createdAt: Date.now(),
      active: true,
    };
    await kvSet(`link:${code}`, record);

    const shortUrl = `${origin}/l/${code}`;

    // Opcional: añade una vista previa firmada para el email
    // (si tienes /api/sign operativo)
    let previewUrl: string | undefined;
    try {
      const sres = await fetch(`${origin}/api/sign?key=${encodeURIComponent(key)}`);
      const sdata = await sres.json();
      if (sres.ok && sdata?.ok && sdata?.url) previewUrl = sdata.url as string;
    } catch {
      /* sin vista previa */
    }

    if (email) {
      try { await sendEmail(email, shortUrl, previewUrl); } catch { /* no detiene */ }
    }

    return NextResponse.json({ ok: true, code, shortUrl });
  } catch (e: any) {
    return jerr(500, e?.message || "create link failed");
  }
}