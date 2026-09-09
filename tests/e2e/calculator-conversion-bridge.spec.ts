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
    { account: "Bet365", type: "Bookie", status: "Active", lifecycle_status: "Active", restrictions: [] },
  ] }));
  let submitted: Record<string, unknown> | null = null;
  await page.context().route("**/fund-manager/calculator-conversions/standard", async (route) => {
    submitted = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ json: {
      source_id: "matched-betting-demo", source_checksum: "demo",
      notification: "Added Standard opportunity to 2 Profiles.",
      results: [
        { profile_id: "profile-synthetic-001", account: "Bet365", state: "succeeded", record_id: "SB-DEMO1", href: "/profiles/profile-synthetic-001/tracker/sportsbook-bets?record=SB-DEMO1", reasons: [] },
        { profile_id: "profile-synthetic-002", account: "Bet365", state: "succeeded", record_id: "SB-DEMO2", href: "/profiles/profile-synthetic-002/tracker/sportsbook-bets?record=SB-DEMO2", reasons: [] },
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
  await dialog.getByText("Synthetic Profile One").click();
  await dialog.getByText("Synthetic Profile Two").click();
  for (const select of await dialog.getByLabel("Bookmaker Account").all()) await select.selectOption("Bet365");
  await dialog.getByRole("button", { name: "Convert to opportunity" }).click();
  await expect(dialog.getByText("Added Standard opportunity to 2 Profiles.")).toBeVisible();
  expect((submitted?.targets as unknown[]).length).toBe(2);
  await expect(page.getByLabel("Back stake")).toHaveValue("10.00");
  await expect(page.getByLabel("Back odds")).toHaveValue("3.00");
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
    { account: "Bet365", type: "Bookie", status: "Active", lifecycle_status: "Active", restrictions: [] },
  ] }));
}

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
    await dialog.getByLabel("Bookmaker Account").selectOption("Bet365");
    await dialog.getByRole("button", { name: "Convert to opportunity" }).click();
    await expect(dialog.getByText(`Added ${mode} opportunity to 1 Profile.`)).toBeVisible();
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
  await dialog.getByLabel("Bookmaker Account").selectOption("Bet365");
  await dialog.getByRole("button", { name: "Convert to opportunity" }).click();
  expect((((submitted?.calculator ?? {}) as { outcomes?: unknown[] }).outcomes ?? []).length).toBe(3);
});
