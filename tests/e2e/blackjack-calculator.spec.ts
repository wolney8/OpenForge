import { expect, test } from "@playwright/test";

async function mockSession(page: import("@playwright/test").Page) {
  const localSessionToken = process.env.OPENFORGE_E2E_SESSION_TOKEN;
  if (localSessionToken) {
    await page.context().addCookies([{ name: "pd_session", value: localSessionToken, url: process.env.OPENFORGE_E2E_BASE_URL ?? "http://127.0.0.1:3010" }]);
  }
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
    if (total > 21) { action = "Bust"; kind = "bust"; }
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

test("separates Simulation, Free Play and Live Play session money", async ({ page }) => {
  await mockSession(page);
  await page.goto("/fund-manager/calculators?family=blackjack");
  await page.evaluate(() => sessionStorage.removeItem("calculator.blackjack.session.v1"));
  await page.reload();

  const mode = page.getByRole("combobox", { name: "Blackjack session mode" });
  await expect(mode).toHaveValue("simulation");
  expect((await mode.boundingBox())?.width ?? 999).toBeLessThanOrEqual(240);
  await expect(page.getByLabel("Player stake", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "Blackjack activity source" })).toHaveCount(0);
  await expect(page.locator('[data-pd-id="calculators.blackjack.session-details"]')).toHaveCount(0);
  await expect(page.getByText("Not convertible", { exact: true })).toBeVisible();
  await expect(page.locator('[data-pd-id="calculators.blackjack.how-to"]')).not.toHaveAttribute("open", "");

  await mode.selectOption("free_play");
  await expect(page.getByRole("textbox", { name: "Free credit / chip value (optional)", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Cash / withdrawable result (optional)", exact: true })).toBeVisible();
  await expect(page.getByLabel("Player stake", { exact: true })).toHaveCount(0);
  const activitySource = page.getByRole("combobox", { name: "Blackjack activity source" });
  await expect(activitySource).toHaveValue("");
  await activitySource.selectOption("promotion");
  const sessionDetails = page.locator('[data-pd-id="calculators.blackjack.session-details"]');
  await expect(sessionDetails).not.toHaveAttribute("open", "");
  await expect(page.getByRole("group", { name: "Blackjack table type" })).toBeHidden();
  await sessionDetails.locator("summary").click();
  const tableType = page.getByRole("group", { name: "Blackjack table type" });
  await expect(tableType.getByRole("button", { name: "Digital / RNG" })).toHaveAttribute("aria-pressed", "true");
  await tableType.getByRole("button", { name: "Live Dealer" }).click();
  await expect(tableType.getByRole("button", { name: "Live Dealer" })).toHaveAttribute("aria-pressed", "true");
  await expect(activitySource).toHaveValue("promotion");
  const freeCredit = page.getByRole("textbox", { name: "Free credit / chip value (optional)", exact: true });
  await freeCredit.fill(".50");
  await freeCredit.blur();
  await expect(freeCredit).toHaveValue("0.50");
  const withdrawable = page.getByRole("textbox", { name: "Cash / withdrawable result (optional)", exact: true });
  await withdrawable.fill(".5");
  await withdrawable.blur();
  await expect(withdrawable).toHaveValue("0.50");
  await withdrawable.fill("1,00");
  await withdrawable.blur();
  await expect(withdrawable).toHaveValue("1,00");
  await expect(page.locator("#blackjack-withdrawable-result-error")).toBeVisible();
  await withdrawable.fill("0.50");

  await mode.selectOption("live_play");
  await page.getByRole("combobox", { name: "Blackjack activity source" }).selectOption("own_cash");
  const startingBalance = page.getByRole("textbox", { name: "Session starting balance", exact: true });
  await startingBalance.fill(".50");
  await startingBalance.blur();
  await expect(startingBalance).toHaveValue("0.50");
  await page.getByRole("textbox", { name: "Session ending balance", exact: true }).fill("116.24");
  await expect(page.getByLabel("Session result")).toHaveAttribute("aria-label", /£ 115\.74/);
  const playerStake = page.getByLabel("Player stake", { exact: true });
  await playerStake.fill(".5");
  await playerStake.blur();
  await expect(playerStake).toHaveValue("0.50");
  const actualReturn = page.getByRole("textbox", { name: "Actual return (optional)", exact: true });
  await actualReturn.fill(".50");
  await actualReturn.blur();
  await expect(actualReturn).toHaveValue("0.50");
  await expect(page.locator(".blackjack-player-side").getByLabel("Player stake", { exact: true })).toHaveCount(0);
  await expect(page.locator('[data-pd-id="calculators.blackjack.session-mode"]').getByLabel("Player stake", { exact: true })).toHaveCount(1);
  const startingField = page.locator('[data-pd-id="calculators.blackjack.starting-balance"]');
  const startingSurface = startingField.locator("..");
  const startingPrefix = startingSurface.locator(".financial-text-input-prefix");
  const [fieldBox, surfaceBox, prefixBox] = await Promise.all([
    startingField.boundingBox(), startingSurface.boundingBox(), startingPrefix.boundingBox(),
  ]);
  expect(fieldBox?.width ?? 999).toBeLessThanOrEqual(240);
  expect((prefixBox?.x ?? -1)).toBeGreaterThanOrEqual(surfaceBox?.x ?? 0);
  const inputPaddingLeft = await startingField.evaluate((node) => Number.parseFloat(getComputedStyle(node).paddingLeft));
  expect((prefixBox?.x ?? 0) + (prefixBox?.width ?? 0)).toBeLessThanOrEqual((fieldBox?.x ?? 0) + inputPaddingLeft - 1);
  expect(Math.abs(((prefixBox?.y ?? 0) + (prefixBox?.height ?? 0) / 2) - ((surfaceBox?.y ?? 0) + (surfaceBox?.height ?? 0) / 2))).toBeLessThanOrEqual(1);
  await expect(page.getByText("Enter the reviewed balance before play.", { exact: true })).toBeHidden();
  const startingHelp = page.getByRole("button", { name: "Help with Session starting balance" });
  await startingHelp.focus();
  await expect(page.getByRole("tooltip").filter({ hasText: "Enter the reviewed balance before play." })).toBeVisible();
  const committed = page.locator('.financial-value[aria-label^="Committed stake:"]');
  await expect(committed).toHaveAttribute("aria-label", /£ 0\.50/);

  await chooseRank(page, "Dealer up-card", "9");
  await mode.selectOption("free_play");
  await expect(mode).toHaveValue("live_play");
  const modeError = page.locator("#blackjack-session-mode-error");
  await expect(modeError).toHaveText("Reset session before changing the Blackjack session mode.");
  await expect(mode).toHaveAttribute("aria-invalid", "true");
  expect(await modeError.evaluate((node) => getComputedStyle(node).textTransform)).toBe("none");
  await expect(page.locator(".blackjack-session-mode-field").locator("#blackjack-session-mode-error")).toHaveCount(1);
  await page.locator('[data-pd-id="calculators.blackjack.controls"]').click();
  await expect(modeError).toHaveCount(0);
  await mode.selectOption("free_play");
  await page.getByRole("button", { name: "Reset session", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Clear Blackjack history?" })).toBeVisible();
  await page.getByRole("button", { name: "Clear History" }).click();
  await expect(mode).toHaveValue("simulation");
  await expect(modeError).toHaveCount(0);
  await mode.selectOption("live_play");
  await page.getByLabel("Player stake", { exact: true }).fill("5.00");
  await chooseRank(page, "Dealer up-card", "9");
  await mode.selectOption("free_play");
  await expect(page.locator("#blackjack-session-mode-error")).toBeVisible();
  await expect(page.locator("#blackjack-session-mode-error")).toHaveCount(0, { timeout: 5000 });
  await expect(mode).toHaveValue("live_play");
  await chooseRank(page, "Player card 1", "6");
  const dealerLabel = page.locator(".blackjack-card-slot-label").filter({ hasText: "Dealer up-card" }).first();
  const playerLabel = page.locator(".blackjack-card-slot-label").filter({ hasText: "Player card 1" }).first();
  const [dealerLabelStyle, playerLabelStyle] = await Promise.all([dealerLabel, playerLabel].map((label) => label.evaluate((node) => ({
    fontSize: getComputedStyle(node).fontSize,
    fontWeight: getComputedStyle(node).fontWeight,
    letterSpacing: getComputedStyle(node).letterSpacing,
    textTransform: getComputedStyle(node).textTransform,
  }))));
  expect(playerLabelStyle).toEqual(dealerLabelStyle);
  expect(playerLabelStyle.textTransform).toBe("uppercase");
  await chooseRank(page, "Player card 2", "5");
  await expect(page.locator(".blackjack-suggested-action")).toContainText("DOUBLE");
  const playerResult = page.locator('[data-pd-id="calculators.blackjack.result"]');
  const blackjackTable = page.locator('[data-pd-id="calculators.blackjack.table"]');
  const dealerRegion = blackjackTable.locator(".blackjack-dealer-side");
  const playerRegion = blackjackTable.locator(".blackjack-player-side");
  await expect(playerResult.locator("..")).toHaveAttribute("data-pd-id", "calculators.blackjack.table");
  await expect(page.locator('[data-pd-id="calculators.blackjack.player-region"]')).toHaveCount(0);
  const [dealerRegionBox, playerRegionBox, playerResultBox] = await Promise.all([
    dealerRegion.boundingBox(), playerRegion.boundingBox(), playerResult.boundingBox(),
  ]);
  expect((playerResultBox?.y ?? 999)).toBeLessThan(dealerRegionBox?.y ?? 0);
  expect(Math.abs((playerResultBox?.x ?? 0) - (dealerRegionBox?.x ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs(((playerResultBox?.x ?? 0) + (playerResultBox?.width ?? 0)) - ((playerRegionBox?.x ?? 0) + (playerRegionBox?.width ?? 0)))).toBeLessThanOrEqual(1);
  expect(Math.abs((dealerRegionBox?.y ?? 0) - (playerRegionBox?.y ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((dealerRegionBox?.height ?? 0) - (playerRegionBox?.height ?? 0))).toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: "Suggested action Double" }).click();
  await expect(committed).toHaveAttribute("aria-label", /£ 10\.00/);
  await expect(page.getByText("Last action · Double", { exact: true })).toBeVisible();
  await expect(page.getByText("Waiting for final player card", { exact: true })).toBeVisible();
  await expect(page.locator(".blackjack-rank-picker-shell")).toHaveClass(/is-waiting/);
  await page.getByRole("button", { name: "Undo last Blackjack action" }).click();
  await expect(page.getByRole("button", { name: /^Player card 3,/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Suggested action Double" }).click();
  await chooseRank(page, "Player card 3", "9");
  await page.getByRole("button", { name: "Undo last Blackjack action" }).click();
  await expect(page.getByRole("button", { name: "Player card 3, not selected" })).toBeVisible();
  await expect(page.getByText("Waiting for final player card", { exact: true })).toBeVisible();
  await chooseRank(page, "Player card 3", "9");
  await page.getByRole("textbox", { name: "Actual return (optional)", exact: true }).fill("12.00");
  const primaryBanner = page.locator(".blackjack-banner-primary");
  const secondaryBanner = page.locator(".blackjack-banner-secondary");
  await expect(secondaryBanner.getByText("This player hand is complete.", { exact: true })).toBeVisible();
  await expect(page.getByText("Record outcome", { exact: true })).toHaveCount(0);
  await expect(primaryBanner.locator(".blackjack-suggested-action.is-static .material-symbols-outlined")).toHaveText("front_hand");
  const [currentHandBox, completionTextBox, outcomeBox] = await Promise.all([
    page.locator(".blackjack-suggested-action.is-static").boundingBox(),
    secondaryBanner.getByText("This player hand is complete.", { exact: true }).boundingBox(),
    primaryBanner.getByRole("group", { name: "Player outcome" }).boundingBox(),
  ]);
  expect((outcomeBox?.y ?? 0)).toBeGreaterThanOrEqual((currentHandBox?.y ?? 0) + (currentHandBox?.height ?? 0));
  expect((completionTextBox?.x ?? 0)).toBeGreaterThan((currentHandBox?.x ?? 0) + (currentHandBox?.width ?? 0));
  expect(await secondaryBanner.evaluate((node) => Array.from(node.children).every((child) => getComputedStyle(child).display !== "inline"))).toBe(true);
  if (process.env.BLACKJACK_COMPLETED_E2E_SCREENSHOT_PATH) {
    await page.locator('[data-pd-id="calculators.blackjack.table"]').screenshot({ path: process.env.BLACKJACK_COMPLETED_E2E_SCREENSHOT_PATH });
  }
  await page.getByRole("group", { name: "Player outcome" }).getByRole("button", { name: "Win" }).evaluate((button) => { button.click(); button.click(); });
  await expect(page.getByText("You have played 1 hand", { exact: true })).toBeVisible();
  await expect(page.locator(".blackjack-history-table tbody tr")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Dealer up-card, not selected" })).toBeVisible();
  await expect(page.locator('[data-pd-id="calculators.blackjack.result-pending"]')).toBeVisible();
  await expect(page.getByLabel("Player stake", { exact: true })).toHaveValue("5.00");
  if (process.env.BLACKJACK_SESSION_E2E_SCREENSHOT_PATH) {
    await page.locator('[data-pd-id="calculators.blackjack"]').screenshot({ path: process.env.BLACKJACK_SESSION_E2E_SCREENSHOT_PATH });
  }
  await page.getByRole("button", { name: "Reset Session" }).click();
  await page.getByRole("button", { name: "Clear History" }).click();
  await expect(mode).toHaveValue("simulation");
  await expect(page.getByLabel("Player stake", { exact: true })).toHaveCount(0);
  await expect(page.getByText("You have played 0 hands", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.locator('[data-pd-id="calculators.blackjack.session-mode"]').evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
});

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

  const header = page.locator(".blackjack-top-rule-bar");
  const surrenderControl = page.locator(".blackjack-rule-surrender");
  const soft17Control = page.locator(".blackjack-rule-soft-17");
  const dealAgain = page.getByRole("button", { name: "Deal Again" });
  const sessionCount = page.getByText("You have played 0 hands", { exact: true });
  const resetHand = page.locator('[data-pd-id="calculators.blackjack.reset-hand"]');
  const [headerBox, dealBox, countBox, resetButtonBox, surrenderBox, soft17Box] = await Promise.all([
    header.boundingBox(), dealAgain.boundingBox(), sessionCount.boundingBox(), resetHand.boundingBox(),
    surrenderControl.boundingBox(), soft17Control.boundingBox(),
  ]);
  expect(Math.abs((dealBox?.x ?? 0) - (headerBox?.x ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs(((dealBox?.y ?? 0) + (dealBox?.height ?? 0) / 2) - ((resetButtonBox?.y ?? 0) + (resetButtonBox?.height ?? 0) / 2))).toBeLessThanOrEqual(1);
  expect(Math.abs((countBox?.x ?? 0) - (dealBox?.x ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs(((countBox?.y ?? 0) + (countBox?.height ?? 0) / 2) - ((surrenderBox?.y ?? 0) + (surrenderBox?.height ?? 0) / 2))).toBeLessThanOrEqual(1);
  expect((soft17Box?.y ?? 0)).toBeGreaterThanOrEqual((surrenderBox?.y ?? 0) + (surrenderBox?.height ?? 0));
  expect(Math.abs(((resetButtonBox?.x ?? 0) + (resetButtonBox?.width ?? 0)) - ((headerBox?.x ?? 0) + (headerBox?.width ?? 0)))).toBeLessThanOrEqual(1);
  expect(Math.abs(((surrenderBox?.x ?? 0) + (surrenderBox?.width ?? 0)) - ((headerBox?.x ?? 0) + (headerBox?.width ?? 0)))).toBeLessThanOrEqual(1);
  expect(Math.abs(((soft17Box?.x ?? 0) + (soft17Box?.width ?? 0)) - ((headerBox?.x ?? 0) + (headerBox?.width ?? 0)))).toBeLessThanOrEqual(1);

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
  const cardRankFont = await pickerCard.locator(".blackjack-card-main-rank").evaluate((node) => getComputedStyle(node).fontFamily);
  expect(cardRankFont).toContain("Times New Roman");
  expect(await page.locator("body").evaluate((node) => getComputedStyle(node).fontFamily)).not.toContain("Times New Roman");
  const pickerBox = await pickerCard.boundingBox();
  expect(pickerBox?.width ?? 0).toBeGreaterThanOrEqual(110);
  expect(Math.abs(((pickerBox?.width ?? 0) / (pickerBox?.height ?? 1)) - (5 / 7))).toBeLessThanOrEqual(0.02);
  const pickerBounds = await picker.boundingBox();
  const firstPickerBox = await picker.getByRole("radio").nth(0).boundingBox();
  const seventhPickerBox = await picker.getByRole("radio").nth(6).boundingBox();
  expect(((seventhPickerBox?.x ?? 0) + (seventhPickerBox?.width ?? 0)) - (firstPickerBox?.x ?? 0)).toBeGreaterThanOrEqual((pickerBounds?.width ?? 0) * 0.85);
  const firstPicker = picker.getByRole("radio").first();
  await firstPicker.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(firstPicker).toBeFocused();
  expect(await firstPicker.evaluate((node) => getComputedStyle(node).outlineStyle)).not.toBe("none");
  await pickerCard.hover();
  const tiltDirection = await pickerCard.getAttribute("data-motion-direction");
  expect(["left", "right"]).toContain(tiltDirection);
  const hoveredTransform = await pickerCard.evaluate((node) => getComputedStyle(node).transform);
  expect(hoveredTransform).not.toBe("none");
  const pickerCardBox = await pickerCard.boundingBox();
  await page.mouse.move((pickerCardBox?.x ?? 0) + 8, (pickerCardBox?.y ?? 0) + 8);
  expect(await pickerCard.getAttribute("data-motion-direction")).toBe(tiltDirection);
  expect(await pickerCard.locator(".blackjack-card-decoration").first().evaluate((node) => getComputedStyle(node).animationName)).toContain("blackjack-card-art-cycle");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await pickerCard.locator(".blackjack-card-decoration").first().evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
  expect(await pickerCard.evaluate((node) => getComputedStyle(node).transform)).toBe("none");
  await pickerCard.click();
  await expect(page.getByRole("button", { name: "Dealer up-card, Queen selected" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Queen", exact: true })).not.toHaveClass(/is-flipping/);
  await page.getByRole("button", { name: "Undo last Blackjack action" }).click();
  await expect(page.getByRole("button", { name: "Dealer up-card, not selected" })).toBeVisible();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("radio", { name: "Queen", exact: true }).evaluate((button) => { button.click(); button.click(); });
  await expect(page.getByRole("button", { name: "Dealer up-card, Queen selected" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Player card 1, not selected" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Queen", exact: true })).toHaveClass(/is-flipping/);
  await expect(page.getByRole("radio", { name: "Queen", exact: true })).not.toHaveClass(/is-flipping/);
  const undo = page.getByRole("button", { name: "Undo last Blackjack action" });
  const pendingBanner = page.locator('[data-pd-id="calculators.blackjack.result-pending"]');
  const [undoBox, pendingBox] = await Promise.all([undo.boundingBox(), pendingBanner.boundingBox()]);
  expect(await undo.evaluate((node) => getComputedStyle(node).position)).toBe("absolute");
  const undoRightGap = (pendingBox?.x ?? 0) + (pendingBox?.width ?? 0) - ((undoBox?.x ?? 0) + (undoBox?.width ?? 0));
  expect(undoRightGap).toBeGreaterThanOrEqual(0);
  expect(undoRightGap).toBeLessThanOrEqual(16);
  expect(Math.abs((undoBox?.width ?? 0) - (undoBox?.height ?? 0))).toBeLessThanOrEqual(1);
  const undoGlyphBox = await undo.locator(".material-symbols-outlined").boundingBox();
  expect(Math.abs(((undoGlyphBox?.x ?? 0) + (undoGlyphBox?.width ?? 0) / 2) - ((undoBox?.x ?? 0) + (undoBox?.width ?? 0) / 2))).toBeLessThanOrEqual(1);
  expect(Math.abs(((undoGlyphBox?.y ?? 0) + (undoGlyphBox?.height ?? 0) / 2) - ((undoBox?.y ?? 0) + (undoBox?.height ?? 0) / 2))).toBeLessThanOrEqual(1);
  const dealerCard = page.getByRole("button", { name: "Dealer up-card, Queen selected" });
  const dealerBox = await dealerCard.boundingBox();
  expect(Math.abs((pickerBox?.width ?? 0) - (dealerBox?.width ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((pickerBox?.height ?? 0) - (dealerBox?.height ?? 0))).toBeLessThanOrEqual(1);

  await chooseRank(page, "Player card 1", "6");
  const playerCard = page.getByRole("button", { name: "Player card 1, 6 selected" });
  await expect(playerCard).not.toHaveClass(/is-flipping/);
  const playerBox = await playerCard.boundingBox();
  expect(Math.abs((pickerBox?.width ?? 0) - (playerBox?.width ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((pickerBox?.height ?? 0) - (playerBox?.height ?? 0))).toBeLessThanOrEqual(1);
  await chooseRank(page, "Player card 2", "5");
  await expect(page.locator('[data-pd-id="calculators.blackjack.result"]')).toContainText("DOUBLE");
  expect(strategyPayloads.at(-1)?.player_cards).toEqual(["6", "5"]);
  expect(strategyPayloads.at(-1)).not.toHaveProperty("dealer_cards");
  expect(JSON.stringify(strategyPayloads)).not.toMatch(/[♠♥♦♣]/);
  await page.getByRole("button", { name: /Double \(recommended\)/ }).click();
  await chooseRank(page, "Player card 3", "9");
  const outcome = page.getByRole("group", { name: "Player outcome" });
  await expect(outcome).toBeVisible();
  await outcome.getByRole("button", { name: "Win" }).click();
  await expect(page.getByText("You have played 1 hand", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Dealer up-card, not selected" })).toBeVisible();

  const dealStyle = await dealAgain.evaluate((node) => ({ weight: getComputedStyle(node).fontWeight, height: node.getBoundingClientRect().height, background: getComputedStyle(node).backgroundColor }));
  expect(Number(dealStyle.weight)).toBeGreaterThanOrEqual(700);
  expect(dealStyle.height).toBeGreaterThanOrEqual(44);
  expect(dealStyle.background).not.toBe("rgba(0, 0, 0, 0)");

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
  await expect(page.getByText("Last action · Split", { exact: true })).toBeVisible();
  await expect(page.getByText("Waiting for next card on Hand 1", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Undo last Blackjack action" }).click();
  await expect(page.getByRole("group", { name: "Active split hand" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Player card 1, 8 selected" })).toBeVisible();
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
  const themeToggle = page.locator('[data-pd-id="app-shell.theme-toggle"]');
  if (await page.locator("html").getAttribute("data-theme") !== "dark") await themeToggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const renderedFaceCard = page.locator(".blackjack-card:has(.blackjack-card-paper)").first();
  const darkCardPresentation = await renderedFaceCard.evaluate((node) => {
    const parse = (value: string) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    const luminance = (value: string) => {
      const channels = parse(value).map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const paper = getComputedStyle(node.querySelector(".blackjack-card-paper")!).fill;
    const ink = getComputedStyle(node.querySelector(".blackjack-card-main-rank")!).fill;
    const light = Math.max(luminance(paper), luminance(ink));
    const dark = Math.min(luminance(paper), luminance(ink));
    return { contrast: (light + 0.05) / (dark + 0.05), paper };
  });
  expect(darkCardPresentation.contrast).toBeGreaterThanOrEqual(4.5);
  expect(darkCardPresentation.paper).not.toBe("rgb(255, 255, 255)");
  await themeToggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const lightPaper = await renderedFaceCard.locator(".blackjack-card-paper").evaluate((node) => getComputedStyle(node).fill);
  expect(lightPaper).not.toBe(darkCardPresentation.paper);
  await page.setViewportSize({ width: 820, height: 900 });
  const calculatorShell = page.locator(".blackjack-calculator-shell");
  expect(await calculatorShell.evaluate((node) => getComputedStyle(node).containerType)).toBe("inline-size");
  expect(await calculatorShell.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  expect(await page.locator('[data-pd-id="calculators.blackjack.table"]').evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  const [halfHeaderBox, halfDealBox, halfResetBox, halfCountBox, halfSurrenderBox, halfSoft17Box] = await Promise.all([
    header.boundingBox(), dealAgain.boundingBox(), resetHand.boundingBox(), page.locator(".blackjack-session-count").boundingBox(),
    surrenderControl.boundingBox(), soft17Control.boundingBox(),
  ]);
  expect(Math.abs(((halfDealBox?.y ?? 0) + (halfDealBox?.height ?? 0) / 2) - ((halfResetBox?.y ?? 0) + (halfResetBox?.height ?? 0) / 2))).toBeLessThanOrEqual(1);
  expect((halfSurrenderBox?.y ?? 0)).toBeGreaterThanOrEqual((halfCountBox?.y ?? 0) + (halfCountBox?.height ?? 0));
  expect((halfSoft17Box?.y ?? 0)).toBeGreaterThanOrEqual((halfSurrenderBox?.y ?? 0) + (halfSurrenderBox?.height ?? 0));
  for (const box of [halfDealBox, halfResetBox, halfCountBox, halfSurrenderBox, halfSoft17Box]) {
    expect(box?.x ?? -1).toBeGreaterThanOrEqual(halfHeaderBox?.x ?? 0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual((halfHeaderBox?.x ?? 0) + (halfHeaderBox?.width ?? 0) + 1);
  }
  const dualPaneCardBox = await page.locator(".blackjack-rank-picker .blackjack-card").first().boundingBox();
  expect(dualPaneCardBox?.width ?? 0).toBeGreaterThanOrEqual(72);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("html").evaluate((node) => { node.style.fontSize = "125%"; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  const narrowAction = page.locator('[data-pd-id="calculators.blackjack.result-pending"]');
  const narrowDealer = page.locator(".blackjack-dealer-side");
  const [narrowActionBox, narrowDealerRegionBox] = await Promise.all([narrowAction.boundingBox(), narrowDealer.boundingBox()]);
  expect((narrowActionBox?.y ?? 999)).toBeLessThan(narrowDealerRegionBox?.y ?? 0);
  expect(Math.abs((narrowActionBox?.x ?? 0) - (narrowDealerRegionBox?.x ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs(((narrowActionBox?.x ?? 0) + (narrowActionBox?.width ?? 0)) - ((narrowDealerRegionBox?.x ?? 0) + (narrowDealerRegionBox?.width ?? 0)))).toBeLessThanOrEqual(1);
  const narrowPickerCard = page.locator(".blackjack-rank-picker .blackjack-card").first();
  const narrowDisplayCards = page.locator(".blackjack-card.blackjack-card-slot");
  const [narrowPickerBox, narrowDealerBox, narrowPlayerBox] = await Promise.all([
    narrowPickerCard.evaluate((node) => ({ height: (node as HTMLElement).offsetHeight, width: (node as HTMLElement).offsetWidth })),
    narrowDisplayCards.nth(0).evaluate((node) => ({ height: (node as HTMLElement).offsetHeight, width: (node as HTMLElement).offsetWidth })),
    narrowDisplayCards.nth(1).evaluate((node) => ({ height: (node as HTMLElement).offsetHeight, width: (node as HTMLElement).offsetWidth })),
  ]);
  expect(Math.abs((narrowPickerBox?.width ?? 0) - (narrowDealerBox?.width ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((narrowPickerBox?.width ?? 0) - (narrowPlayerBox?.width ?? 0))).toBeLessThanOrEqual(1);
});

test("supports current-hand undo, temporary Last Hand and automatic Bust", async ({ page }) => {
  await mockSession(page);
  await page.goto("/fund-manager/calculators?family=blackjack");
  await page.evaluate(() => sessionStorage.removeItem("calculator.blackjack.session.v1"));
  await page.reload();

  await chooseRank(page, "Dealer up-card", "9");
  await chooseRank(page, "Player card 1", "6");
  await chooseRank(page, "Player card 2", "5");
  await page.getByRole("button", { name: /^Stand$/ }).click();
  await expect(page.getByText("Last action · Stand", { exact: true })).toBeVisible();
  await expect(page.getByText("Waiting for outcome", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Undo last Blackjack action" }).click();
  await expect(page.getByRole("group", { name: "Action taken" })).toBeVisible();
  await page.getByRole("button", { name: /^Stand$/ }).click();
  await page.getByRole("group", { name: "Player outcome" }).getByRole("button", { name: "Win" }).click();
  await expect(page.getByText("You have played 1 hand", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Undo last Blackjack action" }).click();
  await expect(page.getByText("You have played 0 hands", { exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "Player outcome" })).toBeVisible();
  await page.getByRole("group", { name: "Player outcome" }).getByRole("button", { name: "Win" }).click();

  const lastHand = page.locator('[data-pd-id="calculators.blackjack.last-hand"]');
  await expect(lastHand).toContainText("Last hand #1");
  await expect(lastHand).toContainText("Outcome: Win");
  await expect(page.getByRole("button", { name: "Restore last hand" })).toHaveCount(0);
  await expect(lastHand.getByRole("button", { name: "Last hand dealer up-card, 9" })).toBeDisabled();
  await expect(lastHand.locator(".blackjack-last-hand-card")).toHaveCount(3);
  const [recapBox, currentCardBox, dealerRecapBox, playerRecapBox] = await Promise.all([
    lastHand.locator(".blackjack-last-hand-card").first().evaluate((node) => ({ width: (node as HTMLElement).offsetWidth })),
    page.locator(".blackjack-dealer-side .blackjack-card").evaluate((node) => ({ width: (node as HTMLElement).offsetWidth })),
    lastHand.locator(".blackjack-last-hand-card").nth(0).boundingBox(),
    lastHand.locator(".blackjack-last-hand-card").nth(1).boundingBox(),
  ]);
  expect(recapBox?.width ?? 999).toBeLessThan(currentCardBox?.width ?? 0);
  expect(Math.abs((dealerRecapBox?.y ?? 0) - (playerRecapBox?.y ?? 0))).toBeLessThanOrEqual(1);
  if (process.env.BLACKJACK_LIVE_USE_E2E_SCREENSHOT_PATH) {
    await page.locator('[data-pd-id="calculators.blackjack.table"]').screenshot({ path: process.env.BLACKJACK_LIVE_USE_E2E_SCREENSHOT_PATH });
  }
  await chooseRank(page, "Dealer up-card", "10");
  await chooseRank(page, "Player card 1", "K");
  await chooseRank(page, "Player card 2", "9");
  await expect(lastHand).toHaveClass(/is-dismissing/);
  await expect(lastHand).toHaveCount(0);
  await page.getByRole("button", { name: /^Hit$/ }).click();
  await expect(page.getByText("Waiting for Player Card 3", { exact: true })).toBeVisible();
  await chooseRank(page, "Player card 3", "5");
  const bustPanel = page.locator(".blackjack-recommendation-bust");
  await expect(bustPanel).toContainText("BUST");
  expect(await bustPanel.evaluate((node) => getComputedStyle(node).animationName)).toBe("blackjack-bust-settle");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await bustPanel.evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
  await expect(page.getByText("You have played 2 hands", { exact: true })).toBeVisible();
  await expect(lastHand).toContainText("Outcome: Bust");
  await expect(lastHand).toContainText("Dealer up-card");
  await expect(lastHand).not.toContainText("Dealer final");
  await chooseRank(page, "Dealer up-card", "2");
  await chooseRank(page, "Player card 1", "2");
  await chooseRank(page, "Player card 2", "3");
  await expect(lastHand).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("html").evaluate((node) => { node.style.fontSize = "125%"; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});

test("offers Blackjack Win only for an original two-card natural", async ({ page }) => {
  await mockSession(page);
  await page.goto("/fund-manager/calculators?family=blackjack");
  await page.evaluate(() => sessionStorage.removeItem("calculator.blackjack.session.v1"));
  await page.reload();

  await chooseRank(page, "Dealer up-card", "9");
  await chooseRank(page, "Player card 1", "A");
  await chooseRank(page, "Player card 2", "K");
  await page.getByRole("button", { name: /^Stand$/ }).click();
  const naturalOutcomes = page.getByRole("group", { name: "Player outcome" });
  await expect(naturalOutcomes.getByRole("button", { name: "Blackjack Win" })).toBeVisible();
  await expect(naturalOutcomes.getByRole("button", { name: "Push" })).toBeVisible();
  await expect(naturalOutcomes.getByRole("button", { name: "Win", exact: true })).toHaveClass(/is-win/);
  await expect(naturalOutcomes.getByRole("button", { name: "Loss" })).toHaveClass(/is-loss/);
  await expect(naturalOutcomes.getByRole("button", { name: "Push" })).toHaveClass(/is-push/);
  await expect(naturalOutcomes.getByRole("button", { name: "Blackjack Win" })).toHaveClass(/is-blackjack/);
  await naturalOutcomes.getByRole("button", { name: "Push" }).click();
  await expect(page.locator('[data-pd-id="calculators.blackjack.last-hand"]')).toContainText("Outcome: Push");

  await chooseRank(page, "Dealer up-card", "7");
  await chooseRank(page, "Player card 1", "K");
  await chooseRank(page, "Player card 2", "5");
  await page.getByRole("button", { name: /Hit \(recommended\)/ }).click();
  await chooseRank(page, "Player card 3", "6");
  await page.getByRole("button", { name: /^Stand/ }).click();
  await expect(page.getByRole("group", { name: "Player outcome" }).getByRole("button", { name: "Blackjack Win" })).toHaveCount(0);
});

test("retains Blackjack state on refresh and clears it only after authoritative expiry", async ({ page }) => {
  const session = await mockSession(page);
  await page.goto("/fund-manager/calculators?family=blackjack");
  await page.getByRole("combobox", { name: "Blackjack session mode" }).selectOption("live_play");
  await page.getByLabel("Player stake", { exact: true }).fill("7.50");
  await chooseRank(page, "Dealer up-card", "9");
  await chooseRank(page, "Player card 1", "6");
  await chooseRank(page, "Player card 2", "5");
  await page.getByRole("button", { name: /^Stand$/ }).click();
  await page.getByRole("group", { name: "Player outcome" }).getByRole("button", { name: "Win", exact: true }).click();
  await chooseRank(page, "Dealer up-card", "7");
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("calculator.blackjack.session.v1"))).not.toBeNull();
  await page.reload();
  await expect(page.getByRole("button", { name: "Dealer up-card, 7 selected" })).toBeVisible();
  const historyDisclosure = page.locator('[data-pd-id="calculators.blackjack.history"]');
  await expect(historyDisclosure).toHaveAttribute("open", "");
  await expect(page.locator(".blackjack-history-table tbody tr")).toHaveCount(1);
  await historyDisclosure.locator(":scope > summary").click();
  await expect(historyDisclosure).not.toHaveAttribute("open", "");
  await page.reload();
  await expect(historyDisclosure).not.toHaveAttribute("open", "");
  await expect(page.getByText("You have played 1 hand", { exact: true })).toBeVisible();

  session.status = "network";
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
  await page.waitForTimeout(200);
  await expect(page.getByRole("button", { name: "Dealer up-card, 7 selected" })).toBeVisible();

  session.status = "expired";
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
  await expect(page).toHaveURL(/\/login\?error=session_expired/);
  expect(await page.evaluate(() => sessionStorage.getItem("calculator.blackjack.session.v1"))).toBeNull();
  session.status = "valid";
  await page.goto("/fund-manager/calculators?family=blackjack");
  await expect(page.getByRole("combobox", { name: "Blackjack session mode" })).toHaveValue("simulation");
  await expect(page.getByLabel("Player stake", { exact: true })).toHaveCount(0);
});
