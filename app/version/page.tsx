export const dynamic = "force-dynamic";

export default async function VersionPage() {
  const res = await fetch("/api/version", { cache: "no-store" }).catch(() => null);
  const payload =
    (res && (await res.json().catch(() => null))) || {
      ok: false,
      error: "no response",
    };

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>/version</h1>
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
        {JSON.stringify(payload, null, 2)}
      </pre>
    </main>
  );
}
