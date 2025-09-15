import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const envs = {
    B2_KEY_ID: !!process.env.B2_KEY_ID,
    B2_APPLICATION_KEY: !!process.env.B2_APPLICATION_KEY,
    B2_BUCKET_NAME: !!process.env.B2_BUCKET_NAME,
    B2_S3_ENDPOINT: !!process.env.B2_S3_ENDPOINT,
    B2_PUBLIC_BASE_URL: !!process.env.B2_PUBLIC_BASE_URL,
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    FROM_EMAIL: !!process.env.FROM_EMAIL,
    BCC_EMAIL: !!process.env.BCC_EMAIL,
    NODE_ENV: process.env.NODE_ENV,
  };
  return NextResponse.json({ ok: true, envs });
}