// app/upload-qr/page.tsx — REEMPLAZO COMPLETO (abre cualquier formato, incluido MP3)
'use client';

import * as React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

type Msg = { text: string; type: 'ok' | 'err' | '' };

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
        setQrWarn(
          `El color del QR no puede ser igual al fondo ${bgOpt === 'white' ? 'blanco' : 'negro'}.`,
        );
        return;
      }
    }
    setQrWarn('');
    setQrColor(next);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg({ text: '', type: '' });
    setMailMsg({ text: '', type: '' });
    setLink(null);

    if (!file) return setMsg({ text: 'Selecciona un archivo.', type: 'err' });
    if (!toEmail.trim()) return setMsg({ text: 'Escribe el correo del usuario.', type: 'err' });

    const body = new FormData();
    body.append('file', file);

    setBusy(true);
    try {
      const up = await fetch('/api/upload', { method: 'POST', body });
      const upData = await up.json();
      if (!up.ok || !upData?.ok)
        throw new Error(upData?.detail || upData?.error || 'Error subiendo archivo');

      const shortUrl = upData.url as string;
      setLink(shortUrl);
      setMsg(
        upData.existed
          ? { text: 'Este archivo ya tenía QR. Reutilizando el mismo enlace (permanente).', type: 'ok' }
          : { text: `Archivo subido: ${upData.key}`, type: 'ok' },
      );

      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: upData.key, to: toEmail.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'No se pudo enviar el correo.');
      setMailMsg({ text: 'Correo enviado ✅', type: 'ok' });
    } catch (err: any) {
      setMailMsg({ text: err.message || 'Error enviando correo', type: 'err' });
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

  return (
    <main className="min-h-[100svh] px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] 
                     bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100">
      <div className="max-w-xl mx-auto mb-3 flex items-center gap-3">
        <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-500 text-white grid place-items-center shadow-md">
          <span className="text-sm font-bold">QR</span>
        </div>
        <span className="text-slate-800 font-semibold">SaveInQR</span>
      </div>

      <div className="max-w-xl mx-auto rounded-2xl bg-white/90 shadow-xl ring-1 ring-slate-200/70 p-5 sm:p-6 backdrop-blur">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 leading-snug mb-3">
          Subir archivo → QR permanente → Enviar por correo
        </h1>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-sm text-slate-700" htmlFor="email">
              Correo del usuario
            </label>
            <input
              id="email"
              type="email"
              required
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="usuario@correo.com"
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-900 
                         placeholder:text-slate-400 shadow-sm
                         focus:outline-none focus:ring-4 focus:ring-sky-200 focus:border-sky-400"
              inputMode="email"
              autoComplete="email"
            />
          </div>

          {/* === ACEPTA CUALQUIER FORMATO === */}
          <div className="space-y-2">
            <label className="block text-sm text-slate-700" htmlFor="file">
              Archivo
            </label>
            <input
              id="file"
              type="file"
              accept="*/*"           // ← permite mp3, wav, zip, docx, etc.
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full rounded-xl border border-slate-200 shadow-sm
                         file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2.5
                         file:text-sm file:font-medium file:text-white hover:file:bg-slate-80
                         text-slate-700 p-2.5"
            />
            <p className="text-xs text-slate-500">Formatos: cualquiera (mp3, mp4, pdf, imágenes, zip…).</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="text-sm font-medium text-slate-700 mb-3">Apariencia del QR</div>

            <div className="mb-3">
              <div className="text-xs text-slate-600 mb-1">Fondo</div>
              <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                {(['transparent', 'white', 'black'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    aria-pressed={bgOpt === opt}
                    onClick={() => handleBgChange(opt)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition
                                ${bgOpt === opt
                      ? 'bg-gradient-to-tr from-sky-400 to-indigo-500 text-white shadow'
                      : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    {opt === 'transparent' ? 'Transparente' : opt === 'white' ? 'Blanco' : 'Negro'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-600">Color del QR</div>
              <input
                aria-label="Color del QR"
                type="color"
                value={qrColor}
                onChange={(e) => handleQrColorChange(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded-lg shadow-inner border border-slate-300"
              />
              <span className="text-xs text-slate-500">{qrColor.toUpperCase()}</span>
              {qrWarn ? <span className="text-xs text-red-600 ml-2">{qrWarn}</span> : null}
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="h-12 w-full rounded-xl bg-slate-900 text-white font-semibold shadow-lg
                       hover:bg-slate-800 active:translate-y-px
                       focus:outline-none focus:ring-4 focus:ring-sky-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Procesando…' : 'Subir y enviar QR'}
          </button>
        </form>

        {(msg.text || mailMsg.text) && (
          <div className="space-y-2 mt-4">
            {msg.text && (
              <p
                className={`p-2.5 rounded-lg text-sm ${
                  msg.type === 'ok'
                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                    : 'text-red-700 bg-red-50 border border-red-200'
                }`}
              >
                {msg.text}
              </p>
            )}
            {mailMsg.text && (
              <p
                className={`p-2.5 rounded-lg text-sm ${
                  mailMsg.type === 'ok'
                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                    : 'text-red-700 bg-red-50 border border-red-200'
                }`}
              >
                {mailMsg.text}
              </p>
            )}
          </div>
        )}

        {link && (
          <div className="space-y-4 mt-5">
            <div>
              <p className="text-sm text-slate-600">Enlace permanente:</p>
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="break-all text-sky-700 underline underline-offset-4"
              >
                {link}
              </a>
            </div>

            <div className="flex flex-wrap gap-3">
              <button onClick={copyLink} className="px-3 py-2 rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50">
                Copiar enlace
              </button>
              <button onClick={downloadPng} className="px-3 py-2 rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50">
                Descargar QR (PNG)
              </button>
              <button onClick={shareWhatsApp} className="px-3 py-2 rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50">
                Compartir por WhatsApp
              </button>
            </div>

            <div
              className="inline-block rounded-2xl p-3 ring-1 ring-slate-200 shadow-sm"
              style={{ background: bgOpt === 'transparent' ? 'transparent' : bgColor }}
            >
              <QRCodeCanvas
                id="qr-png"
                value={link}
                size={220}
                includeMargin
                level="M"
                bgColor={bgColor}
                fgColor={qrColor}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}