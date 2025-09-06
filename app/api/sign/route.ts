// app/api/sign/route.ts
import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "@/lib/b2";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    if (!key) return NextResponse.json({ ok: false, msg: "Falta key" }, { status: 400 });

    const bucket = (process.env.B2_BUCKET_NAME || "").trim();

    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        ResponseContentDisposition: "inline", // o "attachment"
      }),
      { expiresIn: 60 * 60 * 24 } // 24h
    );

    return NextResponse.json({ ok: true, url });
  } catch (err: any) {
    console.error("SIGN ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.Code || err?.name || "SignError", detail: err?.message },
      { status: 500 }
    );
  }
}