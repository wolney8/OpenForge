import { expect, test } from "@playwright/test";

const restoreRun = {
  restore_run_id: "portable-restore-synthetic-001",
  source_filename: "profile-portable-backup-SYNTHETIC-001.xlsx",
  source_byte_checksum: "b".repeat(64),
  source_logical_checksum: "a".repeat(64),
  format_version: "profile-portable-export-v1",
  restore_contract_version: "profile-portable-restore-v1",
  source_profile_display_name: "Synthetic Source Profile",
  target_profile_id: "",
  target_display_name: "Synthetic Restored Profile",
  target_profile_code: "RESTORED-001",
  status: "READY",
  reviews: [],
  result: {},
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      json: {
        authenticated: true,
        email: "founder@example.invalid",
        expires_at: 2_100_000_000,
        linked_profile_ids: [],
        name: "Synthetic Founder",
        role: "fund_manager",
        session_policy: {
          auto_logout_enabled: false,
          preference_configured: true,
          timeout_minutes: 30,
        },
      },
    }),
  );
  await page.route("**/api/auth/activity", (route) => route.fulfill({ status: 204 }));
  await page.route("**/api/fund-manager/import-executions", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/fund-manager/notifications**", (route) =>
    route.fulfill({ json: [] }),
  );
});

test("portable restore owns verification and restore mutations and reports both gates", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let analysisRequests = 0;
  let releaseAnalysis: (() => void) | undefined;
  const analysisGate = new Promise<void>((resolve) => {
    releaseAnalysis = resolve;
  });
  await page.route("**/api/fund-manager/portable-restores/analyse", async (route) => {
    analysisRequests += 1;
    await analysisGate;
    await route.fulfill({ json: restoreRun, status: 201 });
  });
  let executeRequests = 0;
  await page.route(
    `**/api/fund-manager/portable-restores/${restoreRun.restore_run_id}/execute`,
    async (route) => {
      executeRequests += 1;
      await route.fulfill({
        json: {
          ...restoreRun,
          target_profile_id: "profile-restored-001",
          status: "COMPLETE",
          result: {
            financial_reconciliation: { status: "PASS" },
            operational_reconciliation: { status: "OPERATIONAL HEALTH: PASSED" },
            logical_parity: { status: "PASS" },
          },
        },
      });
    },
  );

  await page.goto("/profiles/restore");
  const pagePanel = page.locator('[data-pd-id="portable-profile-restore.page"]');
  const analyse = page.locator('[data-pd-id="portable-profile-restore.analyse"]');
  await page.getByLabel("Portable backup").setInputFiles({
    buffer: Buffer.from("synthetic portable xlsx"),
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    name: "profile-portable-backup-SYNTHETIC-001.xlsx",
  });
  await page.getByLabel("New Profile name (optional)").fill("Synthetic Restored Profile");
  await page.getByLabel("New Profile code").fill("restored-001");

  await analyse.focus();
  await page.keyboard.press("Enter");
  await expect(analyse).toBeDisabled();
  await expect(analyse).toContainText("Verifying backup");
  await expect(pagePanel).toHaveAttribute("aria-busy", "true");
  await page.keyboard.press("Enter");
  await expect.poll(() => analysisRequests).toBe(1);
  releaseAnalysis?.();

  await expect(page.locator('[data-pd-id="portable-profile-restore.ready"]')).toBeVisible();
  await expect(pagePanel).not.toHaveAttribute("aria-busy", "true");
  await expect(page.getByText("Verified · ready to restore")).toBeVisible();
  await page.getByLabel("I confirm this backup should create a fresh Profile.").check();
  const execute = page.locator('[data-pd-id="portable-profile-restore.execute"]');
  await execute.click();

  await expect.poll(() => executeRequests).toBe(1);
  await expect(page.locator('[data-pd-id="portable-profile-restore.complete"]')).toContainText(
    "Financial reconciliation: PASS",
  );
  await expect(page.locator('[data-pd-id="portable-profile-restore.complete"]')).toContainText(
    "Operational health: OPERATIONAL HEALTH: PASSED",
  );
  await expect(page.locator('[data-pd-id="portable-profile-restore.complete"]')).toContainText(
    "Logical parity: PASS",
  );
  await expect(page.getByRole("link", { name: "View restored Profile" })).toHaveAttribute(
    "href",
    "/profiles/profile-restored-001/tracker/dashboard",
  );

  for (const theme of ["light", "dark"] as const) {
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
    }, theme);
    await expect(pagePanel).toBeVisible();
  }
  const geometry = await pagePanel.evaluate((element) => ({
    pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    panelRight: element.getBoundingClientRect().right,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(geometry.pageOverflow).toBe(false);
  expect(geometry.panelRight).toBeLessThanOrEqual(geometry.viewportWidth);
});
