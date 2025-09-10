import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  const env =
    process.env.VERCEL_ENV === "production"
      ? "producción"
      : process.env.VERCEL_ENV || process.env.NODE_ENV || "dev";
  return NextResponse.json(
    {
      ok: true,
      env,
      commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_SHA || "local",
      repo: process.env.VERCEL_GIT_REPO_SLUG || "recuerdos-backend",
      branch: process.env.VERCEL_GIT_COMMIT_REF || "main",
      builtAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
