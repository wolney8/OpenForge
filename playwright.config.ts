import { defineConfig } from "@playwright/test";

const baseURL = process.env.OPENFORGE_E2E_BASE_URL ?? "http://127.0.0.1:3010";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL,
    trace: "off",
    video: "off",
    screenshot: "off",
    storageState: {
      cookies: [],
      origins: [
        {
          origin: baseURL,
          localStorage: [
            { name: "pd-required-storage-notice", value: "acknowledged" },
          ],
        },
      ],
    },
  },
  webServer: [
    {
      command: "pnpm dev:api",
      url: "http://127.0.0.1:8010/healthz",
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command: "pnpm dev:web",
      env: { ...process.env, OPENFORGE_AUTH_REQUIRED: "false" },
      url: "http://127.0.0.1:3010/login",
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],
});
