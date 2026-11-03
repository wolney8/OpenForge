import { defineConfig } from "@playwright/test";

// This suite never starts a normal-owner service or reads a session-token file.
const baseURL = process.env.OPENFORGE_CP117_BASE_URL ?? "http://127.0.0.1:3127";
const target = new URL(baseURL);
const bootstrap = new URL(process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/");
for (const endpoint of [target, bootstrap]) {
  if (endpoint.protocol !== "http:" || endpoint.hostname !== "127.0.0.1" || Number(endpoint.port) < 1024 || ["3010", "8010"].includes(endpoint.port) || endpoint.username || endpoint.password) {
    throw new Error("CP-117 tests require explicit disposable loopback application and authentication endpoints");
  }
}
if (target.port === bootstrap.port) throw new Error("Synthetic authentication uses a separate disposable port");

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["cp117-spreadsheet.spec.ts", "cp117-six-ledger.spec.ts"],
  workers: 1,
  retries: 0,
  outputDir: process.env.OPENFORGE_CP117_VERIFY_LEGACY === "true"
    ? "./data/private/evidence/cp117-spreadsheet-integration/flag-off"
    : "./data/private/evidence/cp117-spreadsheet-integration/v2",
  use: {
    baseURL,
    viewport: { width: 1440, height: 1000 },
    trace: "off",
    video: "on",
    screenshot: "off",
  },
});
