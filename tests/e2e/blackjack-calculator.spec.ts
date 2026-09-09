import { expect, test } from "@playwright/test";

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
    const total = body.player_cards.reduce((sum, card) => sum + (card === "A" ? 1 : ["J", "Q", "K"].includes(card) ? 10 : Number(card)), 0);
    let action = total >= 17 ? "Stand" : "Hit";
    let fallback: string | null = null;
    let kind = "hard";
    if (body.player_cards.length === 2 && body.player_cards[0] === body.player_cards[1]) { action = "Split"; kind = "pair"; }
    if (body.player_cards.join(",") === "6,5") { action = "Double"; fallback = "Hit"; }
    if (body.surrender_allowed && body.dealer_card === "10" && body.player_cards.join(",") === "10,5") action = "Surrender";
    await route.fulfill({ json: { action, fallback_action: fallback, hand_kind: kind, total } });
  });
  return state;
}

const rankName: Record<string, string> = { A: "Ace", J: "Jack", Q: "Queen", K: "King" };

async function chooseRank(page: import("@playwright/test").Page, slot: string, rank: string) {
  const escapedSlot = slot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await page.getByRole("button", { name: new RegExp(`^${escapedSlot},`) }).click();
  await page.getByRole("radiogroup", { name: `Choose ${slot}` }).getByRole("radio", { name: rankName[rank] ?? rank, exact: true }).click();
}

test("uses shared cards, anchored help and outcome-based Blackjack history", async ({ page }) => {
  await mockSession(page);
  const strategyPayloads: Array<Record<string, unknown>> = [];
  page.on("request", (request) => {
    if (request.url().includes("/blackjack/preview")) strategyPayloads.push(request.postDataJSON() as Record<string, unknown>);
  });
  await page.goto("/fund-manager/calculators?family=blackjack");
  await page.evaluate(() => sessionStorage.removeItem("calculator.blackjack.session.v1"));
  await page.reload();

  await expect(page.getByText("Reference only", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Base Stake", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Committed stake/i)).toHaveCount(0);
  await expect(page.getByRole("switch", { name: "Surrender allowed" })).toHaveAttribute("aria-checked", "false");
  await expect(page.getByRole("switch", { name: "Dealer hits Soft 17" })).toHaveAttribute("aria-checked", "false");

  const surrenderHelp = page.getByRole("button", { name: "Help with Surrender allowed" });
  await surrenderHelp.click();
  const surrenderTooltip = page.getByText("Check the game Help or Rules. If surrender is not stated, leave this set to No.");
  await expect(surrenderTooltip).toBeVisible();
  const [helpBox, tipBox] = await Promise.all([surrenderHelp.boundingBox(), surrenderTooltip.boundingBox()]);
  expect((tipBox?.y ?? 999) - ((helpBox?.y ?? 0) + (helpBox?.height ?? 0))).toBeLessThanOrEqual(12);
  await expect(surrenderHelp.locator(".material-symbols-outlined")).toHaveText("help");

  const picker = page.getByRole("radiogroup", { name: "Choose Dealer up-card" });
  await expect(picker.getByRole("radio")).toHaveCount(13);
  const pickerCard = picker.getByRole("radio", { name: "Queen" });
  await expect(pickerCard.locator("svg.blackjack-card-art")).toHaveCount(1);
  const pickerBox = await pickerCard.boundingBox();
  await pickerCard.hover();
  expect(await pickerCard.locator(".blackjack-card-decoration").first().evaluate((node) => getComputedStyle(node).animationName)).toContain("blackjack-card-art-cycle");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await pickerCard.locator(".blackjack-card-decoration").first().evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await chooseRank(page, "Dealer up-card", "Q");
  const dealerCard = page.getByRole("button", { name: "Dealer up-card, Queen selected" });
  const dealerBox = await dealerCard.boundingBox();
  expect(Math.abs((pickerBox?.width ?? 0) - (dealerBox?.width ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((pickerBox?.height ?? 0) - (dealerBox?.height ?? 0))).toBeLessThanOrEqual(1);

  await chooseRank(page, "Player card 1", "6");
  await chooseRank(page, "Player card 2", "5");
  await expect(page.locator('[data-pd-id="calculators.blackjack.result"]')).toContainText("DOUBLE");
  expect(strategyPayloads.at(-1)?.player_cards).toEqual(["6", "5"]);
  expect(JSON.stringify(strategyPayloads)).not.toMatch(/[♠♥♦♣]/);
  await page.getByRole("button", { name: /Double \(recommended\)/ }).click();
  await chooseRank(page, "Player card 3", "9");
  const outcome = page.getByRole("group", { name: "Player outcome" });
  await expect(outcome).toBeVisible();
  await outcome.getByRole("button", { name: "Win" }).click();
  await expect(page.getByText("You have played 1 hand", { exact: true })).toBeVisible();

  const dealAgain = page.getByRole("button", { name: "Deal Again" });
  const dealStyle = await dealAgain.evaluate((node) => ({ weight: getComputedStyle(node).fontWeight, height: node.getBoundingClientRect().height, background: getComputedStyle(node).backgroundColor }));
  expect(Number(dealStyle.weight)).toBeGreaterThanOrEqual(700);
  expect(dealStyle.height).toBeGreaterThanOrEqual(44);
  expect(dealStyle.background).not.toBe("rgba(0, 0, 0, 0)");

  await dealAgain.click();
  await chooseRank(page, "Dealer up-card", "9");
  await chooseRank(page, "Player card 1", "2");
  await chooseRank(page, "Player card 2", "3");
  await page.getByRole("button", { name: /Hit \(recommended\)/ }).click();
  await expect(page.getByRole("button", { name: /^Player card 3,/ })).toBeVisible();
  await chooseRank(page, "Player card 3", "2");
  await page.getByRole("button", { name: /Hit \(recommended\)/ }).click();
  await expect(page.getByRole("button", { name: /^Player card 4,/ })).toBeVisible();

  await page.locator('[data-pd-id="calculators.blackjack.reset-hand"]').click();
  await chooseRank(page, "Dealer up-card", "7");
  await chooseRank(page, "Player card 1", "8");
  await chooseRank(page, "Player card 2", "8");
  await page.getByRole("button", { name: /Split \(recommended\)/ }).click();
  const splitHands = page.getByRole("group", { name: "Active split hand" });
  await chooseRank(page, "Split hand 1 card 2", "10");
  await page.getByRole("button", { name: /^Stand(?: \(recommended\))?$/ }).click();
  await page.getByRole("group", { name: "Split hand 1 outcome" }).getByRole("button", { name: "Win" }).click();
  await splitHands.getByRole("button", { name: "Split hand 2" }).click();
  await chooseRank(page, "Split hand 2 card 2", "2");
  await page.getByRole("button", { name: /^Stand(?: \(recommended\))?$/ }).click();
  await page.getByRole("group", { name: "Split hand 2 outcome" }).getByRole("button", { name: "Push" }).click();
  await expect(page.getByText("You have played 2 hands", { exact: true })).toBeVisible();

  if (process.env.BLACKJACK_E2E_SCREENSHOT_PATH) {
    await page.locator('[data-pd-id="calculators.blackjack"]').screenshot({ path: process.env.BLACKJACK_E2E_SCREENSHOT_PATH });
  }
  const startingTheme = await page.locator("html").getAttribute("data-theme");
  await page.locator('[data-pd-id="app-shell.theme-toggle"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", startingTheme === "dark" ? "light" : "dark");
  await expect(page.locator(".blackjack-card-paper").first()).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("html").evaluate((node) => { node.style.fontSize = "125%"; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});

test("retains Blackjack state on refresh and clears it only after authoritative expiry", async ({ page }) => {
  const session = await mockSession(page);
  await page.goto("/fund-manager/calculators?family=blackjack");
  await chooseRank(page, "Dealer up-card", "9");
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("calculator.blackjack.session.v1"))).not.toBeNull();
  await page.reload();
  await expect(page.getByRole("button", { name: "Dealer up-card, 9 selected" })).toBeVisible();

  session.status = "network";
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
  await page.waitForTimeout(200);
  await expect(page.getByRole("button", { name: "Dealer up-card, 9 selected" })).toBeVisible();

  session.status = "expired";
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
  await expect(page).toHaveURL(/\/login\?error=session_expired/);
  expect(await page.evaluate(() => sessionStorage.getItem("calculator.blackjack.session.v1"))).toBeNull();
});
