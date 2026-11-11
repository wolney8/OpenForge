import { expect, test } from "@playwright/test";

const modules = ["accounts", "sportsbook-bets", "free-bets", "casino-offers", "each-way-extra-places", "cash-adjustments"] as const;
const dialogs: Record<(typeof modules)[number], string> = {
  accounts: "Create account",
  "sportsbook-bets": "Create sportsbook row",
  "free-bets": "Create free-bet row",
  "casino-offers": "Create casino row",
  "each-way-extra-places": "Create Extra Place row",
  "cash-adjustments": "Create cash adjustment",
};

test.use({ video: "on", trace: "retain-on-failure", screenshot: "only-on-failure" });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/");
});

for (const module of modules) {
  test(`${module}: combined view retains native columns and owner-specific Add`, async ({ page }, info) => {
    await page.evaluate(() => { localStorage.setItem("openforge-theme", "light"); document.documentElement.dataset.theme = "light"; });
    const range = await page.request.put("/api/fund-manager/preferences/selected-range", { data: {
      selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null,
    } });
    expect(range.status()).toBe(200);
    await page.goto(`/profiles/profile-demo-001/tracker/${module}`);
    const native = page.locator(`[data-pd-id="${module === "sportsbook-bets" ? "sportsbook" : module === "each-way-extra-places" ? "extra-place" : module}.table-scroll"]`);
    await expect(native).toBeVisible();
    await expect(page.getByText(/^Loading .* ledger$/)).toBeHidden();
    await expect(native.locator("tbody tr").first()).toBeVisible();
    const nativeHeaders = await native.locator("thead th").allTextContents();
    await page.screenshot({ path: info.outputPath(`${module}-native-1440-light.png`) });
    await page.goto(`/tracker/${module}`);
    const combined = page.locator(`[data-pd-id="combined.${module}.table-scroll"]`);
    await expect(combined).toBeVisible();
    const combinedHeaders = await combined.locator("thead th").allTextContents();
    expect(combinedHeaders.map(value => value.trim())).toEqual(["Profile▲", ...nativeHeaders.map(value => value.trim())]);
    await expect(combined.locator("tbody tr").first()).toBeVisible();
    await page.screenshot({ path: info.outputPath(`${module}-combined-1440-light.png`) });
    await page.locator(`[data-pd-id="combined.${module}.add"]`).click();
    await expect(page.getByRole("button", { name: "Continue to Add workflow" })).toBeDisabled();
    await page.locator(`[data-pd-id="combined.${module}.new-owner"]`).click();
    await page.getByRole("option", { name: "Subscriber Alpha" }).click();
    await page.getByRole("button", { name: "Continue to Add workflow" }).click();
    await expect(page).toHaveURL(new RegExp(`/profiles/profile-demo-001/tracker/${module}\\?create=1&returnTo=`));
    await expect(page.getByRole("dialog", { name: dialogs[module] })).toBeVisible();
    await expect(page.locator('[data-pd-id="tracker.return-to-combined"]')).toHaveAttribute("href", `/tracker/${module}`);
  });
}

test("combined Profile filter, query and page size survive native record handoff", async ({ page }) => {
  await page.goto("/tracker/accounts?profile=profile-demo-001&q=Bookmaker&sort=account&desc=1&size=16");
  const table = page.locator('[data-pd-id="combined.accounts.table-scroll"]');
  await expect(table.locator("tbody tr").first()).toBeVisible();
  await table.locator("tbody a").first().click();
  const back = page.locator('[data-pd-id="tracker.return-to-combined"]');
  await expect(back).toHaveAttribute("href", "/tracker/accounts?profile=profile-demo-001&q=Bookmaker&sort=account&desc=1&size=16");
  await expect(page.getByRole("dialog", { name: "Edit account" })).toBeVisible();
  await page.getByRole("button", { name: "Close account editor" }).click();
  await expect(page.getByRole("dialog", { name: "Edit account" })).toHaveCount(0);
  await back.click();
  await expect(page.getByRole("searchbox", { name: "Search Accounts" })).toHaveValue("Bookmaker");
  await expect(page.locator('[data-pd-id="combined.accounts.profile-filter"]')).toContainText("Subscriber Alpha");
});

test("mobile details preserve all fields and spreadsheet selection reaches native review", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tracker/sportsbook-bets");
  const details = page.locator('[data-pd-id="combined.sportsbook-bets.details"]');
  await page.getByRole("button", { name: "Show Labelled Details" }).click();
  await expect(details.locator("article").first()).toBeVisible();
  await expect(details.locator("article").first().getByText("Lay Bet")).toBeVisible();
  await expect(details.locator("article").first().getByText("Back Bet")).toBeVisible();
  await page.getByRole("button", { name: "Show Full Table" }).click();
  const table = page.locator('[data-pd-id="combined.sportsbook-bets.table-scroll"]');
  await expect(table.locator('td[data-ledger-column="displayed_value"]').first()).toBeVisible();
  await table.locator('td[data-ledger-column="bookmaker"]').first().focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/profiles\/profile-demo-001\/tracker\/sportsbook-bets\?record=/);
  await expect(page.getByRole("dialog", { name: "Edit sportsbook row" })).toBeVisible();
});

test("source-owned financial cells retain the native displayed measure", async ({ page }) => {
  test.setTimeout(90_000);
  const range = await page.request.put("/api/fund-manager/preferences/selected-range", { data: {
    selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null,
  } });
  expect(range.status()).toBe(200);
  const cases = [
    { module: "accounts", native: "accounts", record: "ACC-BOOK-A", column: "current_balance" },
    { module: "sportsbook-bets", native: "sportsbook", record: "CP117-CELL-001", column: "displayed_value" },
    { module: "free-bets", native: "free-bets", record: "CP117-FB-001", column: "displayed_value" },
    { module: "casino-offers", native: "casino-offers", record: "CP117-CAS-001", column: "displayed_value" },
    { module: "each-way-extra-places", native: "extra-place", record: "CP117-EP-001", column: "qualLoss" },
    { module: "cash-adjustments", native: "cash-adjustments", record: "CA-SEED-001", column: "signed_amount" },
  ] as const;
  const rendered = (value: string) => value.replace(/\s+/g, " ").trim();
  for (const item of cases) {
    await page.goto(`/profiles/profile-demo-001/tracker/${item.module}`);
    const native = page.locator(`[data-pd-id="${item.native}.table-scroll"] td[data-ledger-row="${item.record}"][data-ledger-column="${item.column}"]`);
    await expect(native).toBeVisible();
    const nativeValue = rendered(await native.innerText());
    await page.goto(`/tracker/${item.module}`);
    const combined = page.locator(`[data-pd-id="combined.${item.module}.table-scroll"] td[data-ledger-row="profile-demo-001::${item.record}"][data-ledger-column="${item.column}"]`);
    await expect(combined).toBeVisible();
    expect(rendered(await combined.innerText()), `${item.module}.${item.column}`).toBe(nativeValue);
  }
});
