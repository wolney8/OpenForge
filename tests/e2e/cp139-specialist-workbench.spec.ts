import { expect, test } from "@playwright/test";

const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";
const cases = [
  { route: "sportsbook-bets", id: "sportsbook", add: "sportsbook.toolbar.add-row", record: "SB-SEED-001", column: "event_name", editName: "Edit sportsbook row" },
  { route: "free-bets", id: "free-bets", add: "free-bets.toolbar.add-row", record: "FB-SEED-001", column: "event_name", editName: "Edit free-bet row" },
  { route: "casino-offers", id: "casino-offers", add: "casino-offers.toolbar.add-row", record: "CO-SEED-001", column: "game", editName: "Edit casino row" },
] as const;

test.use({ video: "on", trace: "retain-on-failure", screenshot: "only-on-failure" });

for (const item of cases) for (const [width, theme] of [[1440, "light"], [390, "dark"]] as const) {
  test(`${item.id} native workbench uses the Lab columns at ${width}px ${theme}`, async ({ page }, info) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(selectedTheme => {
      localStorage.setItem("pd-required-storage-notice", "acknowledged");
      localStorage.setItem("openforge-theme", selectedTheme);
    }, theme);
    await page.goto(authURL);
    await page.goto(`/profiles/profile-demo-001/tracker/${item.route}`);
    await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
    await page.locator(`[data-pd-id="${item.add}"]`).click();
    const dialog = page.locator(`[data-pd-id="${item.id}.editor.dialog"]`);
    await expect(dialog).toBeVisible();
    const columns = dialog.locator(`[data-pd-id="${item.id}.editor.workbench"]`);
    const form = columns.locator("form");
    const aside = columns.locator(`[data-pd-id="${item.id}.editor.financial-context"]`);
    await expect(form).toBeVisible();
    await expect(aside).toBeVisible();
    await expect(aside.locator("dt")).toContainText(["Bookmaker"]);
    const boxes = await Promise.all([form.boundingBox(), aside.boundingBox(), dialog.boundingBox()]);
    expect(boxes.every(Boolean)).toBe(true);
    if (width === 1440) {
      expect(boxes[1]!.x).toBeGreaterThan(boxes[0]!.x + boxes[0]!.width - 2);
      expect(boxes[2]!.width).toBeLessThanOrEqual(1181);
    }
    else expect(boxes[1]!.y).toBeGreaterThan(boxes[0]!.y + boxes[0]!.height - 2);
    expect(boxes[2]!.x).toBeGreaterThanOrEqual(0);
    expect(boxes[2]!.x + boxes[2]!.width).toBeLessThanOrEqual(width + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath(`${item.id}-add-${width}-${theme}.png`) });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });
}

for (const item of cases) {
  test(`${item.id} populated editor retains governed stages and source context`, async ({ page }, info) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 900, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem("pd-required-storage-notice", "acknowledged");
      localStorage.setItem("openforge-theme", "dark");
    });
    await page.goto(authURL);
    await page.goto(`/profiles/profile-demo-001/tracker/${item.route}`);
    await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
    const range = page.locator('[data-pd-id="tracker.range-card.select"]');
    if (await range.isVisible()) {
      await range.click();
      await page.getByRole("option", { name: "All Dates", exact: true }).click();
    }
    await page.locator(`td[data-ledger-row="${item.record}"][data-ledger-column="${item.column}"]`).dblclick();
    const dialog = page.getByRole("dialog", { name: item.editName, exact: true });
    await expect(dialog).toBeVisible();
    const context = dialog.locator(`[data-pd-id="${item.id}.editor.financial-context"]`);
    await expect(context).toBeVisible();
    await expect(context).toContainText("Bookmaker");
    await expect(context).toContainText("Status");
    const stages = dialog.locator('[data-pd-id="ledger-editor.tabs"]');
    await expect(stages).toHaveClass(/stages/);
    await expect(dialog.getByRole("tab").first()).toHaveAttribute("aria-current", "step");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath(`${item.id}-populated-900-dark.png`) });
    if (item.id !== "casino-offers") {
      await dialog.getByRole("tab", { name: /Matching/i }).click();
      await expect(dialog.locator('[data-pd-id="ledger-editor.panel.matching"]')).toBeVisible();
      await page.screenshot({ path: info.outputPath(`${item.id}-matching-900-dark.png`) });
    }
    await dialog.getByRole("tab", { name: /Settlement/i }).click();
    await expect(dialog.locator('[data-pd-id="ledger-editor.panel.settlement"]')).toBeVisible();
    await expect(dialog.getByRole("tab", { name: /Settlement/i })).toHaveAttribute("aria-current", "step");
    const guide = dialog.locator(`[data-pd-id="${item.id}.guided-entry"]`);
    if (await guide.isVisible()) {
      expect((await guide.boundingBox())!.height).toBeGreaterThanOrEqual(70);
    }
    const outcome = dialog.locator(`[data-pd-id="${item.id === "sportsbook" ? "sportsbook.settlement.outcomes" : item.id + ".editor.settlement-outcomes"}"]`);
    if (await outcome.isVisible()) {
      await expect(outcome).toHaveAttribute("data-pd-financial-card", "true");
      expect(await outcome.evaluate(element => getComputedStyle(element).backgroundImage)).toBe("none");
    }
    await page.screenshot({ path: info.outputPath(`${item.id}-settlement-900-dark.png`) });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });
}

test("Casino governed offer types expose their own conditional stages", async ({ page }, info) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 900, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem("pd-required-storage-notice", "acknowledged");
    localStorage.setItem("openforge-theme", "light");
  });
  await page.goto(authURL);
  await page.goto("/profiles/profile-demo-001/tracker/casino-offers");
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
  await page.locator('[data-pd-id="casino-offers.toolbar.add-row"]').click();
  const dialog = page.getByRole("dialog", { name: "Create casino row" });
  await expect(dialog).toBeVisible();
  for (const offer of [
    { value: "Free Spins", campaign: false, slug: "free-spins" },
    { value: "Fixed Spins Or Free Play", campaign: false, slug: "fixed-spins" },
    { value: "Wager To Earn Reward", campaign: true, slug: "wager-reward" },
    { value: "Deposit And Bonus Wagering", campaign: true, slug: "deposit-bonus" },
  ]) {
    await dialog.getByLabel("Offer type").selectOption(offer.value);
    await expect(dialog.getByRole("tab", { name: /Reward/i })).toHaveCount(1);
    await expect(dialog.locator('[data-pd-id="ledger-editor.tab.campaign"]')).toHaveCount(offer.campaign ? 1 : 0);
    await expect(dialog.getByRole("tab", { name: /Settlement/i })).toHaveCount(1);
    await page.screenshot({ path: info.outputPath(`casino-${offer.slug}-900-light.png`) });
  }
  await page.keyboard.press("Escape");
  const discard = page.getByRole("dialog", { name: "Unsaved tracker changes" });
  await expect(discard).toBeVisible();
  await discard.getByRole("button", { name: "Discard changes" }).click();
  await expect(dialog).toHaveCount(0);
});

for (const item of [
  { ...cases[1], labNav: "freeBets", labWorkbench: "lab.cp116.free-bet-workbench" },
  { ...cases[2], labNav: "casino", labWorkbench: "lab.cp116.casino-workbench" },
]) {
  test(`${item.id} Lab and native Add workbench share the approved composition`, async ({ page }, info) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem("pd-required-storage-notice", "acknowledged");
      localStorage.setItem("openforge-theme", "light");
    });
    await page.goto(authURL);
    await page.goto("/design-lab");
    await page.locator(`[data-pd-id="lab.nav.${item.labNav}"]`).click();
    await page.locator(`[data-pd-id="lab.concept-add.${item.labNav}"]`).click();
    const lab = page.locator(`[data-pd-id="${item.labWorkbench}"]`);
    await expect(lab).toBeVisible();
    const labGrid = lab.locator("div[class*='columns']").first();
    const labGridClass = await labGrid.getAttribute("class");
    await page.screenshot({ path: info.outputPath(`${item.id}-lab-add-1440-light.png`) });

    await page.goto(`/profiles/profile-demo-001/tracker/${item.route}`);
    await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
    await page.locator(`[data-pd-id="${item.add}"]`).click();
    const dialog = page.locator(`[data-pd-id="${item.id}.editor.dialog"]`);
    const realGrid = dialog.locator(`[data-pd-id="${item.id}.editor.workbench"]`);
    await expect(realGrid).toBeVisible();
    expect(await realGrid.getAttribute("class")).toBe(labGridClass);
    await expect(dialog.locator(`[data-pd-id="${item.id}.editor.financial-context"]`)).toBeVisible();
    await page.screenshot({ path: info.outputPath(`${item.id}-native-add-1440-light.png`) });
  });
}

for (const item of cases) {
  test(`${item.id} native Add, Save, reopen and Edit keep the source record`, async ({ page }) => {
    test.setTimeout(120_000);
    const sourceName = `Synthetic CP139 ${item.id} ${Date.now()}`;
    const changedName = `${sourceName} revised`;
    await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
    await page.goto(authURL);
    const range = await page.request.put("/api/fund-manager/preferences/selected-range", { data: {
      selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null,
    } });
    expect(range.status()).toBe(200);
    await page.goto(`/profiles/profile-demo-001/tracker/${item.route}`);
    await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
    await page.locator(`[data-pd-id="${item.add}"]`).click();
    const dialog = page.getByRole("dialog", { name: `Create ${item.id === "sportsbook" ? "sportsbook" : item.id === "free-bets" ? "free-bet" : "casino"} row` });
    await expect(dialog).toBeVisible();
    if (item.id === "sportsbook") {
      await dialog.getByLabel("Offer", { exact: true }).fill("Synthetic offer");
      await dialog.locator('[data-guided-field="bookmaker"] select').selectOption("Bookmaker A");
      await dialog.getByLabel("Bet type (bet shape / placement)").selectOption({ label: "Single" });
      await dialog.getByLabel("Offer type").selectOption({ label: "Bet & Get" });
      await dialog.locator("label", { hasText: /^Fixture type/i }).locator("select").selectOption({ label: "Football" });
      await dialog.getByLabel("Event name").fill(sourceName);
      await dialog.getByRole("tab", { name: /Matching/ }).click();
      const plan = dialog.locator('[data-pd-id="sportsbook.matching.core-planner"]');
      await expect(plan).toBeVisible();
      await plan.getByLabel("Back stake").fill("10.00");
      await plan.getByLabel("Back odds").fill("2.10");
      await plan.getByLabel("Lay odds", { exact: true }).fill("2.20");
      await plan.getByRole("combobox", { name: "Exchange", exact: true }).selectOption({ index: 1 });
      await plan.getByLabel("Planning exchange commission (%)").fill("2");
      await expect(plan).toHaveAttribute("data-plan-reviewed", "true", { timeout: 20_000 });
    } else if (item.id === "free-bets") {
      await dialog.getByLabel("Bookmaker").selectOption("Bookmaker A");
      await dialog.getByLabel("Offer type").selectOption("Bet & Get");
      await dialog.getByLabel("Event name").fill(sourceName);
      await dialog.getByRole("tab", { name: /Matching/ }).click();
      const plan = dialog.locator('[data-pd-id="free-bets.matching.core-planner"]');
      await expect(plan).toBeVisible();
      await plan.getByLabel("Free bet value").fill("10.00");
      await plan.getByLabel("Back odds").fill("2.10");
      await plan.getByLabel("Lay odds", { exact: true }).fill("2.20");
      await plan.getByRole("combobox", { name: "Exchange", exact: true }).selectOption({ index: 1 });
      await plan.getByLabel("Planning exchange commission (%)").fill("2");
      await expect(plan).toHaveAttribute("data-plan-reviewed", "true", { timeout: 20_000 });
    } else {
      await dialog.getByRole("button", { name: "Set casino start date to now" }).click();
      await dialog.getByLabel("Bookmaker").selectOption("Bookmaker A");
      await dialog.getByLabel("Offer name").fill(sourceName);
      await dialog.getByLabel("Offer type").selectOption("Free Spins");
    }
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(dialog).toHaveCount(0, { timeout: 30_000 });
    const idKey = item.id === "sportsbook" ? "sportsbook_bet_id" : item.id === "free-bets" ? "free_bet_id" : "casino_offer_id";
    const nameKey = item.id === "casino-offers" ? "offer_name" : "event_name";
    const rowsResponse = await page.request.get(`/api/profiles/profile-demo-001/${item.route}`);
    expect(rowsResponse.status()).toBe(200);
    const saved = (await rowsResponse.json() as Array<Record<string, string>>).find(row => row[nameKey] === sourceName);
    expect(saved).toBeTruthy();
    const recordId = saved![idKey];
    await page.reload();
    await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
    await page.locator(`[data-pd-id="${item.id}.toolbar.search"]`).fill(sourceName);
    const rowCell = page.locator(`td[data-ledger-row="${recordId}"][data-ledger-column="${item.column}"]`);
    await expect(rowCell).toBeVisible();
    await rowCell.click();
    await page.keyboard.press("F2");
    const floating = page.locator('[data-pd-id="ledger.floating-editor"]');
    await expect(floating).toBeVisible();
    await floating.getByRole("button", { name: "Open full editor" }).click();
    const edit = page.getByRole("dialog", { name: item.editName, exact: true });
    await expect(edit).toBeVisible();
    const input = edit.getByLabel(item.id === "casino-offers" ? "Offer name" : "Event name", { exact: true });
    await expect(input).toHaveValue(sourceName);
    await input.fill(changedName);
    await edit.getByRole("button", { name: "Save", exact: true }).click();
    await expect(edit).toHaveCount(0, { timeout: 30_000 });
    const reloaded = await page.request.get(`/api/profiles/profile-demo-001/${item.route}/${recordId}`);
    expect(reloaded.status()).toBe(200);
    expect((await reloaded.json() as Record<string, string>)[nameKey]).toBe(changedName);
    const removed = await page.request.delete(`/api/profiles/profile-demo-001/${item.route}/${recordId}`);
    expect(removed.ok(), await removed.text()).toBe(true);
  });
}
