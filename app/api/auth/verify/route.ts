// /app/api/auth/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { kvGetJSON, kvSetJSON, kvDel } from "@/lib/kv";

export async function POST(req: NextRequest) {
  try {
    const { email, code } = (await req.json()) as { email?: string; code?: string };
    const e = email?.trim().toLowerCase();
    const c = (code || "").trim();
    if (!e || !c) return NextResponse.json({ ok: false, error: "Faltan campos" }, { status: 400 });

    const rec = await kvGetJSON<{ code: string; attempts: number }>(`login:${e}`);
    if (!rec) return NextResponse.json({ ok: false, error: "Código expirado" }, { status: 400 });

    if (rec.code !== c) {
      const attempts = (rec.attempts || 0) + 1;
      await kvSetJSON(`login:${e}`, { code: rec.code, attempts }, 600);
      return NextResponse.json({ ok: false, error: "Código incorrecto" }, { status: 400 });
    }

    await kvDel(`login:${e}`);

    const res = NextResponse.json({ ok: true });
    res.cookies.set("vx_user", e, {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // ponlo true en prod bajo HTTPS
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 días
    });
    return res;
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "error" }, { status: 500 });
  }
}