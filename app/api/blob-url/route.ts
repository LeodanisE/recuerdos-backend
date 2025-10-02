// app/api/blob-url/route.ts
import { generateUploadUrl } from '@vercel/blob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // genera una URL PUT válida 15 min
    const { url } = await generateUploadUrl({ expires: '15m' });
    return Response.json({ ok: true, url });
  } catch (err: any) {
    return Response.json(
      { ok: false, error: err?.message || 'No se pudo generar URL' },
      { status: 500 }
    );
  }
}