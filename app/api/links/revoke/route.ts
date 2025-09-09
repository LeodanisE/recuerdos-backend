// /app/api/links/revoke/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserItems, saveUserItems } from "@/lib/store";
import { kvGetJSON, kvSetJSON } from "@/lib/kv";

export async function POST(req: NextRequest) {
  const email = req.cookies.get("vx_user")?.value || "";
  if (!email) return NextResponse.json({ ok: false, error: "No auth" }, { status: 401 });

  const { code } = (await req.json()) as { code?: string };
  if (!code) return NextResponse.json({ ok: false, error: "Falta code" }, { status: 400 });

  const rec = await kvGetJSON<{ owner: string; url: string; key: string; valid: boolean; createdAt: number }>(`code:${code}`);
  if (!rec) return NextResponse.json({ ok: false, error: "No existe" }, { status: 404 });
  if (rec.owner !== email) return NextResponse.json({ ok: false, error: "No permitido" }, { status: 403 });

  rec.valid = false;
  await kvSetJSON(`code:${code}`, rec);

  const list = await getUserItems(email);
  const idx = list.findIndex(x => x.code === code);
  if (idx >= 0) { list[idx].valid = false; await saveUserItems(email, list); }

  return NextResponse.json({ ok: true });
}