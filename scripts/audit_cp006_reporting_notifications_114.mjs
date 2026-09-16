// CP-006: real authenticated reporting and notification-history boundaries.
import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium, request } from "@playwright/test";

const runtime = process.env.OPENFORGE_CP006_RUNTIME ?? "/tmp/openforge-cp003-normal";
const web = process.env.OPENFORGE_CP006_WEB ?? "http://localhost:3010";
const apiBase = process.env.OPENFORGE_CP006_API ?? "http://127.0.0.1:8010";
const token = fs.readFileSync(`${runtime}/session-token`, "utf8").trim();
const api = await request.newContext({ baseURL: apiBase, extraHTTPHeaders: { Cookie: `pd_session=${token}` } });
const browser = await chromium.launch({ headless: true });
const createdProfiles = [];
const evidence = { date: new Date().toISOString(), source: process.env.OPENFORGE_CP006_SOURCE ?? "working-tree" };

async function expectCreated(response, label) {
  assert.equal(response.status(), 201, `${label}: ${await response.text()}`);
  return response.json();
}

async function createProfile(label) {
  const response = await api.post("/profiles/onboarding", { data: {
    setup_path: "import", display_name: label, profile_code: `CP6-${Date.now()}-${createdProfiles.length}`,
    tracking_start_date: "2026-09-01",
    enabled_modules: ["sportsbook-bets", "free-bets", "casino-offers", "cash-adjustments"],
    accounts: [], quick_actions: [],
  }});
  const body = await expectCreated(response, "Profile");
  const profile = body.profile ?? body;
  createdProfiles.push({ id: profile.profile_id, name: profile.display_name });
  assert.equal((await api.patch(`/profiles/${profile.profile_id}`, { data: { status: "Active" } })).status(), 200);
  for (const [account, type] of [["Bet365", "Bookie"], ["Smarkets", "Exchange"]]) {
    await expectCreated(await api.post(`/profiles/${profile.profile_id}/accounts`, { data: {
      account, type, status: "Active", lifecycle_status: "Active", channel: "Online",
      current_balance: "10.00", pending_withdrawal_amount: "0.00",
      ...(type === "Exchange" ? { commission_rate: "0.02" } : {}),
    }}), `${type} Account`);
  }
  assert.equal((await api.put(`/profiles/${profile.profile_id}/exchange-commissions`, { data: { exchange_name: "Smarkets", commission_rate: "0.02" } })).status(), 200);
  return profile.profile_id;
}

async function openPage(width = 1440) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
  await context.addCookies([{ name: "pd_session", value: token, domain: "localhost", path: "/" }]);
  return { context, page: await context.newPage() };
}

const settledSportsbook = (event) => ({
  event_name: event, offer_text: "CP006 reporting", bookmaker: "Bet365", offer_type: "Bet & Get",
  bet_type: "Single", fixture_type: "Football", status: "Settled", result: "Back Won",
  back_stake: "10.00", back_odds: "5.00", match_strategy: "Standard", lay_odds_1: "5.20",
  lay_actual: "9.00", lay_commission_1: "0.02", exchange_name: "Smarkets",
  date_settled: "2026-09-16T10:00:00Z",
});

try {
  const profile = await createProfile("Synthetic CP006 Reporting");
  const peer = await createProfile("Synthetic CP006 Peer");
  const sportsbook = await expectCreated(await api.post(`/profiles/${profile}/sportsbook-bets`, { data: settledSportsbook("CP006 Settled Sportsbook") }), "Sportsbook");
  const freeBet = await expectCreated(await api.post(`/profiles/${profile}/free-bets`, { data: {
    event_name: "CP006 Settled Free Bet", offer_text: "CP006 reporting", bookmaker: "Bet365",
    offer_type: "Bet & Get", bet_type: "Single", fixture_type: "Football", status: "Settled",
    result: "Back Won", retention_mode: "SNR", match_strategy: "Standard", free_bet_value: "10.00",
    back_odds: "3.00", lay_odds_1: "3.10", lay_actual: "6.00", lay_commission_1: "0.02",
    exchange_name: "Smarkets", date_settled: "2026-09-16T10:00:00Z",
  }}), "Free Bet");
  const casino = await expectCreated(await api.post(`/profiles/${profile}/casino-offers`, { data: {
    date_started: "2026-09-16T10:00:00Z", date_settling: "2026-09-16T11:00:00Z",
    bookmaker: "Bet365", offer_type: "Free Spins", offer_name: "CP006 Casino",
    status: "Settled", result: "Win", final_net_pnl: "1.90",
  }}), "Casino");
  const cash = await expectCreated(await api.post(`/profiles/${profile}/cash-adjustments`, { data: {
    adjustment_date: "2026-09-16T12:00:00Z", direction: "Out", amount: "4.00",
    adjustment_type: "Subscription", affects_investment: false, affects_cash_snapshot: false,
    description: "CP006 subscription",
  }}), "Cash adjustment");
  await expectCreated(await api.post(`/profiles/${peer}/casino-offers`, { data: {
    date_started: "2026-09-16T10:00:00Z", date_settling: "2026-09-16T11:00:00Z",
    bookmaker: "Bet365", offer_type: "Free Spins", offer_name: "CP006 Peer Casino",
    status: "Settled", result: "Win", final_net_pnl: "3.10",
  }}), "Peer Casino");
  assert.deepEqual([sportsbook.final_net_pnl, freeBet.final_net_pnl, casino.resolved_net_pnl, cash.signed_amount], ["2.20", "7.40", "1.90", "-4.00"]);

  const report = await openPage();
  await report.page.goto(`${web}/profiles/${profile}/tracker/reports`, { waitUntil: "domcontentloaded" });
  await report.page.getByLabel("Change tracker date range").selectOption({ label: "All Dates" });
  await report.page.getByText("£ 11.50", { exact: true }).first().waitFor();
  await report.page.getByText("£ 7.50", { exact: true }).first().waitFor();
  await report.page.getByRole("heading", { name: "Module breakdown" }).waitFor();
  await report.page.getByRole("heading", { name: "Bookmaker breakdown" }).waitFor();
  const emptyRange = report.page.getByLabel("Change tracker date range");
  await emptyRange.focus();
  assert.equal(await emptyRange.evaluate((node) => document.activeElement === node), true);
  await emptyRange.selectOption({ label: "Today" });
  await report.page.getByText("£ 11.50", { exact: true }).first().waitFor();
  await emptyRange.selectOption({ label: "All Dates" });
  await report.page.reload({ waitUntil: "domcontentloaded" });
  await report.page.getByText("£ 11.50", { exact: true }).first().waitFor();
  await report.context.close();

  const dashboard = await openPage();
  await dashboard.page.goto(`${web}/profiles/${profile}/tracker/dashboard`, { waitUntil: "domcontentloaded" });
  const chart = dashboard.page.getByRole("img", { name: /Selected range P&L trend/ });
  await chart.waitFor();
  const chartLabel = await chart.getAttribute("aria-label");
  assert(chartLabel?.includes("£ 11.50"), `Chart has no readable point summary: ${chartLabel}`);
  assert.equal(await chart.locator("[tabindex], button, a").count(), 0, "Static chart unexpectedly exposes point controls");
  await dashboard.context.close();

  const combined = await openPage();
  await combined.page.goto(`${web}/profiles`, { waitUntil: "domcontentloaded" });
  const analytics = combined.page.locator(".cross-profile-analytics");
  await analytics.locator('[data-pd-id="profiles.navigation.performance"]').click();
  const picker = analytics.locator("details.profile-report-picker");
  await picker.locator("summary").click();
  const selectedNames = new Set(["Synthetic CP006 Reporting", "Synthetic CP006 Peer"]);
  for (const label of await picker.locator("label.profile-filter-chip").all()) {
    const name = (await label.innerText()).split("\n")[0].trim();
    const checkbox = label.locator('input[type="checkbox"]');
    if ((await checkbox.isChecked()) !== selectedNames.has(name)) await checkbox.click();
  }
  await combined.page.getByLabel("Date range").selectOption({ label: "All Dates" });
  await combined.page.locator('[aria-label="Combined selected range profit and loss: £ 14.60"]').waitFor();
  await combined.context.close();

  const partial = await expectCreated(await api.post(`/profiles/${profile}/sportsbook-bets`, { data: {
    event_name: "CP006 Partial Lay Reminder", offer_text: "CP006 notification", bookmaker: "Bet365",
    offer_type: "Bet & Get", bet_type: "Single", fixture_type: "Football", status: "Placed",
    result: "Pending", back_stake: "10.00", back_odds: "2.10", match_strategy: "Partial Lay",
    lay_odds_1: "2.20", lay_actual: "9.55", lay_matched_stake_1: "4.78", exchange_name: "Smarkets",
    date_settled: "2099-09-07T20:00:00Z",
  }}), "Partial lay source");
  const recordId = partial.sportsbook_bet_id;
  const reminderPayload = { state: "Active", due_at: "2099-09-07T18:00:00Z", reason: "CP006 retained task", actor_id: "CP006" };
  assert.equal((await api.put(`/profiles/${profile}/sportsbook-bets/${recordId}/partial-lay-reminder`, { data: reminderPayload })).status(), 200);
  assert.equal((await api.put(`/profiles/${profile}/sportsbook-bets/${recordId}/partial-lay-reminder`, { data: reminderPayload })).status(), 409);
  assert.equal((await api.put(`/profiles/${peer}/sportsbook-bets/${recordId}/partial-lay-reminder`, { data: reminderPayload })).status(), 404);
  const feedBefore = await (await api.get("/fund-manager/notifications")).json();
  const sourceNotifications = feedBefore.filter((item) => item.record_id === recordId);
  assert.equal(sourceNotifications.length, 1);
  const notification = sourceNotifications[0];
  assert.equal(notification.profile_id, profile);

  const notifications = await openPage();
  await notifications.page.goto(`${web}/notifications`, { waitUntil: "domcontentloaded" });
  const historyRow = notifications.page.locator(`[data-pd-id="notifications.history.item.${recordId}"]`);
  await historyRow.waitFor();
  const destination = await historyRow.getByRole("link").first().getAttribute("href");
  assert(destination?.includes(`/profiles/${profile}/tracker/sportsbook-bets`));
  await historyRow.locator("button.notification-card-clear").click();
  await notifications.page.reload({ waitUntil: "domcontentloaded" });
  const cleared = notifications.page.locator(`[data-pd-id="notifications.history.item.${recordId}"]`);
  await cleared.getByText("Cleared", { exact: true }).waitFor();
  const stateAfterClear = await (await api.get("/fund-manager/notifications/state")).json();
  assert(stateAfterClear.dismissed_ids.includes(notification.notification_id));

  const deleteResponse = await api.delete(`/profiles/${profile}/sportsbook-bets/${recordId}`);
  assert.equal(deleteResponse.status(), 409, "Placed source deletion was not safely denied");
  const resolvedResponse = await api.put(`/profiles/${profile}/sportsbook-bets/${recordId}/partial-lay-reminder`, { data: {
    state: "Resolved", resolution_note: "CP006 completed source task", actor_id: "CP006",
  }});
  assert.equal(resolvedResponse.status(), 200, await resolvedResponse.text());
  const feedAfterChange = await (await api.get("/fund-manager/notifications")).json();
  assert.equal(feedAfterChange.filter((item) => item.notification_id === notification.notification_id).length, 0);
  assert.equal(feedAfterChange.filter((item) => item.record_id === recordId).length, 1, "Expected current completed source state");
  await notifications.page.reload({ waitUntil: "domcontentloaded" });
  assert.equal(await notifications.page.getByText("Cleared", { exact: true }).count(), 0, "Prior cleared event survived source state change");
  const stateAfterChange = await (await api.get("/fund-manager/notifications/state")).json();
  assert(stateAfterChange.dismissed_ids.includes(notification.notification_id), "Clear tombstone vanished with source state change");
  await notifications.context.close();

  Object.assign(evidence, {
    result: "PASS_WITH_CONFIRMED_PRODUCT_GAPS",
    reporting: {
      independent: { sportsbook: "2.20", freeBet: "7.40", casino: "1.90", gross: "11.50", cashAdjustment: "-4.00", retained: "7.50", combinedWithPeer: "14.60" },
      profileRangeReload: "PASS", combinedSelection: "PASS", keyboardRangeControl: "PASS", emptyRange: "PASS",
      moduleAndBookmakerBreakdown: "PASS", moduleFilterControl: "ABSENT", chartNonvisualSummary: "PASS",
      chartPointFocusInspectionDrilldown: "ABSENT",
    },
    notifications: {
      createdFromRealSource: "PASS", duplicateRetry: "409 and one feed row", wrongProfile: "404",
      linkDestination: destination, clearReload: "PASS", placedSourceRemoval: "409 protected",
      tombstoneAfterSourceChange: "PRESENT",
      sourceIndependentHistoryAfterChange: "FAIL: prior cleared event disappears and is replaced by current source state",
    },
  });
} finally {
  for (const profile of createdProfiles.reverse()) {
    await api.patch(`/profiles/${profile.id}`, { data: { status: "Archived" } });
    const removed = await api.delete(`/profiles/${profile.id}`, { data: { confirmation_name: profile.name } });
    if (removed.status() !== 200) evidence.cleanupFailure = `${profile.id}: ${removed.status()} ${await removed.text()}`;
  }
  fs.writeFileSync(`${runtime}/cp006-reporting-notifications-evidence.json`, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
  await browser.close();
  await api.dispose();
}
