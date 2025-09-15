// app/api/version/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const branch = process.env.VERCEL_GIT_COMMIT_REF || process.env.GIT_BRANCH || "unknown";
  const commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT || "unknown";
  const builtAt = new Date().toISOString();

  return NextResponse.json(
    { ok: true, branch, commit, builtAt },
    { headers: { "Cache-Control": "no-store" } },
  );
}