import { defineConfig } from "@playwright/test";

const apiPort = 8120;
const webPort = 3120;
const apiBaseURL = `http://127.0.0.1:${apiPort}`;
const webBaseURL = `http://127.0.0.1:${webPort}`;
const runtimeDirectory = process.env.NOTIFICATION_ACCEPTANCE_RUNTIME_DIR;
if (!runtimeDirectory) {
  throw new Error(
    "Run this config through scripts/run_notification_persistence_acceptance.py.",
  );
}

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "notification-persistence.integration.spec.ts",
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
      origins: [
        {
          origin: webBaseURL,
          localStorage: [
            { name: "pd-required-storage-notice", value: "acknowledged" },
          ],
        },
      ],
    },
  },
  webServer: [
    {
      command:
        `./scripts/run-python.sh scripts/run_notification_persistence_acceptance_api.py ` +
        `--runtime-directory ${runtimeDirectory}/api --port ${apiPort}`,
      url: `${apiBaseURL}/healthz`,
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command: `pnpm --filter @openforge/web exec next dev --port ${webPort}`,
      env: {
        ...process.env,
        OPENFORGE_AUTH_OWNER_EMAILS: "notification-acceptance@example.invalid",
        OPENFORGE_AUTH_REQUIRED: "true",
        OPENFORGE_AUTH_SESSION_SECRET:
          "synthetic-notification-acceptance-secret-not-used-in-production",
        OPENFORGE_INTERNAL_API_BASE_URL: apiBaseURL,
      },
      url: `${webBaseURL}/login`,
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
});
