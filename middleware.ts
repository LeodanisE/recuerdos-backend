// /middleware.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * PROTECCIÓN DE RUTAS EN PRODUCCIÓN
 * - Si NO hay cookies de acceso => redirige a /pricing?need=valid
 * - /upload-qr ahora también está protegido en producción.
 * - En desarrollo (npm run dev) NO se aplica la redirección.
 */
export const config = {
  matcher: [
    // páginas protegidas
    "/upload",
    "/upload/:path*",
    "/upload-qr",            // <<<<< AÑADIDO
    "/my-codes",
    "/my-codes/:path*",

    // APIs que requieren pago
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
  // En dev no bloqueamos nada
  if (process.env.NODE_ENV !== "production") {
    return noStore(NextResponse.next());
  }

  const path = req.nextUrl.pathname;

  // Señal de acceso: cualquiera de estas cookies
  const hasAccess =
    Boolean(req.cookies.get("vx_user")?.value) ||
    Boolean(req.cookies.get("vx_order")?.value) ||
    Boolean(req.cookies.get("vx_access")?.value);

  // ¿Es página protegida?
  const isProtectedPage =
    path === "/upload" ||
    path.startsWith("/upload/") ||
    path === "/my-codes" ||
    path.startsWith("/my-codes/") ||
    path === "/upload-qr"; // <<<<< AÑADIDO

  if (isProtectedPage && !hasAccess) {
    const url = req.nextUrl.clone();
    url.pathname = "/pricing";
    url.searchParams.set("need", "valid");
    return noStore(NextResponse.redirect(url));
  }

  // ¿Es API protegida?
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
        "x-mid": "paywall",
      },
    });
  }

  return noStore(NextResponse.next());
}