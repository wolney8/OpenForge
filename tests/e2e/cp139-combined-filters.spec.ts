import { expect, test } from "@playwright/test";

test.use({ video: "on", trace: "retain-on-failure" });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/");
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
