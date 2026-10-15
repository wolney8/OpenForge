import { expect, test, type Page } from "@playwright/test";

test.use({ actionTimeout: 15_000 });

const baseURL = process.env.OPENFORGE_E2E_BASE_URL ?? "http://localhost:3010";

type SyntheticProfile = { profile_id: string; display_name: string };

async function createProfile(page: Page, name: string, code: string): Promise<SyntheticProfile> {
  const response = await page.request.post("/api/profiles/onboarding", {
    data: {
      accounts: [],
      display_name: name,
      profile_code: code,
      profile_relationship: "Personal",
      management_fee_percent: "0",
      investment_fee_percent: "0",
      enabled_modules: ["sportsbook-bets", "free-bets", "casino-offers", "cash-adjustments", "each-way-extra-places"],
      quick_actions: [],
      setup_path: "import",
      tracking_start_date: "2026-01-01",
    },
  });
  expect(response.status(), await response.text()).toBe(201);
  return (await response.json()).profile as SyntheticProfile;
}

async function openProfileMenu(page: Page) {
  const trigger = page.locator('[data-pd-id="profile-command.trigger"]');
  await trigger.click();
  await expect(page.locator('[data-pd-id="profile-command.popover"]')).toHaveClass(/is-open/);
}

async function switchProfile(page: Page, profileId: string) {
  await openProfileMenu(page);
  await page.locator(`[data-pd-id="profile-command.profile.${profileId}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/profiles/${profileId}/tracker/`));
}

async function navigateSection(page: Page, route: "dashboard" | "sportsbook-bets") {
  await openProfileMenu(page);
  await page.locator(`[data-pd-id="profile-command.route.${route}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/tracker/${route}$`), { timeout: 15_000 });
}

async function expectTerminalSummary(
  page: Page,
  profileName: string,
  range: "Last Month" | "This Year",
  expected: "zero" | "valid",
) {
  const header = page.locator('[data-pd-id="profile-command.trigger"]');
  await expect(header).toContainText(profileName);
  await expect(header).not.toHaveAttribute("aria-busy", "true", { timeout: 10_000 });
  await expect(header).not.toContainText("Updating summary…");
  await expect(header).toHaveAttribute("title", new RegExp(`Tracker range: ${range}`));
  if (expected === "zero") {
    await expect(header.locator(".financial-value")).toHaveAttribute("aria-label", /£ 0\.00$/);
  } else {
    await expect(header.locator(".financial-value")).toHaveAttribute("aria-label", /£ 12\.34$/);
  }
  await expect(page.locator(".summary-menu-loading-icon")).toHaveCount(0);
}

test("universal range and Profile summary settle across 20+ delayed transitions", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  test.skip(process.env.OPENFORGE_PROFILE_RANGE_STABILITY_GATE !== "true", "Authenticated isolated stability runtime required");
  const sessionToken = process.env.OPENFORGE_STABILITY_SESSION_TOKEN;
  const replacementSessionToken = process.env.OPENFORGE_STABILITY_SECOND_SESSION_TOKEN;
  test.skip(!sessionToken || !replacementSessionToken, "Two isolated authenticated sessions are required");

  await page.context().addCookies([{
    httpOnly: true,
    name: "pd_session",
    sameSite: "Lax",
    url: baseURL,
    value: sessionToken,
  }]);
  await page.setViewportSize({ height: 1200, width: 1440 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.setFixedTime(new Date("2026-10-14T12:00:00Z"));
  const suffix = Date.now();
  const profileA = await createProfile(page, `Synthetic Stability A ${suffix}`, `STAB-A-${suffix}`);
  const profileB = await createProfile(page, `Synthetic Stability B ${suffix}`, `STAB-B-${suffix}`);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let delayProfileA = 0;
  let delayProfileB = 0;
  let failProfileB = false;
  let malformedProfileB = false;

  await page.route("**/api/profiles/*/tracker-summary-sources", async (route) => {
    const isProfileA = route.request().url().includes(profileA.profile_id);
    if (failProfileB && !isProfileA) {
      await route.fulfill({ json: { detail: "Synthetic summary failure" }, status: 503 });
      return;
    }
    const response = await route.fetch();
    const payload = await response.json();
    const delay = isProfileA ? delayProfileA : delayProfileB;
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    payload.accounts = isProfileA ? [
      { account_id: "STABILITY-BOOKIE", account: "Bookmaker A", type: "Bookie", counts_in_cash_total: true, status: "Active", current_balance: "62.34", pending_withdrawal_amount: "0.00", last_balance_update: "2026-10-14T10:00:00+01:00", group_name: "Synthetic", platform: "Bookmaker A" },
      { account_id: "STABILITY-EXCHANGE-1", account: "Exchange A", type: "Exchange", counts_in_cash_total: true, status: "Active", current_balance: "", pending_withdrawal_amount: "0.00", last_balance_update: "", group_name: "Synthetic", platform: "Exchange A" },
      { account_id: "STABILITY-EXCHANGE-2", account: "Exchange B", type: "Exchange", counts_in_cash_total: true, status: "Active", current_balance: "", pending_withdrawal_amount: "0.00", last_balance_update: "", group_name: "Synthetic", platform: "Exchange B" },
      { account_id: "STABILITY-BANK", account: "Bank A", type: "Bank", counts_in_cash_total: true, status: "Active", current_balance: "0.00", pending_withdrawal_amount: "0.00", last_balance_update: "2026-10-14T10:00:00+01:00", group_name: "Synthetic", platform: "Bank A" },
    ] : [];
    payload.sportsbook_bets = isProfileA ? [
      ["STABILITY-SB-001", "3.00", "2026-09-04T12:00:00+01:00"],
      ["STABILITY-SB-002", "4.00", "2026-09-11T12:00:00+01:00"],
      ["STABILITY-SB-003", "5.34", "2026-09-18T12:00:00+01:00"],
    ].map(([id, value, settledAt]) => ({
      bookmaker: "Bookmaker A",
      counts_as_open: false,
      date_settled: settledAt,
      event_name: `Synthetic stability fixture ${id}`,
      exchange_name: "Exchange A",
      final_net_pnl: value,
      lay_status: "Matched",
      match_strategy: "Standard",
      offer_name: "Synthetic stability offer",
      offer_type: "Bet & Get",
      projected_current_pnl: value,
      reporting_value: value,
      result: "Back Won",
      sportsbook_bet_id: id,
      status: "Settled",
    })) : [];
    payload.casino_offers = !isProfileA && malformedProfileB ? [{
      bookmaker: "Bookmaker B",
      casino_offer_id: "STABILITY-MALFORMED-001",
      counts_as_open: false,
      date_settling: "2026-09-19T12:00:00+01:00",
      offer_name: "Synthetic malformed value",
      resolved_net_pnl: null,
      result: "Complete",
      status: "Settled",
    }] : [];
    await route.fulfill({ json: payload, status: response.status() });
  });

  let transitions = 0;
  const assert = async (profile: SyntheticProfile, range: "Last Month" | "This Year", expected: "zero" | "valid") => {
    transitions += 1;
    await expectTerminalSummary(page, profile.display_name, range, expected);
    expect(errors, `runtime errors after transition ${transitions}`).toEqual([]);
  };

  try {
    await page.request.put("/api/fund-manager/preferences/selected-range", { data: {
      selected_range_preset: "Last Month",
      selected_range_custom_start: null,
      selected_range_custom_end: null,
    } });
    await page.goto(`/profiles/${profileA.profile_id}/tracker/dashboard`);
    await assert(profileA, "Last Month", "valid"); // 1

    const performanceCard = page.locator('[data-pd-id="dashboard.selected-range-performance"]');
    const openPositionsCard = page.locator('[data-pd-id="dashboard.metric.open-positions"]');
    const accountCashCard = page.locator('[data-pd-id="dashboard.metric.current-account-cash"]');
    const [performanceBox, openPositionsBox, accountCashBox, chartBox] = await Promise.all([
      performanceCard.boundingBox(),
      openPositionsCard.boundingBox(),
      accountCashCard.boundingBox(),
      performanceCard.locator("figure").boundingBox(),
    ]);
    expect(performanceBox).not.toBeNull();
    expect(openPositionsBox).not.toBeNull();
    expect(accountCashBox).not.toBeNull();
    expect(chartBox).not.toBeNull();
    expect(Math.abs(performanceBox!.y - openPositionsBox!.y)).toBeLessThanOrEqual(2);
    expect(Math.abs((performanceBox!.y + performanceBox!.height) - (accountCashBox!.y + accountCashBox!.height))).toBeLessThanOrEqual(2);
    expect(chartBox!.height / performanceBox!.height).toBeGreaterThan(0.38);
    const cashRows = accountCashCard.locator(".current-account-cash-categories > div");
    await expect(cashRows).toHaveCount(3);
    await expect(cashRows.nth(0)).toContainText("Bookie");
    await expect(cashRows.nth(1)).toContainText("ExchangeIncomplete");
    await expect(cashRows.nth(2)).toContainText("Bank");
    const cashRowBoxes = await cashRows.evaluateAll((rows) => rows.map((row) => {
      const box = row.getBoundingClientRect();
      return { bottom: box.bottom, top: box.top };
    }));
    expect(cashRowBoxes[0]!.bottom).toBeLessThanOrEqual(cashRowBoxes[1]!.top);
    expect(cashRowBoxes[1]!.bottom).toBeLessThanOrEqual(cashRowBoxes[2]!.top);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
    await page.screenshot({ fullPage: true, path: testInfo.outputPath("profile-operations-desktop.png") });

    delayProfileA = 450;
    await page.emulateMedia({ reducedMotion: "reduce" });
    const settledHeaderBox = await page.locator('[data-pd-id="profile-command.trigger"]').boundingBox();
    const settledPerformanceBox = await performanceCard.boundingBox();
    await page.getByLabel("Change tracker date range").selectOption("This Year");
    await expect(page.locator('[data-pd-id="profile-command.trigger"]')).toHaveAttribute("aria-busy", "true");
    await expect(page.locator(".summary-menu-loading-indicator")).toBeVisible();
    const updatingHeaderBox = await page.locator('[data-pd-id="profile-command.trigger"]').boundingBox();
    const updatingPerformanceBox = await performanceCard.boundingBox();
    expect(updatingHeaderBox?.height).toBe(settledHeaderBox?.height);
    expect(updatingPerformanceBox?.height).toBeCloseTo(settledPerformanceBox!.height, 0);
    await expect(page.locator(".summary-menu-loading-indicator span")).toHaveCSS("animation-name", "none");
    await assert(profileA, "This Year", "valid"); // 2
    await page.emulateMedia({ reducedMotion: "no-preference" });

    await switchProfile(page, profileB.profile_id);
    await assert(profileB, "This Year", "zero"); // 3
    await navigateSection(page, "sportsbook-bets");
    await assert(profileB, "This Year", "zero"); // 4
    await navigateSection(page, "dashboard");
    await assert(profileB, "This Year", "zero"); // 5
    await expect(performanceCard).toContainText("No betting activity in this range");
    await expect(performanceCard.locator("figure")).toHaveCount(0);

    delayProfileB = 400;
    await page.getByLabel("Change tracker date range").selectOption("Last Month");
    await expect(page.locator(".summary-menu-loading-indicator")).toBeVisible();
    await assert(profileB, "Last Month", "zero"); // 6
    await switchProfile(page, profileA.profile_id);
    await assert(profileA, "Last Month", "valid"); // 7
    await page.reload();
    await assert(profileA, "Last Month", "valid"); // 8

    delayProfileA = 900;
    await page.getByLabel("Change tracker date range").selectOption("This Year");
    await expect(page.locator(".summary-menu-loading-indicator")).toBeVisible();
    await switchProfile(page, profileB.profile_id);
    delayProfileB = 40;
    await assert(profileB, "This Year", "zero"); // 9: stale A response cannot win
    await new Promise((resolve) => setTimeout(resolve, 950));
    await assert(profileB, "This Year", "zero"); // 10

    await switchProfile(page, profileA.profile_id);
    await assert(profileA, "This Year", "valid"); // 11
    await navigateSection(page, "sportsbook-bets");
    await assert(profileA, "This Year", "valid"); // 12
    await navigateSection(page, "dashboard");
    await assert(profileA, "This Year", "valid"); // 13
    await page.getByLabel("Change tracker date range").selectOption("Last Month");
    await assert(profileA, "Last Month", "valid"); // 14
    await switchProfile(page, profileB.profile_id);
    await assert(profileB, "Last Month", "zero"); // 15
    await page.reload();
    await assert(profileB, "Last Month", "zero"); // 16

    failProfileB = true;
    await page.getByLabel("Change tracker date range").selectOption("This Year");
    const header = page.locator('[data-pd-id="profile-command.trigger"]');
    await expect(header).not.toHaveAttribute("aria-busy", "true", { timeout: 10_000 });
    await expect(header).toContainText("Profile summary failed to load");
    expect(errors).toEqual([]);
    transitions += 1; // 17: explicit terminal failure
    failProfileB = false;
    await page.reload();
    await assert(profileB, "This Year", "zero"); // 18
    malformedProfileB = true;
    await page.reload();
    await expect(page.locator('[data-pd-id="profile-command.trigger"]')).toContainText("Profile P&L unavailable");
    await expect(performanceCard).toContainText("Unavailable");
    await expect(performanceCard.locator("figure")).toHaveCount(0);
    transitions += 1; // 19: malformed activity is compact and terminal
    malformedProfileB = false;
    await page.reload();
    await assert(profileB, "This Year", "zero"); // 20
    await switchProfile(page, profileA.profile_id);
    await assert(profileA, "This Year", "valid"); // 21
    await navigateSection(page, "sportsbook-bets");
    await assert(profileA, "This Year", "valid"); // 22
    await navigateSection(page, "dashboard");
    await assert(profileA, "This Year", "valid"); // 23

    expect((await page.request.post("/api/auth/logout")).ok()).toBeTruthy();
    await page.context().clearCookies();
    await page.goto("/login");
    await page.context().addCookies([{
      httpOnly: true,
      name: "pd_session",
      sameSite: "Lax",
      url: baseURL,
      value: replacementSessionToken,
    }]);
    await page.goto(`/profiles/${profileB.profile_id}/tracker/dashboard`);
    await assert(profileB, "This Year", "zero"); // 24: re-auth preserves universal range
    await switchProfile(page, profileA.profile_id);
    await assert(profileA, "This Year", "valid"); // 25
    await page.reload();
    await assert(profileA, "This Year", "valid"); // 26
    await page.setViewportSize({ height: 1000, width: 760 });
    const narrowPerformanceBox = await performanceCard.boundingBox();
    const narrowOpenPositionsBox = await openPositionsCard.boundingBox();
    expect(narrowPerformanceBox).not.toBeNull();
    expect(narrowOpenPositionsBox).not.toBeNull();
    expect(narrowOpenPositionsBox!.y).toBeGreaterThanOrEqual(narrowPerformanceBox!.y + narrowPerformanceBox!.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
    await page.screenshot({ fullPage: true, path: testInfo.outputPath("profile-operations-narrow.png") });
    expect(transitions).toBeGreaterThanOrEqual(20);
  } finally {
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await page.request.patch(`/api/profiles/${profileA.profile_id}`, { data: { status: "Archived" } });
    await page.request.patch(`/api/profiles/${profileB.profile_id}`, { data: { status: "Archived" } });
  }
});
