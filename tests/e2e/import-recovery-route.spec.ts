import { expect, test } from "@playwright/test";

test("Fund Manager recovery route bypasses tracker and Account hydration", async ({ page }) => {
  let recoveryRequests = 0;
  let recoveryArchiveRequests = 0;
  let recoveryDeleteRequests = 0;
  let trackerSummaryRequests = 0;
  let accountsRequests = 0;
  let managementProfileRequests = 0;
  let profileStatus = "Active";
  let releaseArchive: () => void = () => {};
  const archiveGate = new Promise<void>((resolve) => { releaseArchive = resolve; });
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/auth/session") {
      return route.fulfill({
        json: {
          authenticated: true,
          email: "founder@example.invalid",
          expires_at: 2_100_000_000,
          linked_profile_ids: ["profile-will"],
          name: "Synthetic Founder",
          role: "fund_manager",
          session_policy: {
            auto_logout_enabled: false,
            preference_configured: true,
            timeout_minutes: 30,
          },
        },
      });
    }
    if (pathname.includes("tracker-summary-sources")) {
      trackerSummaryRequests += 1;
      return route.fulfill({ status: 500, json: { detail: "Account hydration failed" } });
    }
    if (pathname.endsWith("/accounts")) {
      accountsRequests += 1;
      return route.fulfill({ status: 500, json: { detail: "Account hydration failed" } });
    }
    if (pathname === "/api/profiles/profile-will") {
      managementProfileRequests += 1;
      return route.fulfill({ status: 500, json: { detail: "Normal Profile management unavailable" } });
    }
    if (pathname.endsWith("/fund-manager/import-recovery/profile-will/archive")) {
      recoveryArchiveRequests += 1;
      expect(route.request().method()).toBe("POST");
      expect(route.request().postDataJSON()).toEqual({ confirmation: "ARCHIVE PROFILE" });
      await archiveGate;
      profileStatus = "Archived";
      return route.fulfill({
        json: { profile_id: "profile-will", display_name: "Will", status: profileStatus },
      });
    }
    if (pathname.endsWith("/fund-manager/import-recovery/profile-will/permanent-delete")) {
      recoveryDeleteRequests += 1;
      expect(route.request().method()).toBe("DELETE");
      expect(route.request().postDataJSON()).toEqual({ confirmation_name: "Will" });
      return route.fulfill({
        json: {
          profile_id: "profile-will", display_name: "Will", deleted: true,
          deletion_audit_id: "profile-deletion-synthetic", deleted_record_counts: {},
        },
      });
    }
    if (pathname.endsWith("/workbook-imports/recovery-diagnostics")) {
      recoveryRequests += 1;
      return route.fulfill({
        json: {
          profile_id: "profile-will",
          profile_display_name: "Will",
          profile_status: profileStatus,
          import_run_id: "profile-import-b9670d82dc3b5355bb66e6a33fcb1c68",
          execution_id: "execution-will",
          import_status: "POST_IMPORT_RECONCILIATION_FAILED",
          reconciliation_status: "POST-IMPORT RECONCILIATION: PASSED",
          checkpoint_id: "checkpoint-will",
          checkpoint_status: "AVAILABLE",
          checkpoint_checksum: "a".repeat(64),
          recorded_post_import_checksum: "b".repeat(64),
          current_profile_checksum: "b".repeat(64),
          current_matches_post_import_checksum: true,
          post_import_profile_drift_detected: false,
          rollback_available: true,
          active_write_audit_row_count: 747,
          execution_running: false,
          import_started_at: "2026-09-03T10:13:00+01:00",
          import_completed_at: "2026-09-03T10:20:00+01:00",
          import_rolled_back_at: "",
          rollback_conclusion: "ROLLBACK SAFE",
          rollback_reason: "The current Profile checksum matches the recorded post-import checksum.",
          attempts: [{
            execution_id: "execution-will", attempt_number: 2,
            status: "POST_IMPORT_RECONCILIATION_FAILED", checkpoint_id: "checkpoint-will",
            checkpoint_status: "AVAILABLE",
            reconciliation_status: "POST-IMPORT RECONCILIATION: PASSED",
            operational_health_status: "OPERATIONAL HEALTH: FAILED",
            rollback_status: "AVAILABLE", legacy_ambiguous: false, is_latest_attempt: true,
            started_at: "2026-09-03T10:13:00+01:00",
            completed_at: "2026-09-03T10:20:00+01:00",
          }],
        },
      });
    }
    return route.fulfill({ json: [] });
  });

  await page.goto("/fund-manager/import-recovery/profile-will");
  await expect(page.getByRole("heading", { name: "Import Recovery" })).toBeVisible();
  const diagnostics = page.locator('[data-pd-id="profile-import.recovery-diagnostics"]');

  await expect(diagnostics.getByText("ROLLBACK SAFE")).toBeVisible();
  await expect(diagnostics).toContainText("profile-import-b9670d82dc3b5355bb66e6a33fcb1c68");
  await expect(diagnostics).toContainText("Current / latest attempt");
  await expect(diagnostics.getByRole("button", { name: "Refresh import recovery diagnostics" })).toBeVisible();
  const archive = page.locator('[data-pd-id="profile-import.recovery-actions.archive"]');
  await expect(archive).toBeVisible();
  await expect(page.locator('[data-pd-id="profile-import.recovery-actions.delete"]')).toHaveCount(0);

  const actionGeometry = await archive.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      height: element.getBoundingClientRect().height,
      icon: element.querySelector(".material-symbols-outlined")?.textContent,
      overflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      tone: styles.color,
    };
  });
  expect(actionGeometry.height).toBeGreaterThanOrEqual(44);
  expect(actionGeometry.icon).toBe("archive");
  expect(actionGeometry.overflow).toBe(true);
  expect(actionGeometry.tone).not.toBe("");

  await archive.click();
  let archiveDialog = page.getByRole("dialog", { name: "Archive Profile?" });
  await expect(archiveDialog).toBeVisible();
  await archiveDialog.press("Escape");
  await expect(archiveDialog).toBeHidden();
  await expect(archive).toBeFocused();
  await archive.click();
  archiveDialog = page.getByRole("dialog", { name: "Archive Profile?" });
  await archiveDialog.getByRole("button", { name: "Archive Profile" }).click();
  const archivingButton = archiveDialog.getByRole("button", { name: "Archiving" });
  await expect(archivingButton).toBeDisabled();
  releaseArchive();
  await expect(page.getByText("Profile archived. Permanent deletion is now available.")).toBeVisible();
  const deleteAction = page.locator('[data-pd-id="profile-import.recovery-actions.delete"]');
  await expect(deleteAction).toBeVisible();
  await page.locator('[data-pd-id="app-shell.theme-toggle"]').click();
  await expect(deleteAction).toBeVisible();
  expect(await deleteAction.evaluate((element) => getComputedStyle(element).color)).not.toBe("");
  await page.setViewportSize({ width: 390, height: 780 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);

  await deleteAction.click();
  const deleteDialog = page.getByRole("dialog", { name: "Delete Profile permanently?" });
  const deleteButton = deleteDialog.getByRole("button", { name: "Permanently Delete Profile" });
  await expect(deleteButton).toBeDisabled();
  await deleteDialog.getByRole("textbox", { name: "Profile name" }).fill("Will");
  await expect(deleteButton).toBeEnabled();
  const dialogBounds = await deleteDialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      contained: rect.top >= 0 && rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
    };
  });
  expect(dialogBounds.contained).toBe(true);
  await deleteButton.click();
  await expect(page).toHaveURL(/\/profiles\?status=Archived$/);

  expect(recoveryRequests).toBe(2);
  expect(recoveryArchiveRequests).toBe(1);
  expect(recoveryDeleteRequests).toBe(1);
  expect(trackerSummaryRequests).toBe(0);
  expect(accountsRequests).toBe(0);
  expect(managementProfileRequests).toBe(0);
});
