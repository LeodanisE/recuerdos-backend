"use client";

import * as React from "react";
import { QRCodeCanvas } from "qrcode.react";

type Msg = { text: string; type: "ok" | "err" | "" };

export default function UploadQRPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [toEmail, setToEmail] = React.useState("");

  const [link, setLink] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const [msg, setMsg] = React.useState<Msg>({ text: "", type: "" });
  const [mailMsg, setMailMsg] = React.useState<Msg>({ text: "", type: "" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg({ text: "", type: "" });
    setMailMsg({ text: "", type: "" });
    setLink(null);

    if (!file) return setMsg({ text: "Selecciona un archivo.", type: "err" });
    if (!toEmail.trim()) return setMsg({ text: "Escribe el correo del usuario.", type: "err" });

    const body = new FormData();
    body.append("file", file);

    setBusy(true);
    try {
      // 1) Subir
      const up = await fetch("/api/upload", { method: "POST", body });
      const upData = await up.json();
      if (!up.ok || !upData?.ok)
        throw new Error(upData?.detail || upData?.error || "Error subiendo archivo");

      setMsg(
        upData.existed
          ? { text: "Este archivo ya tenía QR. Reutilizando el mismo enlace (permanente).", type: "ok" }
          : { text: `Archivo subido: ${upData.key}`, type: "ok" }
      );

      // 2) Enviar correo (y generar shortUrl en Redis)
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: upData.url, to: toEmail.trim() }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "No se pudo enviar el correo.");

      // aquí usamos el shortUrl devuelto
      setLink(data.shortUrl || upData.url);
      setMailMsg({ text: "Correo enviado ✅", type: "ok" });
    } catch (err: any) {
      setMailMsg({ text: err.message || "Error enviando correo", type: "err" });
    } finally {
      setBusy(false);
    }
  }

  function copyLink() {
    if (!link) return;
    navigator.clipboard?.writeText(link).catch(() => {});
  }

  function downloadPng() {
    if (!link) return;
    const a = document.createElement("a");
    a.href = (document.getElementById("qr-png") as HTMLCanvasElement)?.toDataURL("image/png") || "#";
    a.download = "qr.png";
    a.click();
  }

  function shareWhatsApp() {
    if (!link) return;
    const text = encodeURIComponent(link);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Subir archivo → QR permanente → Enviar por correo</h1>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-sm text-gray-700">Correo del usuario</label>
          <input
            type="email"
            required
            value={toEmail}
            onChange={(e) => setToEmail(e.target.value)}
            placeholder="usuario@correo.com"
            className="w-full border rounded-lg p-3"
          />

          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full border rounded-lg p-3"
          />

          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
          >
            {busy ? "Procesando…" : "Subir y enviar QR"}
          </button>
        </form>

        {(msg.text || mailMsg.text) && (
          <div className="space-y-2">
            {msg.text && (
              <p className={msg.type === "ok" ? "text-green-700 bg-green-50 p-2 rounded" : "text-red-700 bg-red-50 p-2 rounded"}>
                {msg.text}
              </p>
            )}
            {mailMsg.text && (
              <p className={mailMsg.type === "ok" ? "text-green-700 bg-green-50 p-2 rounded" : "text-red-700 bg-red-50 p-2 rounded"}>
                {mailMsg.text}
              </p>
            )}
          </div>
        )}

        {link && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Enlace permanente:</p>
              <a href={link} target="_blank" rel="noreferrer" className="break-all text-blue-600 underline">
                {link}
              </a>
            </div>

            <div className="flex gap-3">
              <button onClick={copyLink} className="px-3 py-2 rounded-lg border">Copiar enlace</button>
              <button onClick={downloadPng} className="px-3 py-2 rounded-lg border">Descargar QR (PNG)</button>
              <button onClick={shareWhatsApp} className="px-3 py-2 rounded-lg border">Compartir por WhatsApp</button>
            </div>

            <div className="border rounded-xl p-3 w-fit">
              <QRCodeCanvas id="qr-png" value={link} size={220} includeMargin level="M" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}