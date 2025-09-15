// app/api/links/create/route.ts
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  // 🔒 El acortador de links está desactivado en producción para evitar dependencias.
  // Si lo necesitas más adelante, lo reactivamos con una implementación estable.
  return new Response(
    JSON.stringify({
      ok: false,
      error: "Link shortener desactivado en este proyecto.",
    }),
    { status: 501, headers: { "Content-Type": "application/json" } }
  );
}