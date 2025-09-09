// /middleware.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Protegemos /upload, /my-codes y APIs críticas.
 * /upload-qr y /api/access/* quedan PÚBLICAS.
 */
export const config = {
  matcher: [
    // páginas privadas
    "/upload",
    "/upload/:path*",
    "/my-codes",
    "/my-codes/:path*",

    // APIs que requieren pago
    "/api/multipart/:path*",
    "/api/sign",
    "/api/email",
    "/api/links/:path*",
    // OJO: NO incluimos /api/access/* ni /upload-qr
  ],
};

function setNoStore(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

export function middleware(req: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    return setNoStore(NextResponse.next());
  }

  const path = req.nextUrl.pathname;
  const hasAccess =
    Boolean(req.cookies.get("vx_user")?.value) ||
    Boolean(req.cookies.get("vx_order")?.value);

  // Páginas protegidas
  const isProtectedPage =
    path === "/upload" ||
    path.startsWith("/upload/") ||
    path === "/my-codes" ||
    path.startsWith("/my-codes/");

  if (isProtectedPage && !hasAccess) {
    const url = req.nextUrl.clone();
    url.pathname = "/pricing";
    url.searchParams.set("need", "valid");
    const res = NextResponse.redirect(url);
    res.headers.set("x-mid", "paywall-page");
    return setNoStore(res);
  }

  // APIs protegidas
  const isProtectedApi =
    path.startsWith("/api/multipart/") ||
    path === "/api/sign" ||
    path === "/api/email" ||
    path.startsWith("/api/links/");

  if (isProtectedApi && !hasAccess) {
    return new NextResponse(JSON.stringify({ ok: false, error: "NEED_PAYMENT" }), {
      status: 402,
      headers: {
        "content-type": "application/json",
        "Cache-Control": "no-store",
        "x-mid": "paywall-api",
      },
    });
  }

  return setNoStore(NextResponse.next());
}