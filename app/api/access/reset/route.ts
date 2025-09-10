// app/api/access/reset/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clearCookie(res: NextResponse, name: string, domain?: string, path = "/") {
  res.cookies.set(name, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path,
    ...(domain ? { domain } : {}),
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const host = url.hostname.replace(/:\d+$/, "");
  const apex = host.replace(/^www\./, "");

  // IMPORTANTE: mantener los backticks (`) en estas dos líneas
  const domains = Array.from(
    new Set<string | undefined>([
      undefined,
      host,
      apex,
      `.${apex}`,
      `www.${apex}`,
    ]),
  );

  const paths = ["/", "/upload", "/upload-qr", "/api", "/pricing"];
  const names = ["vx_user", "vx_order", "vx_access"];

  const res = NextResponse.json({ ok: true, cleared: { names, domains, paths } });

  for (const name of names) {
    for (const d of domains) {
      for (const p of paths) {
        clearCookie(res, name, d, p);
      }
    }
  }

  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}