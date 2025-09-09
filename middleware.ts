// middleware.ts
import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: [
    "/upload/:path*",
    "/upload-qr/:path*",
    "/my-codes/:path*",
    "/__version",
    "/api/__version",
    "/version",
  ],
};

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // permitir libremente las rutas de verificación
  if (path === "/__version" || path === "/api/__version" || path === "/version") {
    const r = NextResponse.next();
    r.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    r.headers.set("Pragma", "no-cache");
    r.headers.set("Expires", "0");
    return r;
  }

  // tu regla original (solo producción)
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) {
    const user = req.cookies.get("vx_user")?.value || "";
    const order = req.cookies.get("vx_order")?.value || "";
    const needsAuth =
      path.startsWith("/upload") ||
      path.startsWith("/upload-qr") ||
      path.startsWith("/my-codes");

    if (needsAuth && !(user || order)) {
      const url = req.nextUrl.clone();
      url.pathname = "/pricing";
      url.searchParams.set("need", "valid");
      const res = NextResponse.redirect(url);
      res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
      res.headers.set("Pragma", "no-cache");
      res.headers.set("Expires", "0");
      return res;
    }
  }

  const res = NextResponse.next();
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}