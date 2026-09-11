import { expect, test } from "@playwright/test";

async function authorizeServerRoute(page: import("@playwright/test").Page) {
  const token = process.env.OPENFORGE_E2E_SESSION_TOKEN;
  if (!token) return;
  await page.context().addCookies([{
    name: "pd_session",
    value: token,
    url: process.env.OPENFORGE_E2E_BASE_URL ?? "http://127.0.0.1:3010",
  }]);
}

test("keeps Standard state while reusing the guided Profile and Account conversion flow", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await authorizeServerRoute(page);
  await page.context().route("**/auth/session*", (route) => route.fulfill({ json: {
    authenticated: true, email: "bridge-test@example.invalid", name: "Synthetic Fund Manager", role: "fund_manager",
    expires_at: Math.floor(Date.now() / 1000) + 3600, linked_profile_ids: [],
    session_policy: { auto_logout_enabled: false, timeout_minutes: 15, preference_configured: true, effective_expires_at: Math.floor(Date.now() / 1000) + 3600 },
  }}));
  await page.context().route("**/fund-manager/calculators/exchanges", (route) => route.fulfill({ json: [
    { catalogue_id: "exchange-smarkets", name: "Smarkets", default_commission_rate: "0" },
  ] }));
  await page.context().route("**/fund-manager/calculators/matched-betting/preview", (route) => route.fulfill({ json: {
    result_kind: "reference", calculation_state: "resolved", calculator_family: "matched-betting",
    canonical_back_odds: "3.00", canonical_lay_odds: "3.10", selected_lay_stake: "9.68",
    reference_lay_stake_standard: "9.68", reference_lay_stake_underlay: "9.00",
    reference_lay_stake_overlay: "10.20", liability: "20.32", pnl_if_back_wins: "-0.32",
    pnl_if_lay_wins: "-0.32", matched_result: "-0.32", promotion_trigger_result: null,
    effective_back_odds: "3.0000", profit_boost_source: null,
    outcomes: [
      { key: "back", label: "Back bet wins", bookmaker_component: "20.00", exchange_component: "-20.32", promotion_component: null, total: "-0.32" },
      { key: "lay", label: "Lay bet wins", bookmaker_component: "-10.00", exchange_component: "9.68", promotion_component: null, total: "-0.32" },
    ],
  }}));
  await page.context().route("**/profiles", (route) => route.fulfill({ json: [
    { profile_id: "profile-synthetic-001", display_name: "Synthetic Profile One", profile_code: "SYN-001", status: "Active" },
    { profile_id: "profile-synthetic-002", display_name: "Synthetic Profile Two", profile_code: "SYN-002", status: "Active" },
  ] }));
  await page.context().route("**/profiles/*/accounts", (route) => route.fulfill({ json: [
    { account_id: "AC-10BET-A", account: "10Bet", type: "Bookie", status: "Active", lifecycle_status: "Active", restrictions: [] },
    { account_id: "AC-10BET-B", account: "10Bet", type: "Bookie", status: "Active", lifecycle_status: "Active", restrictions: [] },
  ] }));
  const submitted: Record<string, unknown>[] = [];
  await page.context().route("**/fund-manager/calculator-conversions/standard", async (route) => {
    submitted.push(route.request().postDataJSON() as Record<string, unknown>);
    const retry = submitted.length > 1;
    await route.fulfill({ json: {
      source_id: "matched-betting-demo", source_checksum: "demo",
      notification: retry ? "Added Standard opportunity to 1 Profile." : "Added Standard opportunity to 1 Profile; 1 failed.",
      results: retry ? [
        { profile_id: "profile-synthetic-002", account: "10Bet", state: "succeeded", record_id: "SB-DEMO2", href: "/profiles/profile-synthetic-002/tracker/sportsbook-bets?record=SB-DEMO2", reasons: [] },
      ] : [
        { profile_id: "profile-synthetic-001", account: "10Bet", state: "succeeded", record_id: "SB-DEMO1", href: "/profiles/profile-synthetic-001/tracker/sportsbook-bets?record=SB-DEMO1", reasons: [] },
        { profile_id: "profile-synthetic-002", account: "10Bet", state: "failed", record_id: "", href: "", reasons: ["Synthetic retryable failure"] },
      ],
    }});
  });

  await page.goto("/fund-manager/calculators");
  await page.getByLabel("Back stake").fill("10.00");
  await page.getByLabel("Back odds").fill("3.00");
  await page.getByLabel("Lay odds").fill("3.10");
  await expect(page.locator('[data-pd-id="calculators.matched-betting.convert"]')).toBeVisible();
  await page.locator('[data-pd-id="calculators.matched-betting.convert"]').click();
  const dialog = page.getByRole("dialog", { name: "Convert Standard calculation to opportunity" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Event / fixture").fill("Synthetic United v Example City");
  await dialog.getByLabel("Offer type").selectOption("Bet & Get");
  const firstProfile = dialog.getByRole("checkbox", { name: "Synthetic Profile One SYN-001" });
  const secondProfile = dialog.getByRole("checkbox", { name: "Synthetic Profile Two SYN-002" });
  await firstProfile.check();
  await secondProfile.check();
  const firstIdentity = firstProfile.locator("xpath=..").locator(".table-cell-stack");
  const identityGeometry = await firstIdentity.evaluate((element) => {
    const primary = element.querySelector("strong")!.getBoundingClientRect();
    const secondary = element.querySelector("small")!.getBoundingClientRect();
    return { primaryBottom: primary.bottom, secondaryTop: secondary.top };
  });
  expect(identityGeometry.secondaryTop).toBeGreaterThan(identityGeometry.primaryBottom);
  const accountSelects = await dialog.getByLabel("Bookmaker Account").all();
  await expect(accountSelects[0].locator("option")).toHaveCount(3);
  await expect(accountSelects[0].locator("option", { hasText: "10Bet" })).toHaveCount(2);
  await accountSelects[0].selectOption("AC-10BET-A");
  await accountSelects[1].selectOption("AC-10BET-B");
  expect(consoleErrors.filter((message) => message.includes("same key") || message.includes("unique key"))).toEqual([]);
  await dialog.getByRole("button", { name: "Convert to opportunity" }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Synthetic retryable failure");
  await dialog.getByRole("button", { name: "Convert to opportunity" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('[data-pd-id="calculators.matched-betting.conversion-receipt"]')).toContainText("Synthetic Profile One · 10Bet · Sportsbook");
  await expect(page.locator('[data-pd-id="calculators.matched-betting.convert"]')).toBeFocused();
  expect(submitted[0].targets).toEqual([
    { profile_id: "profile-synthetic-001", account_id: "AC-10BET-A" },
    { profile_id: "profile-synthetic-002", account_id: "AC-10BET-B" },
  ]);
  expect(submitted[1].targets).toEqual([
    { profile_id: "profile-synthetic-002", account_id: "AC-10BET-B" },
  ]);
  await expect(page.getByLabel("Back stake")).toHaveValue("10.00");
  await expect(page.getByLabel("Back odds")).toHaveValue("3.00");
});

test("shared application header remains contained at desktop and half width", async ({ page }) => {
  await authorizeServerRoute(page);
  await page.context().route("**/auth/session*", (route) => route.fulfill({ json: { authenticated: true, role: "fund_manager", email: "owner@example.invalid", name: "Owner", expires_at: Date.now() / 1000 + 3600, linked_profile_ids: [], session_policy: { auto_logout_enabled: false } } }));
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1280, 720, 390]) {
    await page.setViewportSize({ width, height: 820 }); await page.goto("/fund-manager/calculators");
    const box = await page.locator('[data-pd-id="app-shell.top-bar"]').boundingBox();
    expect(box?.x).toBeGreaterThanOrEqual(0); expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.evaluate(() => localStorage.setItem("openforge-theme", "dark")); await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("does not expose Casino conversion for Blackjack Simulation", async ({ page }) => {
  await authorizeServerRoute(page);
  await page.context().route("**/auth/session*", (route) => route.fulfill({ json: {
    authenticated: true, email: "bridge-test@example.invalid", name: "Synthetic Fund Manager", role: "fund_manager",
    expires_at: Math.floor(Date.now() / 1000) + 3600, linked_profile_ids: [],
    session_policy: { auto_logout_enabled: false, timeout_minutes: 15, preference_configured: true, effective_expires_at: Math.floor(Date.now() / 1000) + 3600 },
  }}));
  await page.goto("/fund-manager/calculators?family=blackjack");
  await expect(page.getByRole("combobox", { name: "Blackjack session mode" })).toHaveValue("simulation");
  await expect(page.locator('[data-pd-id="calculators.blackjack.save-activity"]')).toHaveCount(0);
});

test("Bonus Lock-In advanced references drive selected, copied, and converted stake", async ({ page, context }) => {
  await authorizeServerRoute(page);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.context().route("**/auth/session*", (route) => route.fulfill({ json: { authenticated: true, role: "fund_manager", email: "owner@example.invalid", name: "Owner", expires_at: Date.now() / 1000 + 3600, linked_profile_ids: [], session_policy: { auto_logout_enabled: false } } }));
  await page.context().route("**/fund-manager/calculators/exchanges", (route) => route.fulfill({ json: [{ catalogue_id: "sm", name: "Smarkets", default_commission_rate: "0" }] }));
  const previewRequests: Array<Record<string, string>> = [];
  await page.context().route("**/fund-manager/calculators/matched-betting/preview", async (route) => {
    const request = route.request().postDataJSON() as Record<string, string>;
    previewRequests.push(request);
    const selected = request.strategy === "Underlay" ? "1.50" : request.strategy === "Overlay" ? "4.34" : "4.07";
    await route.fulfill({ json: { result_kind: "reference", calculation_state: "resolved", calculator_family: "matched-betting", canonical_back_odds: "9.24", canonical_lay_odds: "10.5", selected_lay_stake: selected, reference_lay_stake_standard: "4.07", reference_lay_stake_underlay: "1.50", reference_lay_stake_overlay: "4.34", liability: request.strategy === "Underlay" ? "14.25" : "38.67", pnl_if_back_wins: "2.53", pnl_if_lay_wins: "2.57", matched_result: "2.53", promotion_trigger_result: "2.57", effective_back_odds: "9.2400", profit_boost_source: null, strategy_references: [
      { strategy: "Standard", lay_stake: "4.07", liability: "38.67", back_wins_total: "2.53", back_loses_total: "2.57" },
      { strategy: "Underlay", lay_stake: "1.50", liability: "14.25", back_wins_total: "26.95", back_loses_total: "0.00" },
      { strategy: "Overlay", lay_stake: "4.34", liability: "41.23", back_wins_total: "-0.03", back_loses_total: "2.84" },
    ], outcomes: [{ key: "back", label: "Back bet wins", bookmaker_component: "41.20", exchange_component: "-38.67", promotion_component: null, total: "2.53" }, { key: "lay", label: "Back loses / bonus triggers", bookmaker_component: "-5.00", exchange_component: "4.07", promotion_component: "3.50", total: "2.57" }] } });
  });
  await page.goto("/fund-manager/calculators");
  await page.locator('[data-pd-id="calculators.matched-betting.calculator-offer"]').selectOption("bonus_lock_in");
  await page.getByLabel("Back stake").fill("5"); await page.getByLabel("Back odds").fill("9.24"); await page.getByLabel("Lay odds").fill("10.5");
  await expect(page.getByLabel("Bonus / refund value")).toHaveValue("5");
  await expect(page.locator('[data-pd-id="calculators.bonus-lock-in.underlay"]')).toContainText("£ 1.50");
  await expect(page.locator('[data-pd-id="calculators.bonus-lock-in.overlay"]')).toContainText("£ 4.34");
  await page.getByLabel("Actual selected strategy").selectOption("Underlay");
  await expect(page.locator('[data-pd-id="calculators.matched-betting.copy-lay-stake"]')).toContainText("£ 1.50");
  await page.locator('[data-pd-id="calculators.matched-betting.copy-lay-stake"]').getByRole("button").click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("1.50");
  expect(previewRequests.at(-1)).toMatchObject({ bonus_backing_bet: "Normal", bonus_trigger: "Lay Wins", strategy: "Underlay", retention_percent: "70", exchange_commission: "0" });
  await page.getByLabel("Bet Type").selectOption("SNR");
  await page.getByLabel("Bonus Applied If Bet").selectOption("Back Wins");
  await page.getByLabel("Actual selected strategy").selectOption("Overlay");
  await expect.poll(() => previewRequests.at(-1)).toMatchObject({ bonus_backing_bet: "SNR", bonus_trigger: "Back Wins", strategy: "Overlay" });
});

test("Profit Boost explains payout-derived odds before lay inputs are complete", async ({ page }) => {
  await authorizeServerRoute(page);
  await page.context().route("**/auth/session*", (route) => route.fulfill({ json: { authenticated: true, role: "fund_manager", email: "owner@example.invalid", name: "Owner", expires_at: Date.now() / 1000 + 3600, linked_profile_ids: [], session_policy: { auto_logout_enabled: false } } }));
  await page.context().route("**/fund-manager/calculators/exchanges", (route) => route.fulfill({ json: [{ catalogue_id: "sm", name: "Smarkets", default_commission_rate: "0" }] }));
  await page.context().route("**/fund-manager/calculators/profit-boost/preview", (route) => route.fulfill({ json: { calculation_state: "resolved", notes: [], source: "calculated", reference_odds: "2.7800", raw_derived_odds: "2.786", effective_odds: "2.7800", bookmaker_total_return: "27.86", effective_odds_return: "27.80", potential_profit: "17.86", equation: "Raw odds = bookmaker total return / stake; hedge odds = floor(raw odds, 2dp)" } }));
  await page.goto("/fund-manager/calculators");
  await page.locator('[data-pd-id="calculators.matched-betting.calculator-offer"]').selectOption("profit_boost");
  await page.getByLabel("Boosted price source").selectOption("total_return");
  await page.getByLabel("Back stake").fill("10"); await page.getByRole("textbox", { name: "Total potential return" }).fill("27.86");
  const breakdown = page.locator('[data-pd-id="calculators.profit-boost.breakdown"]');
  await expect(breakdown).toContainText("2.786"); await expect(breakdown).toContainText("£ 27.86"); await expect(breakdown).toContainText("£ 27.80");
});

const eachWayResult = {
  result_kind: "reference", calculation_state: "resolved", mode: "Extra Place", place_back_odds: "2.60",
  win_lay_stake: "9.78", place_lay_stake: "9.63", win_liability: "80.20", place_liability: "16.37",
  qualifying_loss: "-0.22", extra_place_profit: "15.50", first_place_pnl: "-0.22",
  standard_place_pnl: "-0.22", extra_place_pnl: "15.50", unplaced_pnl: "-0.22", current_value: "-0.22",
  first_place_bookie_win_pnl: "80.00", first_place_bookie_place_pnl: "16.00", first_place_exchange_win_pnl: "-80.20", first_place_exchange_place_pnl: "-16.02",
  standard_place_bookie_win_pnl: "-10.00", standard_place_bookie_place_pnl: "16.00", standard_place_exchange_win_pnl: "9.78", standard_place_exchange_place_pnl: "-16.00",
  extra_place_bookie_win_pnl: "-10.00", extra_place_bookie_place_pnl: "16.00", extra_place_exchange_win_pnl: "9.78", extra_place_exchange_place_pnl: "-0.28",
  unplaced_bookie_win_pnl: "-10.00", unplaced_bookie_place_pnl: "-10.00", unplaced_exchange_win_pnl: "9.78", unplaced_exchange_place_pnl: "10.00",
};

async function mockEachWayBridge(page: import("@playwright/test").Page, mode: "Extra Place" | "Each Way") {
  await authorizeServerRoute(page);
  await page.context().route("**/auth/session*", (route) => route.fulfill({ json: {
    authenticated: true, email: "bridge-test@example.invalid", name: "Synthetic Fund Manager", role: "fund_manager",
    expires_at: Math.floor(Date.now() / 1000) + 3600, linked_profile_ids: [],
    session_policy: { auto_logout_enabled: false, timeout_minutes: 15, preference_configured: true, effective_expires_at: Math.floor(Date.now() / 1000) + 3600 },
  }}));
  await page.context().route("**/fund-manager/calculators/exchanges", (route) => route.fulfill({ json: [
    { catalogue_id: "exchange-smarkets", name: "Smarkets", default_commission_rate: "0" },
  ] }));
  await page.context().route("**/fund-manager/calculators/each-way/preview", (route) => route.fulfill({ json: {
    ...eachWayResult, mode, extra_place_profit: mode === "Extra Place" ? "15.50" : null,
    extra_place_pnl: mode === "Extra Place" ? "15.50" : null,
  } }));
  await page.context().route("**/profiles", (route) => route.fulfill({ json: [
    { profile_id: "profile-synthetic-001", display_name: "Synthetic Profile", profile_code: "SYN-001", status: "Active" },
  ] }));
  await page.context().route("**/profiles/*/accounts", (route) => route.fulfill({ json: [
    { account_id: "AC-BET365", account: "Bet365", type: "Bookie", status: "Active", lifecycle_status: "Active", restrictions: [] },
  ] }));
}

test("Profit Boost conversion keeps its governed mode and works in the shared half-width review", async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 900 });
  await page.addInitScript(() => window.localStorage.setItem("openforge-theme", "dark"));
  await mockEachWayBridge(page, "Extra Place");
  await page.context().route("**/fund-manager/calculators/matched-betting/preview", (route) => route.fulfill({ json: {
    result_kind: "reference", calculation_state: "resolved", calculator_family: "matched-betting",
    canonical_back_odds: "3.2000", canonical_lay_odds: "3.10", selected_lay_stake: "10.33",
    reference_lay_stake_standard: "10.33", reference_lay_stake_underlay: "9.00",
    reference_lay_stake_overlay: "10.20", liability: "21.69", pnl_if_back_wins: "0.31",
    pnl_if_lay_wins: "0.33", matched_result: "0.31", promotion_trigger_result: null,
    effective_back_odds: "3.2000", profit_boost_source: "displayed",
    outcomes: [
      { key: "back", label: "Back bet wins", bookmaker_component: "22.00", exchange_component: "-21.69", promotion_component: null, total: "0.31" },
      { key: "lay", label: "Lay bet wins", bookmaker_component: "-10.00", exchange_component: "10.33", promotion_component: null, total: "0.33" },
    ],
  } }));
  let submitted: Record<string, unknown> | null = null;
  await page.context().route("**/fund-manager/calculator-conversions/standard", async (route) => {
    submitted = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ json: { source_id: "profit-boost-demo", source_checksum: "demo", notification: "Added Standard opportunity to 1 Profile.", results: [
      { profile_id: "profile-synthetic-001", account: "Bet365", state: "succeeded", record_id: "SB-PB1", href: "/profiles/profile-synthetic-001/tracker/sportsbook-bets?record=SB-PB1", reasons: [] },
    ] } });
  });
  await page.goto("/fund-manager/calculators");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator('[data-pd-id="calculators.matched-betting.calculator-offer"]').selectOption("profit_boost");
  await page.getByLabel("Back stake").fill("10.00");
  await page.getByLabel("Boosted odds displayed").fill("3.20");
  await page.getByLabel("Lay odds").fill("3.10");
  await page.locator('[data-pd-id="calculators.matched-betting.convert"]').click();
  const dialog = page.getByRole("dialog", { name: "Convert Standard calculation to opportunity" });
  await expect(dialog.getByLabel("Offer type")).toHaveValue("Profit Boost");
  await expect(dialog.getByLabel("Offer type")).toBeDisabled();
  await dialog.getByLabel("Event / fixture").fill("Synthetic boost fixture");
  await dialog.getByText("Synthetic Profile").click();
  await dialog.getByLabel("Bookmaker Account").selectOption("AC-BET365");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await dialog.getByRole("button", { name: "Convert to opportunity" }).click();
  expect(((submitted?.calculator ?? {}) as { bet_type?: string }).bet_type).toBe("profit_boost");
  await expect(page.getByLabel("Boosted odds displayed")).toHaveValue("3.20");
});

for (const mode of ["Extra Place", "Each Way"] as const) {
  test(`${mode} state converts through the shared bridge and remains intact`, async ({ page }) => {
    await mockEachWayBridge(page, mode);
    let submitted: Record<string, unknown> | null = null;
    await page.context().route("**/fund-manager/calculator-conversions/each-way-extra-place", async (route) => {
      submitted = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({ json: { source_id: "each-way-demo", source_checksum: "demo", notification: `Added ${mode} opportunity to 1 Profile.`, results: [
        { profile_id: "profile-synthetic-001", account: "Bet365", state: "succeeded", record_id: "EP-DEMO1", href: "/profiles/profile-synthetic-001/tracker/each-way-extra-places?record=EP-DEMO1", reasons: [] },
      ] } });
    });
    const inputs = { mode, stake: "10.00", backOdds: "9.00", term: "5", bookmakerPlaces: "4", exchangePlaces: mode === "Extra Place" ? "3" : "4", exchange: "Smarkets", winLayOdds: "9.20", placeLayOdds: "2.70", winCommission: "0", placeCommission: "0" };
    const route = mode === "Each Way" ? "/calculator" : "/fund-manager/calculators";
    await page.goto(`${route}?family=each-way&eachWay=${encodeURIComponent(JSON.stringify(inputs))}`);
    await expect(page.locator('[data-pd-id="calculators.each-way.convert"]')).toBeVisible();
    await page.locator('[data-pd-id="calculators.each-way.convert"]').click();
    const dialog = page.getByRole("dialog", { name: "Convert Each Way / Extra Place calculation to opportunity" });
    await dialog.getByLabel("Runner").fill("Synthetic Runner");
    await dialog.getByLabel("Race").fill("Synthetic 14:30");
    await dialog.getByText("Synthetic Profile").click();
    await dialog.getByLabel("Bookmaker Account").selectOption("AC-BET365");
    await dialog.getByRole("button", { name: "Convert to opportunity" }).click();
    await expect(dialog).toHaveCount(0);
    expect(((submitted?.calculator ?? {}) as { mode?: string }).mode).toBe(mode);
    await expect(page.getByLabel("E/W Stake (each way)")).toHaveValue("10.00");
  });
}

test("unsupported financial families and Odds utility expose no conversion action", async ({ page }) => {
  await authorizeServerRoute(page);
  await page.context().route("**/auth/session*", (route) => route.fulfill({ json: {
    authenticated: true, email: "bridge-test@example.invalid", name: "Synthetic Fund Manager", role: "fund_manager",
    expires_at: Math.floor(Date.now() / 1000) + 3600, linked_profile_ids: [],
    session_policy: { auto_logout_enabled: false, timeout_minutes: 15, preference_configured: true, effective_expires_at: Math.floor(Date.now() / 1000) + 3600 },
  }}));
  for (const family of ["sequential-lay", "early-payout", "multiples", "dutching", "odds-converter"]) {
    await page.goto(`/fund-manager/calculators?family=${family}`);
    await expect(page.getByRole("button", { name: "Convert to opportunity" })).toHaveCount(0);
  }
});

test("Multi-Lay exposes the same conversion review without losing its legs", async ({ page }) => {
  await mockEachWayBridge(page, "Extra Place");
  await page.context().route("**/fund-manager/calculators/multi-lay/preview", (route) => route.fulfill({ json: {
    result_kind: "reference", calculation_state: "resolved", no_selection_value: "-0.20",
    matched_result: "-0.20", total_liability: "25.00", branches: [
      { label: "Home", lay_odds: "2.50", lay_stake: "4.10", liability: "6.15", outcome_value: "-0.20" },
      { label: "Away", lay_odds: "3.20", lay_stake: "3.20", liability: "7.04", outcome_value: "-0.20" },
      { label: "Draw", lay_odds: "3.60", lay_stake: "2.84", liability: "7.38", outcome_value: "-0.20" },
    ],
  } }));
  let submitted: Record<string, unknown> | null = null;
  await page.context().route("**/fund-manager/calculator-conversions/multi-lay", async (route) => {
    submitted = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ json: { source_id: "multi-lay-demo", source_checksum: "demo", notification: "Added Multi-Lay opportunity to 1 Profile.", results: [
      { profile_id: "profile-synthetic-001", account: "Bet365", state: "succeeded", record_id: "SB-MULTI1", href: "/profiles/profile-synthetic-001/tracker/sportsbook-bets?record=SB-MULTI1", reasons: [] },
    ] } });
  });
  const inputs = { allocation: "standard", backStake: "10.00", backOdds: "4.00", exchange: "Smarkets", commission: "0", outcomes: [{ label: "Home", layOdds: "2.50" }, { label: "Away", layOdds: "3.20" }, { label: "Draw", layOdds: "3.60" }] };
  await page.goto(`/fund-manager/calculators?family=multi-lay&multiLay=${encodeURIComponent(JSON.stringify(inputs))}`);
  await page.locator('[data-pd-id="calculators.multi-lay.convert"]').click();
  const dialog = page.getByRole("dialog", { name: "Convert Multi-Lay calculation to opportunity" });
  await dialog.getByLabel("Event / fixture").fill("Synthetic Multi-Lay fixture");
  await dialog.getByText("Synthetic Profile").click();
  await dialog.getByLabel("Bookmaker Account").selectOption("AC-BET365");
  await dialog.getByRole("button", { name: "Convert to opportunity" }).click();
  expect((((submitted?.calculator ?? {}) as { outcomes?: unknown[] }).outcomes ?? []).length).toBe(3);
});
