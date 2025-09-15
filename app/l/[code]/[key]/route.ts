// app/l/[key]/route.ts
import type { NextRequest } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const {
  B2_KEY_ID,
  B2_APPLICATION_KEY,
  B2_BUCKET_NAME,
  B2_BUCKET,
  B2_S3_ENDPOINT,
  B2_REGION,
} = process.env;

const BUCKET = (B2_BUCKET_NAME || B2_BUCKET)!;

const s3 = new S3Client({
  region: B2_REGION || "us-east-005",
  endpoint: B2_S3_ENDPOINT!,
  credentials: {
    accessKeyId: B2_KEY_ID!,
    secretAccessKey: B2_APPLICATION_KEY!,
  },
  forcePathStyle: true,
});

export async function GET(_req: NextRequest, ctx: any) {
  try {
    const { key } = await ctx.params;
    if (!key) return new Response("Missing key", { status: 400 });

    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const signed = await getSignedUrl(s3, cmd, { expiresIn: 3600 }); // 1h
    return Response.redirect(signed, 302);
  } catch {
    return new Response("Not found", { status: 404 });
  }
}