import { defineConfig } from "@playwright/test";

// Explicit isolated runtime: never reuse the daily-use 3010/8010 database.
export default defineConfig({
  testDir: "./tests/e2e", testMatch: "multi-lay-normal-parity.spec.ts",
  workers: 1, timeout: 60000,
  use: { baseURL: "http://127.0.0.1:3013", trace: "off", video: "off", screenshot: "off" },
});
