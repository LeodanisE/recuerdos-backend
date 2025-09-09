import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    const noStore = [
      { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" },
      { key: "Pragma", value: "no-cache" },
      { key: "Expires", value: "0" },
    ];
    return [
      { source: "/upload-qr", headers: noStore },
      { source: "/upload-qr/:path*", headers: noStore },
      { source: "/upload", headers: noStore },
      { source: "/upload/:path*", headers: noStore },
      { source: "/my-codes", headers: noStore },
      { source: "/my-codes/:path*", headers: noStore },
      { source: "/__version", headers: noStore },
      { source: "/version", headers: noStore },
      { source: "/api/__version", headers: [{ key: "Cache-Control", value: "no-store" }] },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;