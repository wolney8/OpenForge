// CP-017: fresh award lineage, Cash Adjustment reconciliation and Casino costs.
import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium, expect, request } from "@playwright/test";

const runtime = process.env.OPENFORGE_CP017_RUNTIME ?? "/tmp/openforge-cp017";
const tokenPath = process.env.OPENFORGE_CP017_TOKEN ?? "/tmp/openforge-cp016/session-token";
const webBase = process.env.OPENFORGE_CP017_WEB ?? "http://localhost:3010";
const apiBase = process.env.OPENFORGE_CP017_API ?? "http://127.0.0.1:8010";
fs.mkdirSync(runtime, { recursive: true });
const token = fs.readFileSync(tokenPath, "utf8").trim();
const api = await request.newContext({
  baseURL: apiBase,
  extraHTTPHeaders: { Cookie: `pd_session=${token}` },
});
const browser = await chromium.launch({ headless: true });
const createdProfiles = [];
const evidence = { timestamp: new Date().toISOString(), result: "IN_PROGRESS", journeys: {} };

async function expectJson(response, status, label) {
  assert.equal(response.status(), status, `${label}: ${await response.text()}`);
  return response.json();
}

async function createProfile(label) {
  const suffix = `${Date.now()}-${createdProfiles.length}`;
  const body = await expectJson(await api.post("/profiles/onboarding", { data: {
    setup_path: "import",
    display_name: `${label} ${suffix}`,
    profile_code: `CP17-${suffix}`,
    tracking_start_date: "2026-09-17",
    enabled_modules: ["sportsbook-bets", "free-bets", "casino-offers", "cash-adjustments"],
    accounts: [],
    quick_actions: [],
  }}), 201, "create synthetic Profile");
  const profile = body.profile ?? body;
  createdProfiles.push({ id: profile.profile_id, name: profile.display_name });
  await expectJson(await api.patch(`/profiles/${profile.profile_id}`, { data: { status: "Active" } }), 200, "activate synthetic Profile");
  return profile;
}

async function createAccount(profileId, account, type, currentBalance) {
  return expectJson(await api.post(`/profiles/${profileId}/accounts`, { data: {
    account,
    type,
    status: "Active",
    lifecycle_status: "Active",
    channel: "Online",
    current_balance: currentBalance,
    pending_withdrawal_amount: "0.00",
    ...(type === "Exchange" ? { commission_rate: "0.02" } : {}),
  }}), 201, `create ${account} Account`);
}

async function openPage(path, width = 1440, theme = "light") {
  const context = await browser.newContext({
    colorScheme: theme,
    reducedMotion: "reduce",
    viewport: { width, height: 1000 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  await context.addCookies([{ name: "pd_session", value: token, domain: "localhost", path: "/" }]);
  await context.addInitScript((value) => localStorage.setItem("openforge-theme", value), theme);
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  await page.goto(`${webBase}${path}`, { waitUntil: "domcontentloaded" });
  return { context, page };
}

const freeBetPayloadFields = [
  "lay_plan_json", "free_bet_id", "event_name", "offer_text", "bookmaker", "offer_type",
  "bet_type", "offer_name", "fixture_type", "status", "result", "retention_mode",
  "free_bet_value", "back_odds", "match_strategy", "lay_odds_1", "lay_actual",
  "lay_matched_stake_1", "lay_commission_1", "exchange_name", "expiry_datetime",
  "date_settled", "origin_qual_bet_id", "offer_group_id", "source_award_group_id",
  "source_award_split_index", "source_award_split_total", "source_award_expected_value",
  "source_award_variance_reason", "user_notes", "manual_override_value", "manual_override_reason",
];
const asFreeBetPayload = (row, overrides = {}) => Object.fromEntries(
  freeBetPayloadFields.map((field) => [field, field in overrides
    ? overrides[field]
    : (field === "lay_plan_json" ? (row[field] ?? null) : (row[field] ?? ""))]),
);

const casinoPayload = (name, overrides = {}) => ({
  date_started: "2026-09-17T09:00",
  date_settling: "2026-09-17T10:00",
  expiry_datetime: "",
  bookmaker: "10Bet",
  offer_type: "Free Spins",
  offer_name: name,
  game: "Synthetic Game",
  cash_stake: "10.00",
  credit_amount: "",
  bonus_amount: "",
  wager_multiplier: "",
  wager_target: "",
  required_spins: "",
  spin_stake: "",
  free_spins_awarded: "20",
  free_spins_value: "3.00",
  wagering_base: "CashStake",
  custom_wager_base: "",
  wagering_completed: "10.00",
  rtp_percent: "96.00",
  reward_type: "Free Spins",
  reward_wager_multiplier: "",
  reward_wager_target: "",
  reward_required_spins: "",
  reward_wagering_completed: "",
  reward_rtp_percent: "",
  expected_reward_cash_value: "3.00",
  qualifying_expected_loss: "0.40",
  reward_expected_loss: "0.00",
  other_expected_costs: "0.00",
  campaign_ev: "2.60",
  own_cash_committed: "10.00",
  cash_returned: "14.00",
  settlement_other_costs: "1.00",
  status: "Settled",
  result: "Win",
  calc_net_pnl: "3.00",
  final_net_pnl: "6.00",
  user_notes: "Synthetic CP017 fee allocation",
  ...overrides,
});

try {
  const health = await expectJson(await api.get("/healthz"), 200, "health");
  assert.equal(health.runtime_role, "normal-owner");
  assert.equal(health.schema_version, "import-history-v1");
  const profile = await createProfile("Synthetic CP017 Financial Journeys");
  const peer = await createProfile("Synthetic CP017 Collision Peer");
  const profileId = profile.profile_id;
  const bookie = await createAccount(profileId, "10Bet", "Bookie", "100.00");
  await createAccount(profileId, "Smarkets", "Exchange", "50.00");
  const bank = await createAccount(profileId, "Bank A", "Bank", "200.00");
  await createAccount(peer.profile_id, "10Bet", "Bookie", "75.00");
  await expectJson(await api.put(`/profiles/${profileId}/exchange-commissions`, { data: {
    exchange_name: "Smarkets", commission_rate: "0.02",
  }}), 200, "exchange commission");

  // PQA-J11: issue a fresh split award through the real authenticated bridge.
  const source = await expectJson(await api.post(`/profiles/${profileId}/sportsbook-bets`, { data: {
    event_name: "CP017 qualifying activity",
    offer_text: "Bet 10 Get 10 synthetic award",
    offer_name: "CP017 award",
    bookmaker: "10Bet",
    offer_type: "Bet & Get",
    bet_type: "Single",
    fixture_type: "Football",
    status: "Settled",
    result: "Lay Won",
    back_stake: "10.00",
    back_odds: "5.00",
    lay_odds_1: "5.20",
    lay_actual: "9.00",
    lay_commission_1: "0.02",
    exchange_name: "Smarkets",
    match_strategy: "Standard",
    date_settled: "2026-09-17T09:00",
  }}), 201, "qualifying Sportsbook activity");
  const awardUi = await openPage(`/profiles/${profileId}/tracker/sportsbook-bets?record=${source.sportsbook_bet_id}`);
  const awardDialog = awardUi.page.locator('[data-pd-id="sportsbook.editor.dialog"]');
  await awardDialog.waitFor();
  await awardDialog.getByRole("tab", { name: /Settlement/ }).first().click();
  const editSettled = awardDialog.locator('[data-pd-id="sportsbook.editor.edit-settled-row"]').filter({ visible: true });
  if (await editSettled.count()) await editSettled.click();
  await awardDialog.getByRole("tab", { name: /Free Bet/ }).first().click();
  const bridge = awardDialog.locator('[data-pd-id="sportsbook.free-bet-bridge.inline"]');
  await bridge.getByLabel("Free-bet value", { exact: true }).fill("10.00");
  await bridge.getByLabel("Expiry", { exact: true }).fill("2026-09-30T12:00");
  await awardDialog.getByRole("button", { name: "Expand free-bet award splits", exact: true }).click();
  await awardDialog.getByRole("button", { name: "Add split free bet", exact: true }).click();
  await bridge.getByLabel("Split value", { exact: true }).nth(0).fill("6.00");
  await bridge.getByLabel("Split value", { exact: true }).nth(1).fill("4.00");
  await bridge.locator(".bridge-split-retention select").nth(1).selectOption("SR");
  const createAward = awardDialog.getByRole("button", { name: "Create free bet from sportsbook row", exact: true });
  let committedRequest;
  await awardUi.page.route(`**/profiles/${profileId}/sportsbook-bets/${source.sportsbook_bet_id}/free-bet-awards`, async (route) => {
    committedRequest = route.request().postDataJSON();
    const response = await route.fetch();
    assert.equal(response.status(), 201, await response.text());
    await route.abort("failed");
  });
  await createAward.click();
  await awardDialog.getByText("Award response was not confirmed. Retry this review with its retained operation identity.", { exact: true }).waitFor();
  await awardUi.page.unroute(`**/profiles/${profileId}/sportsbook-bets/${source.sportsbook_bet_id}/free-bet-awards`);
  await awardUi.page.reload({ waitUntil: "domcontentloaded" });
  await awardDialog.waitFor();
  await awardDialog.getByRole("tab", { name: /Settlement/ }).first().click();
  const editAgain = awardDialog.locator('[data-pd-id="sportsbook.editor.edit-settled-row"]').filter({ visible: true });
  if (await editAgain.count()) await editAgain.click();
  await awardDialog.getByRole("tab", { name: /Free Bet/ }).first().click();
  const retryButton = awardDialog.getByRole("button", { name: "Create free bet from sportsbook row", exact: true });
  const [retryResponse] = await Promise.all([
    awardUi.page.waitForResponse((response) => response.url().endsWith("/free-bet-awards") && response.request().method() === "POST"),
    retryButton.click(),
  ]);
  const issued = await expectJson(retryResponse, 201, "lost-response award retry");
  assert.equal(issued.free_bet_ids.length, 2);
  assert.equal(issued.issued_face_value, "10.00");
  assert.equal(issued.operation_id, committedRequest.operation_id);
  const duplicateResults = await Promise.all([
    api.post(`/profiles/${profileId}/sportsbook-bets/${source.sportsbook_bet_id}/free-bet-awards`, { data: committedRequest }),
    api.post(`/profiles/${profileId}/sportsbook-bets/${source.sportsbook_bet_id}/free-bet-awards`, { data: committedRequest }),
  ]);
  const duplicateBodies = await Promise.all(duplicateResults.map((response, index) => expectJson(response, 201, `concurrent replay ${index + 1}`)));
  assert(duplicateBodies.every((body) => JSON.stringify(body.free_bet_ids) === JSON.stringify(issued.free_bet_ids)));
  const changedRequest = structuredClone(committedRequest);
  changedRequest.children[0].offer_name = "Changed retry must be rejected";
  assert.equal((await api.post(`/profiles/${profileId}/sportsbook-bets/${source.sportsbook_bet_id}/free-bet-awards`, { data: changedRequest })).status(), 409);
  const issuedRows = await expectJson(await api.get(`/profiles/${profileId}/free-bets`), 200, "issued free bets");
  const children = issuedRows.filter((row) => issued.free_bet_ids.includes(row.free_bet_id));
  assert.equal(children.length, 2);
  assert(children.every((row) => row.origin_qual_bet_id === source.sportsbook_bet_id));
  assert(children.every((row) => row.source_award_group_id === issued.operation_id));
  let childTotal = 0;
  for (const [index, child] of children.entries()) {
    const settled = await expectJson(await api.put(`/profiles/${profileId}/free-bets/${child.free_bet_id}`, { data: asFreeBetPayload(child, {
      status: "Settled",
      result: "Back Won",
      back_odds: "5.00",
      match_strategy: "Standard",
      lay_odds_1: "5.20",
      lay_actual: index === 0 ? "4.20" : "3.20",
      lay_matched_stake_1: index === 0 ? "4.20" : "3.20",
      lay_commission_1: "0.02",
      exchange_name: "Smarkets",
      date_settled: "2026-09-17T11:00",
    }) }), 200, `settle award child ${index + 1}`);
    childTotal += Number(settled.final_net_pnl);
  }
  const protectedRemoval = await api.delete(`/profiles/${profileId}/free-bets/${children[0].free_bet_id}`, { data: { deletion_reason: "Synthetic protected removal check" } });
  assert.equal(protectedRemoval.status(), 409);
  const awardLinkedPanel = awardUi.page.locator('[data-pd-id="sportsbook.free-bet-bridge.linked-free-bets"]');
  await awardLinkedPanel.scrollIntoViewIfNeeded();
  await awardLinkedPanel.screenshot({ path: `${runtime}/cp017-award-lineage.png` });
  await awardUi.context.close();
  const childUi = await openPage(`/profiles/${profileId}/tracker/free-bets?record=${children[0].free_bet_id}`, 760, "dark");
  const childDialog = childUi.page.getByRole("dialog", { name: "Edit free-bet row" });
  await childDialog.waitFor();
  await childDialog.getByRole("tab", { name: /Settlement/ }).click();
  const childHistory = childDialog.locator('[data-pd-id="free_bet.editor.history"]');
  await childHistory.locator("summary").click();
  await childHistory.getByText("Settled", { exact: true }).waitFor();
  await childUi.page.screenshot({ path: `${runtime}/cp017-award-child-history.png`, fullPage: true });
  await childUi.context.close();

  // PQA-J10: cash movement is linked to an Account, while the Account balance remains an observation.
  const positiveId = `CA-CP17-${Date.now()}`;
  const positivePayload = {
    cash_adjustment_id: positiveId,
    adjustment_date: "2026-09-17T12:00",
    direction: "In",
    amount: "25.00",
    adjustment_type: "TopUp",
    affects_investment: true,
    affects_cash_snapshot: true,
    linked_account: "Bank A",
    description: "CP017 governed Account-linked top-up",
  };
  const positive = await expectJson(await api.post(`/profiles/${profileId}/cash-adjustments`, { data: positivePayload }), 201, "positive cash adjustment");
  const duplicateCreate = await api.post(`/profiles/${profileId}/cash-adjustments`, { data: positivePayload });
  const duplicateBody = await expectJson(duplicateCreate, 201, "identical cash retry");
  assert.equal(duplicateBody.cash_adjustment_id, positive.cash_adjustment_id);
  const changedRetry = await api.post(`/profiles/${profileId}/cash-adjustments`, { data: { ...positivePayload, amount: "24.00" } });
  assert.equal(changedRetry.status(), 409);
  const afterDuplicate = await expectJson(await api.get(`/profiles/${profileId}/cash-adjustments`), 200, "cash rows after duplicate");
  assert.equal(afterDuplicate.filter((row) => row.cash_adjustment_id === positiveId).length, 1);
  const corrected = await expectJson(await api.put(`/profiles/${profileId}/cash-adjustments/${positive.cash_adjustment_id}`, { data: {
    ...positivePayload,
    amount: "20.00",
    description: "CP017 corrected Account-linked top-up",
  }}), 200, "cash correction");
  assert.equal(corrected.signed_amount, "20.00");
  const withdrawal = await expectJson(await api.post(`/profiles/${profileId}/cash-adjustments`, { data: {
    adjustment_date: "2026-09-17T12:30",
    direction: "Out",
    amount: "7.00",
    adjustment_type: "Withdrawal",
    affects_investment: false,
    affects_cash_snapshot: true,
    linked_account: "Bank A",
    description: "CP017 Account-linked withdrawal",
  }}), 201, "negative cash adjustment");
  assert.equal(withdrawal.signed_amount, "-7.00");
  const accountAfterCash = await expectJson(await api.get(`/profiles/${profileId}/accounts/${bank.account_id}`), 200, "linked Account after cash movements");
  assert.equal(accountAfterCash.current_balance, "200.00", "Cash Adjustment silently rewrote an observed Account balance");
  const invalidCash = await api.post(`/profiles/${profileId}/cash-adjustments`, { data: { ...positivePayload, cash_adjustment_id: `CA-BAD-${Date.now()}`, amount: "not-money" } });
  assert.equal(invalidCash.status(), 422);
  const cashHistory = await expectJson(await api.get(`/profiles/${profileId}/financial-history/cash_adjustment/${positive.cash_adjustment_id}`), 200, "cash history");
  assert.deepEqual(cashHistory.map((event) => event.operation), ["created", "corrected"]);

  // PQA-J08: confirmed Casino result applies approved settlement Other Costs exactly once.
  const casino = await expectJson(await api.post(`/profiles/${profileId}/casino-offers`, { data: casinoPayload("CP017 Casino costs") }), 201, "Casino activity");
  assert.equal(casino.resolved_net_pnl, "6.00");
  const correctedCasino = await expectJson(await api.put(`/profiles/${profileId}/casino-offers/${casino.casino_offer_id}`, { data: casinoPayload("CP017 Casino costs", {
    settlement_other_costs: "2.00",
    final_net_pnl: "5.00",
    user_notes: "Corrected actual settlement cost",
  }) }), 200, "Casino fee correction");
  assert.equal(correctedCasino.resolved_net_pnl, "5.00");
  const malformedCasino = await api.post(`/profiles/${profileId}/casino-offers`, { data: casinoPayload("CP017 malformed Casino", { settlement_other_costs: "bad" }) });
  assert.equal(malformedCasino.status(), 422);
  const casinoHistory = await expectJson(await api.get(`/profiles/${profileId}/financial-history/casino/${casino.casino_offer_id}`), 200, "Casino history");
  assert.deepEqual(casinoHistory.map((event) => event.operation), ["created", "corrected"]);

  const sources = await expectJson(await api.get(`/profiles/${profileId}/tracker-summary-sources`), 200, "report sources");
  assert.equal(sources.cash_adjustments.find((row) => row.cash_adjustment_id === positive.cash_adjustment_id).signed_amount, "20.00");
  assert.equal(sources.cash_adjustments.find((row) => row.cash_adjustment_id === withdrawal.cash_adjustment_id).signed_amount, "-7.00");
  assert.equal(sources.casino_offers.find((row) => row.casino_offer_id === casino.casino_offer_id).resolved_net_pnl, "5.00");
  const report = await openPage(`/profiles/${profileId}/tracker/reports`);
  await report.page.getByRole("heading", { name: "Weekly reports", exact: true }).waitFor();
  await report.page.getByLabel("Change tracker date range").selectOption({ label: "All Dates" });
  await report.page.reload({ waitUntil: "domcontentloaded" });
  await report.page.getByText("£ 5.00", { exact: true }).first().waitFor();
  assert.equal(await report.page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true);
  await report.page.screenshot({ path: `${runtime}/cp017-report.png`, fullPage: true });
  await report.context.close();

  for (const [module, searchTerm, dialogName, historyId, searchLabel, loadingLabel, historyTab] of [
    ["cash-adjustments", positive.cash_adjustment_id, "Edit cash adjustment", "cash_adjustment.editor.history", "Search cash-adjustment rows", "Loading cash-adjustment ledger", "Details"],
    ["casino-offers", "CP017 Casino costs", "Edit casino row", "casino.editor.history", "Search casino-offer rows", "Loading casino-offer ledger", "Settlement"],
  ]) {
    const opened = await openPage(`/profiles/${profileId}/tracker/${module}`, 760, "dark");
    await opened.page.getByText(loadingLabel).waitFor({ state: "hidden" });
    await opened.page.getByLabel(searchLabel).fill(searchTerm);
    await opened.page.getByRole("row", { name: new RegExp(searchTerm) }).click();
    const dialog = opened.page.getByRole("dialog", { name: dialogName });
    await dialog.waitFor();
    await dialog.getByRole("tab", { name: new RegExp(historyTab) }).click();
    const historyPanel = dialog.locator(`[data-pd-id="${historyId}"]`);
    await historyPanel.locator("summary").click();
    await historyPanel.getByText("Corrected", { exact: true }).waitFor();
    await opened.page.screenshot({ path: `${runtime}/cp017-${module}-history.png`, fullPage: true });
    await opened.context.close();
  }

  // Portable recovery must remap native award links while retaining the logical group.
  const exported = await api.get(`/profiles/${profileId}/exports/portable-profile.xlsx`);
  assert.equal(exported.status(), 200, await exported.text());
  const backup = await exported.body();
  const restore = await openPage("/profiles/restore");
  const restoreName = `Synthetic CP017 Restored ${Date.now()}`;
  const restoreCode = `CP17-R-${Date.now()}`;
  await restore.page.getByLabel("Portable backup").setInputFiles({
    buffer: backup,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    name: "cp017-portable-profile.xlsx",
  });
  await restore.page.getByLabel("New Profile name (optional)").fill(restoreName);
  await restore.page.getByLabel("New Profile code").fill(restoreCode);
  const [analysisResponse] = await Promise.all([
    restore.page.waitForResponse((response) => response.url().endsWith("/fund-manager/portable-restores/analyse") && response.request().method() === "POST"),
    restore.page.locator('[data-pd-id="portable-profile-restore.analyse"]').click(),
  ]);
  const analysis = await expectJson(analysisResponse, 201, "portable restore analysis");
  await restore.page.getByLabel("I confirm this backup should create a fresh Profile.").check();
  const [restoreResponse] = await Promise.all([
    restore.page.waitForResponse((response) => response.url().endsWith(`/fund-manager/portable-restores/${analysis.restore_run_id}/execute`) && response.request().method() === "POST"),
    restore.page.locator('[data-pd-id="portable-profile-restore.execute"]').click(),
  ]);
  const restored = await expectJson(restoreResponse, 200, "portable restore");
  assert.equal(restored.result.logical_parity.status, "PASS");
  const restoredProfileId = restored.target_profile_id;
  createdProfiles.push({ id: restoredProfileId, name: restoreName });
  const restoredSources = await expectJson(await api.get(`/profiles/${restoredProfileId}/sportsbook-bets`), 200, "restored Sportsbook rows");
  const restoredChildren = await expectJson(await api.get(`/profiles/${restoredProfileId}/free-bets`), 200, "restored Free Bet rows");
  const restoredSource = restoredSources.find((row) => row.event_name === source.event_name);
  const restoredAwardChildren = restoredChildren.filter((row) => row.source_award_group_id === issued.operation_id);
  assert(restoredSource);
  assert.equal(restoredAwardChildren.length, 2);
  assert(restoredAwardChildren.every((row) => row.origin_qual_bet_native_id === restoredSource.sportsbook_bet_id));
  assert(restoredAwardChildren.every((row) => row.origin_qual_bet_native_id !== source.sportsbook_bet_id));
  await restore.context.close();
  const restoredUi = await openPage(`/profiles/${restoredProfileId}/tracker/sportsbook-bets?record=${restoredSource.sportsbook_bet_id}`);
  const restoredDialog = restoredUi.page.locator('[data-pd-id="sportsbook.editor.dialog"]');
  await restoredDialog.waitFor();
  await restoredDialog.getByRole("tab", { name: /Settlement/ }).first().click();
  const restoredEdit = restoredDialog.locator('[data-pd-id="sportsbook.editor.edit-settled-row"]').filter({ visible: true });
  if (await restoredEdit.count()) await restoredEdit.click();
  await restoredDialog.getByRole("tab", { name: /Free Bet/ }).first().click();
  const restoredLinked = restoredDialog.locator('[data-pd-id="sportsbook.free-bet-bridge.linked-free-bets"]');
  await expect(restoredLinked.locator(".linked-free-bets-list > article")).toHaveCount(2);
  await expect(restoredLinked.getByText("Split 1/2", { exact: false })).toBeVisible();
  await expect(restoredLinked.getByText("Split 2/2", { exact: false })).toBeVisible();
  await restoredLinked.scrollIntoViewIfNeeded();
  await restoredLinked.screenshot({ path: `${runtime}/cp017-restored-award-lineage.png` });
  await restoredUi.context.close();

  const peerRows = await expectJson(await api.get(`/profiles/${peer.profile_id}/free-bets`), 200, "peer Free Bets");
  assert.equal(peerRows.some((row) => row.source_award_group_id === issued.operation_id), false);
  evidence.journeys.awardGroup = {
    result: "PASS",
    splitCount: 2,
    issuedFaceValue: "10.00",
    lostResponseReusedResult: true,
    concurrentReplayReusedResult: true,
    changedReplayRejected: true,
    settledChildren: true,
    protectedRemovalRejected: true,
    childTotal: childTotal.toFixed(2),
    portableNativeIdsRemapped: true,
    logicalGroupRetained: true,
    crossProfileIsolation: true,
  };
  evidence.journeys.cashReconciliation = {
    result: "PASS",
    positiveCurrent: "20.00",
    negative: "-7.00",
    linkedAccount: "Bank A",
    observedAccountBalanceUnchanged: accountAfterCash.current_balance,
    duplicateRows: 1,
    invalidRejectedBeforeWrite: true,
    history: cashHistory.map((event) => event.operation),
  };
  evidence.journeys.casinoFeeAllocation = {
    result: "PASS",
    grossBeforeCosts: "7.00",
    originalCosts: "1.00",
    originalRetained: "6.00",
    correctedCosts: "2.00",
    correctedRetained: "5.00",
    reportCurrentOnce: true,
    invalidRejectedBeforeWrite: true,
    history: casinoHistory.map((event) => event.operation),
  };
  evidence.runtime = { role: health.runtime_role, source: health.source_revision, schema: health.schema_version };
  evidence.result = "PASS";
} finally {
  for (const profile of createdProfiles.reverse()) {
    await api.patch(`/profiles/${profile.id}`, { data: { status: "Archived" } });
  }
  fs.writeFileSync(`${runtime}/cp017-financial-journeys-evidence.json`, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
  await browser.close();
  await api.dispose();
}
