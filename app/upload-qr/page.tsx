"use client";

import * as React from "react";
import { QRCodeCanvas } from "qrcode.react";

type Msg = { text: React.ReactNode; type: "success" | "error" | "" };

export const dynamic = "force-dynamic";
const VERSION = "upload-qr v4.7";

export default function UploadQRPage() {
  const [msg, setMsg] = React.useState<Msg>({ text: "", type: "" });
  const [key, setKey] = React.useState<string | null>(null);
  const [signedUrl, setSignedUrl] = React.useState<string | null>(null);
  const [shortUrl, setShortUrl] = React.useState<string | null>(null);

  const [email, setEmail] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [emailMsg, setEmailMsg] = React.useState<{ text: string; type: "ok" | "err" | "" }>({ text: "", type: "" });

  const [needsAccess, setNeedsAccess] = React.useState(false);
  const [waitingPay, setWaitingPay] = React.useState(false);
  const lastFileRef = React.useRef<File | null>(null);
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const APP_ORIGIN =
    (process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "") ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

  // 1) Limpia cualquier query ?plan=... SIN recargar (no se pierde el file)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    if (u.searchParams.has("plan")) {
      u.searchParams.delete("plan");
      window.history.replaceState({}, "", u.pathname + (u.search ? "?" + u.search : ""));
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function checkAccess() {
    const r = await fetch("/api/access/status", { cache: "no-store" });
    return r.ok;
  }

  function startPollingAndRetry() {
    if (pollRef.current) clearInterval(pollRef.current);
    setWaitingPay(true);
    let tries = 0;
    pollRef.current = setInterval(async () => {
      tries++;
      const ok = await checkAccess().catch(() => false);
      if (ok) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setWaitingPay(false);
        setNeedsAccess(false);
        if (lastFileRef.current) await startUpload(lastFileRef.current);
      } else if (tries > 120) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setWaitingPay(false);
      }
    }, 2000);
  }

  async function activateFree() {
    const r = await fetch("/api/access/free", { method: "POST" });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.ok) return setMsg({ text: "No se pudo activar el plan gratis.", type: "error" });
    setNeedsAccess(false);
    if (lastFileRef.current) await startUpload(lastFileRef.current);
    else setMsg({ text: "Gratis 24 h activado. Sube tu archivo.", type: "success" });
  }

  function Paywall() {
    return (
      <div style={{ marginTop: 12, padding: 12, border: "1px dashed #e5e7eb", borderRadius: 8 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Necesitas completar el pago para generar el QR.</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={activateFree} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #111" }}>
            Activar gratis 24 h
          </button>
          <a
            href="/pricing?need=valid"
            target="_blank"
            rel="noreferrer"
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #111", textDecoration: "none" }}
            onClick={() => startPollingAndRetry()}
          >
            Ir a pagar (otra pestaña)
          </a>
          <button onClick={() => startPollingAndRetry()} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #111" }}>
            Ya pagué, reintentar
          </button>
        </div>
        {waitingPay && <div style={{ marginTop: 8, color: "#6b7280", fontSize: 13 }}>Esperando pago… reintentará solo.</div>}
      </div>
    );
  }

  async function startUpload(file: File) {
    setMsg({ text: "Subiendo…", type: "" });
    setKey(null); setSignedUrl(null); setShortUrl(null);
    setEmailMsg({ text: "", type: "" });

    try {
      // INIT
      let res = await fetch(`/api/multipart/init?` + new URLSearchParams({
        filename: file.name, contentType: file.type || "application/octet-stream", parts: "1",
      }).toString(), { cache: "no-store" });
      if (res.status === 402) { setNeedsAccess(true); return setMsg({ text: <Paywall />, type: "error" }); }
      let data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) return setMsg({ text: data?.error || `INIT ${res.status}`, type: "error" });

      const objectKey: string = data.key;
      const uploadId: string  = data.uploadId;
      const putUrl: string    = data.urls?.[0]?.url || data.url;
      if (!putUrl || !objectKey || !uploadId) return setMsg({ text: "INIT incompleto.", type: "error" });

      // PUT
      res = await fetch(`/api/multipart/put?url=${encodeURIComponent(putUrl)}&size=${file.size}&type=${encodeURIComponent(file.type || "application/octet-stream")}`,
        { method: "POST", body: file, cache: "no-store" });
      if (res.status === 402) { setNeedsAccess(true); return setMsg({ text: <Paywall />, type: "error" }); }
      const putJson = await res.json().catch(() => null);
      if (!res.ok || !putJson?.ok) {
        const snip = putJson?.bodySnippet ? ` — ${String(putJson.bodySnippet).slice(0, 160)}…` : "";
        return setMsg({ text: `PUT ${res.status}. ${putJson?.error || ""}${snip}`, type: "error" });
      }
      const ETag = putJson?.etag || res.headers.get("etag") || res.headers.get("ETag") || "";
      if (!ETag) return setMsg({ text: "Sin ETag en PUT.", type: "error" });

      // COMPLETE
      res = await fetch(`/api/multipart/complete`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId, key: objectKey, parts: [{ ETag, PartNumber: 1 }] }), cache: "no-store",
      });
      if (res.status === 402) { setNeedsAccess(true); return setMsg({ text: <Paywall />, type: "error" }); }
      data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) return setMsg({ text: data?.error || `COMPLETE ${res.status}`, type: "error" });

      // SIGN
      res = await fetch(`/api/sign?key=${encodeURIComponent(objectKey)}`, { cache: "no-store" });
      if (res.status === 402) { setNeedsAccess(true); return setMsg({ text: <Paywall />, type: "error" }); }
      data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok || !data?.url) {
        setKey(objectKey);
        setShortUrl(`${APP_ORIGIN}/l/${encodeURIComponent(objectKey)}`);
        return setMsg({ text: "Subido, pero sin firma URL.", type: "error" });
      }

      setKey(objectKey);
      setSignedUrl(data.url);
      setShortUrl(`${APP_ORIGIN}/l/${encodeURIComponent(objectKey)}`);
      setMsg({ text: "¡Archivo subido correctamente!", type: "success" });
    } catch (err: any) {
      setMsg({ text: err?.message || "Error inesperado durante la subida.", type: "error" });
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const file = (form.elements.namedItem("file") as HTMLInputElement | null)?.files?.[0];
    const tos  = (form.elements.namedItem("tos") as HTMLInputElement | null)?.checked;
    if (!file) return setMsg({ text: "Selecciona un archivo.", type: "error" });
    if (!tos)  return setMsg({ text: "Debes aceptar los términos de uso.", type: "error" });
    lastFileRef.current = file;
    await startUpload(file);
  }

  async function sendEmail() {
    try {
      if (!key) return setEmailMsg({ text: "No hay archivo subido todavía.", type: "err" });
      if (!email) return setEmailMsg({ text: "Ingresa un correo válido.", type: "err" });
      setSending(true); setEmailMsg({ text: "", type: "" });
      const r = await fetch("/api/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: email, key }) });
      if (r.status === 402) { setNeedsAccess(true); setEmailMsg({ text: "Necesitas acceso para enviar por email.", type: "err" }); return; }
      const j = await r.json().catch(() => ({} as any));
      if (!r.ok || !j?.ok) setEmailMsg({ text: j?.error || "No se pudo enviar el correo.", type: "err" });
      else setEmailMsg({ text: "Correo enviado ✅", type: "ok" });
    } finally { setSending(false); }
  }

  const qrValue = shortUrl || signedUrl || "";

  return (
    <div style={{ padding: 20, fontFamily: "system-ui" }}>
      <h1>Sube un archivo y genera tu QR</h1>
      <p style={{ color: "#888", fontSize: 12, margin: "4px 0 16px" }}>{VERSION}</p>

      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480 }}>
        <input type="file" name="file" />
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" name="tos" required />
          <span style={{ fontSize: 14 }}>Acepto no subir contenido sexual, violento, ilegal o con copyright sin permiso.</span>
        </label>
        <button type="submit">Subir</button>
      </form>

      {msg.text && <div style={{ marginTop: 12, color: msg.type === "error" ? "red" : "green", fontWeight: "bold" }}>{msg.text}</div>}

      {(signedUrl || shortUrl || key) && (
        <div style={{ marginTop: 20 }}>
          {signedUrl && (
            <p style={{ marginBottom: 8 }}>
              Enlace directo (temporal):{" "}
              <a href={signedUrl} target="_blank" rel="noreferrer">
                {signedUrl.length > 80 ? signedUrl.slice(0, 80) + "…" : signedUrl}
              </a>
            </p>
          )}
          {shortUrl && (
            <p style={{ marginBottom: 12 }}>
              Enlace corto: <a href={shortUrl} target="_blank" rel="noreferrer">{shortUrl}</a>
            </p>
          )}
          {!!qrValue && (
            <>
              <div style={{ display: "inline-block", padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
                <QRCodeCanvas id="qrCanvas" value={qrValue} size={220} includeMargin />
              </div>
              <div style={{ marginTop: 10 }}>
                <button onClick={() => {
                  const canvas = document.getElementById("qrCanvas") as HTMLCanvasElement | null;
                  if (!canvas) return;
                  const a = document.createElement("a");
                  a.href = canvas.toDataURL("image/png");
                  a.download = "qr.png";
                  a.click();
                }}>Descargar QR</button>
              </div>
            </>
          )}
          {key && <p style={{ marginTop: 8, color: "#666" }}>Key: {key}</p>}
        </div>
      )}

      {needsAccess && <Paywall />}

      <div style={{ marginTop: 16, padding: 12, border: "1px solid #e5e7eb", borderRadius: 8, maxWidth: 480 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Enviar el QR y enlace a tu correo</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="email" placeholder="tucorreo@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)}
                 style={{ flex: 1, padding: 8, border: "1px solid #ddd", borderRadius: 6 }} required />
          <button type="button" onClick={sendEmail} disabled={sending || !key}
                  style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #111" }}>
            {sending ? "Enviando…" : "Enviar"}
          </button>
        </div>
        {!key && <p style={{ marginTop: 8, color: "#6b7280" }}>Sube un archivo (y paga/activa gratis) para habilitar el envío por email.</p>}
        {emailMsg.text && (
          <p style={{ marginTop: 8, color: emailMsg.type === "err" ? "#b91c1c" : "#166534", fontWeight: 600 }}>
            {emailMsg.text}
          </p>
        )}
      </div>
    </div>
  );
}