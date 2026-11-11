import { expect, test } from "@playwright/test";

test.use({ video: "on", trace: "retain-on-failure" });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/");
  expect((await page.request.put("/api/fund-manager/preferences/selected-range", { data: {
    selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null,
  } })).status()).toBe(200);
});

test("Sportsbook source status filter retains scope and native return context", async ({ page }) => {
  await page.goto("/tracker/sportsbook-bets?profile=profile-demo-001");
  const table = page.locator('[data-pd-id="combined.sportsbook-bets.table-scroll"]');
  await expect(table.locator("tbody tr").first()).toBeVisible();
  const status = (await table.locator('tbody tr td[data-ledger-column="status"]').first().innerText()).trim();
  await page.locator('[data-pd-id="combined.sportsbook-bets.status-filter"]').click();
  await page.getByRole("option", { name: status, exact: true }).click();
  await expect(page).toHaveURL(/f_status=/);
  for (const cell of await table.locator('tbody tr td[data-ledger-column="status"]').all()) await expect(cell).toContainText(status);
  await table.locator("tbody a").first().click();
  await expect(page.getByRole("dialog", { name: "Edit sportsbook row" })).toBeVisible();
  const back = page.locator('[data-pd-id="tracker.return-to-combined"]');
  await expect(back).toHaveAttribute("href", /f_status=/);
  await page.getByRole("button", { name: "Close sportsbook editor" }).click();
  await back.click();
  await page.locator('[data-pd-id="combined.sportsbook-bets.filters"]').click();
  await expect(page.locator('[data-pd-id="combined.sportsbook-bets.status-filter"]')).toContainText(status);
  await page.locator('[data-pd-id="combined.sportsbook-bets.clear-filters"]').click();
  await expect(page).not.toHaveURL(/f_status=/);
  await expect(page).toHaveURL(/profile=profile-demo-001/);
});

test("all six combined ledgers expose their existing source-field filter controls", async ({ page }) => {
  for (const [ledger, field] of [
    ["accounts", "status"], ["sportsbook-bets", "status"], ["free-bets", "status"],
    ["casino-offers", "result"], ["each-way-extra-places", "mode"], ["cash-adjustments", "calculation_state"],
  ]) {
    await page.goto(`/tracker/${ledger}`);
    await expect(page.locator(`[data-pd-id="combined.${ledger}.table-scroll"]`)).toBeVisible();
    await page.locator(`[data-pd-id="combined.${ledger}.filters"]`).click();
    await expect(page.locator(`[data-pd-id="combined.${ledger}.${field === "status" || field === "calculation_state" ? "status-filter" : `filter.${field}`}"]`)).toBeVisible();
    await expect(page.locator(`[data-pd-id="combined.${ledger}.filter.issue_type"]`)).toBeVisible();
  }
});

test("combined dated ledgers use their native date anchors for Selected Range", async ({ page }) => {
  const owner = "profile-demo-001";
  const recent = new Date().toISOString();
  const old = "2020-01-02T12:00:00Z";
  let selectedRange = "All Dates";
  await page.route(/\/profiles$/, route => route.fulfill({ status: 200, json: [{ profile_id: owner, display_name: "Subscriber Alpha", status: "active" }] }));
  await page.route(/\/fund-manager\/preferences\/selected-range$/, async route => {
    if (route.request().method() === "PUT") selectedRange = (route.request().postDataJSON() as { selected_range_preset: string }).selected_range_preset;
    await route.fulfill({ status: 200, json: { selected_range_preset: selectedRange, selected_range_custom_start: null, selected_range_custom_end: null } });
  });
  await page.route(/\/profiles\/profile-demo-001\/tracker-settings$/, route => route.fulfill({ status: 200, json: {
    custom_start_date: "", custom_end_date: "", range_back_days: 7, range_forward_days: 7,
  } }));
  const dated = [
    ["sportsbook-bets", "sportsbook_bet_id", "date_settled"],
    ["free-bets", "free_bet_id", "date_settled"],
    ["casino-offers", "casino_offer_id", "date_settling"],
    ["each-way-extra-places", "each_way_extra_place_id", "placed_at"],
    ["cash-adjustments", "cash_adjustment_id", "adjustment_date"],
  ] as const;
  for (const [module, idKey, dateKey] of dated) {
    await page.route(`**/profiles/${owner}/${module}`, route => route.fulfill({ status: 200, json: [recent, old].map((date, index) => ({
      profile_id: owner, [idKey]: `RANGE-${module}-${index}`, [dateKey]: date,
      status: "Settled", result: "Won", calculation_state: "resolved", calculation_provenance: "native",
      runner: "Demo Runner", race: "Demo Race", bookmaker: "Bookmaker A", each_way_stake: "10", back_odds: "2",
      win_exchange: "Exchange A", win_lay_odds: "2", place_exchange: "Exchange A", place_lay_odds: "2",
    })) }));
    await page.goto(`/tracker/${module}`);
    const range = page.locator('[data-pd-id="tracker.range-card.select"]');
    await expect(range).toContainText("All Dates");
    await expect(page.locator(`[data-pd-id="combined.${module}.table-scroll"] tbody tr`)).toHaveCount(2);
    await range.click();
    await page.getByRole("option", { name: "Week (Mon-Sun)", exact: true }).click();
    await expect(range).toContainText("Week (Mon-Sun)");
    await expect(page.locator(`[data-pd-id="combined.${module}.table-scroll"] tbody tr`)).toHaveCount(1);
    await page.reload();
    await expect(range).toContainText("Week (Mon-Sun)");
    selectedRange = "All Dates";
  }
});
