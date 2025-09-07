export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui", padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>Memory Links</h1>
      <p style={{ color: "#555", marginBottom: 16 }}>
        Upload a file and get a QR that points to it.
      </p>

      <a
        href="/upload-qr"
        style={{
          display: "inline-block",
          padding: "10px 14px",
          borderRadius: 8,
          background: "#111",
          color: "#fff",
          textDecoration: "none",
        }}
      >
        Open uploader →
      </a>
    </main>
  );
}