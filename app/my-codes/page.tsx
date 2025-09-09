// /app/my-codes/page.tsx
"use client";
import * as React from "react";
import { QRCodeCanvas } from "qrcode.react";

type Item = { code: string; key: string; url: string; createdAt: number; valid: boolean };

export default function MyCodesPage() {
  const [items, setItems] = React.useState<Item[]>([]);
  const [msg, setMsg] = React.useState("");

  async function load() {
    const res = await fetch("/api/links/list", { cache: "no-store" });
    const data = await res.json();
    if (res.ok && data.ok) setItems(data.items as Item[]);
  }
  React.useEffect(() => { load(); }, []);

  function short(code: string) {
    return `${window.location.origin}/d/${code}`;
  }

  async function revoke(code: string) {
    setMsg("Anulando…");
    const res = await fetch("/api/links/revoke", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    const data = await res.json();
    if (!res.ok || !data.ok) return setMsg(data.error || "Error");
    setMsg("Listo");
    load();
  }

  async function emailList() {
    setMsg("Enviando lista por email…");
    const res = await fetch("/api/links/email", { method: "POST" });
    const data = await res.json();
    setMsg(res.ok && data.ok ? "Enviado" : (data.error || "Error"));
  }

  function downloadQR(code: string) {
    const canvas = document.getElementById(`qr-${code}`) as HTMLCanvasElement | null;
    if (!canvas) return;
    const png = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = png; a.download = `qr-${code}.png`; a.click();
  }

  return (
    <div style={{ padding: 20, fontFamily: "system-ui" }}>
      <h1>Mis Códigos</h1>
      <p><button onClick={emailList}>Enviar lista por email</button></p>
      {msg && <p style={{ color: "#555" }}>{msg}</p>}

      <div style={{ display: "grid", gap: 16 }}>
        {items.map(it => (
          <div key={it.code} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
            <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <QRCodeCanvas id={`qr-${it.code}`} value={short(it.code)} size={140} includeMargin />
              </div>
              <div style={{ minWidth: 280 }}>
                <div><b>Código:</b> {it.code}</div>
                <div><b>Enlace:</b> <a href={short(it.code)} target="_blank">{short(it.code)}</a></div>
                <div><b>Creado:</b> {new Date(it.createdAt).toLocaleString()}</div>
                <div><b>Estado:</b> {it.valid ? "Activo" : "Inactivo"}</div>
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => navigator.clipboard.writeText(short(it.code))}>Copiar enlace</button>
                  <button onClick={() => downloadQR(it.code)}>Descargar QR</button>
                  {it.valid
                    ? <button onClick={() => revoke(it.code)}>Anular</button>
                    : <a href={`/pricing?code=${encodeURIComponent(it.code)}&action=recompra`}><button>Recomprar</button></a>
                  }
                </div>
              </div>
            </div>
          </div>
        ))}
        {!items.length && <p>No tienes códigos aún.</p>}
      </div>
    </div>
  );
}