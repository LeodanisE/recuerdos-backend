// app/api/multipart/put/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const presignedUrl = req.nextUrl.searchParams.get("url") || "";
    const sizeParam = req.nextUrl.searchParams.get("size") || "";
    const type = req.nextUrl.searchParams.get("type") || "application/octet-stream";

    if (!presignedUrl || presignedUrl === "[object Object]") {
      return NextResponse.json({ ok: false, error: "Parámetro ?url inválido" }, { status: 400 });
    }

    const hasNumericSize = /^\d+$/.test(sizeParam);
    const contentLength = hasNumericSize ? sizeParam : undefined;

    // Intentamos usar el stream directo; si no, caemos a ArrayBuffer (Edge/compat)
    let body: any = req.body;
    let useStream = !!body;

    if (!useStream) {
      // Edge / o si el stream no está disponible
      const ab = await req.arrayBuffer();
      body = ab;
    }

    const init: any = {
      method: "PUT",
      headers: {
        ...(contentLength ? { "content-length": contentLength } : {}),
        "content-type": type,
      },
      body,
    };

    // En Node 18, cuando body es ReadableStream hay que indicar duplex
    if (useStream) {
      init.duplex = "half";
    }

    const upstream = await fetch(presignedUrl, init);

    const etag = upstream.headers.get("etag") || upstream.headers.get("ETag");
    const text = await upstream.text().catch(() => "");

    if (!upstream.ok) {
      // Devolvemos 200 con ok:false para que el front pueda leer el JSON siempre
      return NextResponse.json(
        { ok: false, status: upstream.status, etag: etag || null, body: text.slice(0, 500) },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true, status: upstream.status, etag: etag || null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "put_proxy_error" }, { status: 500 });
  }
}