import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright targets the local app through 127.0.0.1; permit its development assets.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8010/:path*",
      },
    ];
  },
};

export default nextConfig;
