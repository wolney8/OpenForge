// CP-005: independent combined-report arithmetic and realistic larger-data boundary.
import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium, request } from "@playwright/test";

const runtime = process.env.OPENFORGE_CP005_RUNTIME ?? "/tmp/openforge-cp003-normal";
const web = process.env.OPENFORGE_CP005_WEB ?? "http://localhost:3010";
const apiBase = process.env.OPENFORGE_CP005_API ?? "http://127.0.0.1:8010";
const token = fs.readFileSync(`${runtime}/session-token`, "utf8").trim();
const api = await request.newContext({ baseURL: apiBase, extraHTTPHeaders: { Cookie: `pd_session=${token}` } });
const browser = await chromium.launch({ headless: true });
const evidence = { date: new Date().toISOString(), source: process.env.OPENFORGE_CP005_SOURCE ?? "working-tree" };
const createdProfiles = [];

async function expectCreated(response, label) {
  assert.equal(response.status(), 201, `${label}: ${await response.text()}`);
  return response.json();
}

async function createProfile(label) {
  const response = await api.post("/profiles/onboarding", { data: {
    setup_path: "import", display_name: label, profile_code: `CP5-${Date.now()}-${createdProfiles.length}`,
    tracking_start_date: "2026-09-01",
    enabled_modules: ["sportsbook-bets", "free-bets", "casino-offers", "cash-adjustments", "each-way-extra-places"],
    accounts: [], quick_actions: [],
  }});
  const body = await expectCreated(response, "Profile");
  const profile = body.profile ?? body;
  createdProfiles.push({ id: profile.profile_id, name: profile.display_name });
  assert.equal((await api.patch(`/profiles/${profile.profile_id}`, { data: { status: "Active" } })).status(), 200);
  for (const [account, type, commission] of [["Bet365", "Bookie", ""], ["Smarkets", "Exchange", "0.02"], ["Matchbook", "Exchange", "0"]]) {
    await expectCreated(await api.post(`/profiles/${profile.profile_id}/accounts`, { data: {
      account, type, status: "Active", lifecycle_status: "Active", channel: "Online",
      current_balance: "10.00", pending_withdrawal_amount: "0.00",
      ...(type === "Exchange" ? { commission_rate: commission } : {}),
    }}), `${type} Account`);
  }
  assert.equal((await api.put(`/profiles/${profile.profile_id}/exchange-commissions`, { data: { exchange_name: "Smarkets", commission_rate: "0.02" } })).status(), 200);
  assert.equal((await api.put(`/profiles/${profile.profile_id}/exchange-commissions`, { data: { exchange_name: "Matchbook", commission_rate: "0" } })).status(), 200);
  return profile.profile_id;
}

const sportsbookPayload = (event_name, status = "Settled") => ({
  event_name, offer_text: "Synthetic report fixture", bookmaker: "Bet365", offer_type: "Bet & Get",
  bet_type: "Single", fixture_type: "Football", status, result: status === "Settled" ? "Back Won" : "Pending",
  back_stake: status === "Settled" ? "10.00" : "", back_odds: status === "Settled" ? "5.00" : "",
  match_strategy: "Standard", lay_odds_1: status === "Settled" ? "5.20" : "",
  lay_actual: status === "Settled" ? "9.00" : "", lay_commission_1: "0.02",
  exchange_name: status === "Settled" ? "Smarkets" : "", date_settled: "2026-09-16T10:00",
});

const freeBetPayload = (event_name, status = "Settled") => ({
  event_name, offer_text: "Synthetic report fixture", bookmaker: "Bet365", offer_type: "Bet & Get",
  bet_type: "Single", fixture_type: "Football", status, result: status === "Settled" ? "Back Won" : "Pending",
  retention_mode: "SNR", match_strategy: "Standard", free_bet_value: status === "Settled" ? "10.00" : "",
  back_odds: status === "Settled" ? "3.00" : "", lay_odds_1: status === "Settled" ? "3.10" : "",
  lay_actual: status === "Settled" ? "6.00" : "", lay_commission_1: "0.02",
  exchange_name: status === "Settled" ? "Smarkets" : "", date_settled: "2026-09-16T10:00",
});

const extraPayload = (runner, status = "Settled") => ({
  placed_at: "2026-09-16T10:00", runner, race: "Synthetic 14:30", bookmaker: "Bet365",
  bookmaker_account: "Bet365", mode: "Extra Place", each_way_stake: status === "Settled" ? "10.00" : "",
  back_odds: status === "Settled" ? "6.00" : "", bookmaker_places: status === "Settled" ? "4" : "",
  exchange_places: status === "Settled" ? "3" : "", win_exchange: status === "Settled" ? "Matchbook" : "",
  win_lay_odds: status === "Settled" ? "2.30" : "", actual_win_lay_stake: status === "Settled" ? "26.00" : "",
  place_exchange: status === "Settled" ? "Matchbook" : "", place_lay_odds: status === "Settled" ? "4.50" : "",
  actual_place_lay_stake: status === "Settled" ? "4.40" : "", status,
  result: status === "Settled" ? "Extra Place" : "Pending", finishing_position: status === "Settled" ? "4" : "",
});

const casinoPayload = (offer_name, value = "1.90") => ({
  date_started: "2026-09-16T10:00", date_settling: "2026-09-16T11:00", bookmaker: "Bet365",
  offer_type: "Free Spins", offer_name, status: "Settled", result: "Win", final_net_pnl: value,
});

async function openAuthenticatedPage(width = 1440, theme = "light") {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
  await context.addCookies([{ name: "pd_session", value: token, domain: "localhost", path: "/" }]);
  await context.addInitScript((value) => localStorage.setItem("openforge-theme", value), theme);
  return { context, page: await context.newPage() };
}

try {
  const reportProfile = await createProfile("Synthetic CP005 Reconciliation");
  const sportsbook = await expectCreated(await api.post(`/profiles/${reportProfile}/sportsbook-bets`, { data: sportsbookPayload("CP005 Sportsbook") }), "Sportsbook");
  const freeBet = await expectCreated(await api.post(`/profiles/${reportProfile}/free-bets`, { data: freeBetPayload("CP005 Free Bet") }), "Free Bet");
  const extra = await expectCreated(await api.post(`/profiles/${reportProfile}/each-way-extra-places`, { data: extraPayload("CP005 Extra Place") }), "Extra Place");
  const casino = await expectCreated(await api.post(`/profiles/${reportProfile}/casino-offers`, { data: casinoPayload("CP005 Casino") }), "Casino");
  const cash = await expectCreated(await api.post(`/profiles/${reportProfile}/cash-adjustments`, { data: {
    adjustment_date: "2026-09-16T12:00", direction: "Out", amount: "4.00", adjustment_type: "Subscription",
    affects_investment: false, affects_cash_snapshot: false, description: "CP005 subscription",
  }}), "Cash adjustment");
  assert.equal(sportsbook.final_net_pnl, "2.20");
  assert.equal(freeBet.final_net_pnl, "7.40");
  assert.equal(extra.final_value, "30.40");
  assert.equal(casino.resolved_net_pnl, "1.90");
  assert.equal(cash.signed_amount, "-4.00");
  const independent = { sportsbook: 2.20, freeBet: 7.40, extraPlace: 30.40, casino: 1.90, cash: -4.00 };
  independent.grossBettingPnl = 41.90;
  independent.retainedProfit = 37.90;

  const { context, page } = await openAuthenticatedPage();
  const requests = [];
  page.on("response", (response) => { if (response.url().includes("tracker-summary-sources")) requests.push(response.url()); });
  const reportStart = performance.now();
  await page.goto(`${web}/profiles/${reportProfile}/tracker/reports`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Weekly reports", exact: true }).waitFor();
  const reportMs = Math.round(performance.now() - reportStart);
  await page.getByLabel("Change tracker date range").selectOption({ label: "All Dates" });
  await page.getByText("£ 41.90", { exact: true }).first().waitFor();
  await page.getByText("£ 37.90", { exact: true }).first().waitFor();
  assert.equal(await page.locator("th:not([scope])").count(), 0, "A report header has no explicit table scope");
  assert.equal(await page.locator(".financial-value:not([aria-label])").count(), 0, "A financial value has no accessible name");
  assert.equal(await page.locator('.financial-value[data-money-motion]:not([data-money-motion="none"])').count(), 0, "Reduced-motion report still animates money");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByText("£ 41.90", { exact: true }).first().waitFor();
  assert(requests.length <= 3, `Unexpected report source request count: ${requests.length}`);
  await context.close();

  const correctedExtra = await api.put(`/profiles/${reportProfile}/each-way-extra-places/${extra.each_way_extra_place_id}`, { data: { ...extraPayload("CP005 Extra Place"), status: "Void", result: "Void/NR" } });
  assert.equal(correctedExtra.status(), 200, await correctedExtra.text());
  assert.equal((await correctedExtra.json()).final_value, "0.00");
  const correctedSources = await (await api.get(`/profiles/${reportProfile}/tracker-summary-sources`)).json();
  assert.equal(correctedSources.each_way_extra_places.find((row) => row.each_way_extra_place_id === extra.each_way_extra_place_id).final_value, "0.00");
  const correctedBrowser = await openAuthenticatedPage();
  await correctedBrowser.page.goto(`${web}/profiles/${reportProfile}/tracker/reports`, { waitUntil: "domcontentloaded" });
  await correctedBrowser.page.getByLabel("Change tracker date range").selectOption({ label: "All Dates" });
  await correctedBrowser.page.getByText("£ 11.50", { exact: true }).first().waitFor();
  await correctedBrowser.page.getByText("£ 7.50", { exact: true }).first().waitFor();
  await correctedBrowser.context.close();

  const secondReportProfile = await createProfile("Synthetic CP005 Combined Peer");
  await expectCreated(await api.post(`/profiles/${secondReportProfile}/casino-offers`, { data: casinoPayload("CP005 Combined Casino", "3.10") }), "Combined Casino");
  const combinedBrowser = await openAuthenticatedPage();
  combinedBrowser.page.setDefaultTimeout(90_000);
  await combinedBrowser.page.goto(`${web}/profiles`, { waitUntil: "domcontentloaded" });
  const analytics = combinedBrowser.page.locator(".cross-profile-analytics");
  await analytics.locator('[data-pd-id="profiles.navigation.performance"]').click();
  const picker = analytics.locator("details.profile-report-picker");
  await picker.locator("summary").click();
  const wantedProfiles = new Set(["Synthetic CP005 Reconciliation", "Synthetic CP005 Combined Peer"]);
  for (const label of await picker.locator("label.profile-filter-chip").all()) {
    const text = (await label.innerText()).split("\n")[0].trim();
    const checkbox = label.locator('input[type="checkbox"]');
    const selected = await checkbox.isChecked();
    if (wantedProfiles.has(text) !== selected) await checkbox.click();
  }
  assert.equal(await picker.locator('input[type="checkbox"]:checked').count(), 2);
  await combinedBrowser.page.getByLabel("Date range").selectOption({ label: "All Dates" });
  await combinedBrowser.page.locator('[aria-label="Combined selected range profit and loss: £ 14.60"]').waitFor();
  await combinedBrowser.page.getByText("£ 10.60", { exact: true }).first().waitFor();
  await combinedBrowser.context.close();

  const largeProfile = await createProfile("Synthetic CP005 Large Dataset");
  const counts = { sportsbook: 30, freeBet: 30, extraPlace: 30, casino: 50, cash: 60 };
  const writes = [];
  for (let index = 0; index < counts.sportsbook; index++) writes.push(api.post(`/profiles/${largeProfile}/sportsbook-bets`, { data: sportsbookPayload(`Large Sportsbook ${index}`, "Prospecting") }));
  for (let index = 0; index < counts.freeBet; index++) writes.push(api.post(`/profiles/${largeProfile}/free-bets`, { data: freeBetPayload(`Large Free Bet ${index}`, "Prospecting") }));
  for (let index = 0; index < counts.extraPlace; index++) writes.push(api.post(`/profiles/${largeProfile}/each-way-extra-places`, { data: extraPayload(`Large Runner ${index}`, "Prospecting") }));
  for (let index = 0; index < counts.casino; index++) writes.push(api.post(`/profiles/${largeProfile}/casino-offers`, { data: casinoPayload(`Large Casino ${index}`, "0.00") }));
  for (let index = 0; index < counts.cash; index++) writes.push(api.post(`/profiles/${largeProfile}/cash-adjustments`, { data: { adjustment_date: "2026-09-16T12:00", direction: "In", amount: "0.00", adjustment_type: "Deposit", affects_investment: false, affects_cash_snapshot: false, description: `Large cash ${index}` } }));
  const writeResponses = await Promise.all(writes);
  assert.equal(writeResponses.filter((response) => response.status() !== 201).length, 0, "Large synthetic writes failed");
  const apiStart = performance.now();
  const largeSourcesResponse = await api.get(`/profiles/${largeProfile}/tracker-summary-sources`);
  const summaryApiMs = Math.round(performance.now() - apiStart);
  assert.equal(largeSourcesResponse.status(), 200);
  const largeSources = await largeSourcesResponse.json();
  assert.equal(largeSources.sportsbook_bets.length, counts.sportsbook);
  assert.equal(largeSources.free_bets.length, counts.freeBet);
  assert.equal(largeSources.each_way_extra_places.length, counts.extraPlace);
  assert.equal(largeSources.casino_offers.length, counts.casino);
  assert.equal(largeSources.cash_adjustments.length, counts.cash);

  const routeTimings = [];
  const measuredRoutes = ["dashboard", "reports", "sportsbook-bets", "free-bets", "casino-offers", "cash-adjustments", "each-way-extra-places"];
  for (const route of measuredRoutes) {
    const opened = await openAuthenticatedPage(760, "dark");
    const started = performance.now();
    await opened.page.goto(`${web}/profiles/${largeProfile}/tracker/${route}`, { waitUntil: "domcontentloaded" });
    await opened.page.locator("main").waitFor();
    routeTimings.push({ route, ms: Math.round(performance.now() - started) });
    assert.equal(await opened.page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true);
    await opened.context.close();
  }
  const warm = await openAuthenticatedPage(760, "dark");
  const warmRouteTimings = [];
  let combinedSourceReads = 0;
  warm.page.on("response", (response) => { if (response.url().endsWith(`/profiles/${largeProfile}/tracker-summary-sources`)) combinedSourceReads += 1; });
  for (const route of measuredRoutes) {
    const started = performance.now();
    await warm.page.goto(`${web}/profiles/${largeProfile}/tracker/${route}`, { waitUntil: "domcontentloaded" });
    await warm.page.locator("main").waitFor();
    warmRouteTimings.push({ route, ms: Math.round(performance.now() - started) });
  }
  assert(combinedSourceReads <= measuredRoutes.length + 1, `Repeated combined-source reads: ${combinedSourceReads}`);
  await warm.context.close();
  const searchPage = await openAuthenticatedPage(1440, "light");
  await searchPage.page.goto(`${web}/profiles/${largeProfile}/tracker/cash-adjustments`);
  const pagination = searchPage.page.getByLabel("Cash Adjustment pagination top controls");
  await pagination.getByRole("button", { name: "Next" }).click();
  await pagination.getByText(/Page 2 of/).waitFor();
  await searchPage.page.getByRole("button", { name: "Open cash-adjustment filter and column controls" }).click();
  const filterDialog = searchPage.page.getByRole("dialog", { name: "Cash-adjustment filter controls" });
  await filterDialog.getByLabel("Direction").selectOption("In");
  await filterDialog.getByRole("button", { name: "Close cash-adjustment filter controls" }).click();
  await searchPage.page.getByRole("button", { name: "Clear active cash-adjustment filters and hidden-column states" }).click();
  await searchPage.page.getByLabel("Search cash-adjustment rows").fill("Large cash 59");
  await searchPage.page.getByRole("row", { name: /Large cash 59/ }).waitFor();
  await searchPage.context.close();

  Object.assign(evidence, {
    result: "PASS_WITH_RECORDED_GAPS", reportProfile, independent, reportMs,
    correction: { extraPlace: "30.40 -> 0.00", correctedGross: "11.50", correctedRetained: "7.50" },
    authorisedCombined: { profiles: 2, grossBettingPnl: "14.60", retainedProfit: "10.60", selectedByProfileIdentity: true, note: "Includes the corrected/voided first Profile plus the £3.10 peer" },
    largeData: { totalRecords: 200, counts, trackerSummaryApiMs: summaryApiMs, routeTimings, warmRouteTimings, combinedSourceReads, paginationFilterSearch: "PASS", width: 760, theme: "dark", method: "local synthetic Chromium and authenticated API; not Core Web Vitals" },
    reportBoundary: "Projected/current, settled/final, cash adjustments and Account cash remained separately labelled; promotional face value was not included as realised P&L.",
    accessibility: { reportHeaderScopes: "PASS", financialValueNames: "PASS", reducedMotion: "PASS", screenReader: "UNVERIFIED: no supported local screen reader was exercised" },
  });
} finally {
  for (const profile of createdProfiles.reverse()) {
    await api.patch(`/profiles/${profile.id}`, { data: { status: "Archived" } });
    const removed = await api.delete(`/profiles/${profile.id}`, { data: { confirmation_name: profile.name } });
    if (removed.status() !== 200) evidence.cleanupFailure = `${profile.id}: ${removed.status()} ${await removed.text()}`;
  }
  fs.writeFileSync(`${runtime}/cp005-reporting-performance-evidence.json`, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
  await browser.close();
  await api.dispose();
}
