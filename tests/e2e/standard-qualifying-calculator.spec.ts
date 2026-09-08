import { expect, test } from "@playwright/test";

const webBaseUrl = process.env.OPENFORGE_E2E_BASE_URL ?? "http://127.0.0.1:3010";
const apiBaseUrl = process.env.OPENFORGE_E2E_API_BASE_URL ?? "http://127.0.0.1:8010";

async function mockSession(page: import("@playwright/test").Page) {
  await page.context().route("**/auth/session*", (route) => route.fulfill({ json: {
    authenticated: true, email: "calculator-test@example.invalid", name: "Synthetic Fund Manager",
    role: "fund_manager", expires_at: Math.floor(Date.now() / 1000) + 3600, linked_profile_ids: [],
    session_policy: { auto_logout_enabled: false, timeout_minutes: 15, preference_configured: true, effective_expires_at: Math.floor(Date.now() / 1000) + 3600 },
  }}));
}

test("uses the Fund Manager matched-betting calculator without a Profile", async ({ page }) => {
  await mockSession(page);
  const ledgerMutations: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" && /\/profiles\/[^/]+\/sportsbook-bets(?:$|\?)/.test(request.url())) ledgerMutations.push(request.url());
  });
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: webBaseUrl });
  await page.goto("/fund-manager/calculators");
  if (await page.locator("html").getAttribute("data-theme") === "dark") {
    await page.locator('[data-pd-id="app-shell.theme-toggle"]').click();
  }
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator('[data-pd-id="calculators.workspace"]').getByText("Fund Manager", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Calculators" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Standard" })).toBeVisible();
  await expect(page.getByText("Reference only", { exact: true })).not.toHaveAttribute("role", "button");

  const boxes = await Promise.all(["Back stake", "Back odds", "Lay odds", "Exchange commission"].map((label) => page.getByLabel(label).boundingBox()));
  expect(boxes.every(Boolean)).toBe(true);
  expect(boxes[0]!.height).toBeCloseTo(boxes[2]!.height, 0);
  expect(boxes[1]!.height).toBeCloseTo(boxes[3]!.height, 0);
  for (const segment of await page.locator(".calculator-segment").all()) {
    const segmentBox = await segment.boundingBox();
    for (const input of await segment.locator("input").all()) {
      const inputBox = await input.boundingBox();
      expect(inputBox!.x).toBeGreaterThanOrEqual(segmentBox!.x);
      expect(inputBox!.x + inputBox!.width).toBeLessThanOrEqual(segmentBox!.x + segmentBox!.width + 1);
    }
  }

  await page.getByLabel("Back stake").fill("10.00");
  await page.getByLabel("Back odds").fill("11/4");
  await page.getByLabel("Lay odds").fill("3,8");
  await page.getByLabel("Exchange commission").focus();
  await expect(page.getByLabel("Back odds")).toHaveValue("3.75");
  await expect(page.getByLabel("Lay odds")).toHaveValue("3.8");
  await expect(page.locator('[data-pd-id="calculators.matched-betting.results"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="calculators.matched-betting.exchange"]')).toHaveValue("Smarkets");
  await expect(page.getByLabel("Exchange commission")).toHaveValue("0");
  await page.locator('[data-pd-id="calculators.matched-betting.exchange"]').selectOption("Matchbook");
  await page.getByLabel("Exchange commission").fill("0.02");
  await page.getByLabel("Lay odds").fill("3.81");
  await expect(page.getByLabel("Exchange commission")).toHaveValue("0.02");
  await page.locator('[data-pd-id="calculators.matched-betting.exchange"]').selectOption("Smarkets");
  await expect(page.getByLabel("Exchange commission")).toHaveValue("0");
  const headerActions = page.locator('[data-pd-id="calculators.header-actions"]');
  const referenceStatus = page.locator('[data-pd-id="calculators.reference-status"]');
  const openAction = page.locator('[data-pd-id="calculators.open-new-tab"]');
  const [statusBox, openBox] = await Promise.all([referenceStatus.boundingBox(), openAction.boundingBox()]);
  expect(Math.abs((statusBox?.y ?? 0) + (statusBox?.height ?? 0) / 2 - ((openBox?.y ?? 0) + (openBox?.height ?? 0) / 2))).toBeLessThanOrEqual(1);
  expect(await headerActions.evaluate((element) => getComputedStyle(element).display)).toBe("flex");
  const actionPadding = await openAction.evaluate((element) => {
    const style = getComputedStyle(element);
    return [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft];
  });
  expect(actionPadding[0]).toBe(actionPadding[2]);
  expect(actionPadding[1]).toBe(actionPadding[3]);
  expect(openBox?.height).toBeGreaterThanOrEqual(44);
  await page.getByRole("button", { name: "Copy Lay Stake" }).click();
  await expect(page.getByText(/^Copied /)).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator('[data-pd-id="calculators.matched-betting.results"] .financial-value').first()).toHaveAttribute("data-money-motion", "none");
  await page.emulateMedia({ reducedMotion: "no-preference" });

  await page.getByLabel("Bet type").selectOption("free_bet");
  await page.locator('[data-pd-id="calculators.matched-betting.free-bet-mode"]').selectOption("SR");
  await expect(page.locator('[data-pd-id="calculators.matched-betting.results"]')).toBeVisible();
  await page.getByLabel("Strategy").selectOption("Custom");
  const customSlider = page.getByRole("slider", { name: "Custom lay stake slider" });
  await expect(customSlider).toBeVisible();
  expect(Number(await customSlider.getAttribute("aria-valuemin"))).toBeLessThan(Number(await customSlider.getAttribute("aria-valuenow")));
  expect(Number(await customSlider.getAttribute("aria-valuemax"))).toBeGreaterThan(Number(await customSlider.getAttribute("aria-valuenow")));
  await customSlider.press("ArrowLeft");
  await expect(page.locator('[data-pd-id="calculators.matched-betting.results"]')).toBeVisible();
  await page.getByLabel("Bet type").selectOption("bonus_lock_in");
  await expect(page.getByLabel("Bonus / refund value")).toHaveValue("10.00");
  await page.getByLabel("Back stake").fill("12.00");
  await expect(page.getByLabel("Bonus / refund value")).toHaveValue("12.00");
  await page.getByLabel("Bonus / refund value").fill("7.00");
  await page.getByLabel("Back stake").fill("15.00");
  await expect(page.getByLabel("Bonus / refund value")).toHaveValue("7.00");
  await expect(page.locator('[data-pd-id="calculators.outcomes"]')).toContainText("bonus triggers");
  await page.getByLabel("Award trigger").selectOption("Back Wins");
  await expect(page.locator('[data-pd-id="calculators.outcomes"]')).toContainText("Back wins / bonus triggers");
  await expect(page.locator('[data-pd-id="calculators.outcomes"] .calculator-outcome-scenario-row')).toHaveCount(2);
  if (process.env.CALCULATOR_E2E_SCREENSHOT_PATH) {
    await page.locator('[data-pd-id="calculators.matched-betting.results"]').screenshot({ path: process.env.CALCULATOR_E2E_SCREENSHOT_PATH.replace(/\.png$/, "-standard-outcomes.png") });
  }
  await page.locator('[data-pd-id="calculators.matched-betting.reset"]').click();
  await expect(page.getByLabel("Bet type")).toHaveValue("qualifying");
  await expect(page.getByLabel("Back stake")).toHaveValue("");
  await expect(page.getByLabel("Exchange commission")).toHaveValue("0");
  await expect(page.locator('[data-pd-id="calculators.matched-betting.results"]')).toHaveCount(0);
  await page.waitForTimeout(250);
  await expect(page.locator('[data-pd-id="calculators.matched-betting.results"]')).toHaveCount(0);
  await page.getByLabel("Bet type").selectOption("bonus_lock_in");
  await page.getByLabel("Back stake").fill("10.00");
  await expect(page.getByLabel("Bonus / refund value")).toHaveValue("10.00");
  await page.getByLabel("Bet type").selectOption("profit_boost");
  await page.getByLabel("Lay odds").fill("3.81");
  await page.getByLabel("Boosted price source").selectOption("percentage");
  await page.getByLabel("Original / base odds").fill("3.00");
  await page.getByLabel("Profit Boost (%)").fill("10");
  await expect(page.getByText("3.2000", { exact: true })).toBeVisible();
  await expect(page.locator('[data-pd-id="calculators.outcomes"]')).toContainText("Back bet wins");

  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Open in new tab" }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  await expect(popup.getByLabel("Back stake")).toHaveValue("10.00");
  await expect(popup.getByLabel("Bet type")).toHaveValue("profit_boost");
  await popup.close();

  await page.getByLabel("Original / base odds").fill("1,000");
  await expect(page.locator('[data-pd-id="calculators.matched-betting.results"]')).toHaveCount(0);
  if (process.env.CALCULATOR_E2E_SCREENSHOT_PATH) {
    await page.screenshot({ path: process.env.CALCULATOR_E2E_SCREENSHOT_PATH.replace(/\.png$/, "-light-desktop.png"), fullPage: true });
  }
  const themeBeforeSwitch = await page.locator("html").getAttribute("data-theme");
  await page.locator('[data-pd-id="app-shell.theme-toggle"]').click();
  await expect.poll(() => page.locator("html").getAttribute("data-theme")).not.toBe(themeBeforeSwitch);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await page.getByLabel("Original / base odds").focus();
  await expect(page.getByLabel("Original / base odds")).toBeFocused();
  if (process.env.CALCULATOR_E2E_SCREENSHOT_PATH) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.screenshot({ path: process.env.CALCULATOR_E2E_SCREENSHOT_PATH, fullPage: true });
  }
  expect(ledgerMutations).toEqual([]);
});

test("pages calculator families and calculates Multi-Lay and Each Way modes", async ({ page }) => {
  await mockSession(page);
  const businessMutations: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" && /\/profiles\/[^/]+\/(?:sportsbook-bets|each-way-extra-places)(?:$|\?)/.test(request.url())) businessMutations.push(request.url());
  });
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: webBaseUrl });
  await page.goto("/fund-manager/calculators");

  const rail = page.locator('[data-pd-id="calculators.family-selector"]');
  const familyPage = rail.locator('[data-pd-id="calculators.family-page"]');
  const previous = rail.getByRole("button", { name: "Show previous calculator families" });
  const next = rail.getByRole("button", { name: "Show next calculator families" });
  const more = rail.getByRole("button", { name: /Show all calculators/ });
  await expect(rail.getByRole("button", { name: "Standard" })).toBeVisible();
  expect(await familyPage.locator("button").count()).toBe(3);
  expect(await rail.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  expect(await familyPage.evaluate((element) => getComputedStyle(element).overflowX)).toBe("visible");
  const [previousBox, nextBox] = await Promise.all([previous.boundingBox(), next.boundingBox()]);
  const moreBox = await more.boundingBox();
  expect(previousBox?.width).toBeCloseTo(nextBox?.width ?? 0, 0);
  expect(previousBox?.height).toBeCloseTo(nextBox?.height ?? 0, 0);
  expect((moreBox?.x ?? 0) - ((nextBox?.x ?? 0) + (nextBox?.width ?? 0))).toBeGreaterThan(0);
  await expect(previous.locator(".material-symbols-outlined")).toHaveText("chevron_left");
  await expect(next.locator(".material-symbols-outlined")).toHaveText("chevron_right");
  await expect(more).toHaveText(/^\+\d+$/);
  for (const chip of await familyPage.locator("button").all()) {
    expect(await chip.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  }
  await rail.getByRole("button", { name: "Standard" }).focus();
  await page.keyboard.press("Tab");
  await expect(rail.getByRole("button", { name: "Multi-Lay" })).toBeFocused();
  await next.click();
  expect(await familyPage.locator("button").count()).toBe(3);
  await expect(rail.getByRole("button", { name: /Sequential Lay/ })).toBeVisible();
  await next.click();
  await expect(next).toBeDisabled();
  await more.click();
  await expect(page.locator("#calculator-family-menu").getByRole("menuitem", { name: "Standard" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Standard" }).click();

  await rail.getByRole("button", { name: "Multi-Lay" }).click();
  await page.getByLabel("Back stake").fill("10.00");
  await page.getByLabel("Back odds").fill("11/4");
  await page.locator('[data-pd-id="calculators.multi-outcome-1-odds"]').fill("5,9");
  await page.locator('[data-pd-id="calculators.multi-outcome-2-odds"]').fill("4.9");
  await page.getByLabel("Exchange commission").focus();
  await expect(page.getByLabel("Back odds")).toHaveValue("3.75");
  await expect(page.locator('[data-pd-id="calculators.multi-outcome-1-odds"]')).toHaveValue("5.9");
  await expect(page.locator('[data-pd-id="calculators.multi-lay.outcomes"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="calculators.multi-lay.outcomes"] .calculator-outcome-scenario-row')).toHaveCount(3);
  await page.getByRole("button", { name: /Copy stake for Outcome 1/ }).click();
  await expect(page.getByText(/^Copied /)).toBeVisible();
  await page.locator('[data-pd-id="calculators.multi-lay.reset"]').click();
  await expect(page.getByLabel("Back stake")).toHaveValue("");
  await expect(page.locator('[data-pd-id="calculators.multi-lay.outcomes"]')).toHaveCount(0);

  await rail.getByRole("button", { name: "Extra Place / Each Way" }).click();
  await page.getByLabel("E/W Stake (each way)").fill("10");
  await page.getByLabel("Back odds").fill("6");
  await page.locator('[data-pd-id="calculators.each-way-win-lay-odds"]').fill("2.3");
  await page.locator('[data-pd-id="calculators.each-way-place-lay-odds"]').fill("4.5");
  await expect(page.locator('[data-pd-id="calculators.each-way.outcomes"]')).toBeVisible();
  await expect(page.getByText("Calculated Lay Stake")).toHaveCount(2);
  await page.getByRole("button", { name: "Extra Place", exact: true }).click();
  await expect(page.locator('[data-pd-id="calculators.each-way.outcomes"]').getByText("Extra Place", { exact: true })).toBeVisible();
  await expect(page.locator('[data-pd-id="calculators.each-way.outcomes"]')).toContainText("Extra Place");
  await expect(page.locator('[data-pd-id="calculators.each-way.outcomes"] .calculator-outcome-scenario-row')).toHaveCount(4);
  await page.getByRole("button", { name: "Copy stake" }).first().click();
  await expect(page.getByText(/^Copied /)).toBeVisible();
  await page.locator('[data-pd-id="calculators.each-way.reset"]').click();
  await expect(page.getByLabel("E/W Stake (each way)")).toHaveValue("");
  await expect(page.getByLabel("Each Way calculator mode").getByRole("button", { name: "Extra Place", exact: true })).toHaveAttribute("aria-pressed", "true");
  const placeTermsRail = page.getByRole("group", { name: "Place terms quick choices" });
  const firstPlaceTerm = placeTermsRail.getByRole("button", { name: "Paying 4 instead of 3" });
  await expect(firstPlaceTerm).toBeVisible();
  expect(await firstPlaceTerm.locator(".quick-select-rail-label").evaluate((element) => ({
    overflow: getComputedStyle(element).overflow,
    textOverflow: getComputedStyle(element).textOverflow,
    whiteSpace: getComputedStyle(element).whiteSpace,
  }))).toEqual({ overflow: "visible", textOverflow: "clip", whiteSpace: "normal" });

  const inputHeights = await Promise.all([page.locator('[data-pd-id="calculators.each-way-stake"]'), page.locator('[data-pd-id="calculators.each-way-back-odds"]'), page.locator('[data-pd-id="calculators.each-way-win-lay-odds"]'), page.locator('[data-pd-id="calculators.each-way-place-lay-odds"]')].map((locator) => locator.boundingBox()));
  expect(inputHeights.map((box) => Math.round(box?.height ?? 0))).toEqual([44, 44, 44, 44]);
  expect(inputHeights[0]!.y).toBeCloseTo(inputHeights[1]!.y, 0);
  const winCommission = await page.locator('[data-pd-id="calculators.each-way-win-commission"]').boundingBox();
  const placeCommission = await page.locator('[data-pd-id="calculators.each-way-place-commission"]').boundingBox();
  expect(inputHeights[2]!.y).toBeCloseTo(winCommission!.y, 0);
  expect(inputHeights[3]!.y).toBeCloseTo(placeCommission!.y, 0);
  const beforeTheme = await page.locator("html").getAttribute("data-theme");
  await page.locator('[data-pd-id="app-shell.theme-toggle"]').click();
  await expect.poll(() => page.locator("html").getAttribute("data-theme")).not.toBe(beforeTheme);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await page.evaluate(() => { document.documentElement.style.fontSize = "20px"; });
  await expect(placeTermsRail.locator(".quick-select-rail-page .review-chip")).toHaveCount(1);
  expect(await firstPlaceTerm.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  const scaledOverflow = await page.locator('[data-pd-id="calculators.workspace"]').evaluate((workspace) => ({
    fits: workspace.scrollWidth <= workspace.clientWidth + 1,
    dimensions: `${workspace.getBoundingClientRect().left}/${workspace.getBoundingClientRect().right}/${workspace.clientWidth}/${workspace.scrollWidth}`,
    offenders: Array.from(workspace.querySelectorAll<HTMLElement>("*"))
      .filter((element) => element.getBoundingClientRect().right > workspace.getBoundingClientRect().right + 1)
      .slice(0, 8)
      .map((element) => `${element.tagName}.${element.className}`),
  }));
  expect(scaledOverflow.fits, `${scaledOverflow.dimensions}\n${scaledOverflow.offenders.join("\n")}`).toBe(true);
  await page.getByRole("button", { name: "Extra Place", exact: true }).focus();
  await expect(page.getByRole("button", { name: "Extra Place", exact: true })).toBeFocused();
  if (process.env.CALCULATOR_E2E_SCREENSHOT_PATH) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: process.env.CALCULATOR_E2E_SCREENSHOT_PATH.replace(/\.png$/, "-each-way.png"), fullPage: true });
  }
  expect(businessMutations).toEqual([]);
});

test("calculates a Sequential Lay sequence and lock-in without ledger writes", async ({ page }) => {
  await mockSession(page);
  const businessMutations: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" && /\/profiles\/[^/]+\/(?:sportsbook-bets|free-bets)(?:$|\?)/.test(request.url())) businessMutations.push(request.url());
  });
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: webBaseUrl });
  await page.goto("/fund-manager/calculators?family=sequential-lay");
  await expect(page.getByRole("heading", { name: "Sequential Lay" })).toBeVisible();
  await page.locator('[data-pd-id="calculators.sequential-back-stake"]').fill("10");
  await page.locator('[data-pd-id="calculators.sequential-back-odds"]').fill("8/1");
  await page.getByLabel("Back commission").fill("0");
  await page.locator('[data-pd-id="calculators.sequential-lay.leg-1-odds"]').fill("3/2");
  await page.getByLabel("Leg 1 commission").fill("0.05");
  await page.locator('[data-pd-id="calculators.sequential-lay.leg-2-odds"]').fill("2,00");
  await page.getByLabel("Leg 2 commission").fill("0.05");
  await page.getByRole("button", { name: "Add leg" }).click();
  await page.locator('[data-pd-id="calculators.sequential-lay.leg-3-odds"]').fill("1.50");
  await page.getByLabel("Leg 3 commission").fill("0.05");
  await page.locator('[data-pd-id="calculators.sequential-mode"]').focus();
  await expect(page.locator('[data-pd-id="calculators.sequential-lay.leg-1-odds"]')).toHaveValue("2.50");
  await expect(page.locator('[data-pd-id="calculators.sequential-lay.leg-2-odds"]')).toHaveValue("2.00");
  await expect(page.locator('[data-pd-id="calculators.sequential-lay.outcomes"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="calculators.sequential-lay.leg-3"]')).toContainText("55.73");
  await expect(page.locator('[data-pd-id="calculators.sequential-lay.outcomes"] .calculator-outcome-scenario-row')).toHaveCount(4);
  await page.getByRole("button", { name: "Add leg" }).click();
  await page.locator('[data-pd-id="calculators.sequential-lay.leg-4-odds"]').fill("1.20");
  await page.getByLabel("Leg 4 commission").fill("0.05");
  await expect(page.locator('[data-pd-id="calculators.sequential-lay.outcomes"] .calculator-outcome-scenario-row')).toHaveCount(5);
  await page.getByRole("button", { name: "Remove leg 4" }).click();
  await page.locator('[data-pd-id="calculators.sequential-mode"]').selectOption("lock_in");
  await expect(page.locator('[data-pd-id="calculators.sequential-lay.leg-3"]')).toContainText("62.07");
  await expect(page.locator('[data-pd-id="calculators.sequential-lay.outcomes"]')).toContainText("6.02");
  await page.locator('[data-pd-id="calculators.sequential-lay.leg-3-odds"]').fill("1e3");
  await expect(page.locator('[data-pd-id="calculators.sequential-lay.outcomes"]')).toHaveCount(0);
  await page.locator('[data-pd-id="calculators.sequential-lay.leg-3-odds"]').fill("1.50");
  await expect(page.locator('[data-pd-id="calculators.sequential-lay.leg-3"]')).toContainText("62.07");
  await page.getByRole("button", { name: "Copy leg 3 lay stake" }).click();
  await expect(page.getByText("Copied 62.07")).toBeVisible();
  if (process.env.CALCULATOR_E2E_SCREENSHOT_PATH) await page.screenshot({ path: process.env.CALCULATOR_E2E_SCREENSHOT_PATH, fullPage: true });
  await page.locator('[data-pd-id="app-shell.theme-toggle"]').click();
  if (process.env.CALCULATOR_E2E_SCREENSHOT_PATH) await page.screenshot({ path: process.env.CALCULATOR_E2E_SCREENSHOT_PATH.replace(/\.png$/, "-alternate-theme.png"), fullPage: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator('[data-pd-id="calculators.sequential-lay.outcomes"] .financial-value').first()).toHaveAttribute("data-money-motion", "none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Remove leg 3" }).click();
  await expect(page.locator('[data-pd-id="calculators.sequential-lay.leg-3"]')).toHaveCount(0);
  await page.locator('[data-pd-id="calculators.sequential-lay.reset"]').click();
  await expect(page.locator('[data-pd-id="calculators.sequential-mode"]')).toHaveValue("standard");
  await expect(page.locator('[data-pd-id="calculators.sequential-back-stake"]')).toHaveValue("");
  await expect(page.locator('[data-pd-id="calculators.sequential-lay.outcomes"]')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await page.locator('[data-pd-id="calculators.sequential-mode"]').focus();
  await expect(page.locator('[data-pd-id="calculators.sequential-mode"]')).toBeFocused();
  expect(businessMutations).toEqual([]);
});

test("calculates Early Payout trigger, part-back and Dutch references without writes", async ({ page }) => {
  await mockSession(page);
  const businessMutations: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" && /\/profiles\/[^/]+\/(?:sportsbook-bets|free-bets)(?:$|\?)/.test(request.url())) businessMutations.push(request.url());
  });
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: webBaseUrl });
  await page.goto("/fund-manager/calculators?family=early-payout");
  await expect(page.getByRole("heading", { name: "Early Payout / 2UP" })).toBeVisible();
  await expect(page.locator('[data-pd-id="calculators.early-exchange"]')).toHaveValue("Smarkets");
  await expect(page.locator('[data-pd-id="calculators.early-commission"]')).toHaveValue("0");
  await page.locator('[data-pd-id="calculators.early-back-stake"]').fill("50");
  await page.locator('[data-pd-id="calculators.early-back-odds"]').fill("5/4");
  await page.locator('[data-pd-id="calculators.early-initial-odds"]').fill("2,32");
  await page.locator('[data-pd-id="calculators.early-commission"]').fill("0.05");
  await page.getByRole("switch", { name: "Bookmaker has paid out early" }).focus();
  await expect(page.locator('[data-pd-id="calculators.early-back-odds"]')).toHaveValue("2.25");
  await expect(page.locator('[data-pd-id="calculators.early-initial-odds"]')).toHaveValue("2.32");
  await expect(page.getByLabel("Team / selection wins: Bookmaker £ 62.50; Exchange £ (65.42); total £ (2.92)")).toBeVisible();
  await expect(page.getByLabel("Recommended lay stake: £ 49.56")).toBeVisible();
  await expect(page.getByLabel("Liability: £ 65.42")).toBeVisible();
  const reference = page.locator('[data-pd-id="calculators.early-payout.reference"]');
  const outcomes = page.locator('[data-pd-id="calculators.early-payout.outcomes"]');
  await expect(reference.getByRole("heading", { name: "Initial Matching Reference" })).toBeVisible();
  await expect(reference.getByText("Shows the initial hedge before the early-payout trigger is reached.")).toBeVisible();
  expect(await reference.evaluate((element) => element.parentElement?.getAttribute("data-pd-id"))).toBe("calculators.early-payout.result-sections");
  expect(await outcomes.evaluate((element) => element.parentElement?.getAttribute("data-pd-id"))).toBe("calculators.early-payout.result-sections");
  const [referenceBox, outcomesBox] = await Promise.all([reference.boundingBox(), outcomes.boundingBox()]);
  expect(referenceBox?.x).toBeCloseTo(outcomesBox?.x ?? 0, 0);
  expect((referenceBox?.x ?? 0) + (referenceBox?.width ?? 0)).toBeCloseTo((outcomesBox?.x ?? 0) + (outcomesBox?.width ?? 0), 0);
  expect(await reference.locator(".calculator-panel-card").count()).toBe(0);

  await page.getByRole("switch", { name: "Bookmaker has paid out early" }).click();
  await expect(page.getByRole("slider", { name: "Lock-in adjustment" })).toBeDisabled();
  await page.locator('[data-pd-id="calculators.early-in-play-odds"]').fill("1.20");
  await expect(page.getByRole("slider", { name: "Lock-in adjustment" })).toBeEnabled();
  await expect(reference.getByText("LIVE", { exact: true })).toBeVisible();
  await expect(reference.getByRole("heading", { name: "LIVE Lock-In Reference" })).toBeVisible();
  await expect(page.getByText("Shift the suggested hedge toward more or less profit on the remaining outcome.")).toBeVisible();
  await expect(page.getByLabel("Additional back stake: £ 95.82")).toBeVisible();
  await expect(page.getByLabel("Team / selection wins: Bookmaker £ 62.50; Exchange £ (46.26); total £ 16.24")).toBeVisible();
  await page.locator('[data-pd-id="calculators.early-maximum-payout"]').fill("80");
  await expect(page.getByLabel("Additional back stake: £ 68.73")).toBeVisible();
  await page.locator('[data-pd-id="calculators.early-maximum-payout"]').fill("");
  await expect(page.getByLabel("Additional back stake: £ 95.82")).toBeVisible();
  await page.route("**/fund-manager/calculators/early-payout/preview", async (route) => {
    const payload = route.request().postDataJSON() as { lock_adjustment_percent?: string };
    if (payload.lock_adjustment_percent !== "50") return route.continue();
    const response = await route.fetch();
    await new Promise((resolve) => setTimeout(resolve, 350));
    await route.fulfill({ response });
  });
  const [settledReferenceBox, settledOutcomesBox] = await Promise.all([reference.boundingBox(), outcomes.boundingBox()]);
  await page.getByRole("slider", { name: "Lock-in adjustment" }).fill("50");
  await expect(reference).toBeVisible();
  await expect(outcomes).toBeVisible();
  await expect(page.getByLabel("Additional back stake: £ 95.82")).toBeVisible();
  const [pendingReferenceBox, pendingOutcomesBox] = await Promise.all([reference.boundingBox(), outcomes.boundingBox()]);
  expect(pendingReferenceBox?.height).toBeCloseTo(settledReferenceBox?.height ?? 0, 0);
  expect(pendingOutcomesBox?.height).toBeCloseTo(settledOutcomesBox?.height ?? 0, 0);
  await expect(page.getByLabel("Additional back stake: £ 48.91")).toBeVisible();
  const [liveReferenceBox, liveOutcomesBox] = await Promise.all([reference.boundingBox(), outcomes.boundingBox()]);
  expect(liveReferenceBox?.x).toBeCloseTo(liveOutcomesBox?.x ?? 0, 0);
  expect(liveReferenceBox?.width).toBeCloseTo(liveOutcomesBox?.width ?? 0, 0);
  await page.locator('[data-pd-id="calculators.early-payout.lock-adjustment-reset"]').click();
  await expect(page.getByRole("slider", { name: "Lock-in adjustment" })).toHaveValue("100");
  await expect(page.getByLabel("Additional back stake: £ 95.82")).toBeVisible();
  await page.getByRole("button", { name: "Copy back stake" }).click();
  await expect(page.getByText("Copied 95.82")).toBeVisible();
  await page.getByRole("button", { name: "Add part back" }).click();
  await page.getByLabel("Part back 1 stake").fill("20");
  await page.getByLabel("Part back 1 odds").fill("1.4");
  await expect(page.getByLabel("Additional back stake: £ 72.48")).toBeVisible();
  if (process.env.CALCULATOR_E2E_SCREENSHOT_PATH) {
    await page.screenshot({ path: process.env.CALCULATOR_E2E_SCREENSHOT_PATH, fullPage: true });
  }

  await page.locator('[data-pd-id="calculators.early-payout.reset"]').click();
  await page.locator('[data-pd-id="calculators.early-cover-mode"]').selectOption("two_way_dutch");
  await page.locator('[data-pd-id="calculators.early-back-stake"]').fill("50");
  await page.locator('[data-pd-id="calculators.early-back-odds"]').fill("2.25");
  await page.locator('[data-pd-id="calculators.early-initial-odds"]').fill("1.8");
  await expect(page.getByLabel("Recommended second bookmaker stake: £ 62.50")).toBeVisible();
  await page.getByRole("switch", { name: "Bookmaker has paid out early" }).click();
  await page.locator('[data-pd-id="calculators.early-in-play-odds"]').fill("1.2");
  await expect(page.getByLabel("Additional back stake: £ 93.75")).toBeVisible();
  await expect(page.getByLabel("Selection wins: Bookmaker 1 £ 62.50; Bookmaker 2 £ (62.50); Bookmaker 3 £ 18.75; total £ 18.75")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator('[data-pd-id="calculators.early-payout.outcomes"] .financial-value').first()).toHaveAttribute("data-money-motion", "none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.locator('[data-pd-id="calculators.early-payout.reset"]').click();
  await expect(page.locator('[data-pd-id="calculators.early-cover-mode"]')).toHaveValue("exchange_lay");
  await expect(page.locator('[data-pd-id="calculators.early-back-stake"]')).toHaveValue("");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await page.locator('[data-pd-id="app-shell.theme-toggle"]').click();
  if (process.env.CALCULATOR_E2E_SCREENSHOT_PATH) {
    await page.screenshot({ path: process.env.CALCULATOR_E2E_SCREENSHOT_PATH.replace(/\.png$/, "-alternate-theme-narrow.png"), fullPage: true });
  }
  expect(businessMutations).toEqual([]);
});

test("matches the signed-off Sportsbook calculator geometry", async ({ page, request }) => {
  test.setTimeout(60_000);
  await mockSession(page);
  const profileId = "profile-demo-001";
  const commissionsResponse = await request.get(`${apiBaseUrl}/profiles/${profileId}/exchange-commissions`);
  expect(commissionsResponse.ok()).toBeTruthy();
  const originalCommission = ((await commissionsResponse.json()) as Array<{ exchange_name: string; commission_rate: string }>)
    .find((row) => row.exchange_name === "Exchange A")?.commission_rate ?? "";
  const commissionUpdate = await request.put(`${apiBaseUrl}/profiles/${profileId}/exchange-commissions`, {
    data: { exchange_name: "Exchange A", commission_rate: "0.02" },
  });
  expect(commissionUpdate.ok()).toBeTruthy();
  const created = await request.post(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`, { data: {
    event_name: "Synthetic calculator parity event",
    offer_text: "Synthetic calculator parity offer",
    bookmaker: "Bookmaker A",
    offer_type: "Bet & Get",
    bet_type: "Single",
    offer_name: "Calculator parity",
    fixture_type: "Football",
    market: "Match Odds",
    status: "Placed",
    result: "Pending",
    back_stake: "10.00",
    back_odds: "3.75",
    match_strategy: "Standard",
    lay_odds_1: "3.80",
    lay_actual: "9.91",
    lay_matched_stake_1: "9.91",
    lay_commission_1: "0.02",
    exchange_name: "Exchange A",
    date_settled: "2026-09-08T12:00",
    user_notes: "",
    manual_override_value: "",
    manual_override_reason: "",
  }});
  expect(created.ok()).toBeTruthy();
  const { sportsbook_bet_id: recordId } = await created.json() as { sportsbook_bet_id: string };

  try {
    await page.goto("/fund-manager/calculators");
    await page.getByLabel("Back stake").fill("10.00");
    await page.getByLabel("Back odds").fill("3.75");
    await page.getByLabel("Lay odds").fill("3.80");
    await expect(page.locator('[data-pd-id="calculators.matched-betting.results"]')).toBeVisible();

    const hub = page.locator('[data-pd-id="calculators.workspace"]');
    const hubGeometry = await hub.evaluate((root) => {
      const pick = (selector: string) => {
        const element = root.querySelector<HTMLElement>(selector);
        if (!element) throw new Error(`Missing hub parity element: ${selector}`);
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return { height: box.height, radius: style.borderRadius, padding: style.padding };
      };
      const labelOffset = (selector: string) => {
        const control = root.querySelector<HTMLElement>(selector)!;
        const label = control.closest("label")?.querySelector<HTMLElement>(":scope > span")!;
        return control.getBoundingClientRect().top - label.getBoundingClientRect().top;
      };
      return {
        field: pick('[data-pd-id="calculators.matched-betting.back-stake"]'),
        fieldLabelOffset: labelOffset('[data-pd-id="calculators.matched-betting.back-stake"]'),
        mode: pick('[data-pd-id="calculators.matched-betting.bet-type"]'),
        panel: pick(".calculator-band-primary"),
        resultHeading: pick(".calculator-result-card-heading"),
        resultButton: pick(".calculator-result-copy"),
      };
    });

    await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets?record=${recordId}`);
    const editor = page.getByRole("dialog", { name: "Edit sportsbook row" });
    await expect(editor).toBeVisible();
    await editor.getByRole("tab", { name: /Matching/ }).click();
    const ledgerGeometry = await editor.evaluate((root) => {
      const pick = (selector: string) => {
        const element = root.querySelector<HTMLElement>(selector);
        if (!element) throw new Error(`Missing ledger parity element: ${selector}`);
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return { height: box.height, radius: style.borderRadius, padding: style.padding };
      };
      const labelOffset = (selector: string) => {
        const control = root.querySelector<HTMLElement>(selector)!;
        const label = control.closest("label")?.querySelector<HTMLElement>(":scope > span")!;
        return control.getBoundingClientRect().top - label.getBoundingClientRect().top;
      };
      return {
        field: pick('[data-guided-field="back_stake"] input'),
        fieldLabelOffset: labelOffset('[data-guided-field="back_stake"] input'),
        mode: pick('[data-pd-id="sportsbook.matching.calculator-mode"] select'),
        panel: pick(".calculator-band-primary"),
        resultHeading: pick(".calculator-result-card-heading"),
        resultButton: pick(".calculator-result-copy"),
      };
    });
    expect(hubGeometry.field).toEqual(ledgerGeometry.field);
    expect(hubGeometry.fieldLabelOffset).toBeCloseTo(ledgerGeometry.fieldLabelOffset, 0);
    expect(hubGeometry.mode).toEqual(ledgerGeometry.mode);
    expect(hubGeometry.resultHeading).toEqual(ledgerGeometry.resultHeading);
    expect(hubGeometry.resultButton).toEqual(ledgerGeometry.resultButton);
    expect(hubGeometry.panel.padding).toBe(ledgerGeometry.panel.padding);
    expect(hubGeometry.panel.radius).toBe(ledgerGeometry.panel.radius);

    await editor.getByRole("tab", { name: /Settlement/ }).click();
    await expect(editor.locator('[data-pd-id="sportsbook.calculator.outcomes"]')).toBeVisible();
    await expect(editor.locator('[data-pd-id="sportsbook.calculator.outcomes"] .calculator-outcome-scenario-row')).toHaveCount(2);
    await editor.getByRole("tab", { name: /Matching/ }).click();

    await editor.getByLabel("Sportsbook lay workflow mode").selectOption("Multilay");
    await expect(editor.getByText("Multi-Lay Calculator")).toBeVisible();
    const readMultiLayGeometry = async (root: import("@playwright/test").Locator) => root.evaluate((element) => {
      const pick = (selector: string) => {
        const target = element.querySelector<HTMLElement>(selector);
        if (!target) throw new Error(`Missing Multi-Lay parity element: ${selector}`);
        const style = getComputedStyle(target);
        return { padding: style.padding, radius: style.borderRadius, background: style.backgroundColor };
      };
      const field = element.querySelector<HTMLElement>(".multi-lay-planner-grid input");
      if (!field) throw new Error("Missing Multi-Lay outcome field");
      return {
        band: pick(".calculator-band-multilay"),
        panel: pick(".calculator-panel-card-multilay"),
        heading: pick(".multi-lay-calculator-title-row"),
        toolbar: pick(".multi-lay-planner-toolbar"),
        grid: pick(".multi-lay-planner-grid"),
        field: { height: field.getBoundingClientRect().height, radius: getComputedStyle(field).borderRadius, padding: getComputedStyle(field).padding },
      };
    });
    const ledgerMultiLayGeometry = await readMultiLayGeometry(editor);
    await page.goto("/fund-manager/calculators?family=multi-lay");
    const standaloneMultiLay = page.locator('[data-pd-id="calculators.multi-lay.presentation"]');
    await expect(standaloneMultiLay.getByText("Multi-Lay Calculator")).toBeVisible();
    expect(await readMultiLayGeometry(standaloneMultiLay)).toEqual(ledgerMultiLayGeometry);
  } finally {
    await request.delete(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets/${recordId}`);
    await request.put(`${apiBaseUrl}/profiles/${profileId}/exchange-commissions`, {
      data: { exchange_name: "Exchange A", commission_rate: originalCommission },
    });
  }
});

test("matches the Extra Places calculator presentation for the same family", async ({ page, request }) => {
  test.setTimeout(60_000);
  await mockSession(page);
  const profileId = "profile-demo-001";
  const accountsResponse = await request.get(`${apiBaseUrl}/profiles/${profileId}/accounts`);
  const accounts = await accountsResponse.json() as Array<{ account: string; bookmaker_id: string; type: string }>;
  const bookmaker = accounts.find((account) => account.type === "Bookie");
  expect(bookmaker).toBeTruthy();
  const accountBase = { counts_in_cash_total: true, channel: "Online", status: "Active", current_balance: "25.00", pending_withdrawal_amount: "", last_balance_update: "", group_name: "Synthetic Group", platform: "Synthetic Platform" };
  let exchange = accounts.find((account) => account.type === "Exchange");
  if (!exchange) {
    const exchangeResponse = await request.post(`${apiBaseUrl}/profiles/${profileId}/accounts`, { data: { ...accountBase, catalogue_id: "EXCHANGE-BETCONNECT", account: "BetConnect", type: "Exchange", commission_rate: "0" } });
    expect(exchangeResponse.ok()).toBeTruthy();
    exchange = await exchangeResponse.json() as { account: string; bookmaker_id: string; type: string };
  }
  const created = await request.post(`${apiBaseUrl}/profiles/${profileId}/each-way-extra-places`, { data: {
    placed_at: "2026-09-08T12:00:00Z",
    runner: "Synthetic family parity runner",
    race: "Synthetic 14:30",
    bookmaker: bookmaker!.account,
    bookmaker_account: bookmaker!.account,
    mode: "Extra Place",
    each_way_stake: "10.00",
    back_odds: "6.00",
    place_term_numerator: "1",
    place_term_denominator: "5",
    bookmaker_places: "5",
    exchange_places: "4",
    win_exchange: exchange!.account,
    win_lay_odds: "2.30",
    win_commission: "0",
    place_exchange: exchange!.account,
    place_lay_odds: "4.50",
    place_commission: "0",
    status: "Placed",
    result: "Pending",
  }});
  expect(created.ok()).toBeTruthy();
  const { each_way_extra_place_id: recordId } = await created.json() as { each_way_extra_place_id: string };

  const readFamilyGeometry = async (root: import("@playwright/test").Locator) => root.evaluate((element) => {
    const pick = (selector: string) => {
      const target = element.querySelector<HTMLElement>(selector);
      if (!target) throw new Error(`Missing Each Way parity element: ${selector}`);
      const style = getComputedStyle(target);
      const box = target.getBoundingClientRect();
      return { height: box.height, padding: style.padding, radius: style.borderRadius };
    };
    const surface = (selector: string) => {
      const target = element.querySelector<HTMLElement>(selector);
      if (!target) throw new Error(`Missing Each Way parity surface: ${selector}`);
      const style = getComputedStyle(target);
      return { padding: style.padding, radius: style.borderRadius, background: style.backgroundColor };
    };
    return {
      headings: Array.from(element.querySelectorAll<HTMLElement>(".calculator-segment > h3, .calculator-result-card-heading > h3")).filter((heading) => heading.getClientRects().length > 0).map((heading) => heading.textContent?.trim()),
      back: surface(".extra-place-back-segment"),
      backField: pick(".extra-place-back-segment input"),
      placeTerms: surface(".extra-place-place-terms"),
      winLay: surface(".extra-place-lay-win"),
      layField: pick(".extra-place-lay-win input"),
      calculated: pick(".extra-place-lay-win .extra-place-calculated-stake"),
      copy: pick(".extra-place-lay-win .extra-place-copy-button"),
      outcome: surface(".extra-place-outcome-matrix"),
      outcomeHeading: pick(".extra-place-outcome-matrix .calculator-result-card-heading"),
      outcomeRow: pick(".extra-place-outcome-row"),
      outcomeValues: Array.from(element.querySelector<HTMLElement>(".extra-place-outcome-matrix")!.querySelectorAll<HTMLElement>(".calculator-outcome-scenario-row")).map((row) => row.getAttribute("aria-label")),
    };
  });

  try {
    await page.goto("/fund-manager/calculators?family=each-way");
    await page.getByRole("button", { name: "Extra Place", exact: true }).click();
    await page.getByLabel("E/W Stake (each way)").fill("10.00");
    await page.getByLabel("Back odds").fill("6.00");
    await page.locator('[data-pd-id="calculators.each-way-win-lay-odds"]').fill("2.30");
    await page.locator('[data-pd-id="calculators.each-way-place-lay-odds"]').fill("4.50");
    await expect(page.locator('[data-pd-id="calculators.each-way.outcomes"]')).toContainText("Extra Place");
    await expect.poll(() => page.locator('[data-pd-id="calculators.each-way.outcomes"] .calculator-outcome-scenario-row').first().getAttribute("aria-label")).toContain("£ 10.54");
    const standalone = page.locator('[data-pd-id="calculators.each-way.presentation"]');
    const standaloneGeometry = await readFamilyGeometry(standalone);
    if (process.env.CALCULATOR_E2E_SCREENSHOT_PATH) {
      await standalone.screenshot({ path: process.env.CALCULATOR_E2E_SCREENSHOT_PATH.replace(/\.png$/, "-standalone-extra-place.png") });
    }

    await page.goto(`/profiles/${profileId}/tracker/each-way-extra-places`);
    await page.getByText("Synthetic family parity runner", { exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Edit Extra Place row" });
    await expect(editor).toBeVisible();
    const ledgerGeometry = await readFamilyGeometry(editor);
    if (process.env.CALCULATOR_E2E_SCREENSHOT_PATH) {
      await editor.screenshot({ path: process.env.CALCULATOR_E2E_SCREENSHOT_PATH.replace(/\.png$/, "-ledger-extra-place.png") });
    }

    expect(standaloneGeometry).toEqual(ledgerGeometry);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(editor.locator(".financial-value").first()).toHaveAttribute("data-money-motion", "none");
  } finally {
    await request.delete(`${apiBaseUrl}/profiles/${profileId}/each-way-extra-places/${recordId}`, {
      data: { deletion_reason: "Synthetic calculator family parity cleanup" },
    });
  }
});

test("redirects the retired Profile calculator URL safely", async ({ page }) => {
  await mockSession(page);
  await page.goto("/profiles/profile-demo-001/tracker/calculators");
  await expect(page).toHaveURL(/\/fund-manager\/calculators/);
});
