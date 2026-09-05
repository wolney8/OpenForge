import { expect, test } from "@playwright/test";

const profileId = "profile-demo-001";
const settingsPath = `/profiles/${profileId}/tracker/settings#import-export`;

async function mockSettingsReads(page: import("@playwright/test").Page) {
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/auth/session") {
      await route.fulfill({
        json: {
          authenticated: true,
          email: "founder@example.invalid",
          expires_at: 2_100_000_000,
          linked_profile_ids: [profileId],
          name: "Synthetic Founder",
          role: "fund_manager",
          session_policy: {
            auto_logout_enabled: false,
            preference_configured: true,
            timeout_minutes: 30,
          },
        },
      });
      return;
    }
    if (pathname === `/api/profiles/${profileId}`) {
      await route.fulfill({
        json: {
          profile_id: profileId,
          display_name: "Synthetic Profile",
          status: "Active",
        },
      });
      return;
    }
    if (pathname.endsWith("/recovery-diagnostics")) {
      await route.fulfill({
        json: {
          profile_id: profileId,
          profile_display_name: "Synthetic Profile",
          profile_status: "Active",
          current_profile_checksum: "synthetic-current-checksum",
          execution_running: false,
          rollback_conclusion: "ROLLBACK UNAVAILABLE",
          rollback_reason: "No import recovery state is required for this UI test.",
          attempts: [],
        },
      });
      return;
    }
    await route.fulfill({ json: [] });
  });
}

test("working workbook export owns one keyboard request and reports its evidence boundary", async ({
  page,
}) => {
  await mockSettingsReads(page);
  let releaseExport: (() => void) | undefined;
  const exportGate = new Promise<void>((resolve) => {
    releaseExport = resolve;
  });
  let exportRequests = 0;
  await page.route(
    `**/api/profiles/${profileId}/exports/working-workbook.xlsx`,
    async (route) => {
      exportRequests += 1;
      await exportGate;
      await route.fulfill({
        body: "synthetic-xlsx-content",
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers: {
          "Content-Disposition":
            'attachment; filename="working-workbook-SYNTHETIC-WORKING-001.xlsx"',
          "X-Export-Byte-Checksum": "b".repeat(64),
          "X-Export-Changed-Part-Count": "14",
          "X-Export-Format-Version": "workbook-template-export-v1",
          "X-Export-Logical-Checksum": "a".repeat(64),
          "X-Export-Platform-Only-Warning-Count": "9",
          "X-Export-Unchanged-Part-Count": "60",
        },
      });
    },
  );

  await page.goto(settingsPath);
  const panel = page.locator('[data-pd-id="workbook-template-export.panel"]');
  const button = page.locator('[data-pd-id="workbook-template-export.generate"]');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("does not update an existing workbook");
  await expect(panel).toContainText("deferred Google runtime smoke test");
  await expect(panel).toContainText("does not contain a bound Google Apps Script project");
  const idleBox = await panel.boundingBox();

  await button.focus();
  await page.keyboard.press("Enter");
  await expect(button).toBeDisabled();
  await expect(button).toContainText("Creating workbook");
  await expect(panel).toHaveAttribute("aria-busy", "true");
  await expect(panel.getByRole("status")).toContainText("sanitizing the template copy");
  await page.keyboard.press("Enter");
  await expect.poll(() => exportRequests).toBe(1);
  const busyBox = await panel.boundingBox();
  expect(Math.abs((busyBox?.height ?? 0) - (idleBox?.height ?? 0))).toBeLessThanOrEqual(1);

  const downloadPromise = page.waitForEvent("download");
  releaseExport?.();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(
    "working-workbook-SYNTHETIC-WORKING-001.xlsx",
  );
  await expect(button).toBeEnabled();
  await expect(button).toContainText("Create workbook");
  await expect(panel).not.toHaveAttribute("aria-busy", "true");
  const verification = panel.locator(
    '[data-pd-id="workbook-template-export.verification"]',
  );
  await expect(verification).toContainText("workbook-template-export-v1");
  await expect(verification).toContainText(
    "STRUCTURALLY VALID WORKING-WORKBOOK EXPORT — GOOGLE RUNTIME VALIDATION PENDING",
  );
  await expect(verification).toContainText("14 changed · 60 unchanged parts");
  await expect(verification).toContainText("Explicitly platform-only domains: 9");
  await expect(verification).toContainText("a".repeat(64));
  await expect(verification).toContainText("b".repeat(64));
});

test("working workbook failure is local, retryable, theme-safe, and narrow-safe", async ({
  page,
}) => {
  await mockSettingsReads(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  let exportRequests = 0;
  await page.route(
    `**/api/profiles/${profileId}/exports/working-workbook.xlsx`,
    async (route) => {
      exportRequests += 1;
      await route.fulfill({
        json: { detail: "Synthetic structural validation failed." },
        status: 409,
      });
    },
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(settingsPath);
  const panel = page.locator('[data-pd-id="workbook-template-export.panel"]');
  const button = page.locator('[data-pd-id="workbook-template-export.generate"]');

  await button.click();
  await expect(panel.locator(".warning-text")).toContainText(
    "Synthetic structural validation failed",
  );
  await expect(button).toBeEnabled();
  await expect.poll(() => exportRequests).toBe(1);
  const geometry = await panel.evaluate((element) => ({
    panelRight: element.getBoundingClientRect().right,
    viewportWidth: document.documentElement.clientWidth,
    pageOverflow:
      document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  expect(geometry.panelRight).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.pageOverflow).toBe(false);
  expect((await button.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);

  await page.evaluate(() => window.localStorage.setItem("openforge-theme", "light"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(panel).toBeVisible();
  await expect(button).toBeVisible();
});
