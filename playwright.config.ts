import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:3010",
    trace: "off",
    video: "off",
    screenshot: "off",
    storageState: {
      cookies: [],
      origins: [
        {
          origin: "http://127.0.0.1:3010",
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
      url: "http://127.0.0.1:3010/login",
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],
});
