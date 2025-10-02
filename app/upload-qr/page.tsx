// app/upload-qr/page.tsx — REEMPLAZO COMPLETO
'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { upload } from '@vercel/blob/client';

const QRCodeCanvas = dynamic(
  () => import('qrcode.react').then(m => m.QRCodeCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="h-[240px] w-[240px] grid place-items-center text-xs text-gray-500 border rounded-xl">
        Cargando QR…
      </div>
    ),
  }
);

type Msg = { text: string; type: 'ok' | 'err' | '' };

const IS_LOCAL =
  typeof window !== 'undefined' &&
  (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

function normalizeHex(hex: string) {
  const h = hex.trim().toLowerCase();
  if (/^#([0-9a-f]{3})$/i.test(h)) {
    return '#' + h.slice(1).split('').map((c) => c + c).join('');
  }
  return h;
}

export default function UploadQRPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [toEmail, setToEmail] = React.useState('');
  const [link, setLink] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const [msg, setMsg] = React.useState<Msg>({ text: '', type: '' });
  const [mailMsg, setMailMsg] = React.useState<Msg>({ text: '', type: '' });

  type BgOpt = 'transparent' | 'white' | 'black';
  const [bgOpt, setBgOpt] = React.useState<BgOpt>('white');
  const [qrColor, setQrColor] = React.useState<string>('#000000');
  const [qrWarn, setQrWarn] = React.useState<string>('');

  const bgColor =
    bgOpt === 'transparent' ? 'rgba(255,255,255,0)' : bgOpt === 'white' ? '#ffffff' : '#000000';

  function handleBgChange(next: BgOpt) {
    setBgOpt(next);
    if (next !== 'transparent') {
      const bgHex = next === 'white' ? '#ffffff' : '#000000';
      if (normalizeHex(qrColor) === bgHex) {
        setQrColor(next === 'white' ? '#000000' : '#ffffff');
      }
    }
    setQrWarn('');
  }

  function handleQrColorChange(next: string) {
    if (bgOpt !== 'transparent') {
      const bgHex = bgOpt === 'white' ? '#ffffff' : '#000000';
      if (normalizeHex(next) === bgHex) {
        setQrWarn(`El color del QR no puede ser igual al fondo ${bgOpt === 'white' ? 'blanco' : 'negro'}.`);
        return;
      }
    }
    setQrWarn('');
    setQrColor(next);
  }

  // ---- SUBIDA usando Vercel Blob (client upload) ----
  async function uploadViaVercelBlob(f: File) {
    // Sube directo desde el navegador. handleUploadUrl apunta a /api/presign
    const r = await upload(f.name, f, {
      access: 'public',
      contentType: f.type || 'application/octet-stream',
      handleUploadUrl: '/api/presign',
      multipart: f.size > 50 * 1024 * 1024, // multiparte para archivos grandes
      // onUploadProgress: ({ percentage }) => console.log('progreso', percentage),
    });

    // r.url -> URL pública; r.pathname -> "key" del blob
    return { link: r.url, key: r.pathname };
  }

  // Fallback legacy (solo en local) para compatibilidad con tu /api/upload
  async function uploadViaLegacy(f: File) {
    const body = new FormData();
    body.append('file', f);
    const up = await fetch('/api/upload', { method: 'POST', body, cache: 'no-store' });
    const ct = up.headers.get('content-type') || '';
    const raw = await up.text();

    let upData: any = null;
    if (ct.includes('application/json')) { try { upData = JSON.parse(raw); } catch {} }
    if (!up.ok || !upData?.ok) {
      const snippet = (raw || up.statusText || 'Error').slice(0, 300);
      throw new Error(`Upload falló (${up.status}): ${snippet}`);
    }
    return { link: upData.url as string, key: upData.key as string, existed: upData.existed };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg({ text: '', type: '' });
    setMailMsg({ text: '', type: '' });
    setLink(null);

    if (!file) return setMsg({ text: 'Selecciona un archivo.', type: 'err' });
    if (!toEmail.trim()) return setMsg({ text: 'Escribe el correo del usuario.', type: 'err' });

    setBusy(true);
    try {
      let up: { link: string; key: string; existed?: boolean };

      try {
        // Producción: Vercel Blob
        up = await uploadViaVercelBlob(file);
      } catch (err: any) {
        // En producción no hacemos fallback, mostramos la causa
        if (!IS_LOCAL) {
          throw new Error(
            'No se pudo subir con el proveedor de almacenamiento. ' +
            `Detalle: ${err?.message || 'error'}`
          );
        }
        // Local: usa backend legacy
        up = await uploadViaLegacy(file);
      }

      setLink(up.link);
      setMsg(
        up.existed
          ? { text: 'Este archivo ya tenía QR. Reutilizando el mismo enlace (permanente).', type: 'ok' }
          : { text: `Archivo subido: ${file.name}`, type: 'ok' }
      );

      // Enviar correo
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: up.key, to: toEmail.trim(), url: up.link, filename: file.name }),
      });

      const ct2 = res.headers.get('content-type') || '';
      const raw2 = await res.text();
      let data: any = null;
      if (ct2.includes('application/json')) { try { data = JSON.parse(raw2); } catch {} }
      if (!res.ok || !data?.ok) {
        const snippet = (raw2 || res.statusText || 'Error').slice(0, 300);
        throw new Error(`Email falló (${res.status}): ${snippet}`);
      }
      setMailMsg({ text: 'Correo enviado ✅', type: 'ok' });
    } catch (err: any) {
      setMailMsg({ text: err?.message || 'Error', type: 'err' });
    } finally {
      setBusy(false);
    }
  }

  function copyLink() {
    if (!link) return;
    navigator.clipboard?.writeText(link).catch(() => {});
  }
  function downloadPng() {
    const el = document.getElementById('qr-png') as HTMLCanvasElement | null;
    if (!el) return;
    const a = document.createElement('a');
    a.href = el.toDataURL('image/png');
    a.download = 'qr.png';
    a.click();
  }
  function shareWhatsApp() {
    if (!link) return;
    const text = encodeURIComponent(link);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  }

  // ====== UI (bonita) ======
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.12),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.12),transparent_60%)]">
      <header className="sticky top-0 z-30 border-b border-white/30 bg-white/60 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-indigo-600 to-emerald-500 text-white grid place-items-center font-bold shadow-sm">QR</div>
            <div className="leading-tight">
              <div className="font-semibold tracking-tight">SaveInQR</div>
              <div className="text-xs text-gray-500">Sube → QR permanente → Envía por correo</div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="relative rounded-3xl border border-white/60 bg-white/70 backdrop-blur p-6 md:p-8 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.2)]">
          <div className="pointer-events-none absolute -inset-0.5 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-emerald-500/10" />

          <h1 className="relative z-10 text-3xl md:text-4xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Subir archivo</span>{' '}
            <span className="text-gray-400">→</span>{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-transparent">QR permanente</span>{' '}
            <span className="text-gray-400">→</span>{' '}
            <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Enviar por correo</span>
          </h1>

          <p className="relative z-10 mt-2 text-sm text-gray-600">
            Formatos permitidos: <b>cualquiera</b> (mp3, mp4, pdf, imágenes, zip…).
          </p>

          <form onSubmit={onSubmit} className="relative z-10 mt-7 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo del usuario</label>
              <input
                type="email"
                required
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="usuario@correo.com"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 shadow-sm outline-none focus:border-gray-300 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Archivo</label>
              <label className="group grid w-full place-items-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/70 px-4 py-10 text-center transition hover:border-gray-400 hover:bg-gray-50">
                <input type="file" accept="*/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />
                <div className="flex flex-col items-center gap-2">
                  <svg width="32" height="32" viewBox="0 0 24 24" className="opacity-70"><path fill="currentColor" d="M19 13v6H5v-6H3v8h18v-8zm-6-2V3h-2v8H7l5 5l5-5z"/></svg>
                  <div className="text-sm text-gray-700">
                    {file ? <span className="font-medium">{file.name}</span> : (<><span className="font-medium">Selecciona o suelta un archivo</span><span className="text-gray-500"> (MP3, MP4, PDF, imágenes, ZIP…)</span></>)}
                  </div>
                </div>
              </label>
            </div>

            <div className="rounded-2xl border bg-white/80 p-4 md:p-5">
              <div className="text-sm font-semibold mb-3">Apariencia del QR</div>
              <div className="mb-4">
                <div className="text-xs text-gray-600 mb-1">Fondo</div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => handleBgChange('transparent')}
                    className={'px-3 py-1.5 text-sm rounded-full border transition ' + (bgOpt === 'transparent' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white hover:bg-gray-50')}>Transparente</button>
                  <button type="button" onClick={() => handleBgChange('white')}
                    className={'px-3 py-1.5 text-sm rounded-full border transition ' + (bgOpt === 'white' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white hover:bg-gray-50')}>Blanco</button>
                  <button type="button" onClick={() => handleBgChange('black')}
                    className={'px-3 py-1.5 text-sm rounded-full border transition ' + (bgOpt === 'black' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white hover:bg-gray-50')}>Negro</button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-xs text-gray-600">Color del QR</div>
                <input type="color" value={qrColor} onChange={(e) => handleQrColorChange(e.target.value)} className="h-9 w-12 cursor-pointer rounded-md border border-gray-300" />
                <span className="text-xs text-gray-500">{qrColor.toUpperCase()}</span>
                {qrWarn ? <span className="text-xs text-red-600 ml-2">{qrWarn}</span> : null}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gray-900 via-indigo-700 to-emerald-600 px-5 py-3 text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    Procesando…
                  </>
                ) : (
                  'Subir y enviar QR'
                )}
              </button>
            </div>
          </form>

          {(msg.text || mailMsg.text) && (
            <div className="mt-6 space-y-2">
              {msg.text && (
                <div className={'rounded-xl px-3 py-2 text-sm ' + (msg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100')}>
                  {msg.text}
                </div>
              )}
              {mailMsg.text && (
                <div className={'rounded-xl px-3 py-2 text-sm ' + (mailMsg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100')}>
                  {mailMsg.text}
                </div>
              )}
            </div>
          )}

          {link && (
            <div className="mt-8 space-y-6">
              <div>
                <div className="text-sm text-gray-600 mb-1">Enlace permanente:</div>
                <a href={link} target="_blank" rel="noreferrer" className="break-all text-indigo-700 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-800">
                  {link}
                </a>
              </div>

              <div className="flex flex-wrap gap-3">
                <button onClick={copyLink} className="rounded-full border px-3 py-2 text-sm hover:bg-gray-50">Copiar enlace</button>
                <button onClick={downloadPng} className="rounded-full border px-3 py-2 text-sm hover:bg-gray-50">Descargar QR (PNG)</button>
                <button onClick={shareWhatsApp} className="rounded-full border px-3 py-2 text-sm hover:bg-gray-50">Compartir por WhatsApp</button>
              </div>

              <div className="w-fit rounded-2xl border bg-white p-4 shadow-md" style={{ background: bgOpt === 'transparent' ? 'transparent' : bgColor }}>
                <QRCodeCanvas id="qr-png" value={link} size={240} includeMargin level="M" bgColor={bgColor} fgColor={qrColor} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}