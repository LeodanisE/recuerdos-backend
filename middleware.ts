// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ALWAYS_ALLOW = [
  "/upload-qr",
  "/api/upload",
  "/api/email",
  "/api/_health",
  "/favicon.ico",
];

export function middleware(req: NextRequest) {
  const { pathname } = new URL(req.url);

  // Permitir Next internals y estáticos
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/assets") ||
    pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|gif|css|js|map)$/)
  ) {
    return NextResponse.next();
  }

  // Permitir rutas críticas
  if (ALWAYS_ALLOW.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ❌ Elimina cualquier redirección a /pricing que tuvieras aquí
  // return NextResponse.redirect(new URL("/pricing", req.url));

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api).*)"], // api ya queda fuera por matcher
};