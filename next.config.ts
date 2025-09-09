// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // ⚠️ SIN redirects/rewrites. Si los tenías, quedan anulados aquí.
  async redirects() {
    return []; // NO REDIRECTS
  },
  async rewrites() {
    return []; // NO REWRITES
  },

  async headers() {
    const noStore = [
      { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" },
      { key: "Pragma", value: "no-cache" },
      { key: "Expires", value: "0" },
    ];
    return [
      { source: "/upload-qr", headers: noStore },
      { source: "/upload-qr/:path*", headers: noStore },
      { source: "/pub", headers: noStore },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;