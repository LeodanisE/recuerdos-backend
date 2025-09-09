// app/version/page.tsx
export const dynamic = "force-dynamic";
export default function VersionPage() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Version</h1>
      <p>build v1</p>
      <p>{new Date().toISOString()}</p>
    </main>
  );
}