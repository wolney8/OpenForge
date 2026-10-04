import { expect, test } from "@playwright/test";

const profiles = [
  ...Array.from({ length: 56 }, (_, index) => ({
    profile_id: `active-${String(index).padStart(2, "0")}`,
    display_name: `Active Profile ${String(index).padStart(2, "0")}`,
    profile_code: `ACT-${String(index).padStart(2, "0")}`,
    status: "Active",
    tracking_start_date: "2026-01-01",
    management_fee_percent: "0",
    investment_fee_percent: "0",
  })),
  ...Array.from({ length: 8 }, (_, index) => ({
    profile_id: `inactive-${String(index).padStart(2, "0")}`,
    display_name: `Inactive Profile ${String(index).padStart(2, "0")}`,
    profile_code: `INA-${String(index).padStart(2, "0")}`,
    status: index % 2 ? "Archived" : "Inactive",
    tracking_start_date: "2026-01-01",
    management_fee_percent: "0",
    investment_fee_percent: "0",
  })),
];

const emptySources = {
  accounts: [], sportsbook_bets: [], free_bets: [], casino_offers: [], cash_adjustments: [],
  each_way_extra_places: [], balance_snapshots: [], fee_periods: [], tracker_settings: {
    active_date_preset: "Week (Mon-Sun)", custom_start_date: "", custom_end_date: "",
    range_back_days: 0, range_forward_days: 0,
  },
};

test("Reports stays aggregate-first with 64 authorised Profiles", async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    localStorage.removeItem("openforge-report-profile-selection");
    localStorage.removeItem("openforge-report-period-pnl:combined");
  });
  let combinedSummaryReads = 0;
  let legacySummaryReads = 0;
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/profiles") {
      await route.fulfill({ json: profiles }); return;
    }
    if (pathname === "/api/reports/combined-summary-sources") {
      combinedSummaryReads += 1;
      const body = route.request().postDataJSON() as { profile_ids: string[] };
      await route.fulfill({ json: {
        scope: "custom",
        profile_ids: body.profile_ids,
        sources: Object.fromEntries(body.profile_ids.map((profileId) => [profileId, emptySources])),
      } }); return;
    }
    if (/\/api\/profiles\/[^/]+\/tracker-summary-sources$/.test(pathname)) {
      legacySummaryReads += 1;
      await route.fulfill({ json: emptySources }); return;
    }
    await route.continue();
  });

  await page.goto("/reports");
  const scope = page.locator('[data-pd-id="reports.profile-scope"]');
  await expect(scope.locator("summary")).toContainText("56 Active Profiles");
  await expect(scope.locator("summary")).not.toContainText("Active Profile 00");
  await expect(page.locator('[data-pd-id="reports.period-pnl"]')).toBeVisible({ timeout: 90_000 });
  await expect(page.locator('[data-pd-id="reports.category-breakdown"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="reports.explorer"]')).toBeHidden();
  await expect(page.getByRole("heading", { name: "Profile Performance" })).toBeVisible();
  await expect(page.locator('[data-pd-id^="reports.profile.active-"]')).toHaveCount(16);
  await expect(page.getByText("Page 1 of 4 · 56 rows").first()).toBeVisible();
  expect(combinedSummaryReads).toBeLessThanOrEqual(2);
  expect(legacySummaryReads).toBe(0);

  await page.getByRole("button", { name: "Next", exact: true }).filter({ visible: true }).first().click();
  await expect(page.locator('[data-pd-id="reports.profile.active-16"]')).toBeVisible();
  await page.getByLabel("Search Profile Performance").fill("Active Profile 55");
  await expect(page.locator('[data-pd-id^="reports.profile.active-"]')).toHaveCount(1);
  await expect(page.locator('[data-pd-id="reports.profile.active-55"]')).toBeVisible();
  await page.getByLabel("Search Profile Performance").fill("");
  await page.getByLabel("Sort Profile Performance").selectOption("profile-asc");
  await expect(page.locator('[data-pd-id="reports.profile.active-00"]')).toBeVisible();

  await scope.locator("summary").click();
  await scope.getByLabel("Report Profile scope").selectOption("inactive");
  await expect(scope.locator("summary")).toContainText("8 Inactive Profiles");
  await expect(page.locator('[data-pd-id^="reports.profile.inactive-"]')).toHaveCount(8);
  await scope.getByLabel("Report Profile scope").selectOption("all");
  await expect(scope.locator("summary")).toContainText("All Profiles · 64");
  await scope.getByLabel("Report Profile scope").selectOption("custom");
  await scope.getByLabel("Search Report Profiles").fill("Inactive Profile 07");
  await expect(scope.getByRole("checkbox")).toHaveCount(1);
  await scope.getByRole("button", { name: "Use Matching Profiles" }).click();
  await expect(scope.locator("summary")).toContainText("Custom · 1 Profile");
  await scope.locator("summary").click();
  await expect(page.locator('[data-pd-id="reports.profile.inactive-07"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="reports.profile.inactive-07"] a')).toHaveAttribute(
    "href", "/profiles/inactive-07/tracker/reports?source=combined-reports"
  );

  await page.locator('[data-pd-id="reports.explorer-disclosure"] > summary').click();
  await expect(page.locator('[data-pd-id="reports.explorer"]')).toBeVisible();
  await page.getByLabel("Explorer group by").selectOption("module");
  await page.getByLabel("Explorer metric").selectOption("count");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByLabel("Search Profile Performance").focus();
  await expect(page.getByLabel("Search Profile Performance")).toBeFocused();
});
