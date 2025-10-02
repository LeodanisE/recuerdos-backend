// lib/b2.ts
import { S3Client } from '@aws-sdk/client-s3';

function need(name: string, def?: string) {
  const v = process.env[name] ?? def;
  if (!v) throw new Error(`Falta env ${name}`);
  return v;
}

export function bucketIsPublic() {
  return String(process.env.BUCKET_PUBLIC || '').toLowerCase() === 'true';
}

export function b2Config() {
  const bucket = process.env.B2_BUCKET_NAME || process.env.B2_BUCKET;
  if (!bucket) throw new Error('Falta env B2_BUCKET_NAME o B2_BUCKET');

  const region = need('B2_REGION');
  const endpoint = need('B2_S3_ENDPOINT');
  const accessKeyId = need('B2_KEY_ID');
  const secretAccessKey = need('B2_APPLICATION_KEY');

  // Si el bucket es público, armamos base pública tipo:
  // B2_DOWNLOAD_URL/file/<bucket>
  const downloadBase = process.env.B2_DOWNLOAD_URL
    ? `${process.env.B2_DOWNLOAD_URL.replace(/\/+$/,'')}/file/${bucket}`
    : '';

  return { bucket, region, endpoint, accessKeyId, secretAccessKey, downloadBase };
}

export function b2Client() {
  const { region, endpoint, accessKeyId, secretAccessKey } = b2Config();
  return new S3Client({
    region,
    endpoint,
    forcePathStyle: true, // Backblaze va mejor así
    credentials: { accessKeyId, secretAccessKey },
  });
}

export function safeName(name: string) {
  return (name || 'file.bin').replace(/[^a-z0-9._-]+/gi, '_');
}