import { expect, test } from "@playwright/test";

const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";

test.beforeEach(async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  await page.goto(authURL);
  await page.evaluate(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
});

test("CP-140A Tracker opens the Lab ledger overview and retains Profile scope", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-pd-id="ux-v2.nav.tracker"]').click();
  await expect(page).toHaveURL(/\/tracker$/);
  await expect(page.locator('[data-pd-id="tracker.ledger-selection"]')).toBeVisible();
  for (const module of ["sportsbook", "free-bets", "casino", "extra-place", "cash"]) await expect(page.locator(`[data-pd-id="tracker.open.${module}"]`)).toBeVisible();
  await page.locator('[data-pd-id="ux-v2.nav.tracker-expand"]').click();
  await expect(page.locator('[data-pd-id="tracker.ledger-selection"]')).toBeVisible();
  await page.locator('[data-pd-id="tracker.open.sportsbook"]').click();
  await expect(page).toHaveURL(/\/tracker\/sportsbook-bets$/);
  await page.goto("/tracker?scope=profile-demo-001");
  await expect(page.locator('[data-pd-id="tracker.open.sportsbook"]')).toHaveAttribute("href", "/profiles/profile-demo-001/tracker/sportsbook-bets");
  await page.goto("/tracker?scope=foreign-profile");
  await expect(page).toHaveURL(/\/tracker$/);
  await expect(page.locator('[data-pd-id="ux-v2.profile-scope"]')).toContainText("All Profiles");
  await expect(page.locator('[data-pd-id="tracker.open.sportsbook"]')).toHaveAttribute("href", "/tracker/sportsbook-bets");
});

test("CP-140A Opportunities has an independent scoped destination and governed handoff", async ({ page, browser }) => {
  await page.goto("/");
  await page.locator('[data-pd-id="ux-v2.nav.opportunities"]').click();
  await expect(page).toHaveURL(/\/opportunities$/);
  await expect(page.locator('[data-pd-id="opportunities.source-list"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Opportunities", exact: true })).toBeVisible();
  await page.goto("/opportunities?scope=profile-demo-001");
  await expect(page.locator('[data-pd-id="opportunities.page"]')).toBeVisible();
  await page.goto("/opportunities?scope=foreign-profile");
  await expect(page).toHaveURL(/\/opportunities$/);
  await expect(page.locator('[data-pd-id="ux-v2.profile-scope"]')).toContainText("All Profiles");
  const anonymous = await browser.newContext();
  try {
    const cleanPage = await anonymous.newPage();
    await cleanPage.goto(new URL("/opportunities", page.url()).toString());
    await expect(cleanPage).toHaveURL(/\/login\?next=%2Fopportunities/);
  } finally { await anonymous.close(); }
});

test("CP-140A Today date view preserves Needs Action and Position links to real workflows", async ({ page }) => {
  await page.goto("/");
  const shortcuts = page.getByRole("navigation", { name: "Position shortcuts" });
  await expect(shortcuts.getByRole("link", { name: "Record and settle a bet" })).toHaveAttribute("href", /sportsbook-bets/);
  await expect(shortcuts.getByRole("link", { name: "Review performance" })).toHaveAttribute("href", /reports/);
  await expect(shortcuts.getByRole("link", { name: "Inspect linked Free Bets" })).toHaveAttribute("href", /free-bets/);
  await page.goto("/tasks");
  await expect(page.locator('[data-pd-id="tasks.v2.date-view"]')).toContainText("Needs Action · all dates");
  await expect(page.locator('[data-pd-id="tasks.v2.pagination"]')).toBeVisible();
});

test("CP-140A Reports keeps incomplete financial warnings discoverable without crowding its KPI row", async ({ page }) => {
  await page.route("**/reports/combined-summary-sources", async route => {
    const response = await route.fetch();
    const payload = await response.json() as { sources: Record<string, { accounts: Array<Record<string, unknown>> }> };
    const source = payload.sources["profile-demo-001"];
    if (source?.accounts.length) source.accounts[0] = { ...source.accounts[0], current_balance: null };
    await route.fulfill({ response, json: payload });
  });
  await page.goto("/reports");
  const review = page.locator('[data-pd-id="reports.financial-review"]');
  await expect(review).toBeVisible();
  await expect(review.locator("summary").first()).toContainText("Financial data needs review");
  await expect(review).not.toHaveAttribute("open", "");
  await review.locator("summary").first().click();
  await expect(review).toHaveAttribute("open", "");
  await expect(review).toContainText("Account cash information is incomplete");
  await expect(page.locator('[data-pd-id="reports.metrics"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
