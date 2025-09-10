"use client";

import * as React from "react";
import { QRCodeCanvas } from "qrcode.react";

type Msg = { text: string; type: "success" | "error" | "" };

export default function UploadClient({ initialTag }: { initialTag: string }) {
  const [msg, setMsg] = React.useState<Msg>({ text: "", type: "" });
  const [key, setKey] = React.useState<string | null>(null);
  const [signedUrl, setSignedUrl] = React.useState<string | null>(null);
  const [shortUrl, setShortUrl] = React.useState<string | null>(null);

  // Email UI
  const [email, setEmail] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [emailMsg, setEmailMsg] = React.useState<{ text: string; type: "ok" | "err" | "" }>({
    text: "",
    type: "",
  });

  function originForLinks() {
    const env = process.env.NEXT_PUBLIC_SITE_URL;
    if (env && env.trim().length > 0) return env.replace(/\/+$/, "");
    if (typeof window !== "undefined") return window.location.origin;
    return "http://localhost:3000";
  }

  function goPricing(reason?: string) {
    if (typeof window === "undefined") return;
    const u = new URL("/pricing", window.location.origin);
    u.searchParams.set("need", "valid");
    u.searchParams.set("from", "upload-qr");
    if (reason) u.searchParams.set("reason", reason);
    window.location.href = u.toString();
  }

  async function resetAccess() {
    try {
      await fetch("/api/access/reset", { cache: "no-store" });
    } catch {}
    goPricing("reset");
  }

  function needPay(detail?: string) {
    setMsg({ text: "NEED_PAYMENT", type: "error" });
    goPricing(detail);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg({ text: "Subiendo…", type: "" });
    setKey(null);
    setSignedUrl(null);
    setShortUrl(null);
    setEmailMsg({ text: "", type: "" });

    const form = e.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement | null;
    const tos = (form.elements.namedItem("tos") as HTMLInputElement | null)?.checked;
    const file = input?.files?.[0];

    if (!file) return setMsg({ text: "Selecciona un archivo.", type: "error" });
    if (!tos) return setMsg({ text: "Debes aceptar los términos de uso.", type: "error" });

    try {
      // 1) INIT
      const q = new URLSearchParams({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        parts: "1",
      }).toString();

      const initRes = await fetch(`/api/multipart/init?${q}`, { cache: "no-store" });
      if (initRes.status === 402) return needPay("init");

      const initData = await initRes.json().catch(() => null);
      if (!initRes.ok || !initData?.ok) {
        if (String(initData?.error || "").includes("NEED_PAYMENT")) return needPay("init");
        return setMsg({
          text:
            initData?.error ||
            initData?.detail ||
            `No se pudo iniciar la subida (INIT ${initRes.status}).`,
          type: "error",
        });
      }

      const objectKey: string = initData.key;
      const uploadId: string = initData.uploadId;
      const putUrl: string = initData.urls?.[0]?.url || initData.url;

      if (!putUrl || !objectKey || !uploadId) {
        return setMsg({ text: "INIT incompleto. Falta URL o claves.", type: "error" });
      }

      // 2) PUT
      const putRes = await fetch(
        `/api/multipart/put?url=${encodeURIComponent(putUrl)}&size=${file.size}&type=${encodeURIComponent(
          file.type || "application/octet-stream",
        )}`,
        { method: "POST", body: file, cache: "no-store" },
      );
      if (putRes.status === 402) return needPay("put");

      const putJson = await putRes.json().catch(() => null);
      if (!putRes.ok || !putJson?.ok) {
        if (String(putJson?.error || "").includes("NEED_PAYMENT")) return needPay("put");
        const snippet = putJson?.bodySnippet ? ` — ${String(putJson.bodySnippet).slice(0, 160)}…` : "";
        return setMsg({ text: `Fallo en PUT (${putRes.status}). ${putJson?.error || ""}${snippet}`, type: "error" });
      }

      const ETag: string =
        putJson?.etag ||
        putRes.headers.get("etag") ||
        putRes.headers.get("ETag") ||
        "";

      if (!ETag) {
        return setMsg({ text: "No se recibió ETag del PUT (requerido para completar).", type: "error" });
      }

      // 3) COMPLETE
      const completeRes = await fetch(`/api/multipart/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId, key: objectKey, parts: [{ ETag, PartNumber: 1 }] }),
      });
      if (completeRes.status === 402) return needPay("complete");

      const completeData = await completeRes.json().catch(() => null);
      if (!completeRes.ok || !completeData?.ok) {
        if (String(completeData?.error || "").includes("NEED_PAYMENT")) return needPay("complete");
        return setMsg({
          text:
            completeData?.error ||
            completeData?.detail ||
            `Fallo al completar la subida (COMPLETE ${completeRes.status}).`,
          type: "error",
        });
      }

      // 4) SIGN
      const signRes = await fetch(`/api/sign?key=${encodeURIComponent(objectKey)}`, { cache: "no-store" });
      if (signRes.status === 402) return needPay("sign");

      const signData = await signRes.json().catch(() => null);
      if (!signRes.ok || !signData?.ok || !signData?.url) {
        setKey(objectKey);
        const origin = originForLinks();
        setShortUrl(`${origin}/l/${encodeURIComponent(objectKey)}`);
        return setMsg({ text: "Archivo subido, pero no se pudo firmar URL.", type: "error" });
      }

      setKey(objectKey);
      setSignedUrl(signData.url);
      setShortUrl(`${originForLinks()}/l/${encodeURIComponent(objectKey)}`);
      setMsg({ text: "¡Archivo subido correctamente!", type: "success" });
    } catch (err: any) {
      setMsg({ text: err?.message || "Error inesperado durante la subida.", type: "error" });
    }
  }

  function downloadQR() {
    const canvas = document.getElementById("qrCanvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const png = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = png;
    a.download = "qr.png";
    a.click();
  }

  async function sendEmail() {
    try {
      if (!key) return setEmailMsg({ text: "No hay archivo subido todavía.", type: "err" });
      if (!email) return setEmailMsg({ text: "Ingresa un correo válido.", type: "err" });

      setSending(true);
      setEmailMsg({ text: "", type: "" });

      const r = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email, key }),
      });
      if (r.status === 402) return goPricing("email");

      const j = await r.json().catch(() => ({} as any));
      if (!r.ok || !j?.ok) setEmailMsg({ text: j?.error || "No se pudo enviar el correo.", type: "err" });
      else setEmailMsg({ text: "Correo enviado ✅", type: "ok" });
    } catch (e: any) {
      setEmailMsg({ text: e?.message || "Error inesperado.", type: "err" });
    } finally {
      setSending(false);
    }
  }

  const qrValue = shortUrl || signedUrl || "";

  return (
    <div style={{ padding: 20, fontFamily: "system-ui" }}>
      <h1>Sube un archivo y genera tu QR</h1>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>{initialTag}</div>

      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480 }}>
        <input type="file" name="file" />
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" name="tos" required />
          <span style={{ fontSize: 14 }}>
            Acepto no subir contenido sexual, violento, ilegal o con copyright sin permiso.
          </span>
        </label>
        <button type="submit">Subir</button>
      </form>

      {msg.text && (
        <p style={{ marginTop: 12, color: msg.type === "error" ? "red" : "green", fontWeight: "bold" }}>
          {msg.text} · <a href="#" onClick={(e) => (e.preventDefault(), goPricing("cta"))}>Ir a pagar</a> ·{" "}
          <a href="#" onClick={(e) => (e.preventDefault(), resetAccess())}>Reset acceso</a>
        </p>
      )}

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
              Enlace corto:{" "}
              <a href={shortUrl} target="_blank" rel="noreferrer">
                {shortUrl}
              </a>
            </p>
          )}

          {!!qrValue && (
            <>
              <div style={{ display: "inline-block", padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
                <QRCodeCanvas id="qrCanvas" value={qrValue} size={220} includeMargin />
              </div>
              <div style={{ marginTop: 10 }}>
                <button onClick={downloadQR}>Descargar QR</button>
              </div>
            </>
          )}

          {key && <p style={{ marginTop: 8, color: "#666" }}>Key: {key}</p>}
        </div>
      )}

      <div style={{ marginTop: 16, padding: 12, border: "1px solid #e5e7eb", borderRadius: 8, maxWidth: 480 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Enviar el QR y enlace a tu correo</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="email"
            placeholder="tucorreo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ flex: 1, padding: 8, border: "1px solid #ddd", borderRadius: 6 }}
            required
          />
          <button
            type="button"
            onClick={sendEmail}
            disabled={sending || !key}
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #111" }}
            title={!key ? "Sube un archivo para habilitar el envío" : ""}
          >
            {sending ? "Enviando…" : "Enviar"}
          </button>
        </div>
        {emailMsg.text && (
          <p style={{ marginTop: 8, color: emailMsg.type === "err" ? "#b91c1c" : "#166534", fontWeight: 600 }}>
            {emailMsg.text}
          </p>
        )}
      </div>
    </div>
  );
}