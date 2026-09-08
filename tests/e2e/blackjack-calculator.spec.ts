import { expect, test } from "@playwright/test";

const webBaseUrl = process.env.OPENFORGE_E2E_BASE_URL ?? "http://127.0.0.1:3010";

async function mockSession(page: import("@playwright/test").Page) {
  await page.context().route("**/auth/session*", (route) => route.fulfill({ json: {
    authenticated: true, email: "blackjack-calculator@example.invalid", name: "Synthetic Fund Manager",
    role: "fund_manager", expires_at: Math.floor(Date.now() / 1000) + 3600, linked_profile_ids: [],
    session_policy: { auto_logout_enabled: false, timeout_minutes: 15, preference_configured: true, effective_expires_at: Math.floor(Date.now() / 1000) + 3600 },
  }}));
}

test("plays and retains a reference-only Blackjack session", async ({ page }) => {
  await mockSession(page);
  const businessWrites: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" && /\/profiles\/[^/]+\/(sportsbook-bets|free-bets|casino-offers)/.test(request.url())) businessWrites.push(request.url());
  });

  await page.goto("/fund-manager/calculators?family=blackjack");
  await page.evaluate(() => sessionStorage.removeItem("calculator.blackjack.session.v1"));
  await page.reload();
  const table = page.locator('[data-pd-id="calculators.blackjack.table"]');
  const dealerSide = table.locator(".blackjack-dealer-side");
  const playerSide = table.locator(".blackjack-player-side");
  const [dealerBox, playerBox] = await Promise.all([dealerSide.boundingBox(), playerSide.boundingBox()]);
  expect(dealerBox?.y).toBeCloseTo(playerBox?.y ?? 0, 0);
  expect((dealerBox?.x ?? 0) + (dealerBox?.width ?? 0)).toBeLessThan(playerBox?.x ?? 0);

  const surrender = page.getByRole("group", { name: "Surrender Allowed" });
  const soft17 = page.getByRole("group", { name: "Dealer on Soft 17" });
  await expect(surrender.getByRole("button", { name: "No" })).toHaveAttribute("aria-pressed", "true");
  await expect(soft17.getByRole("button", { name: "Stands" })).toHaveAttribute("aria-pressed", "true");

  await page.getByLabel("Dealer up-card").selectOption("A");
  await page.getByLabel("Player card 1").selectOption("6");
  await page.getByLabel("Player card 2").selectOption("5");
  await expect(page.locator('[data-pd-id="calculators.blackjack.result"]')).toContainText("Recommended Move: HIT");
  await soft17.getByRole("button", { name: "Hits" }).click();
  await expect(page.locator('[data-pd-id="calculators.blackjack.result"]')).toContainText("Recommended Move: DOUBLE");

  await page.locator('[data-pd-id="calculators.blackjack.reset-hand"]').click();
  await soft17.getByRole("button", { name: "Stands" }).click();
  await surrender.getByRole("button", { name: "Yes" }).click();
  await page.getByRole("textbox", { name: "Base Stake" }).fill("5.00");
  await page.getByLabel("Dealer up-card").selectOption("10");
  await page.getByLabel("Player card 1").selectOption("10");
  await page.getByLabel("Player card 2").selectOption("5");
  await expect(page.locator('[data-pd-id="calculators.blackjack.result"]')).toContainText("Recommended Move: SURRENDER");
  await page.getByRole("button", { name: /Surrender \(recommended\)/ }).click();
  await expect(page.getByRole("heading", { name: "You have played 1 hand" })).toBeVisible();
  await page.getByText("#1", { exact: true }).click();
  await expect(page.getByText("Surrender reference: £ 2.50 returned / £ 2.50 forfeited.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "You have played 1 hand" })).toBeVisible();

  await page.locator('[data-pd-id="calculators.blackjack.deal-again"]').click();
  await expect(page.getByRole("textbox", { name: "Base Stake" })).toHaveValue("5.00");
  await expect(surrender.getByRole("button", { name: "Yes" })).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Dealer up-card").selectOption("9");
  await page.getByLabel("Player card 1").selectOption("6");
  await page.getByLabel("Player card 2").selectOption("5");
  await expect(page.locator('[data-pd-id="calculators.blackjack.result"]')).toContainText("Recommended Move: DOUBLE");
  await page.getByRole("button", { name: /Double \(recommended\)/ }).click();
  await expect(page.getByText("Committed").locator("..")).toContainText("£ 10.00");
  await page.getByLabel("Player card 3").selectOption("9");
  await expect(page.locator('[data-pd-id="calculators.blackjack.result"]')).toContainText("Hand: 20");
  await expect(page.locator('[data-pd-id="calculators.blackjack.result"]')).toContainText("complete");
  await expect(page.getByRole("heading", { name: "You have played 2 hands" })).toBeVisible();

  await page.locator('[data-pd-id="calculators.blackjack.deal-again"]').click();
  await page.getByLabel("Dealer up-card").selectOption("7");
  await page.getByLabel("Player card 1").selectOption("8");
  await page.getByLabel("Player card 2").selectOption("8");
  await page.getByRole("button", { name: /Split \(recommended\)/ }).click();
  const splitHands = page.getByRole("group", { name: "Active split hand" });
  await expect(splitHands).toBeVisible();
  await page.getByLabel("Split hand 1 card 2").selectOption("10");
  await page.getByRole("button", { name: /^Stand(?: \(recommended\))?$/ }).click();
  await splitHands.getByRole("button", { name: "Split hand 2" }).click();
  await page.getByLabel("Split hand 2 card 2").selectOption("2");
  await page.getByRole("button", { name: /^Stand(?: \(recommended\))?$/ }).click();
  await expect(page.getByRole("heading", { name: "You have played 3 hands" })).toBeVisible();

  if (process.env.BLACKJACK_E2E_SCREENSHOT_PATH) {
    await page.locator('[data-pd-id="calculators.blackjack"]').screenshot({ path: process.env.BLACKJACK_E2E_SCREENSHOT_PATH });
  }
  await page.locator('[data-pd-id="app-shell.theme-toggle"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", /light|dark/);
  if (process.env.BLACKJACK_E2E_SCREENSHOT_PATH) {
    await page.locator('[data-pd-id="calculators.blackjack"]').screenshot({ path: process.env.BLACKJACK_E2E_SCREENSHOT_PATH.replace(/\.png$/, "-light.png") });
  }

  await page.locator('[data-pd-id="calculators.blackjack.reset-hand"]').click();
  await expect(page.getByRole("heading", { name: "You have played 3 hands" })).toBeVisible();
  await page.getByRole("button", { name: "Reset Session" }).click();
  await expect(page.getByRole("dialog", { name: "Clear Blackjack history?" })).toBeVisible();
  await page.getByRole("button", { name: "Clear History" }).click();
  await expect(page.getByRole("heading", { name: "You have played 0 hands" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { document.documentElement.style.fontSize = "125%"; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await page.getByLabel("Dealer up-card").focus();
  await expect(page.getByLabel("Dealer up-card")).toBeFocused();
  expect(businessWrites).toEqual([]);

});
