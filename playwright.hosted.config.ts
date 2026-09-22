import { defineConfig } from "@playwright/test";

const baseURL = process.env.OPENFORGE_E2E_BASE_URL;
if (!baseURL) throw new Error("OPENFORGE_E2E_BASE_URL is required for hosted verification");

const sessionToken = process.env.OPENFORGE_E2E_SESSION_TOKEN;
const vercelBypassCookie = process.env.OPENFORGE_E2E_VERCEL_BYPASS_COOKIE;
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  timeout: 180_000,
  use: {
    baseURL,
    storageState: {
      cookies: [
        ...(sessionToken ? [{
            domain: new URL(baseURL).hostname,
            httpOnly: true,
            name: "pd_session",
            path: "/",
            sameSite: "Lax",
            secure: true,
            value: sessionToken,
          } as const] : []),
        ...(vercelBypassCookie ? [{
          domain: new URL(baseURL).hostname,
          httpOnly: true,
          name: "_vercel_jwt",
          path: "/",
          sameSite: "Lax" as const,
          secure: true,
          value: vercelBypassCookie,
        }] : []),
      ],
      origins: [{
        origin: baseURL,
        localStorage: [{ name: "pd-required-storage-notice", value: "acknowledged" }],
      }],
    },
    trace: "off",
    video: "off",
    screenshot: "off",
  },
  webServer: [],
});
