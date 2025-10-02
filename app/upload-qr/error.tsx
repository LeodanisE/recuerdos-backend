'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="max-w-lg w-full rounded-2xl border bg-white p-6 shadow">
        <h2 className="text-lg font-semibold">Algo salió mal</h2>
        <p className="mt-2 text-sm text-gray-600 break-words">{error?.message || 'Error'}</p>
        <button
          onClick={() => reset()}
          className="mt-4 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}