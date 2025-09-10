// app/api/access/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const op = url.searchParams.get("op") ?? "status";

  const vx_user = req.cookies.get("vx_user")?.value ?? null;
  const vx_order = req.cookies.get("vx_order")?.value ?? null;
  const hasAccess = Boolean(vx_user || vx_order);

  // /api/access?op=status
  if (op === "status") {
    return new NextResponse(
      JSON.stringify({ ok: true, hasAccess, cookies: { vx_user, vx_order } }),
      { headers: { "content-type": "application/json", ...NO_STORE } },
    );
  }

  // /api/access?op=reset
  if (op === "reset") {
    const res = new NextResponse(
      JSON.stringify({ ok: true, cleared: ["vx_user", "vx_order"] }),
      { headers: { "content-type": "application/json", ...NO_STORE } },
    );
    res.cookies.set("vx_user", "", { path: "/", maxAge: 0 });
    res.cookies.set("vx_order", "", { path: "/", maxAge: 0 });
    return res;
  }

  // /api/access?op=trial&hours=24
  if (op === "trial") {
    const hours = Math.max(1, Math.min(24 * 30, Number(url.searchParams.get("hours")) || 24));
    const ttl = hours * 60 * 60;
    const res = new NextResponse(
      JSON.stringify({ ok: true, granted: "vx_order", hours, ttlSeconds: ttl }),
      { headers: { "content-type": "application/json", ...NO_STORE } },
    );
    res.cookies.set("vx_order", `trial-${Date.now()}`, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: ttl,
    });
    return res;
  }

  return new NextResponse(
    JSON.stringify({
      ok: false,
      error: "unknown op",
      usage: ["/api/access?op=status", "/api/access?op=reset", "/api/access?op=trial&hours=24"],
    }),
    { status: 400, headers: { "content-type": "application/json", ...NO_STORE } },
  );
}