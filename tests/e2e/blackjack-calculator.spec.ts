import { expect, test } from "@playwright/test";

const webBaseUrl = process.env.OPENFORGE_E2E_BASE_URL ?? "http://127.0.0.1:3010";

async function mockSession(page: import("@playwright/test").Page) {
  const state: { status: "valid" | "network" | "expired" } = { status: "valid" };
  await page.context().route("**/auth/session*", (route) => {
    if (state.status === "network") return route.abort("failed");
    if (state.status === "expired") return route.fulfill({ status: 401, json: { detail: "expired" } });
    return route.fulfill({ json: {
    authenticated: true, email: "blackjack-calculator@example.invalid", name: "Synthetic Fund Manager",
    role: "fund_manager", expires_at: Math.floor(Date.now() / 1000) + 3600, linked_profile_ids: [],
    session_policy: { auto_logout_enabled: false, timeout_minutes: 15, preference_configured: true, effective_expires_at: Math.floor(Date.now() / 1000) + 3600 },
  }});
  });
  await page.context().route("**/fund-manager/calculators/blackjack/preview", async (route) => {
    const body = route.request().postDataJSON() as { dealer_card: string; player_cards: string[]; surrender_allowed: boolean; dealer_hits_soft_17: boolean };
    const cards = body.player_cards;
    let result = { action: "Hit", fallback_action: null as string | null, hand_kind: "hard", total: cards.reduce((total, card) => total + (card === "A" ? 1 : ["J", "Q", "K"].includes(card) ? 10 : Number(card)), 0) };
    if (cards.length === 2 && cards[0] === cards[1]) result = { ...result, action: "Split", hand_kind: "pair" };
    if (body.surrender_allowed && body.dealer_card === "10" && cards.join(",") === "10,5") result = { ...result, action: "Surrender", total: 15 };
    else if (body.dealer_card === "A" && cards.join(",") === "6,5") result = body.dealer_hits_soft_17 ? { ...result, action: "Double", fallback_action: "Hit", total: 11 } : { ...result, action: "Hit", total: 11 };
    else if (cards.join(",") === "6,5" && body.dealer_card === "9") result = { ...result, action: "Double", fallback_action: "Hit", total: 11 };
    else if (result.total >= 17) result = { ...result, action: "Stand" };
    await route.fulfill({ json: result });
  });
  return state;
}

const rankName: Record<string, string> = { A: "Ace", J: "Jack", Q: "Queen", K: "King" };

async function chooseRank(page: import("@playwright/test").Page, slot: string, rank: string) {
  const escapedSlot = slot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await page.getByRole("button", { name: new RegExp(`^${escapedSlot},`) }).click();
  await page.getByRole("radiogroup", { name: `Choose ${slot}` }).getByRole("radio", { name: rankName[rank] ?? rank, exact: true }).click();
}

test("plays and retains a reference-only Blackjack session", async ({ page }) => {
  await mockSession(page);
  const businessWrites: string[] = [];
  const strategyPayloads: Array<Record<string, unknown>> = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" && /\/profiles\/[^/]+\/(sportsbook-bets|free-bets|casino-offers)/.test(request.url())) businessWrites.push(request.url());
    if (request.url().includes("/fund-manager/calculators/blackjack/preview")) strategyPayloads.push(request.postDataJSON() as Record<string, unknown>);
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

  const surrender = page.getByRole("switch", { name: "Surrender allowed" });
  const soft17 = page.getByRole("switch", { name: "Dealer hits Soft 17" });
  await expect(surrender).toHaveAttribute("aria-checked", "false");
  await expect(soft17).toHaveAttribute("aria-checked", "false");
  await expect(page.getByText("You have played 0 hands", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Help with Surrender allowed" }).focus();
  await expect(page.getByText(/leave this set to No\.$/)).toBeVisible();
  await page.getByRole("button", { name: "Help with Dealer hits Soft 17" }).click();
  await expect(page.getByText(/assume the dealer stands\.$/)).toBeVisible();
  const soft17Box = await soft17.boundingBox();
  expect(soft17Box?.width ?? 999).toBeLessThan(180);
  await expect(page.getByRole("textbox", { name: "Base Stake" })).toHaveValue("0.00");
  await page.getByRole("button", { name: "£0.50" }).click();
  await expect(page.getByRole("textbox", { name: "Base Stake" })).toHaveValue("0.50");
  await expect(page.getByRole("radiogroup", { name: "Choose Dealer up-card" }).getByRole("radio")).toHaveCount(13);

  await chooseRank(page, "Dealer up-card", "A");
  await chooseRank(page, "Player card 1", "6");
  await chooseRank(page, "Player card 2", "5");
  await expect(page.locator('[data-pd-id="calculators.blackjack.result"]')).toContainText("HIT");
  expect(strategyPayloads.at(-1)?.player_cards).toEqual(["6", "5"]);
  expect(strategyPayloads.at(-1)?.dealer_hits_soft_17).toBe(false);
  expect(JSON.stringify(strategyPayloads)).not.toMatch(/[♠♥♦♣]/);

  const selectedCard = page.getByRole("button", { name: "Player card 2, 5 selected" });
  const selectedCardBox = await selectedCard.boundingBox();
  expect(selectedCardBox?.height ?? 0).toBeGreaterThan(selectedCardBox?.width ?? 999);
  await expect(selectedCard.locator(".blackjack-card-corner")).toHaveCount(4);

  await page.locator('[data-pd-id="calculators.blackjack.reset-hand"]').click();
  await chooseRank(page, "Dealer up-card", "9");
  await chooseRank(page, "Player card 1", "2");
  await chooseRank(page, "Player card 2", "3");
  await page.getByRole("button", { name: /Hit \(recommended\)/ }).click();
  await expect(page.getByRole("button", { name: /^Player card 3,/ })).toBeVisible();
  await chooseRank(page, "Player card 3", "2");
  await page.getByRole("button", { name: /Hit \(recommended\)/ }).click();
  await expect(page.getByRole("button", { name: /^Player card 4,/ })).toBeVisible();

  await page.locator('[data-pd-id="calculators.blackjack.reset-hand"]').click();
  await chooseRank(page, "Dealer up-card", "9");
  await chooseRank(page, "Player card 1", "10");
  await chooseRank(page, "Player card 2", "7");
  await expect(page.locator('[data-pd-id="calculators.blackjack.result"]')).toContainText("STAND");
  await expect(page.locator(".blackjack-recommendation-stand")).toBeVisible();

  await soft17.click();
  await expect(soft17).toHaveAttribute("aria-checked", "true");
  await expect.poll(() => strategyPayloads.at(-1)?.dealer_hits_soft_17).toBe(true);
  await expect(page.locator('[data-pd-id="calculators.blackjack.result"]')).toContainText("STAND");

  await page.locator('[data-pd-id="calculators.blackjack.reset-hand"]').click();
  await soft17.click();
  await surrender.click();
  await page.getByRole("textbox", { name: "Base Stake" }).fill("5.00");
  await chooseRank(page, "Dealer up-card", "10");
  await chooseRank(page, "Player card 1", "10");
  await chooseRank(page, "Player card 2", "5");
  await expect(page.locator('[data-pd-id="calculators.blackjack.result"]')).toContainText("SURRENDER");
  expect(strategyPayloads.at(-1)?.surrender_allowed).toBe(true);
  expect(strategyPayloads.at(-1)?.dealer_hits_soft_17).toBe(false);
  await page.getByRole("button", { name: /Surrender \(recommended\)/ }).click();
  await expect(page.getByText("You have played 1 hand", { exact: true })).toBeVisible();
  await page.getByText("#1", { exact: true }).click();
  await expect(page.getByText("Surrender reference: £ 2.50 returned / £ 2.50 forfeited.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("You have played 1 hand", { exact: true })).toBeVisible();

  await page.locator('[data-pd-id="calculators.blackjack.deal-again"]').click();
  await expect(page.getByRole("textbox", { name: "Base Stake" })).toHaveValue("5.00");
  await expect(surrender).toHaveAttribute("aria-checked", "true");
  await chooseRank(page, "Dealer up-card", "9");
  await chooseRank(page, "Player card 1", "6");
  await chooseRank(page, "Player card 2", "5");
  await expect(page.locator('[data-pd-id="calculators.blackjack.result"]')).toContainText("DOUBLE");
  await page.getByRole("button", { name: /Double \(recommended\)/ }).click();
  await expect(page.getByText("Committed").locator("..")).toContainText("£ 10.00");
  await chooseRank(page, "Player card 3", "9");
  await expect(page.locator('[data-pd-id="calculators.blackjack.result"]')).toContainText("Hand: 20");
  await expect(page.locator('[data-pd-id="calculators.blackjack.result"]')).toContainText("complete");
  await expect(page.getByText("You have played 2 hands", { exact: true })).toBeVisible();

  await page.locator('[data-pd-id="calculators.blackjack.deal-again"]').click();
  await chooseRank(page, "Dealer up-card", "7");
  await chooseRank(page, "Player card 1", "8");
  await chooseRank(page, "Player card 2", "8");
  await page.getByRole("button", { name: /Split \(recommended\)/ }).click();
  const splitHands = page.getByRole("group", { name: "Active split hand" });
  await expect(splitHands).toBeVisible();
  await chooseRank(page, "Split hand 1 card 2", "10");
  await page.getByRole("button", { name: /^Stand(?: \(recommended\))?$/ }).click();
  await splitHands.getByRole("button", { name: "Split hand 2" }).click();
  await chooseRank(page, "Split hand 2 card 2", "2");
  await page.getByRole("button", { name: /^Stand(?: \(recommended\))?$/ }).click();
  await expect(page.getByText("You have played 3 hands", { exact: true })).toBeVisible();

  if (process.env.BLACKJACK_E2E_SCREENSHOT_PATH) {
    await page.locator('[data-pd-id="calculators.blackjack"]').screenshot({ path: process.env.BLACKJACK_E2E_SCREENSHOT_PATH });
  }
  await page.locator('[data-pd-id="app-shell.theme-toggle"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", /light|dark/);
  if (process.env.BLACKJACK_E2E_SCREENSHOT_PATH) {
    await page.locator('[data-pd-id="calculators.blackjack"]').screenshot({ path: process.env.BLACKJACK_E2E_SCREENSHOT_PATH.replace(/\.png$/, "-light.png") });
  }

  await page.locator('[data-pd-id="calculators.blackjack.reset-hand"]').click();
  await expect(page.getByText("You have played 3 hands", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reset Session" }).click();
  await expect(page.getByRole("dialog", { name: "Clear Blackjack history?" })).toBeVisible();
  await page.getByRole("button", { name: "Clear History" }).click();
  await expect(page.getByText("You have played 0 hands", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Base Stake" })).toHaveValue("0.00");
  await expect(soft17).toHaveAttribute("aria-checked", "false");

  const ranks = page.getByRole("radiogroup", { name: "Choose Dealer up-card" });
  await ranks.getByRole("radio", { name: "Ace" }).focus();
  await ranks.getByRole("radio", { name: "Ace" }).press("ArrowRight");
  await expect(ranks.getByRole("radio", { name: "2", exact: true })).toBeFocused();
  await ranks.getByRole("radio", { name: "2", exact: true }).press("Space");
  await expect(page.getByRole("button", { name: "Dealer up-card, 2 selected" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { document.documentElement.style.fontSize = "125%"; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await page.getByRole("button", { name: /^Dealer up-card,/ }).focus();
  await expect(page.getByRole("button", { name: /^Dealer up-card,/ })).toBeFocused();
  expect(businessWrites).toEqual([]);

});

test("retains Blackjack state for a valid session and clears it only after authoritative expiry", async ({ page }) => {
  const session = await mockSession(page);
  await page.goto("/fund-manager/calculators?family=blackjack");
  await page.getByRole("button", { name: "£1.00" }).click();
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("calculator.blackjack.session.v1"))).not.toBeNull();

  await page.reload();
  await expect(page.getByRole("textbox", { name: "Base Stake" })).toHaveValue("1.00");

  session.status = "network";
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
  await page.waitForTimeout(200);
  await expect(page).toHaveURL(/family=blackjack/);
  await expect(page.getByRole("textbox", { name: "Base Stake" })).toHaveValue("1.00");

  session.status = "expired";
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
  await expect(page).toHaveURL(/\/login\?error=session_expired/);
  const cleared = await page.evaluate(() => JSON.parse(sessionStorage.getItem("calculator.blackjack.session.v1") ?? "null"));
  expect(cleared === null || (cleared.history.length === 0 && cleared.round.handNumber === 1 && cleared.round.baseStake === "0.00")).toBe(true);
});

test("explicit successful logout clears the Blackjack browser session", async ({ page }) => {
  await mockSession(page);
  await page.context().route("**/auth/logout", (route) => route.fulfill({ status: 204 }));
  await page.goto("/fund-manager/calculators?family=blackjack");
  await page.getByRole("button", { name: "£1.00" }).click();
  await page.getByRole("button", { name: /Open account menu/ }).click();
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login\?signed_out=1/);
  expect(await page.evaluate(() => sessionStorage.getItem("calculator.blackjack.session.v1"))).toBeNull();
});
