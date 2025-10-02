// app/api/presign/route.ts — REEMPLAZO COMPLETO
import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    note: 'Usa POST con { pathname, contentType, multipart?, clientPayload? } para obtener token de subida.',
  });
}

export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;

  // Aquí puedes validar sesión/usuario si lo necesitas

  try {
    const result = await handleUpload({
      request: req,
      body,
      // Controlas lo que se permite subir
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        return {
          addRandomSuffix: true,            // evita choques de nombre
          allowedContentTypes: ['*/*'],     // aceptamos cualquier tipo (mp3, mp4, pdf, zip, imágenes…)
          maximumSizeInBytes: 5 * 1024 * 1024 * 1024, // hasta 5 GB
          // validUntil: Date.now() + 60 * 60 * 1000, // 1h (opcional)
        };
      },
      // Se llama cuando el upload termina (útil p/guardar en DB si quieres)
      onUploadCompleted: async ({ blob }) => {
        console.log('Blob subido:', blob.url);
      },
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'No se pudo generar token de subida' },
      { status: 400 },
    );
  }
}