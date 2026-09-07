import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.config";

export default defineConfig({
  ...baseConfig,
  workers: 1,
  webServer: [
    {
      command: "./scripts/run-isolated-e2e-api.sh",
      url: "http://127.0.0.1:8010/healthz",
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command: "pnpm dev:web",
      env: {
        ...process.env,
        OPENFORGE_AUTH_REQUIRED: "false",
        OPENFORGE_E2E_AUTH_BYPASS: "true",
      },
      url: "http://127.0.0.1:3010/login",
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
});
