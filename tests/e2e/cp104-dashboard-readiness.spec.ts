import { expect, test } from "@playwright/test";

const profile = {
  profile_id: "profile-synthetic-cp104",
  display_name: "Synthetic CP-104 Profile",
  profile_code: "CP104-001",
  status: "Active",
  tracking_start_date: "2026-01-01",
  management_fee_percent: "0",
  investment_fee_percent: "0",
};

const emptySources = {
  accounts: [], sportsbook_bets: [], free_bets: [], casino_offers: [], cash_adjustments: [],
  each_way_extra_places: [], balance_snapshots: [], fee_periods: [], tracker_settings: {
    active_date_preset: "All Dates", custom_start_date: "", custom_end_date: "",
    range_back_days: 0, range_forward_days: 0,
  },
};

function sourcesWithCasino(id: string, value: string) {
  return {
    ...emptySources,
    casino_offers: [{
      casino_offer_id: `casino-${id}`, bookmaker: "Synthetic Casino", offer_name: "Synthetic result",
      status: "Settled", result: "Win", date_started: "2026-01-02", date_settling: "2026-01-02",
      expiry_datetime: "2026-01-02", resolved_net_pnl: value, counts_as_open: false,
      is_overdue: false, week_label: "2026-W01",
    }],
  };
}

function sourcesWithPartialCasino() {
  return {
    ...emptySources,
    casino_offers: [
      ...sourcesWithCasino("known", "5.00").casino_offers,
      ...["unknown-a", "unknown-b", "unknown-c"].map((id) => ({
        ...sourcesWithCasino(id, "").casino_offers[0],
        resolved_net_pnl: null,
      })),
    ],
  };
}

const session = {
  authenticated: true,
  email: "cp104@example.invalid",
  expires_at: 4102444800,
  name: "Synthetic CP-104 Owner",
  role: "fund_manager",
  session_policy: {
    absolute_expires_at: 4102444800, auto_logout_enabled: false,
    effective_expires_at: 4102444800, inactivity_expires_at: null,
    last_activity_at: 1791100000, preference_configured: true,
    timeout_minutes: 30, valid_now: true,
  },
};

test("fresh Dashboard loading never presents a cached financial failure", async ({ page }) => {
  let releaseSummary!: () => void;
  const summaryGate = new Promise<void>((resolve) => { releaseSummary = resolve; });
  await page.addInitScript(() => localStorage.removeItem("openforge-report-profile-selection"));
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/auth/session") return route.fulfill({ json: session });
    if (pathname === "/api/auth/activity") return route.fulfill({ status: 200, json: { session_policy: session.session_policy } });
    if (pathname === "/api/profiles") return route.fulfill({ json: [profile] });
    if (pathname === "/api/fund-manager/preferences/selected-range") return route.fulfill({ json: {
      selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null,
    } });
    if (pathname === "/api/reports/combined-summary-sources") {
      await summaryGate;
      return route.fulfill({ json: {
        scope: "active", profile_ids: [profile.profile_id], failures: [],
        sources: { [profile.profile_id]: sourcesWithPartialCasino() },
      } });
    }
    return route.fulfill({ status: 200, json: [] });
  });

  await page.goto("/");
  const performance = page.locator('[data-pd-id="performance.selected-range"]');
  await expect(page.getByRole("status").filter({ hasText: "Loading combined profile reporting" })).toBeVisible();
  await expect(page.getByText("Unavailable", { exact: true })).toHaveCount(0);
  releaseSummary();
  await expect(performance).toBeVisible();
  await expect(performance).toContainText("£ 5.00");
  await expect(performance).toContainText("Incomplete · 3 records unavailable");
  await expect(performance.getByText("Unavailable", { exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 430, height: 900 });
  await expect(performance).toBeInViewport();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test("a superseded combined response cannot overwrite the current Profile scope", async ({ page }) => {
  const secondProfile = { ...profile, profile_id: "profile-synthetic-cp104-b", display_name: "Synthetic CP-104 B", profile_code: "CP104-002" };
  let requestCount = 0;
  await page.addInitScript(() => localStorage.removeItem("openforge-report-profile-selection"));
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/auth/session") return route.fulfill({ json: session });
    if (pathname === "/api/auth/activity") return route.fulfill({ status: 200, json: { session_policy: session.session_policy } });
    if (pathname === "/api/profiles") return route.fulfill({ json: [profile, secondProfile] });
    if (pathname === "/api/fund-manager/preferences/selected-range") return route.fulfill({ json: {
      selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null,
    } });
    if (pathname === "/api/reports/combined-summary-sources") {
      requestCount += 1;
      const body = route.request().postDataJSON() as { profile_ids: string[]; scope: string };
      if (requestCount === 1) await new Promise((resolve) => setTimeout(resolve, 800));
      return route.fulfill({ json: {
        scope: body.scope, profile_ids: body.profile_ids, failures: [],
        sources: Object.fromEntries(body.profile_ids.map((id) => [
          id, sourcesWithCasino(id, id === profile.profile_id ? "10.00" : "20.00"),
        ])),
      } });
    }
    return route.fulfill({ status: 200, json: [] });
  });

  await page.goto("/");
  const scope = page.locator('[data-pd-id="reports.profile-scope"]');
  await scope.locator("summary").click();
  await scope.getByLabel("Report Profile scope").selectOption("custom");
  if (!(await scope.evaluate((node) => (node as HTMLDetailsElement).open))) {
    await scope.locator("summary").click();
  }
  await scope
    .locator('[data-pd-id="reports.profile-scope.options"] label')
    .filter({ hasText: "CP104-002" })
    .locator("input")
    .uncheck({ force: true });
  const performance = page.locator('[data-pd-id="performance.selected-range"]');
  await expect(scope.locator("summary")).toContainText("Custom · 1 Profile");
  await expect(performance).toContainText("£ 10.00");
  await page.waitForTimeout(1_000);
  await expect(performance).toContainText("£ 10.00");
  await expect(performance).not.toContainText("£ 30.00");
  await expect(scope.locator("summary")).toContainText("Custom · 1 Profile");
});
