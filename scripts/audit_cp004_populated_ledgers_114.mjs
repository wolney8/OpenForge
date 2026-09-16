// CP-004: real authenticated browser evidence for the remaining populated ledgers.
import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium, expect, request } from "@playwright/test";

const webBase = process.env.OPENFORGE_CP004_WEB_BASE ?? "http://localhost:3010";
const apiBase = process.env.OPENFORGE_CP004_API_BASE ?? "http://127.0.0.1:8010";
const runtime = process.env.OPENFORGE_CP004_RUNTIME ?? "/tmp/openforge-cp003-normal";
const profileId = process.env.OPENFORGE_CP004_PROFILE;
assert(profileId, "OPENFORGE_CP004_PROFILE is required");
const token = fs.readFileSync(`${runtime}/session-token`, "utf8").trim();
const api = await request.newContext({
  baseURL: apiBase,
  extraHTTPHeaders: { Cookie: `pd_session=${token}` },
});
const browser = await chromium.launch({ headless: true });
const stamp = Date.now();
const observations = [];
const created = { extra: "", cash: "", casino: "" };

async function contextFor(width, theme, reducedMotion = "no-preference") {
  const context = await browser.newContext({
    viewport: { width, height: 1000 },
    reducedMotion,
  });
  await context.addCookies([{ name: "pd_session", value: token, domain: "localhost", path: "/" }]);
  await context.addInitScript((value) => localStorage.setItem("openforge-theme", value), theme);
  return context;
}

async function assertPageGeometry(page, label) {
  const geometry = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  assert(geometry.scrollWidth <= geometry.clientWidth + 1, `${label} overflow: ${JSON.stringify(geometry)}`);
}

async function reportReload(page) {
  await page.goto(`${webBase}/profiles/${profileId}/tracker/reports`);
  await page.getByRole("heading", { name: "Weekly reports", exact: true }).waitFor();
  await page.reload();
  await page.getByRole("heading", { name: "Weekly reports", exact: true }).waitFor();
}

async function extraPlaceJourney(page) {
  const runner = `Synthetic CP004 Runner ${stamp}`;
  await page.goto(`${webBase}/profiles/${profileId}/tracker/each-way-extra-places`);
  const range = page.getByLabel("Change tracker date range");
  if (await range.isVisible()) await range.selectOption({ label: "All Dates" });
  await page.getByRole("button", { name: "Add Extra Place row" }).click();
  let dialog = page.getByRole("dialog", { name: "Create Extra Place row" });
  await dialog.waitFor();
  await dialog.getByLabel("Runner / Horse").fill(runner);
  await dialog.getByLabel("Race").fill("Synthetic 14:30");
  await dialog.getByLabel("Date / Time").fill("2026-09-16T14:30");
  await dialog.getByRole("combobox", { name: /^Bookmaker/ }).selectOption({ label: "Bet365" });
  await dialog.getByLabel("E/W Stake (each way)").fill("10.00");
  await dialog.getByLabel("Back Odds").fill("6.00");
  await dialog.getByLabel("Bookmaker Pays").fill("4");
  await dialog.getByLabel("Exchange Pays").fill("3");
  const exchanges = dialog.getByRole("combobox", { name: /^Exchange/ });
  await exchanges.nth(0).selectOption({ label: "Smarkets" });
  await dialog.getByLabel("Lay Odds").nth(0).fill("2.30");
  await dialog.getByLabel("Actual matched stake").nth(0).fill("26.00");
  await exchanges.nth(1).selectOption({ label: "Smarkets" });
  await dialog.getByLabel("Lay Odds").nth(1).fill("4.50");
  await dialog.getByLabel("Actual matched stake").nth(1).fill("4.40");
  await dialog.getByRole("tab", { name: /Settlement/ }).click();
  await dialog.getByLabel("Status").selectOption("Placed");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toBeHidden();
  let rows = await (await api.get(`/profiles/${profileId}/each-way-extra-places`)).json();
  let row = rows.find((item) => item.runner === runner);
  assert(row, "Extra Place row was not persisted");
  created.extra = row.each_way_extra_place_id;
  assert.equal(row.actual_win_lay_stake, "26.00");
  assert.equal(row.actual_place_lay_stake, "4.40");
  assert.equal(row.first_place_pnl, "10.80");
  assert.equal(row.standard_place_pnl, "10.60");
  assert.equal(row.extra_place_pnl, "30.40");
  assert.equal(row.unplaced_pnl, "10.40");

  await page.goto(`${webBase}/profiles/${profileId}/tracker/each-way-extra-places`);
  if (await range.isVisible()) await range.selectOption({ label: "All Dates" });
  await page.getByLabel("Search Extra Place rows").fill(runner);
  await page.getByRole("row", { name: new RegExp(runner) }).click();
  dialog = page.getByRole("dialog", { name: "Edit Extra Place row" });
  await dialog.waitFor();
  await expect(dialog.getByLabel("Actual matched stake").nth(0)).toHaveValue("26.00");
  await expect(dialog.getByLabel("Actual matched stake").nth(1)).toHaveValue("4.40");
  await dialog.getByRole("tab", { name: /Settlement/ }).click();
  await dialog.getByLabel("Status").selectOption("Settled");
  await dialog.getByLabel("Result").selectOption("Extra Place");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toBeHidden();
  row = await (await api.get(`/profiles/${profileId}/each-way-extra-places/${created.extra}`)).json();
  assert.equal(row.final_value, "30.40");
  await reportReload(page);

  await page.goto(`${webBase}/profiles/${profileId}/tracker/each-way-extra-places`);
  if (await range.isVisible()) await range.selectOption({ label: "All Dates" });
  await page.getByLabel("Search Extra Place rows").fill(runner);
  await page.getByRole("row", { name: new RegExp(runner) }).click();
  dialog = page.getByRole("dialog", { name: "Edit Extra Place row" });
  await dialog.getByRole("tab", { name: /Settlement/ }).click();
  await dialog.getByLabel("Result").selectOption("Void/NR");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toBeHidden();
  row = await (await api.get(`/profiles/${profileId}/each-way-extra-places/${created.extra}`)).json();
  assert.equal(row.final_value, "0.00");
  observations.push({ workflow: "PQA-J09", created: true, actuals: true, reopened: true, settled: "30.40", corrected: "0.00", reportReload: true });
}

async function cashJourney(page) {
  const description = `Synthetic CP004 cash ${stamp}`;
  await page.goto(`${webBase}/profiles/${profileId}/tracker/cash-adjustments`);
  const range = page.getByLabel("Change tracker date range");
  if (await range.isVisible()) await range.selectOption({ label: "All Dates" });
  await page.getByRole("button", { name: "Add cash adjustment" }).click();
  let dialog = page.getByRole("dialog", { name: "Create cash adjustment" });
  await dialog.waitFor();
  await dialog.getByRole("combobox", { name: /^Direction/ }).selectOption("In");
  await dialog.getByRole("combobox", { name: /^Adjustment type/ }).selectOption("Deposit");
  await dialog.getByLabel("Adjustment date", { exact: true }).fill("2026-09-16T12:00");
  await dialog.getByLabel("Amount", { exact: true }).fill("25.00");
  await dialog.getByRole("tab", { name: /Notes/ }).click();
  await dialog.getByLabel("Description", { exact: true }).fill(description);
  await expect(dialog.getByLabel("Signed value preview", { exact: true })).toHaveValue("£ 25.00");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toBeHidden();
  let rows = await (await api.get(`/profiles/${profileId}/cash-adjustments`)).json();
  let row = rows.find((item) => item.description === description);
  assert(row, "Cash adjustment was not persisted");
  created.cash = row.cash_adjustment_id;
  assert.equal(row.signed_amount, "25.00");

  await page.goto(`${webBase}/profiles/${profileId}/tracker/cash-adjustments`);
  if (await range.isVisible()) await range.selectOption({ label: "All Dates" });
  await page.getByLabel("Search cash-adjustment rows").fill(description);
  await page.getByRole("row", { name: new RegExp(description) }).click();
  dialog = page.getByRole("dialog", { name: "Edit cash adjustment" });
  await dialog.waitFor();
  await dialog.getByRole("button", { name: "Edit cash-adjustment row" }).click();
  // Select the correction meaning first: each governed dropdown change autosaves
  // and returns a resolved row to read-only mode.
  await dialog.getByRole("combobox", { name: /^Adjustment type/ }).selectOption("Correction");
  await dialog.getByRole("button", { name: "Edit cash-adjustment row" }).click();
  await dialog.getByRole("combobox", { name: /^Direction/ }).selectOption("Out");
  await dialog.getByRole("button", { name: "Edit cash-adjustment row" }).click();
  await dialog.getByLabel("Amount", { exact: true }).fill("10.00");
  await dialog.getByRole("button", { name: "Save Edits" }).click();
  await expect(dialog.getByRole("button", { name: "Edit cash-adjustment row" })).toBeVisible();
  row = await (await api.get(`/profiles/${profileId}/cash-adjustments/${created.cash}`)).json();
  assert.equal(row.signed_amount, "-10.00");
  await reportReload(page);

  const invalid = await api.post(`/profiles/${profileId}/cash-adjustments`, { data: {
    adjustment_date: "2026-09-16T12:00", direction: "In", amount: "not-money",
    adjustment_type: "Deposit", affects_investment: false, affects_cash_snapshot: false,
    linked_account: "", description: `invalid-${stamp}`,
  }});
  assert.equal(invalid.status(), 422, `Malformed cash amount was not rejected: ${await invalid.text()}`);
  rows = await (await api.get(`/profiles/${profileId}/cash-adjustments`)).json();
  assert.equal(rows.some((item) => item.description === `invalid-${stamp}`), false);
  observations.push({ workflow: "PQA-J10", created: "+25.00", reopened: true, corrected: "-10.00", reportReload: true, malformedWrite: "REJECTED_ZERO_WRITE" });
}

async function casinoJourney(page) {
  const name = `Synthetic CP004 Casino ${stamp}`;
  await page.goto(`${webBase}/profiles/${profileId}/tracker/casino-offers`);
  await page.getByRole("button", { name: "Add casino row" }).click();
  let dialog = page.getByRole("dialog", { name: "Create casino row" });
  await dialog.waitFor();
  await dialog.getByLabel("Date started").fill("2026-09-16T09:00");
  await dialog.getByRole("combobox", { name: /^Bookmaker/ }).selectOption("Bet365");
  await dialog.getByLabel("Offer name").fill(name);
  await dialog.getByRole("combobox", { name: /^Offer type/ }).selectOption("Free Spins");
  await dialog.getByRole("tab", { name: /Reward/ }).click();
  await dialog.getByRole("textbox", { name: /Spin stake/i }).fill("0.20");
  await dialog.getByRole("textbox", { name: /Free spins awarded/i }).fill("10");
  await dialog.getByRole("textbox", { name: /Converted win amount/i }).fill("2.40");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toBeHidden();
  let rows = await (await api.get(`/profiles/${profileId}/casino-offers`)).json();
  let row = rows.find((item) => item.offer_name === name);
  assert(row, "Casino row was not persisted");
  created.casino = row.casino_offer_id;
  assert.equal(row.free_spins_value, "2.40");
  assert.equal(row.expected_reward_cash_value, "2.40");

  await page.goto(`${webBase}/profiles/${profileId}/tracker/casino-offers?record=${created.casino}`);
  dialog = page.getByRole("dialog", { name: "Edit casino row" });
  await dialog.waitFor();
  await dialog.getByRole("tab", { name: /Settlement/ }).click();
  await dialog.locator("label").filter({ hasText: /^Net Result/ }).locator("input").fill("2.10");
  await dialog.locator("label").filter({ hasText: /^Result/ }).locator("select").selectOption("Win");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  row = await (await api.get(`/profiles/${profileId}/casino-offers/${created.casino}`)).json();
  assert.equal(row.final_net_pnl, "2.10");
  assert.equal(row.status, "Settled");
  await reportReload(page);

  await page.goto(`${webBase}/profiles/${profileId}/tracker/casino-offers?record=${created.casino}`);
  dialog = page.getByRole("dialog", { name: "Edit casino row" });
  await dialog.getByRole("button", { name: "EDIT", exact: true }).first().click();
  await dialog.getByRole("tab", { name: /Settlement/ }).click();
  await dialog.locator("label").filter({ hasText: /^Net Result/ }).locator("input").fill("1.90");
  await dialog.getByRole("button", { name: "Save Edits" }).click();
  await expect(dialog).toBeHidden();
  row = await (await api.get(`/profiles/${profileId}/casino-offers/${created.casino}`)).json();
  assert.equal(row.final_net_pnl, "1.90");
  observations.push({ workflow: "PQA-J08", created: true, calculated: "2.40", settled: "2.10", corrected: "1.90", reportReload: true });
}

try {
  const context = await contextFor(1440, "light");
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await extraPlaceJourney(page);
  await cashJourney(page);
  await casinoJourney(page);
  const reportSources = await (await api.get(`/profiles/${profileId}/tracker-summary-sources`)).json();
  assert.equal(reportSources.each_way_extra_places.find((item) => item.each_way_extra_place_id === created.extra)?.final_value, "0.00");
  assert.equal(reportSources.cash_adjustments.find((item) => item.cash_adjustment_id === created.cash)?.signed_amount, "-10.00");
  assert.equal(reportSources.casino_offers.find((item) => item.casino_offer_id === created.casino)?.final_net_pnl, "1.90");
  await assertPageGeometry(page, "desktop populated ledger");
  assert.deepEqual(pageErrors, []);
  await context.close();

  for (const [width, theme, reducedMotion] of [[760, "dark", "reduce"], [390, "light", "reduce"]]) {
    const responsiveContext = await contextFor(width, theme, reducedMotion);
    const responsivePage = await responsiveContext.newPage();
    await responsivePage.goto(`${webBase}/profiles/${profileId}/tracker/cash-adjustments`);
    await assertPageGeometry(responsivePage, `${width}px cash ledger`);
    await responsivePage.goto(`${webBase}/profiles/${profileId}/tracker/each-way-extra-places`);
    await assertPageGeometry(responsivePage, `${width}px Extra Place ledger`);
    await responsivePage.goto(`${webBase}/profiles/${profileId}/tracker/casino-offers`);
    await assertPageGeometry(responsivePage, `${width}px Casino ledger`);
    await responsiveContext.close();
  }

  const evidence = {
    source: process.env.OPENFORGE_CP004_SOURCE ?? "working-tree",
    date: new Date().toISOString(),
    profileId,
    result: "PASS_WITH_LIMITATION",
    observations,
    responsive: "760 dark reduced-motion and 390 light reduced-motion: no page overflow",
    limitation: "Deletion audit preservation still requires an approved schema/policy change because the current audit rows cascade with their parent.",
  };
  fs.writeFileSync(`${runtime}/cp004-populated-ledgers-evidence.json`, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
} finally {
  await browser.close();
  await api.dispose();
}
