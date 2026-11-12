import { expect, test, chromium } from "@playwright/test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";
const cases = [
  { route: "sportsbook-bets", id: "sportsbook", add: "sportsbook.toolbar.add-row", record: "SB-SEED-001", column: "event_name", editName: "Edit sportsbook row" },
  { route: "free-bets", id: "free-bets", add: "free-bets.toolbar.add-row", record: "FB-SEED-001", column: "event_name", editName: "Edit free-bet row" },
  { route: "casino-offers", id: "casino-offers", add: "casino-offers.toolbar.add-row", record: "CO-SEED-001", column: "game", editName: "Edit casino row" },
] as const;

test.use({ video: "on", trace: "retain-on-failure", screenshot: "only-on-failure" });

for (const item of cases) for (const [width, theme] of [[1440, "light"], [900, "light"], [390, "light"], [390, "dark"]] as const) {
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
    const header = dialog.locator(`[data-pd-id="${item.id}.editor.header"]`);
    const footer = dialog.locator(`[data-pd-id="${item.id}.editor.actions"]`);
    await expect(form).toBeVisible();
    await expect(aside).toBeVisible();
    await expect(header.locator('[data-pd-financial-header="true"]')).toBeVisible();
    await expect(header.locator('[data-pd-financial-header="true"] button')).toHaveCSS("width", "44px");
    await expect(form.locator(".editor-section-summary").first()).toHaveCSS("text-transform", "none");
    await expect(form.locator(".editor-section-summary").first().locator("span").first()).toHaveCSS("font-size", "19.2px");
    await expect(form.locator(".field-control > input, .field-control > select").first()).toHaveCSS("border-radius", "9px");
    await expect(footer).toBeVisible();
    const footerRect = await footer.boundingBox();
    const bodyRect = await dialog.locator(".workflow-editor-body").boundingBox();
    expect(footerRect!.x).toBeGreaterThanOrEqual(bodyRect!.x - 2);
    expect(footerRect!.x + footerRect!.width).toBeLessThanOrEqual(bodyRect!.x + bodyRect!.width + 2);
    if (item.id === "sportsbook") {
      const accountAction = dialog.locator('[data-pd-id="account.review.open"]');
      await expect(accountAction).toBeVisible();
      expect((await accountAction.boundingBox())!.height).toBeLessThanOrEqual(50);
    }
    await expect(aside.locator("dt")).toContainText(["Bookmaker"]);
    const boxes = await Promise.all([form.boundingBox(), aside.boundingBox(), dialog.boundingBox()]);
    expect(boxes.every(Boolean)).toBe(true);
    if (width >= 900) {
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
    if (item.id === "sportsbook") {
      await page.locator(`td[data-ledger-row="${item.record}"][data-ledger-column="${item.column}"]`).click();
      await page.locator('[data-pd-id="sportsbook.toolbar.open-selected"]').click();
    } else {
      await page.locator(`td[data-ledger-row="${item.record}"][data-ledger-column="${item.column}"]`).click();
      await page.locator(`[data-pd-id="${item.id}.toolbar.open-selected"]`).click();
    }
    const dialog = page.getByRole("dialog", { name: item.editName, exact: true });
    await expect(dialog).toBeVisible();
    const context = dialog.locator(`[data-pd-id="${item.id}.editor.financial-context"]`);
    await expect(context).toBeVisible();
    await expect(context).toContainText("Bookmaker");
    await expect(context).toContainText("Status");
    const stages = dialog.locator('[data-pd-id="ledger-editor.tabs"]');
    await expect(stages).toHaveClass(/stages/);
    await expect(dialog.locator('[role="tab"][aria-current="step"]')).toHaveCount(1);
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
    const lockId = item.id === "casino-offers" ? "casino-offers.editor.settlement.edit-settled-row" : `${item.id}.editor.edit-settled-row`;
    await dialog.locator(`[data-pd-id="${lockId}"]:visible`).first().click({ timeout: 5_000 });
    await expect(dialog.locator(`[data-pd-id="${item.id === "casino-offers" ? "casino-offers.editor.settlement.editing-state" : `${item.id}.editor.editing-state`}"]:visible`).first()).toBeVisible();
    const footer = dialog.locator(`[data-pd-id="${item.id}.editor.actions"]`);
    expect(await footer.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath(`${item.id}-correction-handoff-900-dark.png`) });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });
}

for (const item of cases) {
  test(`${item.id} required draft and unsaved-change guard remain governed`, async ({ page }) => {
    test.setTimeout(30_000);
    await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
    await page.goto(authURL);
    await page.goto(`/profiles/profile-demo-001/tracker/${item.route}`);
    await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
    await page.locator(`[data-pd-id="${item.add}"]`).click();
    const dialog = page.locator(`[data-pd-id="${item.id}.editor.dialog"]`);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
    const field = dialog.getByLabel(item.id === "casino-offers" ? "Offer name" : "Event name", { exact: true });
    await field.fill(`Synthetic unsaved ${item.id}`);
    await page.keyboard.press("Escape");
    const guard = page.getByRole("dialog", { name: "Unsaved tracker changes" });
    await expect(guard).toBeVisible();
    await guard.getByRole("button", { name: "Keep editing", exact: true }).click();
    await expect(field).toHaveValue(`Synthetic unsaved ${item.id}`);
    await dialog.locator('[data-pd-financial-header="true"] button').click();
    await expect(guard).toBeVisible();
    await guard.getByRole("button", { name: "Discard changes", exact: true }).click();
    await expect(dialog).toHaveCount(0);
  });
}

for (const item of cases) {
  test(`${item.id} governed workbench remains usable at actual Chromium 200% zoom`, async ({}, info) => {
    test.setTimeout(90_000);
    const baseURL = process.env.OPENFORGE_CP117_BASE_URL ?? "http://127.0.0.1:3127";
    const scratch = await mkdtemp(join(tmpdir(), "pd-cp140-workbench-zoom-"));
    const extension = join(scratch, "extension");
    await mkdir(extension);
    await writeFile(join(extension, "manifest.json"), JSON.stringify({ manifest_version: 3, name: "Disposable editor zoom check", version: "1.0", permissions: ["tabs"], background: { service_worker: "background.js" } }));
    await writeFile(join(extension, "background.js"), "chrome.runtime.onInstalled.addListener(() => {});");
    const context = await chromium.launchPersistentContext(join(scratch, "profile"), { channel: "chromium", headless: true, viewport: { width: 1440, height: 900 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
    try {
      const page = await context.newPage();
      await page.goto(authURL);
      await page.goto(`${baseURL}/profiles/profile-demo-001/tracker/${item.route}`);
      await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
      await page.locator(`[data-pd-id="${item.add}"]`).click();
      const dialog = page.locator(`[data-pd-id="${item.id}.editor.dialog"]`);
      await expect(dialog).toBeVisible();
      const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
      await worker.evaluate(async url => {
        const tabs = (globalThis as unknown as { chrome: { tabs: { query: (filter: { url: string }) => Promise<Array<{ id: number }>>; setZoom: (id: number, zoom: number) => Promise<void> } } }).chrome.tabs;
        const matches = await tabs.query({ url: `${url}/*` });
        await tabs.setZoom(matches[0].id, 2);
      }, baseURL);
      await expect.poll(() => page.evaluate(() => innerWidth)).toBe(720);
      await expect(dialog).toBeVisible();
      const footer = dialog.locator(`[data-pd-id="${item.id}.editor.actions"]`);
      await expect(footer).toBeVisible();
      const rect = await dialog.boundingBox();
      const footerRect = await footer.boundingBox();
      expect(rect!.x).toBeGreaterThanOrEqual(0);
      expect(rect!.x + rect!.width).toBeLessThanOrEqual(721);
      expect(footerRect!.y).toBeGreaterThanOrEqual(rect!.y - 1);
      expect(footerRect!.y + footerRect!.height).toBeLessThanOrEqual(rect!.y + rect!.height + 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: info.outputPath(`${item.id}-actual-200-percent.png`) });
      const field = dialog.locator(".workflow-editor-body .field-control > input:visible").first();
      await field.scrollIntoViewIfNeeded();
      await field.focus();
      await expect(field).toBeFocused();
      const fieldRect = await field.boundingBox();
      const bodyRect = await dialog.locator(".workflow-editor-body").boundingBox();
      expect(fieldRect!.y).toBeGreaterThanOrEqual(bodyRect!.y - 1);
      expect(fieldRect!.y + fieldRect!.height).toBeLessThanOrEqual(footerRect!.y + 1);
      await page.screenshot({ path: info.outputPath(`${item.id}-actual-200-percent-field-focus.png`) });
    } finally {
      await context.close();
      await rm(scratch, { recursive: true, force: true });
    }
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
    const labHeaderClass = await lab.locator('[data-pd-financial-header="true"]').getAttribute("class");
    const labTitleStyle = await lab.locator('[data-pd-financial-header="true"] h2').evaluate(element => ({
      fontSize: getComputedStyle(element).fontSize,
      lineHeight: getComputedStyle(element).lineHeight,
      fontWeight: getComputedStyle(element).fontWeight,
    }));
    const labGrid = lab.locator("div[class*='columns']").first();
    const labGridClass = await labGrid.getAttribute("class");
    await page.screenshot({ path: info.outputPath(`${item.id}-lab-add-1440-light.png`) });

    await page.goto(`/profiles/profile-demo-001/tracker/${item.route}`);
    await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
    await page.locator(`[data-pd-id="${item.add}"]`).click();
    const dialog = page.locator(`[data-pd-id="${item.id}.editor.dialog"]`);
    const nativeHeader = dialog.locator('[data-pd-financial-header="true"]');
    await expect(nativeHeader).toHaveAttribute("class", labHeaderClass!);
    expect(await nativeHeader.locator("h2").evaluate(element => ({
      fontSize: getComputedStyle(element).fontSize,
      lineHeight: getComputedStyle(element).lineHeight,
      fontWeight: getComputedStyle(element).fontWeight,
    }))).toEqual(labTitleStyle);
    const realGrid = dialog.locator(`[data-pd-id="${item.id}.editor.workbench"]`);
    await expect(realGrid).toBeVisible();
    expect(await realGrid.getAttribute("class")).toBe(labGridClass);
    await expect(dialog.locator(`[data-pd-id="${item.id}.editor.financial-context"]`)).toBeVisible();
    await page.screenshot({ path: info.outputPath(`${item.id}-native-add-1440-light.png`) });
  });
}

test("Sportsbook populated Lab and native workbenches expose their complete governed stages", async ({ page }, info) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem("pd-required-storage-notice", "acknowledged");
    localStorage.setItem("openforge-theme", "dark");
  });
  await page.goto(authURL);
  await page.goto("/design-lab");
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  await page.locator('tr[data-lab-row-id="LAB-SB-001"] button[aria-label^="Open "]').click();
  await page.getByRole("button", { name: "Edit Bet", exact: true }).click();
  const lab = page.locator('[data-pd-id="lab.entry.page"]');
  const labStages = lab.getByRole("navigation", { name: "Bet workbench sections" });
  await expect(lab).toBeVisible();
  await expect(labStages.getByRole("button")).toHaveCount(5);
  await page.setViewportSize({ width: 900, height: 900 });
  for (const [stage, slug] of [["Offer", "offer"], ["Requirements", "requirements"], ["Matching", "matching"], ["Placement", "placement"], ["Finish / Review", "review"]] as const) {
    await labStages.getByRole("button", { name: new RegExp(stage, "i") }).click();
    await expect(lab.getByRole("group", { name: new RegExp(stage, "i") })).toBeVisible();
    await page.screenshot({ path: info.outputPath(`sportsbook-lab-populated-${slug}-900-dark.png`), fullPage: true });
  }

  const range = await page.request.put("/api/fund-manager/preferences/selected-range", { data: {
    selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null,
  } });
  expect(range.status()).toBe(200);
  await page.goto("/profiles/profile-demo-001/tracker/sportsbook-bets");
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
  await page.locator('td[data-ledger-row="SB-SEED-001"][data-ledger-column="event_name"]').click();
  await page.locator('[data-pd-id="sportsbook.toolbar.open-selected"]').click();
  const native = page.getByRole("dialog", { name: "Edit sportsbook row", exact: true });
  await expect(native).toBeVisible();
  await expect(native).toHaveCSS("opacity", "1");
  await page.waitForTimeout(350);
  await expect(native.getByRole("tab", { name: /Bet Setup/i })).toBeVisible();
  await expect(native.getByRole("tab", { name: /Matching/i })).toBeVisible();
  await expect(native.getByRole("tab", { name: /Settlement/i })).toBeVisible();
  await page.screenshot({ path: info.outputPath("sportsbook-native-populated-setup-900-dark.png") });
  const nativeBody = native.locator(".workflow-editor-body");
  await nativeBody.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await page.screenshot({ path: info.outputPath("sportsbook-native-populated-setup-end-900-dark.png") });
  await native.getByRole("tab", { name: /Matching/i }).click();
  await expect(native.locator('[data-pd-id="ledger-editor.panel.matching"]')).toBeVisible();
  await page.screenshot({ path: info.outputPath("sportsbook-native-populated-matching-900-dark.png") });
  await nativeBody.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await page.screenshot({ path: info.outputPath("sportsbook-native-populated-matching-end-900-dark.png") });
  await native.getByRole("tab", { name: /Settlement/i }).click();
  await expect(native.locator('[data-pd-id="ledger-editor.panel.settlement"]')).toBeVisible();
  await page.screenshot({ path: info.outputPath("sportsbook-native-populated-settlement-900-dark.png") });
  await nativeBody.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await page.screenshot({ path: info.outputPath("sportsbook-native-populated-settlement-end-900-dark.png") });
  await native.locator('[data-pd-id="sportsbook.editor.edit-settled-row"]:visible').first().click();
  await expect(native.locator('[data-pd-id="sportsbook.editor.editing-state"]:visible').first()).toBeVisible();
  await page.screenshot({ path: info.outputPath("sportsbook-native-populated-correction-900-dark.png") });
});

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
    let rejectNextSave = true;
    const saveEndpoint = new RegExp(`/profiles/profile-demo-001/${item.route}$`);
    const rejectSave = async (route: import("@playwright/test").Route) => {
      if (rejectNextSave && route.request().method() === "POST") {
        rejectNextSave = false;
        await route.fulfill({ status: 503, json: { detail: "Synthetic temporary Save failure" } });
      } else await route.continue();
    };
    await page.route(saveEndpoint, rejectSave);
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel(item.id === "casino-offers" ? "Offer name" : "Event name", { exact: true })).toHaveValue(sourceName);
    await expect(dialog.locator(`[data-pd-id="${item.id}.editor.save-error"]`)).toBeVisible();
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await page.unroute(saveEndpoint, rejectSave);
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
    await expect(floating.getByRole("button", { name: "Open full editor" })).toHaveCount(0);
    await floating.getByRole("textbox").press("Alt+Enter");
    const edit = page.getByRole("dialog", { name: item.editName, exact: true });
    await expect(edit).toBeVisible();
    const input = edit.getByLabel(item.id === "casino-offers" ? "Offer name" : "Event name", { exact: true });
    await edit.getByRole("tab", { name: /Setup/i }).click();
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
