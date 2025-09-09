// app/version/page.tsx
export const dynamic = "force-dynamic";

export default function VersionPage() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Version Check</h1>
      <p style={{ marginTop: 8, color: "#555" }}>
        build: <strong>upload-qr v4.0</strong>
      </p>
      <p style={{ marginTop: 8, color: "#777" }}>
        {new Date().toISOString()}
      </p>
    </main>
  );
}