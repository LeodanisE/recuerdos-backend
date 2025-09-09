"use client";

import * as React from "react";

export default function PricingPage() {
  async function activateFree() {
    const r = await fetch("/api/access/free", { method: "POST" });
    const j = await r.json().catch(() => null);
    if (r.ok && j?.ok) {
      window.location.assign("/upload-qr");
    } else {
      alert(j?.error || "No se pudo activar el plan gratis.");
    }
  }

  return (
    <main style={{ padding: 20, fontFamily: "system-ui" }}>
      <h1>Planes</h1>
      <p>Paga una vez. Recibe un código QR que te redirige a tu archivo. Sin suscripción.</p>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", maxWidth: 900 }}>
        <div style={{ border: "2px solid #111", borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 700 }}>Gratis 24h</div>
          <div style={{ color: "#555", marginTop: 4 }}>Una sola carga. El enlace/QR caduca en 24 horas.</div>
          <button onClick={activateFree} style={{ marginTop: 12, padding: "8px 12px", border: "1px solid #111", borderRadius: 6 }}>
            Activar gratis
          </button>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 700 }}>$1 por 30 días</div>
          <div style={{ color: "#555", marginTop: 4 }}>Acceso por 30 días. Sin suscripción.</div>
          <a href="#" onClick={(e)=>{e.preventDefault(); alert("Configura PayPal sandbox primero.");}}
             style={{ display:"inline-block", marginTop: 12, padding:"8px 12px", border:"1px solid #111", borderRadius:6, textDecoration:"none" }}>
            Pagar con PayPal (sandbox)
          </a>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 700 }}>$5 por 10 años</div>
          <div style={{ color: "#555", marginTop: 4 }}>Próximamente.</div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 700 }}>$9 de por vida</div>
          <div style={{ color: "#555", marginTop: 4 }}>Próximamente.</div>
        </div>
      </div>
    </main>
  );
}