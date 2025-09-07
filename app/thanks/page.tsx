// app/thanks/page.tsx
export default function ThanksPage({ searchParams }: { searchParams: { order?: string } }) {
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>Payment successful ✅</h1>
      <p style={{ color: '#555' }}>You can now upload your file and generate a QR.</p>
      {searchParams.order && (
        <p style={{ color: '#666' }}>OrderID: {searchParams.order}</p>
      )}
      <a href="/upload-qr" style={{ display: 'inline-block', marginTop: 12, color: '#0b5cff' }}>
        Go to uploader →
      </a>
    </div>
  );
}