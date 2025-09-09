// app/version/page.tsx
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

type Info = {
  ok: boolean;
  env?: string | null;
  commit?: string | null;
  repo?: string | null;
  branch?: string | null;
  builtAt?: string | null;
  error?: string;
};

async function baseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host =
    h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export default async function VersionPage() {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL || (await baseUrl());

  let j: Info = { ok: false, error: "no response" };
  try {
    const res = await fetch(`${base}/api/version`, {
      cache: "no-store",
      // Evita cualq. revalidación implícita
      next: { revalidate: 0 },
    });
    j = (await res.json()) as Info;
  } catch {
    j = { ok: false, error: "no response" };
  }

  const tag = j.commit
    ? `commit ${j.commit.slice(0, 7)}${j.branch ? ` (${j.branch})` : ""}`
    : "dev";

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Version Check</h1>
      <p>
        build: <b>{tag}</b>
      </p>
      <p>{j.builtAt ?? ""}</p>
      <pre
        style={{
          marginTop: 12,
          background: "#0b1020",
          color: "#e6ecff",
          padding: 12,
          borderRadius: 8,
          overflowX: "auto",
        }}
      >
        {JSON.stringify(j, null, 2)}
      </pre>
    </main>
  );
}