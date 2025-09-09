"use client";
import { useState } from "react";

export default function PayTest() {
  const [out, setOut] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function crearOrden() {
    setLoading(true);
    setOut(null);
    try {
      const res = await fetch("/api/paypal/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: "p1-30d" }),
      });
      const data = await res.json();
      setOut(data);
    } catch (e: any) {
      setOut({ ok: false, error: e?.message || "request failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 520, margin: "40px auto", padding: 16, fontFamily: "sans-serif" }}>
      <h1>Test PayPal Create</h1>

      <button
        onClick={crearOrden}
        disabled={loading}
        style={{ padding: "10px 16px", fontWeight: 600, cursor: "pointer" }}
      >
        {loading ? "Creando orden..." : "Crear orden de $1 (30 días)"}
      </button>

      {out && (
        <pre style={{ marginTop: 16, background: "#f5f5f5", padding: 12, overflowX: "auto" }}>
{JSON.stringify(out, null, 2)}
        </pre>
      )}

      {out?.ok && out?.approveUrl && (
        <p style={{ marginTop: 12 }}>
          <a href={out.approveUrl} target="_blank" rel="noreferrer">Ir a PayPal (approve)</a>
        </p>
      )}
    </main>
  );
}
