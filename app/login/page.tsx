// /app/login/page.tsx
"use client";
import * as React from "react";

export default function LoginPage() {
  const [step, setStep] = React.useState<"email" | "code">("email");
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [msg, setMsg] = React.useState("");

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setMsg("Enviando código…");
    const res = await fetch("/api/auth/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) return setMsg(data.error || "Error");
    setMsg("Te envié un código al email.");
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setMsg("Verificando…");
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) return setMsg(data.error || "Error");
    setMsg("Listo, entrando…");
    window.location.href = "/upload-qr";
  }

  return (
    <div style={{ padding: 24, maxWidth: 420, margin: "0 auto", fontFamily: "system-ui" }}>
      <h1>Entrar</h1>

      {step === "email" && (
        <form onSubmit={start} style={{ display: "grid", gap: 12 }}>
          <input
            type="email"
            required
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit">Enviar código</button>
      </form>
      )}

      {step === "code" && (
        <form onSubmit={verify} style={{ display: "grid", gap: 12 }}>
          <p style={{ color: "#666", fontSize: 14 }}>
            Código enviado a <b>{email}</b>.
          </p>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            required
            placeholder="código de 6 dígitos"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button type="submit">Verificar y entrar</button>
          <button type="button" onClick={() => setStep("email")}>Cambiar correo</button>
        </form>
      )}

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  );
}