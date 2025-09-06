// app/api/upload/route.ts
import { NextResponse } from "next/server";
import { Upload } from "@aws-sdk/lib-storage";
import { s3 } from "@/lib/b2";
import { fileTypeFromBuffer } from "file-type";

export const runtime = "nodejs";
export const maxDuration = 60;

// Tipos permitidos (firma real, no solo extensión)
const ALLOW_MIME = new Set([
  "image/jpeg", "image/png", "image/webp",
  "audio/mpeg", "audio/mp4", "audio/aac", "audio/wav",
  "video/mp4", "video/quicktime",
  "application/pdf",
]);

// Límite de tamaño (ajústalo si quieres)
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    // Debe venir marcado el checkbox "tos" del formulario
    if (!form.get("tos")) {
      return NextResponse.json(
        { ok: false, msg: "Debes aceptar las normas de uso." },
        { status: 400 }
      );
    }

    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { ok: false, msg: "No llegó 'file'" },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, msg: `Archivo muy grande (máx ${MAX_BYTES / 1024 / 1024} MB)` },
        { status: 400 }
      );
    }

    const ab = await file.arrayBuffer();
    const buf = Buffer.from(ab); // también podrías usar new Uint8Array(ab)

    // Detecta tipo real por firma binaria
    const ft = await fileTypeFromBuffer(buf);
    const mime = ft?.mime || file.type || "application/octet-stream";
    if (!ALLOW_MIME.has(mime)) {
      return NextResponse.json(
        { ok: false, msg: `Tipo no permitido (${mime})` },
        { status: 400 }
      );
    }

    const bucket = (process.env.B2_BUCKET_NAME || "").trim();
    const key = `${Date.now()}-${(file.name || "file").replace(/\s+/g, "_")}`;

    // (Opcional) logs útiles para depurar
    // console.log("bucket:", bucket);
    // console.log("endpoint:", process.env.B2_ENDPOINT_URL);
    // console.log("file.size:", file.size, "buf.length:", buf.length, "mime:", mime);

    const uploader = new Upload({
      client: s3,
      params: {
        Bucket: bucket,
        Key: key,
        Body: buf,
        ContentType: mime,
      },
      queueSize: 1,
      partSize: 8 * 1024 * 1024,
      leavePartsOnError: false,
    });

    await uploader.done();

    return NextResponse.json({
      ok: true,
      key,
      msg: `Archivo ${file.name} subido 🚀`,
    });
  } catch (err: any) {
    console.error("UPLOAD ERROR:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.Code || err?.name || "UploadError",
        detail: err?.message,
      },
      { status: 500 }
    );
  }
}