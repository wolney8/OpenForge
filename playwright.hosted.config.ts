import { defineConfig } from "@playwright/test";

const baseURL = process.env.OPENFORGE_E2E_BASE_URL;
if (!baseURL) throw new Error("OPENFORGE_E2E_BASE_URL is required for hosted verification");

const sessionToken = process.env.OPENFORGE_E2E_SESSION_TOKEN;
const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  timeout: 180_000,
  use: {
    baseURL,
    extraHTTPHeaders: protectionBypass
      ? { "x-vercel-protection-bypass": protectionBypass }
      : undefined,
    storageState: {
      cookies: sessionToken
        ? [{
            domain: new URL(baseURL).hostname,
            httpOnly: true,
            name: "pd_session",
            path: "/",
            sameSite: "Lax",
            secure: true,
            value: sessionToken,
          }]
        : [],
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
