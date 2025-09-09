export const dynamic = "force-dynamic";

type Info = {
  ok: boolean;
  env?: string | null;
  commit?: string | null;
  repo?: string | null;
  branch?: string | null;
  buildTag?: string | null;
  builtAt?: string | null;
  error?: string;
};

export default async function VersionPage() {
  const res = await fetch("/api/version", { cache: "no-store" }).catch(() => null);
  const j: Info =
    (res && (await res.json().catch(() => null))) || { ok: false, error: "no response" };

  const tag =
    j.buildTag ||
    (j.commit ? `commit ${j.commit.slice(0, 7)}` : "dev") +
      (j.branch ? ` (${j.branch})` : "");

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
