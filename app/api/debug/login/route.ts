// app/api/debug/login/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Uso: /api/debug/login?email=...&order=...&plan=30d&to=/upload
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = (searchParams.get("email") || "").trim().toLowerCase();
  const order = (searchParams.get("order") || "").trim();
  const plan  = (searchParams.get("plan")  || "30d").trim();
  const to    = (searchParams.get("to")    || "/").trim();

  const resp = NextResponse.redirect(new URL(to, req.url));
  const maxAge = 60 * 60 * 24 * 30; // 30 días

  // En dev: secure=false para que Chrome acepte cookies en http://localhost
  if (email) resp.cookies.set("vx_user",  email, { httpOnly:true, sameSite:"lax", secure:false, path:"/", maxAge });
  if (order) resp.cookies.set("vx_order", order, { httpOnly:true, sameSite:"lax", secure:false, path:"/", maxAge });
  resp.cookies.set("vx_plan", plan, { httpOnly:true, sameSite:"lax", secure:false, path:"/", maxAge });

  return resp;
}