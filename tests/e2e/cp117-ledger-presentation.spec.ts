import { expect, test } from "@playwright/test";

const profile = "profile-demo-001";
const modules = ["accounts", "sportsbook-bets", "free-bets", "casino-offers", "each-way-extra-places", "cash-adjustments"];

test.beforeEach(async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  expect(health.database_identity).toBe("cp117-integration-synthetic");
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/");
  await page.request.put("/api/fund-manager/preferences/selected-range", { data: { selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null } });
});

test("all owned and combined ledgers exclude the tracked banner before loading", async ({ page }) => {
  test.setTimeout(180_000);
  await page.route("**/api/task-annotations**", async route => { await new Promise(resolve => setTimeout(resolve, 800)); await route.continue(); });
  for (const module of modules) for (const combined of [false, true]) {
    await page.goto(combined ? `/tracker/${module}` : `/profiles/${profile}/tracker/${module}`);
    await expect(page.locator('[data-pd-id^="v2.active-task"]')).toHaveCount(0);
    await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
    await expect(page.locator('[data-pd-id^="v2.active-task"]')).toHaveCount(0);
  }
  await page.goto(`/profiles/${profile}/tracker/sportsbook-bets?record=CP117-CELL-001`);
  await expect(page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]')).toBeVisible({ timeout: 45_000 });
  await expect(page.locator('[data-pd-id^="v2.active-task"]')).toHaveCount(0);
});

test("ledger frame uses balanced small gutters and flat review popouts", async ({ page }) => {
  test.setTimeout(90_000);
  for (const [width, height, theme] of [[2048, 1152, "dark"], [1440, 900, "light"], [390, 844, "dark"]] as const) {
    await page.setViewportSize({ width, height });
    await page.addInitScript(value => localStorage.setItem("openforge-theme", value), theme);
    await page.goto(`/profiles/${profile}/tracker/sportsbook-bets`);
    await expect(page.locator('[data-pd-id="sportsbook.design-screen"]')).toBeVisible({ timeout: 45_000 });
    await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
    const geometry = await page.evaluate(() => {
      const main = document.querySelector(".ux-v2-main")!.getBoundingClientRect();
      const card = document.querySelector('[data-pd-id="sportsbook.design-screen"]')!.getBoundingClientRect();
      return { left: card.left - main.left, right: main.right - card.right, overflow: document.documentElement.scrollWidth - innerWidth };
    });
    expect(Math.abs(geometry.left - geometry.right)).toBeLessThanOrEqual(1);
    expect(geometry.left).toBeLessThanOrEqual(width <= 390 ? 17 : 25);
    expect(geometry.left).toBeGreaterThanOrEqual(15);
    expect(geometry.overflow).toBeLessThanOrEqual(0);
    if (width === 2048) {
      await page.getByRole("button", { name: "Collapse navigation" }).click();
      const collapsed = await page.evaluate(() => {
        const main = document.querySelector(".ux-v2-main")!.getBoundingClientRect();
        const card = document.querySelector('[data-pd-id="sportsbook.design-screen"]')!.getBoundingClientRect();
        return { left: card.left - main.left, right: main.right - card.right };
      });
      expect(Math.abs(collapsed.left - collapsed.right)).toBeLessThanOrEqual(1);
      expect(collapsed.left).toBeLessThanOrEqual(25);
    }
    const cell = page.locator('[data-pd-id="sportsbook.table-scroll"] td[data-ledger-column="displayed_value"][data-ledger-row]').first();
    await cell.dblclick();
    const review = page.locator('[data-pd-id="sportsbook.protected-cell"]');
    await expect(review).toBeVisible();
    expect(await review.evaluate(element => getComputedStyle(element).boxShadow)).toBe("none");
    const action = review.getByRole("button", { name: "Open record for review" });
    await action.hover();
    expect(await action.evaluate(element => ({ shadow: getComputedStyle(element).boxShadow, filter: getComputedStyle(element).filter, before: getComputedStyle(element, "::before").boxShadow, after: getComputedStyle(element, "::after").boxShadow }))).toEqual({ shadow: "none", filter: "none", before: "none", after: "none" });
    const buttonBox = await action.boundingBox();
    expect(buttonBox).not.toBeNull();
    await page.mouse.move(buttonBox!.x + buttonBox!.width / 2, buttonBox!.y + buttonBox!.height / 2);
    await page.mouse.down();
    expect(await action.evaluate(element => getComputedStyle(element).boxShadow)).toBe("none");
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await action.focus();
    await action.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(action).toBeFocused();
    expect(await action.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe("none");
    await action.press("Escape");
    await page.locator('[data-pd-id="sportsbook.toolbar.status-filter"]').click();
    const options = page.getByRole("listbox", { name: "Status Filter options" });
    await expect(options).toBeVisible();
    expect(await options.evaluate(element => getComputedStyle(element).boxShadow)).toBe("none");
    await page.keyboard.press("Escape");
  }
});

test("the separate operations preview and grouped Offer editor keep flat, contained controls", async ({ page }) => {
  const id = `PD-FIX-670-PRESENTATION-${Date.now()}`;
  const created = await page.request.post(`/api/profiles/${profile}/sportsbook-bets`, { data: {
    sportsbook_bet_id: id, event_name: "Synthetic Offer display", offer_text: "Grouped editor display",
    offer_name: "Fixture review", bookmaker: "Bookmaker A", offer_type: "Bet & Get", bet_type: "Single",
    fixture_type: "Football", market: "Match Odds", status: "Prospecting", result: "Pending",
    back_stake: "10.00", back_odds: "2.00", match_strategy: "Standard", lay_odds_1: "2.00",
  } });
  expect(created.status(), await created.text()).toBe(201);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/design-lab/sportsbook-proposals?amendment=operations");
  const cell = page.getByRole("button", { name: "Review protected bookmaker cell" });
  await cell.dblclick();
  const preview = page.locator('[data-pd-id="lab.proposal.protected-cell"]');
  await expect(preview).toBeVisible();
  expect(await preview.evaluate(element => getComputedStyle(element).boxShadow)).toBe("none");
  await page.goto(`/tracker/sportsbook-bets?q=${id}`);
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
  await page.locator('[data-pd-id="combined.sportsbook-bets.table-scroll"] td[data-ledger-column="offer_details"][data-ledger-row]').first().dblclick();
  const editor = page.locator('[data-pd-id="ledger.floating-editor"]');
  await expect(editor.getByRole("combobox", { name: /Offer Type/ })).toBeVisible();
  await expect(editor.getByRole("combobox", { name: /Bet Type/ })).toBeVisible();
  await expect(editor.getByRole("combobox", { name: /Fixture Type/ })).toBeVisible();
  await expect(editor.getByRole("button", { name: "Apply offer details" })).toBeVisible();
  const box = await editor.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  expect(await editor.evaluate(element => getComputedStyle(element).boxShadow)).toBe("none");
  await editor.getByRole("combobox", { name: /Offer Type/ }).press("Escape");
  await page.goto(`/profiles/${profile}/tracker/sportsbook-bets?q=${id}`);
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
  await page.locator('[data-pd-id="sportsbook.table-scroll"] td[data-ledger-column="offer_details"][data-ledger-row]').first().dblclick();
  const ownedEditor = page.locator('[data-pd-id="ledger.floating-editor"]');
  await expect(ownedEditor.getByRole("button", { name: "Apply offer details" })).toBeVisible();
  const ownedBox = await ownedEditor.boundingBox();
  expect(ownedBox).not.toBeNull();
  expect(ownedBox!.x).toBeGreaterThanOrEqual(0);
  expect(ownedBox!.x + ownedBox!.width).toBeLessThanOrEqual(390);
});
