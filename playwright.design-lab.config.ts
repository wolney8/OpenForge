import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "design-lab-journey.spec.ts",
  workers: 1,
  retries: 0,
  use: {
    baseURL: "http://localhost:3911",
    trace: "off",
    video: "off",
    screenshot: "off",
  },
  webServer: {
    command: "./node_modules/.bin/next dev --webpack --hostname localhost --port 3911",
    cwd: process.cwd() + "/apps/web",
    env: {
      ...process.env,
      OPENFORGE_DESIGN_LAB_ENABLED: "true",
      OPENFORGE_E2E_AUTH_BYPASS: "true",
      OPENFORGE_AUTH_REQUIRED: "false",
      OPENFORGE_RUNTIME_ROLE: "test",
    },
    url: "http://localhost:3911/login",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
