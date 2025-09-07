import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

function mask(v?: string) {
  if (!v) return null;
  return v.length <= 8 ? "********" : `${v.slice(0,4)}...${v.slice(-4)}`;
}

export async function GET() {
  return NextResponse.json({
    env: process.env.VERCEL_ENV || process.env.NODE_ENV,
    paypal: {
      base: process.env.PAYPAL_API_BASE || null,        // <— debe ser api-m.paypal.com
      nextPublicClientId: mask(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID),
      serverClientId: mask(process.env.PAYPAL_CLIENT_ID),
      hasSecret: !!process.env.PAYPAL_CLIENT_SECRET,
    },
    email: {
      from: process.env.EMAIL_FROM || null,
      hasResendKey: !!process.env.RESEND_API_KEY,
    },
    time: new Date().toISOString(),
  });
}