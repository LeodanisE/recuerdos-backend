// app/api/upload/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

function uid(n = 16) {
  return crypto.randomBytes(n).toString('hex');
}

export async function POST(req: Request) {
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

  // 🔒 En producción NO permitimos fallback; solo presign + PUT directo al bucket
  if (isProd) {
    return Response.json(
      {
        ok: false,
        error:
          'En producción solo se permite presign + PUT directo al bucket. Revisa la regla CORS en B2 (origen https://saveinqr.com, métodos PUT/GET/HEAD, headers *).',
      },
      { status: 410 }
    );
  }

  // ✅ Modo local: fallback de desarrollo (guarda en ./public/u/)
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return Response.json({ ok: false, error: 'Falta file' }, { status: 400 });

    const array = await file.arrayBuffer();
    const buf = Buffer.from(array);

    const id = uid(8);
    const safeName = file.name.replace(/[/\\?%*:|"<>]/g, '_');
    const dir = path.join(process.cwd(), 'public', 'u', id);
    await fs.mkdir(dir, { recursive: true });
    const fp = path.join(dir, safeName);
    await fs.writeFile(fp, buf);

    const url = `/u/${id}/${encodeURIComponent(safeName)}`;
    return Response.json({ ok: true, key: `u/${id}/${safeName}`, url, existed: false });
  } catch (e: any) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}