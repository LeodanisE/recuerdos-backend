// app/success/page.tsx
export default function SuccessPage() {
  return (
    <main style={{ maxWidth: 560, margin: "40px auto", padding: 16, fontFamily: "sans-serif", textAlign: "center" }}>
      <h1>✅ Pago completado</h1>
      <p>¡Gracias por tu compra! Tu acceso fue activado correctamente.</p>
      <a href="/" style={{ display: "inline-block", marginTop: 20, padding: "10px 16px", background: "#0070f3", color: "#fff", borderRadius: 6, textDecoration: "none" }}>
        Volver al inicio
      </a>
    </main>
  );
}