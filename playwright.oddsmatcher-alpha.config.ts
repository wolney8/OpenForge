import { defineConfig } from "@playwright/test";

const apiPort = 8081;
const webPort = 3081;
const apiBaseURL = `http://127.0.0.1:${apiPort}`;
const webBaseURL = `http://127.0.0.1:${webPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "oddsmatcher-alpha.spec.ts",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  use: {
    baseURL: webBaseURL,
    trace: "off",
    video: "off",
    screenshot: "off",
    storageState: {
      cookies: [],
      origins: [{
        origin: webBaseURL,
        localStorage: [{ name: "pd-required-storage-notice", value: "acknowledged" }],
      }],
    },
  },
  webServer: [
    {
      command: `OPENFORGE_E2E_API_PORT=${apiPort} OPENFORGE_E2E_SEED_SYNTHETIC=true ./scripts/run-isolated-e2e-api.sh`,
      url: `${apiBaseURL}/healthz`,
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command: `pnpm --filter @openforge/web exec next dev --port ${webPort}`,
      env: {
        ...process.env,
        OPENFORGE_AUTH_REQUIRED: "false",
        OPENFORGE_E2E_AUTH_BYPASS: "true",
        OPENFORGE_INTERNAL_API_BASE_URL: apiBaseURL,
      },
      url: `${webBaseURL}/login`,
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
});
