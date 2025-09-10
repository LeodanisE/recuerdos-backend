"use client";

import * as React from "react";
import { QRCodeCanvas } from "qrcode.react";

type Msg = { text: string; type: "ok" | "err" | "" };

export default function UploadQRPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [url, setUrl] = React.useState<string | null>(null);
  const [key, setKey] = React.useState<string | null>(null);

  // Email UI
  const [email, setEmail] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [msg, setMsg] = React.useState<Msg>({ text: "", type: "" });

  const qrRef = React.useRef<QRCodeCanvas | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setMsg({ text: "", type: "" });
    if (!file) {
      setMsg({ text: "Selecciona un archivo primero.", type: "err" });
      return;
    }
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Error subiendo archivo");

      setUrl(data.url as string);
      setKey(data.key as string);
      setMsg({ text: data.msg ?? "Archivo subido 🚀", type: "ok" });
    } catch (err: any) {
      setMsg({ text: err.message || "Fallo la carga", type: "err" });
    } finally {
      setUploading(false);
    }
  }

  async function sendEmail() {
    if (!email || !url) {
      setMsg({ text: "Pon un correo válido y sube un archivo primero.", type: "err" });
      return;
    }
    try {
      setSending(true);
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email, url }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "No se pudo enviar el correo");
      setMsg({ text: "Correo enviado ✅", type: "ok" });
    } catch (err: any) {
      setMsg({ text: err.message || "Fallo enviando correo", type: "err" });
    } finally {
      setSending(false);
    }
  }

  function copyLink() {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setMsg({ text: "Enlace copiado al portapapeles", type: "ok" });
  }

  function downloadQR() {
    const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas || !url) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `qr-${key ?? "archivo"}.png`;
    a.click();
  }

  return (
    <div style={{ maxWidth: 680, margin: "32px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Subir archivo → QR</h1>
      <p style={{ color: "#666", marginBottom: 16 }}>
        Sube tu archivo, obtén un enlace <b>permanente</b> en este dominio y comparte el QR. Sin pagos.
      </p>

      <form onSubmit={handleUpload} style={{ display: "grid", gap: 12 }}>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          aria-label="archivo"
        />
        <button
          type="submit"
          disabled={uploading}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: uploading ? "#bbb" : "#111",
            color: "#fff",
            cursor: uploading ? "not-allowed" : "pointer",
          }}
        >
          {uploading ? "Subiendo..." : "Subir archivo"}
        </button>
      </form>

      {msg.text ? (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 10,
            background: msg.type === "err" ? "#ffe6e6" : "#e8fff0",
            color: msg.type === "err" ? "#b30000" : "#035e2f",
          }}
        >
          {msg.text}
        </div>
      ) : null}

      {url ? (
        <div style={{ marginTop: 24, padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
          <h2 style={{ margin: 0, marginBottom: 8 }}>Tu enlace</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
              wordBreak: "break-all",
            }}
          >
            <code style={{ fontSize: 13 }}>{url}</code>
            <button onClick={copyLink} style={{ padding: "6px 10px", borderRadius: 8 }}>
              Copiar
            </button>
          </div>

          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <QRCodeCanvas
              value={url}
              size={180}
              includeMargin
              ref={qrRef as any}
              style={{ borderRadius: 12 }}
            />
            <div style={{ display: "grid", gap: 8 }}>
              <button onClick={downloadQR} style={{ padding: "8px 12px", borderRadius: 10 }}>
                Descargar QR
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="email"
                  placeholder="tu_correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd" }}
                />
                <button
                  onClick={sendEmail}
                  disabled={sending}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: sending ? "#bbb" : "#0a7",
                    color: "#fff",
                    border: "none",
                    cursor: sending ? "not-allowed" : "pointer",
                  }}
                >
                  {sending ? "Enviando..." : "Enviar al correo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}