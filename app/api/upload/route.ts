import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/** ---------- Ajustes (puedes dejar valores por defecto) ---------- */
const DEFAULT_MAX_BYTES = 50 * 1024 * 1024; // 50 MB por defecto
const ALLOWED_TYPES = [
  // imágenes
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  // docs comunes
  "application/pdf",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
  // audio/video ligeros (ajusta a tu negocio)
  "audio/mpeg",
  "audio/mp4",
  "video/mp4",
];

function jsonErr(status: number, message: string) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function trimQuotes(s: string) {
  return s?.replace?.(/^"+|"+$/g, "") || s;
}

/** Limpia el nombre de archivo para que sea una key válida */
function normalizeName(name: string) {
  return (name || "file").replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 120);
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const tos = form.get("tos");

    if (!file) return jsonErr(400, "No file");
    if (!tos) return jsonErr(400, "Terms not accepted");

    // Validación de tamaño por entorno (opcional)
    const envMax = Number(process.env.UPLOAD_MAX_BYTES || process.env.NEXT_PUBLIC_UPLOAD_MAX_BYTES || "") || DEFAULT_MAX_BYTES;
    if (typeof file.size === "number" && file.size > envMax) {
      return jsonErr(413, `Archivo demasiado grande. Límite: ${Math.round(envMax / (1024 * 1024))} MB`);
    }

    // Validación de tipo (opcional; comenta si quieres permitir cualquier cosa)
    const contentType = file.type || "application/octet-stream";
    if (ALLOWED_TYPES.length && contentType && !ALLOWED_TYPES.includes(contentType)) {
      return jsonErr(415, `Tipo de archivo no permitido: ${contentType}`);
    }

    // Origin del propio proyecto (misma instancia)
    const origin = req.nextUrl.origin.replace(/\/+$/, "");

    // Nombre y key
    const cleanName = normalizeName(file.name);
    const key = `uploads/${Date.now()}-${cleanName}`;

    /** 1) INIT (1 parte) */
    const initURL = new URL("/api/multipart/init", origin);
    initURL.searchParams.set("filename", key);
    initURL.searchParams.set("contentType", contentType);
    initURL.searchParams.set("parts", "1");

    const initRes = await fetch(initURL.toString(), { cache: "no-store" });
    const initData = await initRes.json().catch(() => ({} as any));

    if (
      !initRes.ok ||
      !initData?.uploadId ||
      !(initData?.urls?.[0]?.url || initData?.url) ||
      !initData?.bucket ||
      !initData?.key
    ) {
      return jsonErr(500, initData?.error || initData?.detail || "init failed");
    }

    const putUrl: string = initData.urls?.[0]?.url || initData.url;

    /** 2) PUT (subir binario a URL firmada a través del proxy) */
    // Nuestro proxy acepta opcionalmente size/type para setear headers
    const putProxy = new URL("/api/multipart/put", origin);
    putProxy.searchParams.set("url", putUrl);
    if (typeof file.size === "number") putProxy.searchParams.set("size", String(file.size));
    if (contentType) putProxy.searchParams.set("type", contentType);

    const putRes = await fetch(putProxy.toString(), {
      method: "POST",
      body: file, // File es Blob -> streaming en Node 18+
      cache: "no-store",
    });

    // Intentar ETag desde JSON o headers
    let etag =
      putRes.headers.get("etag") ||
      putRes.headers.get("ETag") ||
      "";

    try {
      // Algunos proxies devuelven JSON con { etag / ETag }
      const pj = await putRes.clone().json();
      etag = pj?.etag || pj?.ETag || etag;
    } catch {
      // si no es JSON, ignoramos
    }

    etag = trimQuotes(etag);

    if (!putRes.ok || !etag) {
      // Intentar leer snippet del body para diagnosticar
      let bodySnippet = "";
      try {
        const txt = await putRes.clone().text();
        bodySnippet = txt?.slice?.(0, 200) || "";
      } catch {}
      return jsonErr(
        500,
        `upload part failed (status ${putRes.status})${bodySnippet ? ` — ${bodySnippet}` : ""}`,
      );
    }

    /** 3) COMPLETE */
    const completeURL = new URL("/api/multipart/complete", origin);
    const completeRes = await fetch(completeURL.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({
        uploadId: initData.uploadId,
        bucket: initData.bucket,
        key: initData.key,
        parts: [{ ETag: etag, PartNumber: 1 }],
      }),
      cache: "no-store",
    });

    const completeData = await completeRes.json().catch(() => ({} as any));
    if (!completeRes.ok || completeData?.ok === false) {
      return jsonErr(500, completeData?.error || completeData?.detail || "complete failed");
    }

    return NextResponse.json({
      ok: true,
      key: initData.key, // p.ej. uploads/1234-nombre.jpg
      contentType,
      size: file.size ?? null,
      msg: "Archivo subido ✅",
    });
  } catch (e: any) {
    return jsonErr(500, e?.message || "upload failed");
  }
}