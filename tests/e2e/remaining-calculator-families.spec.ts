import { expect, test } from "@playwright/test";

const webBaseUrl = process.env.OPENFORGE_E2E_BASE_URL ?? "http://127.0.0.1:3010";

async function mockSession(page: import("@playwright/test").Page) {
  await page.context().route("**/auth/session*", (route) => route.fulfill({ json: {
    authenticated: true, email: "remaining-calculators@example.invalid", name: "Synthetic Fund Manager",
    role: "fund_manager", expires_at: Math.floor(Date.now() / 1000) + 3600, linked_profile_ids: [],
    session_policy: { auto_logout_enabled: false, timeout_minutes: 15, preference_configured: true, effective_expires_at: Math.floor(Date.now() / 1000) + 3600 },
  }}));
}

async function assertContained(page: import("@playwright/test").Page, selector: string) {
  expect(await page.locator(selector).evaluate((element) => {
    const box = element.getBoundingClientRect();
    return box.left >= 0 && box.right <= document.documentElement.clientWidth + 1 && element.scrollWidth <= element.clientWidth + 1;
  })).toBe(true);
}

async function chooseBlackjackRank(page: import("@playwright/test").Page, slot: string, rank: string) {
  const names: Record<string, string> = { A: "Ace", J: "Jack", Q: "Queen", K: "King" };
  await page.getByRole("button", { name: new RegExp(`^${slot},`) }).click();
  await page.getByRole("radiogroup", { name: `Choose ${slot}` }).getByRole("radio", { name: names[rank] ?? rank, exact: true }).click();
}

test("uses the source-backed accumulator, Dutching and Blackjack families without writes", async ({ page }) => {
  await mockSession(page);
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" && /\/profiles\/[^/]+\/(sportsbook-bets|free-bets|each-way-extra-places)/.test(request.url())) writes.push(request.url());
  });
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: webBaseUrl });

  await page.goto("/fund-manager/calculators?family=multiples");
  await page.getByLabel("Stake").fill("10");
  await page.getByLabel("Selection 1 odds").fill("2");
  await page.getByLabel("Selection 2 odds").fill("5/2");
  await page.getByLabel("Selection 2 result").focus();
  await expect(page.getByLabel("Selection 2 odds")).toHaveValue("3.50");
  await expect(page.locator('[data-pd-id="calculators.accumulator.outcomes"]')).toContainText("£ 60.00");
  await page.getByRole("button", { name: "Add selection" }).click();
  await page.getByLabel("Selection 3 odds").fill("1,5");
  await page.getByLabel("Selection 3 odds").press("Tab");
  await expect(page.getByLabel("Selection 3 odds")).toHaveValue("1.5");
  await page.getByLabel("Selection 3 result").selectOption("void");
  await expect(page.locator('[data-pd-id="calculators.accumulator.outcomes"]')).toBeVisible();
  if (process.env.CALCULATOR_E2E_SCREENSHOT_PATH) await page.locator('[data-pd-id="calculators.accumulator"]').screenshot({ path: `${process.env.CALCULATOR_E2E_SCREENSHOT_PATH}-accumulator.png` });
  await page.locator('[data-pd-id="calculators.accumulator.reset"]').click();
  await expect(page.getByLabel("Stake")).toHaveValue("");

  await page.goto("/fund-manager/calculators?family=dutching");
  await page.getByLabel("First stake").fill("10");
  await page.getByLabel("Dutch selection 1 odds").fill("2");
  await page.getByLabel("Dutch selection 2 odds").fill("3");
  const stake = page.locator('[data-pd-id="calculators.dutching.selection-2.copyable"]');
  await expect(stake).toContainText("£ 6.67");
  const button = stake.locator("button");
  await expect(button).toHaveAccessibleName(/Copy Selection 2 stake/);
  const before = await button.evaluate((element) => {
    const icon = element.querySelector<HTMLElement>(".material-symbols-outlined")!;
    const target = element.getBoundingClientRect(); const glyph = icon.getBoundingClientRect();
    return { width: target.width, height: target.height, x: glyph.left + glyph.width / 2 - (target.left + target.width / 2), y: glyph.top + glyph.height / 2 - (target.top + target.height / 2) };
  });
  expect(before.width).toBe(44); expect(before.height).toBe(44); expect(Math.abs(before.x)).toBeLessThanOrEqual(1); expect(Math.abs(before.y)).toBeLessThanOrEqual(1);
  await button.click();
  await expect(button.locator(".material-symbols-outlined")).toHaveText("check");
  const after = await button.evaluate((element) => { const icon = element.querySelector<HTMLElement>(".material-symbols-outlined")!; const target = element.getBoundingClientRect(); const glyph = icon.getBoundingClientRect(); return { width: target.width, height: target.height, x: glyph.left + glyph.width / 2 - (target.left + target.width / 2), y: glyph.top + glyph.height / 2 - (target.top + target.height / 2) }; });
  expect(after.width).toBe(before.width); expect(after.height).toBe(before.height); expect(Math.abs(after.x)).toBeLessThanOrEqual(1); expect(Math.abs(after.y)).toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: "Add third selection" }).click();
  await page.getByLabel("Dutch selection 3 odds").fill("6");
  await page.getByLabel("Bet type").selectOption("free_bet");
  await expect(page.locator('[data-pd-id="calculators.dutching.outcomes"] .calculator-outcome-scenario-row')).toHaveCount(3);
  if (process.env.CALCULATOR_E2E_SCREENSHOT_PATH) await page.locator('[data-pd-id="calculators.dutching"]').screenshot({ path: `${process.env.CALCULATOR_E2E_SCREENSHOT_PATH}-dutching.png` });
  await page.locator('[data-pd-id="calculators.dutching.reset"]').click();
  await expect(page.getByLabel("First stake")).toHaveValue("");

  await page.goto("/fund-manager/calculators?family=blackjack");
  await chooseBlackjackRank(page, "Dealer up-card", "10");
  await chooseBlackjackRank(page, "Player card 1", "8");
  await chooseBlackjackRank(page, "Player card 2", "8");
  await expect(page.locator('[data-pd-id="calculators.blackjack.result"]')).toContainText("Split");
  await page.getByRole("button", { name: "Hit", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Player card 3,/ })).toBeVisible();
  await chooseBlackjackRank(page, "Player card 3", "2");
  await expect(page.locator('[data-pd-id="calculators.blackjack.result"]')).toContainText("Recommended Move: STAND");
  if (process.env.CALCULATOR_E2E_SCREENSHOT_PATH) await page.locator('[data-pd-id="calculators.blackjack"]').screenshot({ path: `${process.env.CALCULATOR_E2E_SCREENSHOT_PATH}-blackjack.png` });
  await page.locator('[data-pd-id="calculators.blackjack.reset-hand"]').click();
  await expect(page.getByRole("button", { name: "Dealer up-card, not selected" })).toBeVisible();

  await page.locator('[data-pd-id="app-shell.theme-toggle"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", /light|dark/);
  await page.setViewportSize({ width: 390, height: 844 });
  await assertContained(page, '[data-pd-id="calculators.blackjack"]');
  await page.getByRole("button", { name: /^Dealer up-card,/ }).focus();
  await expect(page.getByRole("button", { name: /^Dealer up-card,/ })).toBeFocused();
  expect(writes).toEqual([]);
});
