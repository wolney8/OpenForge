import { expect, test } from "@playwright/test";

const webBaseUrl = process.env.OPENFORGE_E2E_BASE_URL ?? "http://127.0.0.1:3010";

async function mockSession(page: import("@playwright/test").Page) {
  await page.context().route("**/auth/session", (route) => route.fulfill({ json: {
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
  const switchToLight = page.getByRole("button", { name: "Switch to light mode" });
  if (await switchToLight.isVisible()) await switchToLight.click();
  await expect(page.locator('[data-pd-id="calculators.workspace"]').getByText("Fund Manager", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Calculators" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Matched Betting" })).toBeVisible();

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
  await page.getByRole("button", { name: "Calculate" }).click();
  await expect(page.locator('[data-pd-id="calculators.matched-betting.results"]')).toBeVisible();
  await page.getByRole("button", { name: "Copy Lay Stake" }).click();
  await expect(page.getByText(/^Copied /)).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator('[data-pd-id="calculators.matched-betting.results"] .financial-value').first()).toHaveAttribute("data-money-motion", "none");
  await page.emulateMedia({ reducedMotion: "no-preference" });

  await page.getByLabel("Bet type").selectOption("free_bet");
  await page.locator('[data-pd-id="calculators.matched-betting.free-bet-mode"]').selectOption("SR");
  await page.getByRole("button", { name: "Calculate" }).click();
  await expect(page.locator('[data-pd-id="calculators.matched-betting.results"]')).toBeVisible();
  await page.getByLabel("Bet type").selectOption("money_back");
  await page.getByLabel("Maximum refund").fill("10.00");
  await page.getByRole("button", { name: "Calculate" }).click();
  await expect(page.getByText("If refund triggers")).toBeVisible();

  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Open in new tab" }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  await expect(popup.getByLabel("Back stake")).toHaveValue("10.00");
  await expect(popup.getByLabel("Bet type")).toHaveValue("money_back");
  await popup.close();

  await page.getByLabel("Back odds").fill("1,000");
  await expect(page.getByRole("button", { name: "Calculate" })).toBeDisabled();
  if (process.env.CALCULATOR_E2E_SCREENSHOT_PATH) {
    await page.screenshot({ path: process.env.CALCULATOR_E2E_SCREENSHOT_PATH.replace(/\.png$/, "-light-desktop.png"), fullPage: true });
  }
  const themeBeforeSwitch = await page.locator("html").getAttribute("data-theme");
  await page.locator('[data-pd-id="app-shell.theme-toggle"]').click();
  await expect.poll(() => page.locator("html").getAttribute("data-theme")).not.toBe(themeBeforeSwitch);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await page.getByLabel("Back odds").focus();
  await expect(page.getByLabel("Back odds")).toBeFocused();
  if (process.env.CALCULATOR_E2E_SCREENSHOT_PATH) {
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

  const rail = page.locator('[data-pd-id="quick-select.rail"]');
  await expect(rail.getByRole("button", { name: /Matched Betting/ })).toBeVisible();
  expect(await rail.locator(".quick-select-rail-page button").count()).toBe(3);
  expect(await rail.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  expect(await rail.locator(".quick-select-rail-page").evaluate((element) => getComputedStyle(element).overflowX)).toBe("visible");
  await rail.getByRole("button", { name: "Matched Betting" }).focus();
  await page.keyboard.press("Tab");
  await expect(rail.getByRole("button", { name: "Multi-Lay" })).toBeFocused();
  await rail.getByRole("button", { name: /Show next Calculator families/ }).click();
  expect(await rail.locator(".quick-select-rail-page button").count()).toBe(3);
  await expect(rail.getByRole("button", { name: /Sequential Lay/ })).toBeVisible();
  await rail.getByRole("button", { name: /Show next Calculator families/ }).click();
  await expect(rail.getByRole("button", { name: /Show next Calculator families/ })).toBeDisabled();
  await rail.getByRole("button", { name: /Show previous Calculator families/ }).click();
  await rail.getByRole("button", { name: /Show previous Calculator families/ }).click();

  await rail.getByRole("button", { name: "Multi-Lay" }).click();
  await page.getByLabel("Back stake").fill("10.00");
  await page.getByLabel("Back odds").fill("11/4");
  await page.locator('[data-pd-id="calculators.multi-outcome-1-odds"]').fill("5,9");
  await page.locator('[data-pd-id="calculators.multi-outcome-2-odds"]').fill("4.9");
  await page.getByLabel("Exchange commission").focus();
  await expect(page.getByLabel("Back odds")).toHaveValue("3.75");
  await expect(page.locator('[data-pd-id="calculators.multi-outcome-1-odds"]')).toHaveValue("5.9");
  await page.getByRole("button", { name: "Calculate Multi-Lay" }).click();
  await expect(page.getByText("Multi-Lay reference")).toBeVisible();
  await page.getByRole("button", { name: "Copy stake" }).first().click();
  await expect(page.getByText(/^Copied /)).toBeVisible();

  await rail.getByRole("button", { name: "Each Way" }).click();
  await page.getByLabel("E/W stake per leg").fill("10");
  await page.getByLabel("Back odds").fill("6");
  await page.getByLabel("Win lay odds").fill("2.3");
  await page.getByLabel("Place lay odds").fill("4.5");
  await page.getByRole("button", { name: "Calculate Each Way" }).click();
  await expect(page.getByText("Each Way reference")).toBeVisible();
  await page.locator('[data-pd-id="calculators.each-way-mode"]').selectOption("Extra Place");
  await expect(page.getByText("Each Way reference")).toHaveCount(0);
  await page.getByRole("button", { name: "Calculate Extra Place" }).click();
  await expect(page.getByText("Extra Place reference")).toBeVisible();
  await page.getByRole("button", { name: "Copy win stake" }).click();
  await expect(page.getByText(/^Copied /)).toBeVisible();

  const inputHeights = await Promise.all(["E/W stake per leg", "Back odds", "Win lay odds", "Place lay odds"].map((label) => page.getByLabel(label).boundingBox()));
  expect(new Set(inputHeights.map((box) => Math.round(box?.height ?? 0))).size).toBe(1);
  expect(inputHeights[0]!.y).toBeCloseTo(inputHeights[1]!.y, 0);
  expect(inputHeights[2]!.y).toBeCloseTo(inputHeights[3]!.y, 0);
  const beforeTheme = await page.locator("html").getAttribute("data-theme");
  await page.locator('[data-pd-id="app-shell.theme-toggle"]').click();
  await expect.poll(() => page.locator("html").getAttribute("data-theme")).not.toBe(beforeTheme);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await page.evaluate(() => { document.documentElement.style.fontSize = "20px"; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await page.locator('[data-pd-id="calculators.each-way-mode"]').focus();
  await expect(page.locator('[data-pd-id="calculators.each-way-mode"]')).toBeFocused();
  if (process.env.CALCULATOR_E2E_SCREENSHOT_PATH) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: process.env.CALCULATOR_E2E_SCREENSHOT_PATH.replace(/\.png$/, "-each-way.png"), fullPage: true });
  }
  expect(businessMutations).toEqual([]);
});

test("redirects the retired Profile calculator URL safely", async ({ page }) => {
  await mockSession(page);
  await page.goto("/profiles/profile-demo-001/tracker/calculators");
  await expect(page).toHaveURL(/\/fund-manager\/calculators/);
});
