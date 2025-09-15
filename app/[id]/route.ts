// app/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs"; // aseguramos que corra en Node

// Crea cliente Redis
async function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  return {
    async get(key: string) {
      const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      return data?.result ?? null;
    },
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const redis = await getRedis();
  const id = params.id;
  const key = `map:${id}`;

  try {
    const target = await redis.get(key);

    if (!target) {
      return new NextResponse(
        "No se configuró ningún mapeo de enlaces. Sube el archivo de nuevo.",
        { status: 404 }
      );
    }

    // Redirigimos al destino (firmado o público)
    return NextResponse.redirect(target, 302);
  } catch (err: any) {
    return new NextResponse("Error interno: " + err.message, { status: 500 });
  }
}