import { defineConfig } from "@playwright/test";

const baseURL = process.env.OPENFORGE_CP117_BASE_URL ?? "http://127.0.0.1:3127";
const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";
for (const value of [baseURL, authURL]) {
  const endpoint = new URL(value);
  if (endpoint.protocol !== "http:" || endpoint.hostname !== "127.0.0.1" || Number(endpoint.port) < 1024 || ["3010", "8010"].includes(endpoint.port) || endpoint.username || endpoint.password) {
    throw new Error("Visual comparison requires disposable loopback endpoints");
  }
}
if (new URL(baseURL).port === new URL(authURL).port) throw new Error("Synthetic authentication requires a separate disposable port");

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["cp117-visual-adoption.spec.ts", "cp117-ledger-parity-comparison.spec.ts", "cp117-management-adoption.spec.ts", "cp131-position-parity.spec.ts", "cp132-shell-parity.spec.ts", "cp133-operational-queue.spec.ts", "cp134-tracked-tasks.spec.ts", "cp137-profile-scope-banner.spec.ts", "cp138-combined-ledger-visual.spec.ts", "cp117-presentation-closeout.spec.ts", "cp117-rejected-parity.spec.ts", "cp117-parity-captures.spec.ts", "cp117-opportunity-actionability.spec.ts", "cp117-today-opportunity-corrections.spec.ts"],
  workers: 1,
  retries: 0,
  outputDir: "./data/private/evidence/cp117-visual-adoption/playwright",
  use: { baseURL, trace: "off", video: "on", screenshot: "off" },
});
