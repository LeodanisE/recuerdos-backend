// app/version/page.tsx
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function baseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export default async function VersionPage() {
  let info: any = null;
  let tag = "dev";

  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || (await baseUrl());
    const r = await fetch(`${base}/api/version?cb=${Date.now()}`, { cache: "no-store" });
    info = await r.json();
    if (info?.commit) tag = `commit ${String(info.commit).slice(0, 7)} (${info?.branch || "main"})`;
  } catch {
    info = { ok: false, error: "no response" };
  }

  return (
    <main style={{ padding: 16, fontFamily: "system-ui" }}>
      <div>Version Check</div>
      <div style={{ margin: "8px 0" }}>
        build: <strong>{tag}</strong>
      </div>
      <pre
        style={{
          background: "#0b1020",
          color: "white",
          padding: 12,
          borderRadius: 8,
          overflow: "auto",
        }}
      >
        {JSON.stringify(info, null, 2)}
      </pre>
    </main>
  );
}