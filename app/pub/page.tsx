export const dynamic = "force-dynamic";
export default function PubPage() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>PUBLIC-OK v1</h1>
      <p>{new Date().toISOString()}</p>
    </main>
  );
}