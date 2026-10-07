import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright targets the local app through 127.0.0.1; permit its development assets.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Local owner databases and workbook evidence are runtime-only inputs. Never
  // include them in a hosted server trace, even when a local fallback path is
  // present in server-side code.
  outputFileTracingExcludes: {
    "*": ["../../data/private/**/*", "data/private/**/*"],
  },
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    const localApiBaseUrl =
      process.env.OPENFORGE_INTERNAL_API_BASE_URL?.trim().replace(/\/+$/, "") ||
      "http://127.0.0.1:8010";
    return [
      {
        source: "/api/:path*",
        destination: `${localApiBaseUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
