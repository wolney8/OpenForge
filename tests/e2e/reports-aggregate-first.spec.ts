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

const syntheticSession = {
  authenticated: true,
  email: "release-smoke@example.invalid",
  expires_at: 4102444800,
  name: "Release Smoke",
  role: "fund_manager",
  session_policy: {
    absolute_expires_at: 4102444800,
    auto_logout_enabled: false,
    effective_expires_at: 4102444800,
    inactivity_expires_at: null,
    last_activity_at: 1791100000,
    preference_configured: true,
    timeout_minutes: 30,
    valid_now: true,
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
    if (pathname === "/api/auth/session") {
      await route.fulfill({ json: syntheticSession }); return;
    }
    if (pathname === "/api/auth/activity") {
      await route.fulfill({ status: 200, json: { session_policy: syntheticSession.session_policy } }); return;
    }
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
  await expect(page.getByRole("heading", { name: "Detailed Formal Reports" })).toBeVisible();
  await expect(page.locator('[data-pd-id="reports.category-breakdown"]')).toHaveCount(0);
  await page.getByRole("tab", { name: "Performance" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('[data-pd-id="reports.category-breakdown"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="reports.explorer"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Profile Performance" })).toBeVisible();
  await expect(page.locator('[data-pd-id^="reports.profile.active-"]')).toHaveCount(16);
  await expect(page.getByText("Page 1 of 4 · 56 rows").first()).toBeVisible();
  // One bounded combined projection per route mount; no N×Profile summary fan-out.
  expect(combinedSummaryReads).toBeLessThanOrEqual(4);
  expect(legacySummaryReads).toBe(0);

  await page.getByLabel("Profile Performance top controls").getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator('[data-pd-id="reports.profile.active-16"]')).toBeVisible();
  await page.getByLabel("Search Profile Performance").fill("Active Profile 55");
  await expect(page.locator('[data-pd-id^="reports.profile.active-"]')).toHaveCount(1);
  await expect(page.locator('[data-pd-id="reports.profile.active-55"]')).toBeVisible();
  await page.getByLabel("Search Profile Performance").fill("");
  await page.getByLabel("Sort Profile Performance").selectOption("profile-asc");
  await expect(page.locator('[data-pd-id="reports.profile.active-00"]')).toBeVisible();

  await page.getByRole("tab", { name: "Profiles" }).click();
  await expect(page.locator('[data-pd-id^="profiles.directory.row."]')).toHaveCount(16);
  await expect(page.getByLabel("Profile Directory top controls", { exact: true })).toContainText("Page 1 of 4 · 56 rows");
  await page.getByRole("tab", { name: "Exposure" }).click();
  await expect(page.getByRole("heading", { name: "Profile Exposure" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Profile Exposure" }).locator("xpath=..").locator("tbody > tr")).toHaveCount(16);
  await expect(page.getByLabel("Profile Exposure top controls", { exact: true })).toContainText(/Page 1 of 4 · \d+ rows/);
  await page.getByRole("tab", { name: "Fees" }).click();
  await expect(page.locator('[data-pd-id^="fees.active-"][data-pd-id$=".row"]')).toHaveCount(16);
  await expect(page.getByLabel("Monthly Fee Status top controls", { exact: true })).toContainText(/Page 1 of 4 · \d+ rows/);
  await page.getByRole("tab", { name: "Performance" }).click();

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

  await page.getByLabel("Explorer group by").selectOption("module");
  await page.getByLabel("Explorer metric").selectOption("count");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByLabel("Search Profile Performance").focus();
  await expect(page.getByLabel("Search Profile Performance")).toBeFocused();
  await page.getByRole("tab", { name: "Profiles" }).click();
  await expect(page.getByRole("heading", { name: "Profile Workload" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Balance Snapshot History" })).toBeVisible();
  await page.getByRole("tab", { name: "Exposure" }).click();
  await expect(page.getByRole("heading", { name: "Profile Exposure" })).toBeVisible();
  await page.getByRole("tab", { name: "Fees" }).click();
  await expect(page.getByRole("heading", { name: "Monthly Fee Status" })).toBeVisible();
  await page.getByRole("tab", { name: "Formal Reports" }).click();
  await expect(page.getByRole("heading", { name: "Detailed Formal Reports" })).toBeVisible();
});

test("Reports keeps valid Profile evidence while a malformed Profile remains unavailable", async ({ page }) => {
  const scopedProfiles = [profiles[0]!, profiles.at(-1)!];
  await page.addInitScript(() => {
    localStorage.setItem("openforge-report-profile-selection", JSON.stringify({
      scope: "all",
      selectedIds: [],
      archivedIds: [],
    }));
  });
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/auth/session") {
      await route.fulfill({ json: syntheticSession }); return;
    }
    if (pathname === "/api/auth/activity") {
      await route.fulfill({ status: 200, json: { session_policy: syntheticSession.session_policy } }); return;
    }
    if (pathname === "/api/profiles") {
      await route.fulfill({ json: scopedProfiles }); return;
    }
    if (pathname === "/api/reports/combined-summary-sources") {
      await route.fulfill({ json: {
        scope: "all",
        profile_ids: scopedProfiles.map((profile) => profile.profile_id),
        sources: { [scopedProfiles[0].profile_id]: emptySources },
        failures: [{
          profile_id: scopedProfiles[1].profile_id,
          status: 500,
          code: "source_validation_failed",
        }],
      } }); return;
    }
    await route.continue();
  });

  await page.goto("/reports");
  await expect(page.locator('[data-pd-id="reports.profile-scope"] summary')).toContainText(
    "All Profiles · 2",
  );
  const sourceFailure = page.locator(".validation-message").filter({ hasText: "profile load failed" });
  await expect(sourceFailure).toContainText("1 profile load failed");
  await expect(sourceFailure).toContainText("Summary cards require complete reads");
  await expect(sourceFailure).toContainText(scopedProfiles[1].display_name);
  await page.getByRole("tab", { name: "Performance" }).click();
  await expect(page.locator(`[data-pd-id="reports.profile.${scopedProfiles[0].profile_id}"]`)).toBeVisible();
  await expect(page.locator(`[data-pd-id="reports.profile.${scopedProfiles[1].profile_id}"]`)).toHaveCount(0);
});

test("Free Bets Today applies one exact recipe and paginates matching Placed and Settled records", async ({ page }) => {
  const profile = profiles[0]!;
  const freeBets = Array.from({ length: 34 }, (_, index) => ({
    free_bet_id: `free-today-${String(index).padStart(2, "0")}`,
    bookmaker: index % 2 ? "Bookmaker A" : "Bookmaker B",
    event_name: `Free Bet Today ${String(index).padStart(2, "0")}`,
    offer_type: "Free Bet",
    bet_type: "Single",
    fixture_type: "Football",
    status: index % 2 ? "Settled" : "Placed",
    result: index % 2 ? "Back Won" : "Pending",
    retention_mode: "SNR",
    date_settled: "2026-10-08T12:00:00+01:00",
    expiry_datetime: "2026-10-10T12:00:00+01:00",
    exchange_name: "Exchange A",
    calculated_liability_1: "5.00",
    projected_current_pnl: index % 2 ? "1.00" : "0.40",
    final_net_pnl: index % 2 ? "1.00" : "99.00",
    reporting_value: index % 2 ? "1.00" : "0.40",
    lay_status: "Matched",
    counts_as_open: index % 2 === 0,
    is_overdue: false,
  }));
  freeBets.push({ ...freeBets[0]!, free_bet_id: "wrong-type", bet_type: "Multiple" });
  freeBets.push({ ...freeBets[1]!, free_bet_id: "wrong-status", status: "Available" });
  freeBets.push({ ...freeBets[1]!, free_bet_id: "wrong-date", date_settled: "2026-10-07T12:00:00+01:00" });
  freeBets.push({ ...freeBets[1]!, free_bet_id: "undated", date_settled: "", final_net_pnl: null, reporting_value: null });
  await page.addInitScript(() => {
    localStorage.setItem("openforge-report-explorer:combined", JSON.stringify({
      preset: "This Month", metric: "pnl", group: "provider", expanded: "stale",
      filters: { provider: "Stale Provider", offerType: "Stale Offer" }, point: "stale",
    }));
  });
  await page.clock.setFixedTime(new Date("2026-10-08T12:00:00Z"));
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/auth/session") return route.fulfill({ json: syntheticSession });
    if (pathname === "/api/auth/activity") return route.fulfill({ status: 200, json: { session_policy: syntheticSession.session_policy } });
    if (pathname === "/api/profiles") return route.fulfill({ json: [profile] });
    if (pathname === "/api/reports/combined-summary-sources") return route.fulfill({ json: {
      scope: "active", profile_ids: [profile.profile_id],
      sources: { [profile.profile_id]: { ...emptySources, free_bets: freeBets } },
    }});
    await route.continue();
  });
  await page.goto("/");
  const explorer = page.locator('[data-pd-id="reports.explorer"]');
  const recipe = explorer.locator('[data-pd-id="reports.explorer.recipe.free-bets-today"]');
  await recipe.click();
  await expect(recipe).toHaveAttribute("aria-pressed", "true");
  await expect(explorer.locator('[data-pd-id="reports.explorer.match-count"]')).toHaveText("34");
  await expect(explorer.locator('[data-pd-id="reports.explorer.total"]')).toHaveText("Incomplete");
  await expect(explorer.getByRole("status").locator(".financial-value")).toHaveAttribute("aria-label", "£ 17.00");
  await expect(explorer.getByRole("status")).toContainText("1 undated candidate record");
  await expect(explorer.locator('[data-pd-id^="reports.explorer.record.free-today-"]')).toHaveCount(16);
  await expect(explorer.getByText("Page 1 of 3 · 34 rows").first()).toBeVisible();
  await expect(explorer.locator('[data-pd-id="reports.explorer.record.free-today-00"]')).toContainText("Placed");
  await expect(explorer.locator('[data-pd-id="reports.explorer.record.free-today-01"]')).toContainText("Settled");
  await expect(explorer.locator('[data-pd-id="reports.explorer.active-filters"]')).toContainText("Status: Placed");
  await expect(explorer.locator('[data-pd-id="reports.explorer.active-filters"]')).not.toContainText("Stale Provider");
  await explorer.getByRole("button", { name: "This month", exact: true }).click();
  await expect(recipe).toHaveAttribute("aria-pressed", "false");
  await expect(explorer.locator('[data-pd-id="reports.explorer.active-filters"]')).toContainText("Module: Free Bets");
  await recipe.click();
  await explorer.getByLabel("Explorer metric").selectOption("count");
  await expect(explorer.locator('[data-pd-id="reports.explorer.match-count"]')).toHaveText("34");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
