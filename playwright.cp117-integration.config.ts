import { defineConfig } from "@playwright/test";

// This suite never starts a normal-owner service or reads a session-token file.
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "cp117-spreadsheet.spec.ts",
  workers: 1,
  retries: 0,
  outputDir: process.env.OPENFORGE_CP117_VERIFY_LEGACY === "true"
    ? "./data/private/evidence/cp117-spreadsheet-integration/flag-off"
    : "./data/private/evidence/cp117-spreadsheet-integration/v2",
  use: {
    baseURL: "http://127.0.0.1:3127",
    viewport: { width: 1440, height: 1000 },
    trace: "off",
    video: "on",
    screenshot: "off",
  },
});
