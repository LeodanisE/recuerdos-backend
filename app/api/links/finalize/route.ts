// /app/api/links/finalize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { kvSetJSON, kvGetJSON } from "@/lib/kv";
import { addUserItem } from "@/lib/store";
import { newUniqueCode } from "@/lib/ids";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const email = req.cookies.get("vx_user")?.value || "";
    if (!email) return NextResponse.json({ ok: false, error: "No auth" }, { status: 401 });

    const { key, url } = (await req.json()) as { key?: string; url?: string };
    if (!key || !url) return NextResponse.json({ ok: false, error: "Faltan datos" }, { status: 400 });

    // evita duplicados si ya existe alias para esa key/url
    const now = Date.now();
    let code = await newUniqueCode();

    // por si alguien re-finaliza, intenta reutilizar
    const maybe = await kvGetJSON<{ url: string; key: string; valid: boolean; owner: string; createdAt: number }>(`key:${key}`);
    if (maybe && maybe.owner === email) {
      code = (await kvGetJSON<{ code: string }>(`key2code:${key}`))?.code || code;
    }

    const short = new URL(`/d/${code}`, req.url).toString();

    // guarda mapping
    const rec = { url, key, valid: true, owner: email, createdAt: now };
    await kvSetJSON(`code:${code}`, rec);
    await kvSetJSON(`key:${key}`, { ...rec, code });
    await kvSetJSON(`key2code:${key}`, { code });

    await addUserItem(email, { code, key, url, createdAt: now, valid: true });

    // email al usuario con el QR/enlace
    const html = `
      <div style="font-family:system-ui,Segoe UI,Roboto,Arial">
        <h2>Tu QR está listo</h2>
        <p>Puedes compartir o imprimir este enlace corto:</p>
        <p><a href="${short}" target="_blank">${short}</a></p>
        <p>Si el código expira, podrás recomprarlo desde esa misma URL.</p>
      </div>`;
    await sendEmail(email, "Tu QR está listo", html);

    return NextResponse.json({ ok: true, code, short });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 });
  }
}