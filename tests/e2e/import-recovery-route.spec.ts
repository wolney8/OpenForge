import { expect, test } from "@playwright/test";

test("Fund Manager recovery route bypasses tracker and Account hydration", async ({ page }) => {
  let recoveryRequests = 0;
  let trackerSummaryRequests = 0;
  let accountsRequests = 0;
  await page.route("**/api/**", (route) => {
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
    if (pathname.endsWith("/workbook-imports/recovery-diagnostics")) {
      recoveryRequests += 1;
      return route.fulfill({
        json: {
          profile_id: "profile-will",
          profile_display_name: "Will",
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
          manual_post_import_mutation_detected: false,
          rollback_available: true,
          active_write_audit_row_count: 747,
          execution_running: false,
          import_started_at: "2026-09-03T10:13:00+01:00",
          import_completed_at: "2026-09-03T10:20:00+01:00",
          import_rolled_back_at: "",
          rollback_conclusion: "ROLLBACK SAFE",
          rollback_reason: "The current Profile checksum matches the recorded post-import checksum.",
        },
      });
    }
    return route.fulfill({ json: [] });
  });

  await page.goto("/fund-manager/import-recovery/profile-will");
  await expect(page.getByRole("heading", { name: "Import Recovery" })).toBeVisible();
  const diagnostics = page.locator('[data-pd-id="profile-import.recovery-diagnostics"]');
  await diagnostics.getByRole("button", { name: "Load import recovery diagnostics" }).click();

  await expect(diagnostics.getByText("ROLLBACK SAFE")).toBeVisible();
  await expect(diagnostics).toContainText("profile-import-b9670d82dc3b5355bb66e6a33fcb1c68");
  expect(recoveryRequests).toBe(1);
  expect(trackerSummaryRequests).toBe(0);
  expect(accountsRequests).toBe(0);
});
