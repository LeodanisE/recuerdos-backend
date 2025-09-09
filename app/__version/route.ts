// app/__version/route.ts
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET() {
  return NextResponse.json({
    ok: true,
    where: "/__version",
    version: "build v1",
    buildTime: new Date().toISOString(),
  });
}