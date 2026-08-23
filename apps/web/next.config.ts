import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright targets the local app through 127.0.0.1; permit its development assets.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
