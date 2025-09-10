// app/api/version/route.ts
import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      env: process.env.VERCEL_ENV || "local",
      commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
      repo: process.env.VERCEL_GIT_REPO_SLUG || null,
      branch: process.env.VERCEL_GIT_COMMIT_REF || null,
      builtAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } }
  );
}