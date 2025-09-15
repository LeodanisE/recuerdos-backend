import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: any) {
  const { code } = await ctx.params; // Next 15: params es async
  return new Response(
    JSON.stringify({
      ok: false,
      error: "Resolución de códigos desactivada.",
      code,
    }),
    { status: 404, headers: { "Content-Type": "application/json" } }
  );
}