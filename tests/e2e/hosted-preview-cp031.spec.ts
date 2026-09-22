import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const hostedOnly = () => test.skip(
  process.env.OPENFORGE_HOSTED_PREVIEW_GATE !== "true",
  "Explicit hosted gate only",
);

async function createProfile(request: APIRequestContext, label: string) {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const response = await request.post("/api/profiles/onboarding", { data: {
    accounts: [], display_name: `Synthetic CP031 ${label} ${suffix}`,
    enabled_modules: ["sportsbook-bets", "free-bets", "cash-adjustments"],
    profile_code: `C31-${suffix}`.slice(0, 32), quick_actions: [], setup_path: "import",
    tracking_start_date: "2026-09-22",
  }});
  expect(response.status()).toBe(201);
  const profileId = ((await response.json()) as { profile: { profile_id: string } }).profile.profile_id;
  expect((await request.patch(`/api/profiles/${profileId}`, { data: { status: "Active" } })).ok()).toBeTruthy();
  return { profileId, suffix };
}

async function addAccount(request: APIRequestContext, profileId: string, account: string, type: "Bookie" | "Exchange", overrides = {}) {
  const response = await request.post(`/api/profiles/${profileId}/accounts`, { data: {
    account, type, status: "Active", lifecycle_status: "Active", channel: "Online",
    stake_access: "Normal", promo_access: "Full", restrictions: [],
    ...(type === "Exchange" ? { commission_rate: "0.02" } : {}), ...overrides,
  }});
  expect(response.status()).toBe(201);
  return response.json() as Promise<{ account_id: string }>;
}

function standardConversion(profileId: string, suffix: string, mode: "qualifying" | "profit_boost" | "cashback") {
  const calculator: Record<string, string> = {
    bet_type: mode, free_bet_mode: "SNR", promotion_mode: "standard", strategy: "Standard",
    back_stake: "10.00", back_odds: "3.00", lay_odds: "3.10", exchange_commission: "0.02",
    manual_lay_stake: "", promotion_value: "", bonus_trigger: "Lay Wins", retention_percent: "70",
    underlay_factor: "0.928", overlay_factor: "1.300", profit_boost_mode: "displayed_odds",
    boosted_back_odds: "", total_potential_return: "", potential_profit: "", base_back_odds: "",
    profit_boost_percent: "", actual_accepted_back_odds: "", maximum_boost_winnings: "",
  };
  let offerType = "Bet & Get";
  if (mode === "profit_boost") {
    Object.assign(calculator, { back_odds: "", boosted_back_odds: "3.20" });
    offerType = "Profit Boost";
  }
  if (mode === "cashback") {
    Object.assign(calculator, { cashback_reward_kind: "cash", promotion_value: "5.00" });
    offerType = "Cashback";
  }
  return {
    source: { calculator_family: "matched-betting", calculator_version: "matched-betting-v1",
      calculator_mode: mode, canonical_inputs: { ...calculator, exchange: "Smarkets" },
      created_at: `2026-09-22T12:${mode === "qualifying" ? "01" : mode === "profit_boost" ? "02" : "03"}:00Z` },
    calculator, targets: [{ profile_id: profileId, bookmaker: "Bet365" }],
    event_name: `Synthetic CP031 ${mode} ${suffix}`, offer_type: offerType,
    bet_type: "Single", offer_name: "", fixture_type: "Football",
  };
}

test("Group A persists supported calculator results and financial lifecycles", async ({ page }) => {
  hostedOnly(); test.setTimeout(600_000);
  const { profileId, suffix } = await createProfile(page.request, "calculators");
  await addAccount(page.request, profileId, "Bet365", "Bookie");
  await addAccount(page.request, profileId, "Smarkets", "Exchange");

  const ids: string[] = [];
  for (const [index, mode] of (["qualifying", "profit_boost", "cashback"] as const).entries()) {
    const payload = standardConversion(profileId, suffix, mode);
    const converted = await page.request.post("/api/fund-manager/calculator-conversions/standard", { data: payload });
    expect(converted.status()).toBe(200);
    const result = ((await converted.json()) as { results: Array<{ state: string; record_id: string }> }).results[0];
    expect(result.state).toBe("succeeded"); ids.push(result.record_id);
    const retry = await page.request.post("/api/fund-manager/calculator-conversions/standard", { data: payload });
    expect(((await retry.json()) as { results: Array<{ state: string; record_id: string }> }).results[0])
      .toMatchObject({ state: "already_succeeded", record_id: result.record_id });
    const current = await (await page.request.get(`/api/profiles/${profileId}/sportsbook-bets/${result.record_id}`)).json();
    const placed = await page.request.put(`/api/profiles/${profileId}/sportsbook-bets/${result.record_id}`, {
      data: { ...current, status: "Placed", result: "Pending", lay_actual: current.reference_lay_stake_standard,
        lay_matched_stake_1: current.reference_lay_stake_standard },
    });
    expect(placed.status()).toBe(200);
    const settled = await page.request.put(`/api/profiles/${profileId}/sportsbook-bets/${result.record_id}`, {
      data: { ...(await placed.json()), status: "Settled", result: "Back Won",
        manual_override_value: `${index + 1}.00`, manual_override_reason: "Synthetic CP031 independent oracle" },
    });
    expect(settled.status()).toBe(200);
    expect((await settled.json()).final_net_pnl).toBe(`${index + 1}.00`);
    const history = await (await page.request.get(`/api/profiles/${profileId}/financial-history/sportsbook/${result.record_id}`)).json();
    expect(history.length).toBeGreaterThanOrEqual(3);
  }

  const freeBetPayload = { event_name: `Synthetic CP031 SNR ${suffix}`, offer_text: "", bookmaker: "Bet365",
    offer_type: "Free Bet", bet_type: "Single", offer_name: "", fixture_type: "Football",
    status: "Settled", result: "Back Won", retention_mode: "SNR", free_bet_value: "10.00",
    back_odds: "4.00", match_strategy: "Standard", lay_odds_1: "4.20", lay_actual: "7.14",
    lay_matched_stake_1: "7.14", lay_commission_1: "0.02", exchange_name: "Smarkets",
    expiry_datetime: "", date_settled: "2026-09-22", origin_qual_bet_id: "", offer_group_id: "",
    source_award_group_id: "", source_award_split_index: 0, source_award_split_total: 0,
    source_award_expected_value: "", source_award_variance_reason: "", user_notes: "",
    manual_override_value: "4.00", manual_override_reason: "Synthetic CP031 independent oracle" };
  const freeBet = await page.request.post(`/api/profiles/${profileId}/free-bets`, { data: freeBetPayload });
  expect(freeBet.status()).toBe(201);
  expect((await freeBet.json()).final_net_pnl).toBe("4.00");

  const multiPayload = {
    source: { calculator_family: "multi-lay", calculator_version: "multi-lay-v2", calculator_mode: "standard",
      canonical_inputs: { exchange: "Smarkets", calculator: {} }, created_at: "2026-09-22T12:04:00Z" },
    calculator: { allocation: "standard", strategy: "standard", backing_type: "normal", back_stake: "10.00",
      back_odds: "4.00", profit_boost_percent: "0", refund_amount: "0", retention_percent: "70",
      custom_multiplier: "1", outcomes: [
        { label: "Home", lay_odds: "2.50", commission: "0.05" },
        { label: "Away", lay_odds: "3.00", commission: "0.02" },
      ] }, targets: [{ profile_id: profileId, bookmaker: "Bet365" }],
    event_name: `Synthetic CP031 Multi-Lay ${suffix}`, offer_type: "Bet & Get", bet_type: "Single", fixture_type: "Football",
  };
  multiPayload.source.canonical_inputs.calculator = multiPayload.calculator;
  const multi = await page.request.post("/api/fund-manager/calculator-conversions/multi-lay", { data: multiPayload });
  expect(multi.status()).toBe(200);
  const multiResult = ((await multi.json()) as { results: Array<{ state: string; record_id: string }> }).results[0];
  const reopened = await (await page.request.get(`/api/profiles/${profileId}/sportsbook-bets/${multiResult.record_id}`)).json();
  expect(reopened.multi_lay_reference.branches.map((leg: { lay_stake: string }) => leg.lay_stake)).toEqual(["16.33", "13.42"]);
  expect(reopened.reporting_value).toBeNull();

  await page.goto(`/profiles/${profileId}/tracker/reports`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Reports", exact: true })).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText("Loading tracker summaries", { exact: true })).toBeHidden({ timeout: 150_000 });
  const rows = await (await page.request.get(`/api/profiles/${profileId}/sportsbook-bets`)).json();
  expect(rows.filter((row: { sportsbook_bet_id: string }) => ids.includes(row.sportsbook_bet_id))
    .reduce((sum: number, row: { reporting_value: string }) => sum + Number(row.reporting_value), 0)).toBe(6);
  await expect(page.locator("main")).toContainText("£ 10.00");
  expect((await page.request.patch(`/api/profiles/${profileId}`, { data: { status: "Archived" } })).ok()).toBeTruthy();
});

test("Group B preserves Account access, awards and portable lineage", async ({ page }) => {
  hostedOnly(); test.setTimeout(600_000);
  const { profileId, suffix } = await createProfile(page.request, "relationships");
  const bookie = await addAccount(page.request, profileId, "Bet365", "Bookie", {
    stake_access: "Severely Limited", promo_access: "Restricted", restrictions: ["Soft Limited", "Bonus Restricted"],
    restriction_details: { fixed_maximum_stake: "1.00", stake_restriction_type: "fixed_maximum",
      stake_restriction_note: "Synthetic cap", available_promotion_types: ["Boosts"],
      promotion_restriction_note: "Selected synthetic promotions" },
    access_evidence_note: "Synthetic CP031", access_source: "manual_check", access_observed_at: "2026-09-22T12:00:00Z",
  });
  await addAccount(page.request, profileId, "Smarkets", "Exchange");
  const sourcePayload = { event_name: `Synthetic CP031 award ${suffix}`, offer_text: "", bookmaker: "Bet365",
    offer_type: "Bet & Get", bet_type: "Single", offer_name: "", fixture_type: "Football", market: "Match Odds",
    status: "Placed", result: "Pending", back_stake: "10.00", back_odds: "2.00", match_strategy: "Standard",
    lay_odds_1: "2.10", lay_actual: "9.62", lay_matched_stake_1: "9.62", lay_commission_1: "0.02",
    exchange_name: "Smarkets", date_settled: "2026-09-22", user_notes: "", manual_override_value: "", manual_override_reason: "" };
  const source = await page.request.post(`/api/profiles/${profileId}/sportsbook-bets`, { data: sourcePayload });
  expect(source.status()).toBe(201);
  const sourceId = (await source.json()).sportsbook_bet_id as string;
  const child = { event_name: "", offer_text: "Synthetic split award", bookmaker: "Bet365", offer_type: "Free Bet",
    bet_type: "", offer_name: "", fixture_type: "", status: "Available", result: "Pending", retention_mode: "SNR",
    free_bet_value: "5.00", back_odds: "", match_strategy: "", lay_odds_1: "", lay_actual: "",
    lay_matched_stake_1: "", lay_commission_1: "", exchange_name: "", expiry_datetime: "", date_settled: "",
    origin_qual_bet_id: "", offer_group_id: "", source_award_group_id: "", source_award_split_index: 0,
    source_award_split_total: 0, source_award_expected_value: "", source_award_variance_reason: "",
    user_notes: "", manual_override_value: "", manual_override_reason: "" };
  const awardPayload = { operation_id: `cp031_${suffix.replaceAll("-", "_")}`.slice(0, 64), children: [child, child], expected_award_value: "10.00", variance_reason: "" };
  const award = await page.request.post(`/api/profiles/${profileId}/sportsbook-bets/${sourceId}/free-bet-awards`, { data: awardPayload });
  expect(award.status()).toBe(201);
  const awardBody = await award.json() as { free_bet_ids: string[] };
  expect(awardBody.free_bet_ids).toHaveLength(2);
  const retry = await page.request.post(`/api/profiles/${profileId}/sportsbook-bets/${sourceId}/free-bet-awards`, { data: awardPayload });
  expect((await retry.json()).free_bet_ids).toEqual(awardBody.free_bet_ids);

  const exported = await page.request.get(`/api/profiles/${profileId}/exports/portable-profile.xlsx`);
  expect(exported.status()).toBe(200);
  const analysed = await page.request.post("/api/fund-manager/portable-restores/analyse", { data: {
    source_filename: "synthetic-cp031.xlsx", content_base64: Buffer.from(await exported.body()).toString("base64"),
    target_display_name: `Synthetic CP031 restored ${suffix}`, target_profile_code: `R31-${suffix}`.slice(0, 32),
  }});
  expect(analysed.status()).toBe(201);
  const analysis = await analysed.json() as { status: string; restore_run_id: string };
  expect(analysis.status).toBe("READY");
  const restored = await page.request.post(`/api/fund-manager/portable-restores/${analysis.restore_run_id}/execute`, {
    data: { confirmation: "RESTORE PORTABLE PROFILE" },
  });
  expect(restored.status()).toBe(200);
  const restoredBody = await restored.json() as { status: string; target_profile_id: string; attempts: Array<{ parity: { status: string } }> };
  expect(restoredBody.status).toBe("COMPLETE"); expect(restoredBody.attempts[0].parity.status).toBe("PASS");
  const restoredAccounts = await (await page.request.get(`/api/profiles/${restoredBody.target_profile_id}/accounts`)).json();
  const restoredBookie = restoredAccounts.find((item: { account: string }) => item.account === "Bet365");
  expect(restoredBookie).toMatchObject({ stake_access: "Severely Limited", promo_access: "Restricted" });
  expect(restoredBookie.account_id).not.toBe(bookie.account_id);
  const restoredChildren = await (await page.request.get(`/api/profiles/${restoredBody.target_profile_id}/free-bets`)).json();
  expect(restoredChildren).toHaveLength(2);
  expect(new Set(restoredChildren.map((item: { source_award_group_id: string }) => item.source_award_group_id)).size).toBe(1);
  expect(restoredChildren.every((item: { origin_qual_bet_resolution_state: string }) => item.origin_qual_bet_resolution_state === "resolved")).toBe(true);
  expect((await page.request.get(`/api/profiles/${restoredBody.target_profile_id}/accounts/${bookie.account_id}`)).status()).toBe(404);
  await page.request.patch(`/api/profiles/${profileId}`, { data: { status: "Archived" } });
  await page.request.patch(`/api/profiles/${restoredBody.target_profile_id}`, { data: { status: "Archived" } });
});

test("Group C preserves search, empty state, drilldown and return context", async ({ page }) => {
  hostedOnly(); test.setTimeout(360_000);
  await page.goto("/profiles", { waitUntil: "domcontentloaded" });
  const search = page.locator('[data-pd-id="global-search.input"]');
  await search.fill("Subscriber Alpha");
  const result = page.locator('[data-pd-id="global-search.results"]');
  await expect(result).toContainText("Subscriber Alpha", { timeout: 90_000 });
  await search.fill("no-such-cp031-result");
  await expect(result).toContainText("No matching profiles, providers or pages.", { timeout: 90_000 });
  await search.fill("Subscriber Alpha");
  await expect(result).toContainText("Subscriber Alpha", { timeout: 90_000 });
  await search.press("ArrowDown");
  await expect(search).toHaveAttribute("aria-activedescendant", /global-search-result-\d+/, { timeout: 10_000 });
  await search.press("Enter");
  await expect(page).toHaveURL(/profile-demo-001\/tracker\/dashboard/, { timeout: 90_000 });
  await expect(page.getByText("Loading tracker summaries", { exact: true })).toBeHidden({ timeout: 150_000 });
  const points = page.locator('figure.dashboard-chart-figure [role="button"]');
  await expect(points.first()).toBeVisible({ timeout: 90_000 });
  await points.first().focus(); await points.first().press("Enter");
  const drilldown = page.locator('[data-pd-id="dashboard.chart.drilldown"]');
  await expect(drilldown).toBeVisible();
  const link = drilldown.getByRole("link").first();
  if (await link.count()) {
    await link.click(); await expect(page).toHaveURL(/source=report-point/, { timeout: 90_000 });
    await page.goBack(); await expect(drilldown).toBeVisible();
  }
  await page.goto("/profiles/profile-demo-002/tracker/sportsbook-bets", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Sportsbook Bets", exact: true })).toBeVisible({ timeout: 90_000 });
  await expect(page.locator("main")).toContainText(/No .*rows|No sportsbook|0 records/i, { timeout: 90_000 });

  await page.goto("/profiles/profile-demo-001/tracker/casino-offers", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Casino Offers", exact: true })).toBeVisible({ timeout: 90_000 });
  const quickActions = page.locator('[data-pd-id="ledger-quick-actions.casino"]');
  await expect(quickActions.getByRole("button", { name: "Demo Free Spins", exact: true })).toBeVisible({ timeout: 90_000 });
  await quickActions.getByRole("button", { name: "Demo Free Spins", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Create casino row" });
  await expect(editor).toBeVisible();
  await expect(editor.getByLabel("Offer name", { exact: false })).toHaveValue("Free Spins");
  await editor.getByRole("button", { name: "Close casino editor" }).click();
  await page.getByRole("dialog", { name: "Unsaved tracker changes" })
    .getByRole("button", { name: "Discard Changes" }).click();
  await expect(editor).toHaveCount(0);
});

test("Reports motion preference changes and navigation do not accumulate work", async ({ page }) => {
  hostedOnly(); test.setTimeout(360_000);
  const diagnostics: string[] = [];
  let summaryRequests = 0;
  page.on("pageerror", (error) => diagnostics.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") diagnostics.push(message.text()); });
  page.on("request", (request) => {
    if (request.url().includes("/api/profiles/profile-demo-001/tracker-summary-sources")) summaryRequests += 1;
  });
  await page.emulateMedia({ reducedMotion: "no-preference", colorScheme: "light" });
  await page.goto("/profiles/profile-demo-001/tracker/reports", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Reports", exact: true })).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText("Loading tracker summaries", { exact: true })).toBeHidden({ timeout: 150_000 });
  await expect(page.locator("article.stat-card").first()).toBeVisible({ timeout: 90_000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/profiles/profile-demo-001/tracker/accounts", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Accounts", exact: true })).toBeVisible({ timeout: 90_000 });
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Reports", exact: true })).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText("Loading tracker summaries", { exact: true })).toBeHidden({ timeout: 150_000 });
  await page.waitForTimeout(2_000);
  expect(diagnostics.filter((value) => /maximum update depth|react error #185/i.test(value))).toEqual([]);
  expect(summaryRequests).toBeLessThanOrEqual(3);
});

test("Preview authorization and failed-write boundaries remain Profile-scoped", async ({ page, browser }) => {
  hostedOnly(); test.setTimeout(360_000);
  const baseURL = process.env.OPENFORGE_E2E_BASE_URL!;
  const bypass = process.env.OPENFORGE_E2E_VERCEL_BYPASS_COOKIE!;
  const unauthorised = await browser.newContext({ baseURL, storageState: { cookies: [{
    domain: new URL(baseURL).hostname, httpOnly: true, name: "_vercel_jwt", path: "/",
    sameSite: "Lax", secure: true, value: bypass,
  }], origins: [] } });
  const unauthorisedRequest = unauthorised.request;
  expect((await unauthorisedRequest.get("/api/profiles")).status()).toBe(401);
  await unauthorised.close();

  const profilesResponse = await page.request.get("/api/profiles");
  expect(profilesResponse.status()).toBe(200);
  const profiles = await profilesResponse.json() as Array<{ profile_id: string; status: string }>;
  expect(profiles.some((profile) => profile.profile_id === "profile-demo-001")).toBe(true);
  expect(profiles.some((profile) => profile.profile_id === "profile-demo-002")).toBe(true);
  expect((await page.request.get("/api/profiles/profile-demo-001/accounts")).status()).toBe(200);
  expect((await page.request.get("/api/profiles/profile-demo-002/accounts")).status()).toBe(200);

  const eligibilityStartedAt = Date.now();
  const eligibilityResponse = await page.request.post("/api/multi-profile-opportunities/eligibility", {
    data: { bookmaker: "10Bet", offer_type: "Bet & Get" },
  });
  expect(eligibilityResponse.status()).toBe(200);
  const eligibility = await eligibilityResponse.json() as Array<{ profile_id: string }>;
  expect(eligibility.map((row) => row.profile_id).sort()).toEqual(
    profiles.filter((profile) => profile.status !== "Archived").map((profile) => profile.profile_id).sort(),
  );
  expect(Date.now() - eligibilityStartedAt).toBeLessThan(30_000);

  const rows = await (await page.request.get("/api/profiles/profile-demo-001/sportsbook-bets")).json() as Array<{ sportsbook_bet_id: string }>;
  expect(rows.length).toBeGreaterThan(0);
  expect((await page.request.get(`/api/profiles/profile-demo-002/sportsbook-bets/${rows[0].sportsbook_bet_id}`)).status()).toBe(404);
  expect((await page.request.get(`/api/profiles/profile-demo-002/financial-history/sportsbook/${rows[0].sportsbook_bet_id}`)).status()).toBe(200);
  expect(await (await page.request.get(`/api/profiles/profile-demo-002/financial-history/sportsbook/${rows[0].sportsbook_bet_id}`)).json()).toEqual([]);

  const before = await (await page.request.get("/api/profiles/profile-demo-002/cash-adjustments")).json() as unknown[];
  const invalid = await page.request.post("/api/profiles/profile-demo-002/cash-adjustments", { data: {
    adjustment_date: "2026-09-22T12:00", direction: "In", amount: "not-money",
    adjustment_type: "TopUp", affects_investment: true, affects_cash_snapshot: true,
    linked_account: "", description: "Synthetic rejected CP031 write",
  }});
  expect(invalid.status()).toBe(422);
  const after = await (await page.request.get("/api/profiles/profile-demo-002/cash-adjustments")).json() as unknown[];
  expect(after).toHaveLength(before.length);
});

test("representative Preview screens retain responsive accepted geometry", async ({ page }) => {
  hostedOnly(); test.setTimeout(480_000);
  const checks = [
    { width: 720, scheme: "light" as const, motion: "no-preference" as const },
    { width: 390, scheme: "dark" as const, motion: "reduce" as const },
  ];
  for (const check of checks) {
    await page.setViewportSize({ width: check.width, height: 900 });
    await page.emulateMedia({ colorScheme: check.scheme, reducedMotion: check.motion });
    for (const path of [
      "/fund-manager/calculators?family=standard", "/fund-manager/calculators?family=multi-lay",
      "/profiles/profile-demo-001/tracker/accounts", "/profiles/profile-demo-001/tracker/reports",
    ]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("progressbar", { name: "Loading page data" })).toBeHidden({ timeout: 150_000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/fund-manager/calculators?family=multi-lay", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => { document.documentElement.style.fontSize = "32px"; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
