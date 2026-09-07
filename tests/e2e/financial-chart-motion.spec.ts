import { expect, test, type Page } from "@playwright/test";

const profileId = "profile-demo-001";

test.beforeEach(async ({ page }) => {
  const sessionToken = process.env.OPENFORGE_E2E_SESSION_TOKEN;
  if (!sessionToken) return;
  await page.context().addCookies([{
    domain: "127.0.0.1", httpOnly: true, name: "pd_session", path: "/",
    sameSite: "Lax", secure: false, value: sessionToken,
  }]);
});

async function mockDashboard(page: Page, motionEnabled = true) {
  await page.addInitScript(() => window.localStorage.setItem("openforge-theme", "dark"));
  await page.route("**/auth/session**", (route) => route.fulfill({ json: {
    authenticated: true, auth_provider: "local", email: "motion@example.invalid",
    linked_profile_ids: [profileId], name: "Motion Tester", role: "fund_manager",
  }}));
  await page.route("**/auth/activity", (route) => route.fulfill({ status: 204 }));
  await page.route("**/auth/security-preference", (route) => route.fulfill({ json: { configured: false } }));
  await page.route("**/fund-manager/preferences/financial-motion", (route) => route.fulfill({ json: {
    duration_ms: 520, enabled: motionEnabled, replay_delay_ms: 1500, stagger_ms: 80,
  }}));
  await page.route("**/fund-manager/import-executions", (route) => route.fulfill({ json: [] }));
  await page.route("**/fund-manager/notifications**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    return route.fulfill({ json: pathname.endsWith("/state")
      ? { dismissed_ids: [], read_keys: [] }
      : pathname.endsWith("/preferences") ? { preferences: {} } : [] });
  });
  await page.route(/\/profiles\/?(?:\?.*)?$/, (route) => route.fulfill({ json: [{
    current_cash_snapshot: "250.00", display_name: "Motion Profile", investment_fee_percent: "0.00",
    management_fee_percent: "0.00", profile_code: "MOTION", profile_id: profileId,
    status: "Active", tracking_start_date: "2026-01-01",
  }] }));
  await page.route(`**/profiles/${profileId}/**`, (route) => {
    if (route.request().resourceType() === "document") return route.fallback();
    return route.fulfill({ json: [] });
  });
  await page.route(`**/profiles/${profileId}/tracker-summary-sources`, (route) => route.fulfill({ json: {
    accounts: [], balance_snapshots: [], casino_offers: [], each_way_extra_places: [], fee_periods: [],
    free_bets: [], sportsbook_bets: [{
      bookmaker: "Bookmaker A", calculated_liability_1: "20.00", counts_as_open: false,
      created_at: "2026-09-07T08:00:00Z", date_settled: "2026-09-07T09:00:00Z",
      event_name: "Synthetic event", exchange_name: "Exchange A", final_net_pnl: "100.00",
      is_overdue: false, lay_status: "Fully Laid", match_strategy: "Standard",
      offer_name: "Synthetic offer", offer_type: "Qualifying Bet", projected_current_pnl: "100.00",
      reporting_value: "100.00", result: "Win", sportsbook_bet_id: "MOTION-SB-001", status: "Settled",
    }, {
      bookmaker: "Bookmaker B", calculated_liability_1: "10.00", counts_as_open: true,
      created_at: "2026-09-07T10:00:00Z", date_settled: "2026-12-07T09:00:00Z",
      event_name: "Synthetic open event", exchange_name: "Exchange A", final_net_pnl: null,
      is_overdue: true, lay_status: "Fully Laid", match_strategy: "Standard",
      offer_name: "Synthetic open offer", offer_type: "Qualifying Bet", projected_current_pnl: "0.00",
      reporting_value: "0.00", result: "Pending", sportsbook_bet_id: "MOTION-SB-002", status: "Placed",
    }, {
      bookmaker: "Bookmaker C", calculated_liability_1: "10.00", counts_as_open: true,
      created_at: "2026-09-07T11:00:00Z", date_settled: "2026-12-07T10:00:00Z",
      event_name: "Synthetic later event", exchange_name: "Exchange A", final_net_pnl: null,
      is_overdue: false, lay_status: "Fully Laid", match_strategy: "Standard",
      offer_name: "Synthetic later offer", offer_type: "Qualifying Bet", projected_current_pnl: "0.00",
      reporting_value: "0.00", result: "Pending", sportsbook_bet_id: "MOTION-SB-003", status: "Placed",
    }], cash_adjustments: [], tracker_settings: {
      annual_profit_target: "200.00",
      active_date_preset: "This Year", custom_end_date: "", custom_start_date: "",
      range_back_days: 0, range_forward_days: 0,
    },
  }}));
}

test("dashboard containers coordinate financial, bar, and ring replay without layout drift", async ({ page }) => {
  await mockDashboard(page);
  await page.goto(`/profiles/${profileId}/tracker/dashboard`);
  await expect(page.getByText("Loading tracker summaries")).toBeHidden({ timeout: 60_000 });

  const targetCard = page.locator('[data-pd-id="dashboard.target-progress"]');
  const targetBar = targetCard.locator('[data-progress-motion]');
  const targetValue = targetCard.locator(".financial-value").first();
  const performanceCard = page.locator('[data-pd-id="dashboard.selected-range-performance"]');
  const performanceGraph = performanceCard.locator('[data-chart-motion]');
  const performanceValue = performanceCard.locator(".financial-value").first();
  const moduleCard = page.locator('[data-pd-id="dashboard.module-mix"]');
  const moduleBars = moduleCard.locator('[data-progress-motion]');
  const focusCard = page.locator('[data-pd-id="dashboard.action-load"]');
  const focusRing = focusCard.locator('[data-progress-motion]');
  await expect(targetBar).toHaveAttribute("data-progress-motion", "settled", { timeout: 5_000 });
  await page.waitForTimeout(1_600);

  await targetCard.hover();
  await expect(targetBar).toHaveAttribute("data-progress-motion", "running");
  const hoverBarCycle = Number(await targetBar.getAttribute("data-progress-motion-cycle"));
  const hoverValueCycle = Number(await targetValue.getAttribute("data-money-motion-cycle"));
  await targetCard.locator("h3").hover();
  expect(Number(await targetBar.getAttribute("data-progress-motion-cycle"))).toBe(hoverBarCycle);

  await page.locator(".dashboard-primary-row").hover();
  await targetCard.hover();
  expect(Number(await targetBar.getAttribute("data-progress-motion-cycle"))).toBe(hoverBarCycle);

  await targetCard.click({ position: { x: 18, y: 18 } });
  const firstClickCycle = Number(await targetBar.getAttribute("data-progress-motion-cycle"));
  expect(firstClickCycle).toBeGreaterThan(hoverBarCycle);
  expect(Number(await targetValue.getAttribute("data-money-motion-cycle"))).toBeGreaterThan(hoverValueCycle);
  await targetCard.click({ position: { x: 18, y: 18 } });
  const secondClickCycle = Number(await targetBar.getAttribute("data-progress-motion-cycle"));
  expect(secondClickCycle).toBeGreaterThan(firstClickCycle);

  await page.waitForTimeout(1_600);
  await page.locator(".dashboard-primary-row").hover();
  await targetCard.hover();
  expect(Number(await targetBar.getAttribute("data-progress-motion-cycle"))).toBeGreaterThan(secondClickCycle);

  const chartDuration = Number.parseFloat(await targetBar.evaluate((bar) => getComputedStyle(bar).animationDuration));
  expect(chartDuration).toBeGreaterThanOrEqual(1);

  await performanceCard.click({ position: { x: 18, y: 18 } });
  await expect(performanceGraph).toHaveAttribute("data-chart-motion", "running");
  await expect(performanceGraph.locator(".dashboard-sparkline-line")).toHaveCSS(
    "animation-name",
    "dashboard-graph-line-reveal",
  );
  expect(Number(await performanceValue.getAttribute("data-money-motion-cycle"))).toBeGreaterThan(0);

  const uncoveredMotionCards = await page.locator("article.dashboard-visual-card").evaluateAll((cards) =>
    cards
      .filter((card) => card.querySelector(".financial-value, [data-progress-motion], [data-chart-motion]"))
      .filter((card) => card.getAttribute("data-motion-replay-group") !== "true")
      .map((card) => card.getAttribute("data-pd-id") ?? card.className),
  );
  expect(uncoveredMotionCards).toEqual([]);

  const miniCard = page.locator(".dashboard-mini-card", { hasText: "Open Current Value" });
  const miniValue = miniCard.locator('.financial-value[aria-label="£ 100.00"]');
  const miniCycle = Number(await miniValue.getAttribute("data-money-motion-cycle"));
  await miniCard.hover();
  expect(Number(await miniValue.getAttribute("data-money-motion-cycle"))).toBeGreaterThan(miniCycle);

  await moduleCard.hover();
  await expect(moduleBars.first()).toHaveAttribute("data-progress-motion", "running");
  expect(await moduleBars.count()).toBeGreaterThan(1);
  const delays = await moduleBars.evaluateAll((bars) => bars.map((bar) => getComputedStyle(bar).animationDelay));
  expect(new Set(delays).size).toBeGreaterThan(1);
  await focusCard.hover();
  await expect(focusRing).toHaveCSS("animation-name", "dashboard-ring-reveal");

  const beforeTheme = await Promise.all([targetCard.boundingBox(), moduleCard.boundingBox(), focusCard.boundingBox()]);
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const afterTheme = await Promise.all([targetCard.boundingBox(), moduleCard.boundingBox(), focusCard.boundingBox()]);
  afterTheme.forEach((box, index) => {
    expect(Math.abs((box?.width ?? 0) - (beforeTheme[index]?.width ?? 0))).toBeLessThanOrEqual(1);
    expect(Math.abs((box?.height ?? 0) - (beforeTheme[index]?.height ?? 0))).toBeLessThanOrEqual(1);
  });

  await expect(moduleBars.first()).toHaveAttribute("data-progress-motion", "settled", { timeout: 5_000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await moduleCard.click({ position: { x: 18, y: 18 } });
  await expect(moduleBars.first()).toHaveAttribute("data-progress-motion", "settled");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBeTruthy();

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`/profiles/${profileId}/tracker/reports`);
  await expect(page.getByText("Loading tracker summaries")).toBeHidden({ timeout: 60_000 });
  const reportRow = page.locator("table tbody tr", { has: page.locator(".financial-value") }).first();
  const reportValues = reportRow.locator(".financial-value");
  await page.waitForTimeout(1_600);
  const reportCycles = await reportValues.evaluateAll((values) =>
    values.map((value) => Number(value.getAttribute("data-money-motion-cycle"))),
  );
  await reportRow.hover();
  const hoveredReportCycles = await reportValues.evaluateAll((values) =>
    values.map((value) => Number(value.getAttribute("data-money-motion-cycle"))),
  );
  expect(hoveredReportCycles.some((cycle, index) => cycle > reportCycles[index])).toBe(true);
  await page.mouse.move(0, 0);
  await reportRow.hover();
  expect(await reportValues.evaluateAll((values) =>
    values.map((value) => Number(value.getAttribute("data-money-motion-cycle"))),
  )).toEqual(hoveredReportCycles);
  await reportRow.locator("td").first().click();
  await expect.poll(async () => {
    const next = await reportValues.evaluateAll((values) =>
      values.map((value) => Number(value.getAttribute("data-money-motion-cycle"))),
    );
    return next.some((cycle, index) => cycle > hoveredReportCycles[index]);
  }).toBe(true);
});

test("financial motion preference off keeps chart progress at its exact final state", async ({ page }) => {
  await mockDashboard(page, false);
  await page.goto(`/profiles/${profileId}/tracker/dashboard`);
  await expect(page.getByText("Loading tracker summaries")).toBeHidden({ timeout: 60_000 });
  const card = page.locator('[data-pd-id="dashboard.target-progress"]');
  const bar = card.locator('[data-progress-motion]');
  await expect(bar).toHaveAttribute("data-progress-motion", "settled");
  await expect(bar).toHaveAttribute("data-progress-motion-cycle", "0");
  await card.hover();
  await card.click({ position: { x: 18, y: 18 } });
  await expect(bar).toHaveAttribute("data-progress-motion-cycle", "0");
  expect(await bar.evaluate((element) => getComputedStyle(element).width)).not.toBe("0px");
});
