"use client";
import * as React from "react";
import { QRCodeCanvas } from "qrcode.react";

export default function UploadQRPage() {
  const [msg, setMsg] = React.useState<{ text: string; type: "success" | "error" | "" }>({ text: "", type: "" });
  const [key, setKey] = React.useState<string | null>(null);
  const [fileUrl, setFileUrl] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg({ text: "Uploading...", type: "" });
    setKey(null);
    setFileUrl(null);

    const input = e.currentTarget.elements.namedItem("file") as HTMLInputElement;
    const tos = (e.currentTarget.elements.namedItem("tos") as HTMLInputElement)?.checked;
    const file = input.files?.[0];

    if (!file) {
      setMsg({ text: "Please select a file.", type: "error" });
      return;
    }

    if (!tos) {
      setMsg({ text: "You must accept the terms of use.", type: "error" });
      return;
    }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("tos", "true");

    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      setMsg({ text: data.msg || data.detail || data.error || "Upload failed.", type: "error" });
      return;
    }

    setMsg({ text: data.msg || "File uploaded successfully!", type: "success" });
    setKey(data.key);

    // Request signed URL
    const sres = await fetch(`/api/sign?key=${encodeURIComponent(data.key)}`);
    const sdata = await sres.json();
    if (sres.ok && sdata.ok) setFileUrl(sdata.url);
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

  return (
    <div style={{ padding: 20, fontFamily: "system-ui" }}>
      <h1>Upload a file & generate QR</h1>

      <form
        onSubmit={onSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 420 }}
      >
        <input type="file" name="file" />

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" name="tos" required />
          <span style={{ fontSize: "14px" }}>
            I agree not to upload sexual, violent, illegal, or copyrighted content without permission.
          </span>
        </label>

        <button type="submit">Upload</button>
      </form>

      {msg.text && (
        <p
          style={{
            marginTop: 12,
            color: msg.type === "error" ? "red" : "green",
            fontWeight: "bold",
          }}
        >
          {msg.text}
        </p>
      )}

      {fileUrl && (
        <div style={{ marginTop: 20 }}>
          <p>
            File URL:&nbsp;
            <a href={fileUrl} target="_blank" rel="noreferrer">
              {fileUrl.slice(0, 80)}
              {fileUrl.length > 80 ? "…" : ""}
            </a>
          </p>

          <div style={{ display: "inline-block", padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
            <QRCodeCanvas id="qrCanvas" value={fileUrl} size={220} includeMargin />
          </div>

          <div style={{ marginTop: 10 }}>
            <button onClick={downloadQR}>Download QR</button>
          </div>

          {key && <p style={{ marginTop: 8, color: "#666" }}>Key: {key}</p>}
        </div>
      )}
    </div>
  );
}