import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  return new Response(
    JSON.stringify({
      ok: false,
      error: "Endpoint /api/shorten desactivado.",
    }),
    { status: 501, headers: { "Content-Type": "application/json" } }
  );
}