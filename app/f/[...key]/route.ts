// app/f/[...key]/route.ts
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import { b2Client, b2Config } from '../../../lib/b2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { key: string[] } }) {
  try {
    const key = params.key.join('/');
    const s3 = b2Client();
    const { bucket } = b2Config();

    const out = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const body = out.Body as Readable;

    const headers = new Headers();
    headers.set('Content-Type', out.ContentType || 'application/octet-stream');
    if (out.ContentLength != null) headers.set('Content-Length', String(out.ContentLength));

    return new Response(Readable.toWeb(body) as any, { headers });
  } catch (err: any) {
    return new Response(`Not found: ${err?.message || 'error'}`, { status: 404 });
  }
}