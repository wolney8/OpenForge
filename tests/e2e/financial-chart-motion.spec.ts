import { expect, test, type Page } from "@playwright/test";

const profileId = "profile-demo-001";

test.beforeEach(async ({ page, baseURL }) => {
  const sessionToken = process.env.OPENFORGE_E2E_SESSION_TOKEN;
  if (!sessionToken || !baseURL) return;
  await page.context().addCookies([{
    domain: new URL(baseURL).hostname, httpOnly: true, name: "pd_session", path: "/",
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

  const trendPoints = performanceGraph.getByRole("button");
  expect(await trendPoints.count()).toBeGreaterThan(0);
  const firstPoint = trendPoints.first();
  const firstPointName = await firstPoint.getAttribute("aria-label");
  await firstPoint.focus();
  await expect(performanceCard.locator(".dashboard-chart-point-detail")).toContainText(
    firstPointName?.split(":")[0] ?? "",
  );
  await firstPoint.press("Enter");
  await expect(firstPoint).toHaveClass(/is-selected/);
  const pointRecords = performanceCard.locator('[data-pd-id="dashboard.chart.drilldown"]');
  await expect(pointRecords).toBeVisible();
  await expect(pointRecords.getByRole("heading", { name: "Records in this point" })).toBeVisible();
  const underlyingRecord = pointRecords.getByRole("link", { name: /Synthetic event/ });
  await expect(underlyingRecord).toContainText("£ 100.00");
  await expect(underlyingRecord).toHaveAttribute(
    "href",
    `/profiles/${profileId}/tracker/sportsbook-bets?search=MOTION-SB-001&source=report-point`,
  );
  await underlyingRecord.click();
  await expect(page).toHaveURL(/sportsbook-bets\?search=MOTION-SB-001&source=report-point$/);
  await expect(page.getByRole("heading", { name: "Sportsbook Bets" })).toBeVisible();
  await page.goBack();
  await expect(performanceCard.locator('[data-pd-id="dashboard.chart.drilldown"]')).toBeVisible();

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
  await page.mouse.move(0, 0);
  await page.waitForTimeout(1_000);
  await miniCard.click({ position: { x: 18, y: 18 } });
  await expect.poll(async () => Number(await miniValue.getAttribute("data-money-motion-cycle")))
    .toBeGreaterThan(miniCycle);

  await moduleCard.click({ position: { x: 18, y: 18 } });
  await expect(moduleBars.first()).toHaveAttribute("data-progress-motion", "running");
  expect(await moduleBars.count()).toBeGreaterThan(1);
  const delays = await moduleBars.evaluateAll((bars) => bars.map((bar) => getComputedStyle(bar).animationDelay));
  expect(new Set(delays).size).toBeGreaterThan(1);
  await focusCard.click({ position: { x: 18, y: 18 } });
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

test("a delayed large-data response cannot repaint a newer report surface and recovery keeps the newer state", async ({ page }) => {
  const staleProfileId = profileId;
  let releaseProfileA: (() => void) | undefined;
  let profileAStarted: (() => void) | undefined;
  const profileARequest = new Promise<void>((resolve) => { profileAStarted = resolve; });
  const profileARelease = new Promise<void>((resolve) => { releaseProfileA = resolve; });
  let interruptProfileB = false;
  let summaryRequestCount = 0;

  const source = (profileId: string, amount: string) => ({
    accounts: [], balance_snapshots: [], casino_offers: [], cash_adjustments: [],
    each_way_extra_places: [], fee_periods: [], free_bets: [],
    sportsbook_bets: Array.from({ length: 200 }, (_, index) => ({
      bookmaker: `Bookmaker ${index + 1}`, calculated_liability_1: "0.00", counts_as_open: false,
      created_at: `2026-09-${String((index % 18) + 1).padStart(2, "0")}T08:00:00Z`,
      date_settled: `2026-09-${String((index % 18) + 1).padStart(2, "0")}T09:00:00Z`,
      event_name: `${profileId} record ${index + 1}`, exchange_name: "Exchange A",
      final_net_pnl: index === 0 ? amount : "0.00", is_overdue: false,
      lay_status: "Fully Laid", match_strategy: "Standard", offer_name: "Synthetic large-data offer",
      offer_type: "Qualifying Bet", projected_current_pnl: index === 0 ? amount : "0.00",
      reporting_value: index === 0 ? amount : "0.00", result: "Win",
      sportsbook_bet_id: `${profileId}-SB-${index + 1}`, status: "Settled",
    })),
    tracker_settings: {
      active_date_preset: "This Month", annual_profit_target: "1000.00",
      custom_end_date: "", custom_start_date: "", range_back_days: 0, range_forward_days: 0,
    },
  });

  await page.route("**/auth/session**", (route) => route.fulfill({ json: {
    authenticated: true, auth_provider: "local", email: "stale@example.invalid",
    linked_profile_ids: [staleProfileId], name: "Stale Response Tester", role: "fund_manager",
  }}));
  await page.route("**/auth/activity", (route) => route.fulfill({ status: 204 }));
  await page.route("**/auth/security-preference", (route) => route.fulfill({ json: { configured: false } }));
  await page.route("**/fund-manager/preferences/financial-motion", (route) => route.fulfill({ json: {
    duration_ms: 0, enabled: false, replay_delay_ms: 0, stagger_ms: 0,
  }}));
  await page.route("**/fund-manager/import-executions", (route) => route.fulfill({ json: [] }));
  await page.route("**/fund-manager/notifications**", (route) => route.fulfill({ json: [] }));
  await page.route(/\/profiles\/?(?:\?.*)?$/, (route) => route.fulfill({ json: [
    { current_cash_snapshot: "0.00", display_name: "Large Data Profile", profile_code: "LARGE", profile_id: staleProfileId, status: "Active", tracking_start_date: "2026-09-01" },
  ] }));
  await page.route("**/profiles/*/tracker-summary-sources", async (route) => {
    summaryRequestCount += 1;
    if (summaryRequestCount === 1) {
      profileAStarted?.();
      await profileARelease;
      await route.fulfill({ json: source(staleProfileId, "-111.00") }).catch(() => undefined);
      return;
    }
    if (interruptProfileB) {
      await route.fulfill({ status: 503, json: { detail: "Synthetic API interruption" } });
      return;
    }
    await route.fulfill({ json: source(staleProfileId, "222.00") });
  });
  await page.route("**/profiles/*/**", (route) => {
    if (route.request().resourceType() === "document") return route.fallback();
    if (new URL(route.request().url()).pathname.endsWith("/tracker-summary-sources")) {
      return route.fallback();
    }
    return route.fulfill({ json: [] });
  });

  await page.goto(`/profiles/${staleProfileId}/tracker/dashboard`);
  await profileARequest;
  await page.goto(`/profiles/${staleProfileId}/tracker/reports`);
  await expect(page.getByText("Loading tracker summaries")).toBeHidden({ timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "Reports", exact: true })).toBeVisible();
  await expect(page.locator("main")).toContainText("£ 222.00");
  releaseProfileA?.();
  await page.waitForTimeout(250);
  await expect(page.locator("main")).toContainText("£ 222.00");
  await expect(page.locator("body")).not.toContainText("£ (111.00)");

  interruptProfileB = true;
  await page.reload();
  await expect.poll(() => summaryRequestCount).toBeGreaterThan(2);
  const recoveryError = page.getByText(/Request failed with status 503|Synthetic API interruption|Unable to load tracker summaries/);
  await expect(recoveryError).toBeVisible();
  interruptProfileB = false;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.locator("main")).toContainText("£ 222.00", { timeout: 60_000 });
  await expect(recoveryError).toBeHidden();
});
