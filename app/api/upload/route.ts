import { NextResponse } from "next/server";
import { Upload } from "@aws-sdk/lib-storage";
import { s3 } from "@/lib/b2";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ ok: false, msg: "No llegó 'file'" }, { status: 400 });
    }

    const ab = await file.arrayBuffer();
    const buf = Buffer.from(ab); // también podrías usar: new Uint8Array(ab)

    const bucket = (process.env.B2_BUCKET_NAME || "").trim();
    const key = `${Date.now()}-${file.name}`;

    console.log("bucket:", bucket);
    console.log("endpoint:", process.env.B2_ENDPOINT_URL);
    console.log("file.size:", file.size, "buf.length:", buf.length);

    const uploader = new Upload({
      client: s3,
      params: {
        Bucket: bucket,
        Key: key,
        Body: buf,
        ContentType: file.type || "application/octet-stream",
      },
      queueSize: 1,
      partSize: 8 * 1024 * 1024,
      leavePartsOnError: false,
    });

    await uploader.done();

    return NextResponse.json({ ok: true, key, msg: `Archivo ${file.name} subido 🚀` });
  } catch (err: any) {
    console.error("UPLOAD ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.Code || err?.name || "UploadError", detail: err?.message },
      { status: 500 }
    );
  }
}