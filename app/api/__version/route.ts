// app/api/__version/route.ts
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET() {
  return NextResponse.json({
    ok: true,
    where: "/api/__version",
    version: "build v1",
    buildTime: new Date().toISOString(),
  });
}