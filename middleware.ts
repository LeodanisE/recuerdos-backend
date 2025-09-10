// /middleware.ts
import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: [
    // páginas estrictas (si las tienes)
    "/upload",
    "/my-codes",
    "/my-codes/:path*",

    // APIs con control de acceso/pago
    "/api/multipart/:path*",
    "/api/sign",
    "/api/email",
    "/api/links/:path*",
  ],
};

function noStore(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  res.headers.set("x-mid", "paywall");
  return res;
}

export function middleware(req: NextRequest) {
  // En dev, no bloquear nada (pero no-cache)
  if (process.env.NODE_ENV !== "production") return noStore(NextResponse.next());

  const p = req.nextUrl.pathname;
  const hasAccess =
    Boolean(req.cookies.get("vx_user")?.value) || Boolean(req.cookies.get("vx_order")?.value);

  // páginas
  const isProtectedPage = p === "/upload" || p.startsWith("/my-codes");
  if (isProtectedPage && !hasAccess) {
    const url = req.nextUrl.clone();
    url.pathname = "/pricing";
    url.searchParams.set("need", "valid");
    return noStore(NextResponse.redirect(url));
  }

  // APIs
  const isProtectedApi =
    p.startsWith("/api/multipart/") ||
    p === "/api/sign" ||
    p === "/api/email" ||
    p.startsWith("/api/links/");

  if (isProtectedApi && !hasAccess) {
    return new NextResponse(JSON.stringify({ ok: false, error: "NEED_PAYMENT" }), {
      status: 402,
      headers: { "content-type": "application/json", "Cache-Control": "no-store" },
    });
  }

  return noStore(NextResponse.next());
}