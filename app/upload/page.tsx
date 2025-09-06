// app/upload/page.tsx
"use client";
import * as React from "react";

export default function UploadPage() {
  const [msg, setMsg] = React.useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("");

    const input = (e.currentTarget.elements.namedItem("file") as HTMLInputElement);
    const file = input.files?.[0];
    if (!file) {
      setMsg("Seleccione un archivo");
      return;
    }

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();

    setMsg(data.msg || data.error || (res.ok ? "Listo" : "Solicitud no válida"));
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Subir a Backblaze</h1>
      <form onSubmit={onSubmit}>
        <input type="file" name="file" />
        <button type="submit" style={{ marginLeft: 10 }}>Subir</button>
      </form>
      <p>{msg}</p>
    </div>
  );
}
