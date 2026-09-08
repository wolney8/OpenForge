import { expect, test } from "@playwright/test";

const webBaseUrl = process.env.OPENFORGE_E2E_BASE_URL ?? "http://127.0.0.1:3010";
const apiBaseUrl = process.env.OPENFORGE_E2E_API_BASE_URL ?? "http://127.0.0.1:8010";

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
  if (await page.locator("html").getAttribute("data-theme") === "dark") {
    await page.locator('[data-pd-id="app-shell.theme-toggle"]').click();
  }
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator('[data-pd-id="calculators.workspace"]').getByText("Fund Manager", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Calculators" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "STANDARD Calculator" })).toBeVisible();
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
  await page.getByRole("button", { name: "Calculate" }).click();
  await expect(page.locator('[data-pd-id="calculators.matched-betting.results"]')).toBeVisible();
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
  await expect(rail.getByRole("button", { name: "STANDARD Calculator" })).toBeVisible();
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
  await rail.getByRole("button", { name: "STANDARD Calculator" }).focus();
  await page.keyboard.press("Tab");
  await expect(rail.getByRole("button", { name: "Multi-Lay" })).toBeFocused();
  await next.click();
  expect(await familyPage.locator("button").count()).toBe(3);
  await expect(rail.getByRole("button", { name: /Sequential Lay/ })).toBeVisible();
  await next.click();
  await expect(next).toBeDisabled();
  await more.click();
  await expect(page.locator("#calculator-family-menu").getByRole("menuitem", { name: "STANDARD Calculator" })).toBeVisible();
  await page.getByRole("menuitem", { name: "STANDARD Calculator" }).click();

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
    await page.getByRole("button", { name: "Calculate" }).click();
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
  } finally {
    await request.delete(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets/${recordId}`);
    await request.put(`${apiBaseUrl}/profiles/${profileId}/exchange-commissions`, {
      data: { exchange_name: "Exchange A", commission_rate: originalCommission },
    });
  }
});

test("redirects the retired Profile calculator URL safely", async ({ page }) => {
  await mockSession(page);
  await page.goto("/profiles/profile-demo-001/tracker/calculators");
  await expect(page).toHaveURL(/\/fund-manager\/calculators/);
});
