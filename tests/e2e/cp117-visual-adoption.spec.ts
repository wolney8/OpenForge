import { chromium, expect, test, type Page } from "@playwright/test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";
const evidence = "data/private/evidence/cp117-visual-adoption/comparison";
const profile = "/profiles/profile-demo-001/tracker";
const routes = [
  { name: "position", lab: "Position", path: "/", heading: "Position" },
  { name: "today", lab: "Today", path: "/tasks", heading: "Today" },
  { name: "reports", lab: "Reports", path: "/reports", heading: "Reports" },
  { name: "accounts", lab: "Accounts", path: `${profile}/accounts`, heading: "Accounts" },
  { name: "sportsbook", lab: "Sportsbook Bets", path: `${profile}/sportsbook-bets`, heading: "Sportsbook Bets" },
] as const;
const ledgerSearchRoutes = [
  { key: "accounts", lab: "Accounts", path: `${profile}/accounts` },
  { key: "sportsbook", lab: "Sportsbook Bets", path: `${profile}/sportsbook-bets` },
  { key: "free-bets", lab: "Free Bets", path: `${profile}/free-bets`, labKey: "freeBets" },
  { key: "casino-offers", lab: "Casino Offers", path: `${profile}/casino-offers`, labKey: "casino" },
  { key: "extra-place", lab: "Extra Place", path: `${profile}/each-way-extra-places`, labKey: "extraPlace" },
  { key: "cash-adjustments", lab: "Cash Adjustments", path: `${profile}/cash-adjustments`, labKey: "cash" },
] as const;

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate((value) => { window.localStorage.setItem("openforge-theme", value); document.documentElement.dataset.theme = value; document.documentElement.style.colorScheme = value; }, theme);
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  await page.waitForTimeout(250); // Allow the established 160 ms surface transition to settle.
}

async function noPageOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test.beforeEach(async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  expect(health.database_identity).toBe("cp117-integration-synthetic");
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(authURL);
  const session = await (await page.request.get("/api/auth/session")).json();
  expect(session.email).toBe("demo@example.invalid");
});

for (const route of routes) {
  for (const width of [1440, 390] as const) {
    for (const theme of ["light", "dark"] as const) {
      test(`${route.name} ${width} ${theme}: Lab versus integrated V2`, async ({ page }) => {
        await mkdir(evidence, { recursive: true });
        await page.setViewportSize({ width, height: 900 });
        await page.goto("/design-lab");
        await page.locator('[data-pd-id="design-lab-connected.root"]').waitFor();
        const cookie = page.getByRole("button", { name: "Understood" });
        if (await cookie.isVisible()) await cookie.click();
        if (route.lab !== "Position") {
          if (width < 761) await page.getByRole("button", { name: "Open navigation" }).click();
          await page.getByRole("button", { name: route.lab, exact: true }).first().click();
        }
        await expect(page.getByRole("heading", { name: route.heading, exact: true }).first()).toBeVisible();
        await setTheme(page, theme);
        await noPageOverflow(page);
        const labPositionStyle = route.name === "position" ? await page.locator('[data-pd-id="lab.metrics"]').evaluate((element) => {
          const item = element.firstElementChild!;
          const label = item.querySelector("span")!;
          return {
            className: element.className,
            radius: getComputedStyle(element).borderRadius,
            padding: getComputedStyle(item).padding,
            labelSize: getComputedStyle(label).fontSize,
          };
        }) : null;
        const labTodayRowStyle = route.name === "today" ? await page.locator('[data-pd-id^="lab.task."]:not([class*="urgent"])').first().evaluate((element) => ({
          className: element.className.split(" ")[0],
          fontFamily: getComputedStyle(element).fontFamily,
          fontSize: getComputedStyle(element).fontSize,
          padding: getComputedStyle(element).padding,
          minimumHeight: getComputedStyle(element).minHeight,
        })) : null;
        const labTodayCollectionStyle = route.name === "today" ? await page.locator('[aria-label="Needs Action"]').first().evaluate((element) => ({
          className: element.className,
          radius: getComputedStyle(element).borderRadius,
          padding: getComputedStyle(element).padding,
        })) : null;
        await page.screenshot({ path: join(evidence, `lab-${route.name}-${width}-${theme}.png`), fullPage: true });
        if (route.name === "today") {
          await page.locator('[data-pd-id="lab.today.layout"]').getByRole("button", { name: "Board" }).click();
          await expect(page.locator('[data-pd-id="lab.today.board"]')).toBeVisible();
          await page.screenshot({ path: join(evidence, `lab-today-board-${width}-${theme}.png`), fullPage: true });
        }

        await page.goto(route.path);
        await expect(page.getByRole("heading", { name: route.heading, exact: true }).first()).toBeVisible();
        if (route.name === "position" || route.name === "reports") {
          await expect(page.locator(`[data-pd-id="${route.name}.overview"]`)).toBeVisible();
          await expect(page.locator(`[data-pd-id="${route.name}.metrics"]`)).not.toContainText(/Loading|Updating/, { timeout: 45_000 });
          await page.locator('[data-pd-id="combined-reporting.loading"]').waitFor({ state: "hidden" });
        } else if (route.name === "accounts" || route.name === "sportsbook") {
          await page.locator(".ledger-loading-overlay").first().waitFor({ state: "hidden" });
        } else if (route.name === "today") {
          await page.locator('[data-pd-id="tasks.loading-shell"]').waitFor({ state: "hidden", timeout: 45_000 });
        }
        await setTheme(page, theme);
        await noPageOverflow(page);
        await page.screenshot({ path: join(evidence, `v2-${route.name}-${width}-${theme}.png`), fullPage: true });

        if (route.name === "position") {
          await expect(page.locator('[data-pd-id="position.metrics"] > div')).toHaveCount(3);
          const realPositionStyle = await page.locator('[data-pd-id="position.metrics"]').evaluate((element) => {
            const item = element.firstElementChild!;
            const label = item.querySelector("span")!;
            return {
              className: element.className,
              radius: getComputedStyle(element).borderRadius,
              padding: getComputedStyle(item).padding,
              labelSize: getComputedStyle(label).fontSize,
            };
          });
          expect(realPositionStyle).toEqual(labPositionStyle);
          const cashPresentation = await page.locator('[data-pd-id="position.metrics.cash"]').evaluate((element) => {
            const label = element.querySelector("span")!;
            const value = element.querySelector(".financial-value-canonical-text")!;
            return { labelColor: getComputedStyle(label).color, valueColor: getComputedStyle(value).color, valueSize: parseFloat(getComputedStyle(value).fontSize) };
          });
          expect(cashPresentation.valueSize).toBeGreaterThanOrEqual(28);
          expect(cashPresentation.valueColor).not.toBe(cashPresentation.labelColor);
          await expect(page.locator(".v2-position-table tbody tr")).toHaveCount(2);
          await page.locator(".v2-position-detail > summary").click();
          await expect(page.locator('[data-pd-id="reports.profile-performance"]')).toBeVisible();
        }
        if (route.name === "reports") {
          await expect(page.locator('[data-pd-id="reports.explorer"]')).toBeVisible();
          await page.locator(".v2-position-detail > summary").click();
          const source = page.locator('[data-pd-id="reports.period-pnl.records"]');
          if (await source.count()) await expect(source).toHaveCSS("position", "static");
        }
        if (route.name === "today") {
          const realTodayRowStyle = await page.locator('[data-pd-id^="tasks.v2.row."]:not([class*="urgent"])').first().evaluate((element) => ({
            className: element.className.split(" ")[0],
            fontFamily: getComputedStyle(element).fontFamily,
            fontSize: getComputedStyle(element).fontSize,
            padding: getComputedStyle(element).padding,
            minimumHeight: getComputedStyle(element).minHeight,
          }));
          expect(realTodayRowStyle).toEqual(labTodayRowStyle);
          const realCollectionStyle = await page.locator('[data-pd-id="tasks.v2.collection"]').evaluate((element) => ({
            className: element.className,
            radius: getComputedStyle(element).borderRadius,
            padding: getComputedStyle(element).padding,
          }));
          expect(realCollectionStyle).toEqual(labTodayCollectionStyle);
          await page.locator('[data-pd-id="tasks.v2.layout-toggle"]').getByRole("button", { name: "Board" }).click();
          const board = page.locator('[data-pd-id="tasks.v2.board"]');
          await expect(board).toBeVisible();
          await expect(board).toHaveAttribute("aria-label", "Task Board");
          await expect(board.locator("section")).toHaveCount(3);
          await page.screenshot({ path: join(evidence, `v2-today-board-${width}-${theme}.png`), fullPage: true });
          await board.locator('[data-pd-id^="tasks.v2.row."]').first().click();
          const inspector = page.locator('[data-pd-id="tasks.v2.inspector"]');
          await expect(inspector).toBeVisible();
          await expect(inspector.getByRole("link", { name: "Open Source" })).toBeVisible();
          await noPageOverflow(page);
          await page.screenshot({ path: join(evidence, `v2-today-detail-${width}-${theme}.png`), fullPage: true });
          if (width === 390) {
            await expect(inspector).toHaveAttribute("role", "dialog");
            await page.keyboard.press("Escape");
          } else {
            await inspector.getByRole("button", { name: "Close Task Details" }).click();
          }
          await expect(inspector).toHaveCount(0);
          await page.locator('[data-pd-id="tasks.v2.layout-toggle"]').getByRole("button", { name: "List" }).click();
          await expect(page.locator('[data-pd-id="tasks.v2.collection"]')).toBeVisible();
        }
      });
    }
  }
}

test("Today uses the shared Lab toolbar and preserves real lifecycle controls", async ({ page }) => {
  await mkdir(evidence, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/design-lab");
  await page.locator('[data-pd-id="design-lab-connected.root"]').waitFor();
  const cookie = page.getByRole("button", { name: "Understood" });
  if (await cookie.isVisible()) await cookie.click();
  await page.getByRole("button", { name: "Today", exact: true }).first().click();
  await setTheme(page, "light");
  const labToolbar = page.locator('[data-pd-id="lab.today.toolbar"]');
  const labStyle = await labToolbar.evaluate(element => ({ className: element.className, padding: getComputedStyle(element).padding, border: getComputedStyle(element).borderBottomWidth }));
  await page.screenshot({ path: join(evidence, "lab-today-structure-1440-light.png"), fullPage: true });

  await page.goto("/tasks");
  await expect(page.locator('[data-pd-id="tasks.v2.collection"]')).toBeVisible({ timeout: 45_000 });
  await expect(page.locator('[data-pd-id="tasks.loading-shell"]')).toHaveCount(0);
  await setTheme(page, "light");
  const toolbar = page.locator('[data-pd-id="tasks.v2.toolbar"]');
  await expect(toolbar).toBeVisible();
  expect(await toolbar.evaluate(element => ({ className: element.className, padding: getComputedStyle(element).padding, border: getComputedStyle(element).borderBottomWidth }))).toEqual(labStyle);
  await expect(page.locator('[data-pd-id="tasks.tabs"]')).toHaveCount(0);
  await expect(page.locator('[data-pd-id="tasks.workspace"]')).not.toHaveClass(/content-panel/);
  await page.screenshot({ path: join(evidence, "v2-today-structure-1440-light.png"), fullPage: true });
  await page.locator('[data-pd-id="tasks.v2.filter-toggle"]').click();
  const filters = page.locator('[data-pd-id="tasks.v2.filters"]');
  await expect(filters).toBeVisible();
  await filters.getByRole("searchbox", { name: "Search Daily Tasks" }).fill("no such synthetic task");
  await expect(page.locator('[data-pd-id="tasks.v2.collection"]')).toContainText("No tasks match these controls.");
  await filters.getByRole("button", { name: "Clear Filters" }).click();
  await expect(page.locator('[data-pd-id^="tasks.v2.row."]').first()).toBeVisible();
  await page.getByRole("combobox", { name: /^Task lifecycle view/ }).click();
  await page.getByRole("option", { name: "Completed" }).click();
  await expect(page.locator('[data-pd-id="tasks.v2.collection"] h2')).toContainText("Completed");
  await page.getByRole("combobox", { name: /^Task lifecycle view/ }).click();
  await page.getByRole("option", { name: "Needs Action" }).click();
  await page.locator('[data-pd-id^="tasks.v2.row."]').first().click();
  await expect(page.locator('[data-pd-id="tasks.v2.inspector"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="tasks.v2.inspector"]').getByRole("link", { name: "Open Source" })).toBeVisible();
  await noPageOverflow(page);
  await page.screenshot({ path: join(evidence, "v2-today-detail-1440-light.png"), fullPage: true });
});

for (const width of [1440, 390] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`six ledger searches ${width} ${theme}: shared Lab input geometry`, async ({ page }) => {
      test.setTimeout(120_000);
      await mkdir(evidence, { recursive: true });
      await page.setViewportSize({ width, height: 900 });
      for (const ledger of ledgerSearchRoutes) {
        await page.goto("/design-lab");
        await page.locator('[data-pd-id="design-lab-connected.root"]').waitFor();
        const cookie = page.getByRole("button", { name: "Understood" });
        if (await cookie.isVisible()) await cookie.click();
        if (width < 761) await page.getByRole("button", { name: "Open navigation" }).click();
        await page.getByRole("button", { name: ledger.lab, exact: true }).first().click();
        await setTheme(page, theme);
        const labSearch = page.locator(`[data-pd-id="lab.ledger.search.${"labKey" in ledger ? ledger.labKey : ledger.key}"]`);
        await expect(labSearch).toBeVisible();
        const labStyle = await labSearch.evaluate(element => ({ className: element.className.split(" ")[0], height: getComputedStyle(element).height, radius: getComputedStyle(element).borderRadius, padding: getComputedStyle(element).padding }));
        await page.screenshot({ path: join(evidence, `lab-${ledger.key}-search-${width}-${theme}.png`), fullPage: true });

        await page.goto(ledger.path);
        await page.locator(".ledger-loading-overlay").first().waitFor({ state: "hidden", timeout: 45_000 });
        await setTheme(page, theme);
        const realSearch = page.locator(`[data-pd-id="${ledger.key}.toolbar.search"]`);
        await expect(realSearch).toBeVisible();
        const realStyle = await realSearch.evaluate(element => ({ className: element.className.split(" ")[0], height: getComputedStyle(element).height, radius: getComputedStyle(element).borderRadius, padding: getComputedStyle(element).padding }));
        expect(realStyle).toEqual(labStyle);
        await noPageOverflow(page);
        await page.screenshot({ path: join(evidence, `v2-${ledger.key}-search-${width}-${theme}.png`), fullPage: true });
      }
    });
  }
}

for (const theme of ["light", "dark"] as const) {
  test(`six ledgers ${theme}: labelled mobile details retain the complete table`, async ({ page }) => {
    test.setTimeout(180_000);
    await mkdir(evidence, { recursive: true });
    await page.setViewportSize({ width: 390, height: 900 });
    const range = await page.request.put("/api/fund-manager/preferences/selected-range", { data: {
      selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null,
    } });
    expect(range.status()).toBe(200);
    for (const ledger of ledgerSearchRoutes) {
      await page.goto("/design-lab");
      await page.locator('[data-pd-id="design-lab-connected.root"]').waitFor();
      const cookie = page.getByRole("button", { name: "Understood" });
      if (await cookie.isVisible()) await cookie.click();
      await page.getByRole("button", { name: "Open navigation" }).click();
      await page.getByRole("button", { name: ledger.lab, exact: true }).first().click();
      await setTheme(page, theme);
      await page.getByRole("button", { name: "Show Labelled Details" }).click();
      const labRows = page.locator(`[data-pd-id="lab.ledger.${"labKey" in ledger ? ledger.labKey : ledger.key}"]`).locator("article");
      await expect(labRows.first()).toBeVisible();
      const labDetailStyle = await labRows.first().evaluate(element => ({
        className: element.className,
        padding: getComputedStyle(element).padding,
        radius: getComputedStyle(element).borderRadius,
      }));
      await page.screenshot({ path: join(evidence, `lab-${ledger.key}-detail-390-${theme}.png`), fullPage: true });

      await page.goto(ledger.path);
      await page.locator(".ledger-loading-overlay").first().waitFor({ state: "hidden", timeout: 45_000 });
      await setTheme(page, theme);
      const screen = page.locator(`[data-pd-id="${ledger.key}.design-screen"]`);
      await screen.getByRole("button", { name: "Show Labelled Details" }).click();
      const details = page.locator(`[data-pd-id="${ledger.key}.labelled-details"]`);
      await expect(details.locator("article").first()).toBeVisible();
      const table = page.locator(`[data-pd-id="${ledger.key}.table-scroll"]`);
      await expect(table).toBeHidden();
      const realDetailStyle = await details.locator("article").first().evaluate(element => ({
        className: element.className,
        padding: getComputedStyle(element).padding,
        radius: getComputedStyle(element).borderRadius,
      }));
      expect(realDetailStyle).toEqual(labDetailStyle);
      const fieldCount = await details.locator("article").first().locator("dt").count();
      const fullColumns = await table.locator("thead th").count();
      expect(fieldCount).toBeGreaterThanOrEqual(fullColumns - 2);
      await noPageOverflow(page);
      await page.screenshot({ path: join(evidence, `v2-${ledger.key}-detail-390-${theme}.png`), fullPage: true });
      await details.getByRole("button", { name: /^Open full record for / }).first().click();
      await expect(page.getByRole("dialog").first()).toBeVisible();
      await page.screenshot({ path: join(evidence, `v2-${ledger.key}-editor-390-${theme}.png`), fullPage: true });
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await screen.getByRole("button", { name: "Show Full Table" }).click();
      await expect(table).toBeVisible();
      await expect(details).toBeHidden();
      expect(await table.evaluate(element => element.scrollWidth)).toBeGreaterThan(await table.evaluate(element => element.clientWidth));
      await noPageOverflow(page);
    }
  });
}

test("six ledgers: shared grid cell rhythm and pinned Actions", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const range = await page.request.put("/api/fund-manager/preferences/selected-range", { data: {
    selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null,
  } });
  expect(range.status()).toBe(200);
  for (const ledger of ledgerSearchRoutes) {
    await page.goto("/design-lab");
    await page.locator('[data-pd-id="design-lab-connected.root"]').waitFor();
    const cookie = page.getByRole("button", { name: "Understood" });
    if (await cookie.isVisible()) await cookie.click();
    await page.getByRole("button", { name: ledger.lab, exact: true }).first().click();
    const labTable = page.locator(`[data-pd-id="lab.ledger-pan.${"labKey" in ledger ? ledger.labKey : ledger.key}"] table`);
    const labCell = await labTable.locator("tbody td").first().evaluate(element => ({
      padding: getComputedStyle(element).padding,
      fontSize: getComputedStyle(element).fontSize,
      lineHeight: getComputedStyle(element).lineHeight,
    }));
    const labHeader = await labTable.locator("thead th").first().evaluate(element => ({ padding: getComputedStyle(element).padding, fontSize: getComputedStyle(element).fontSize, lineHeight: getComputedStyle(element).lineHeight, background: getComputedStyle(element).backgroundColor }));
    await page.goto(ledger.path);
    await page.locator(".ledger-loading-overlay").first().waitFor({ state: "hidden", timeout: 45_000 });
    const table = page.locator(`[data-pd-id="${ledger.key}.table-scroll"] table`);
    const cell = await table.locator("tbody td").first().evaluate(element => ({
      padding: getComputedStyle(element).padding,
      fontSize: getComputedStyle(element).fontSize,
      lineHeight: getComputedStyle(element).lineHeight,
    }));
    const header = await table.locator("thead th").first().evaluate(element => ({ padding: getComputedStyle(element).padding, fontSize: getComputedStyle(element).fontSize, lineHeight: getComputedStyle(element).lineHeight, background: getComputedStyle(element).backgroundColor }));
    expect(cell, ledger.key).toEqual(labCell);
    expect(header, `${ledger.key} header`).toEqual(labHeader);
    await expect(table.locator("th").last()).toHaveCSS("position", "sticky");
    await noPageOverflow(page);
  }
});

test("actual 200% zoom retains the full spreadsheet and notification filters", async ({}, info) => {
  const scratch = await mkdtemp(join(tmpdir(), "pd-cp126-zoom-"));
  const extension = join(scratch, "extension");
  await mkdir(extension);
  await writeFile(join(extension, "manifest.json"), JSON.stringify({ manifest_version: 3, name: "Disposable ledger zoom check", version: "1.0", permissions: ["tabs"], background: { service_worker: "background.js" } }));
  await writeFile(join(extension, "background.js"), "chrome.runtime.onInstalled.addListener(() => {});");
  const context = await chromium.launchPersistentContext(join(scratch, "profile"), { channel: "chromium", headless: true, viewport: { width: 780, height: 900 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try {
    const page = await context.newPage();
    await page.goto(authURL);
    const health = await (await page.request.get("/api/healthz")).json();
    expect(health.database_identity).toBe("cp117-integration-synthetic");
    const range = await page.request.put("/api/fund-manager/preferences/selected-range", { data: { selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null } });
    expect(range.status()).toBe(200);
    await page.goto(`${String(info.project.use.baseURL)}${profile}/sportsbook-bets`);
    await page.locator(".ledger-loading-overlay").first().waitFor({ state: "hidden", timeout: 45_000 });
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    await worker.evaluate(async (url) => { const tabs = (globalThis as unknown as { chrome: { tabs: { query: (filter: { url: string }) => Promise<Array<{ id: number }>>; setZoom: (id: number, zoom: number) => Promise<void> } } }).chrome.tabs; const matches = await tabs.query({ url: `${url}/*` }); await tabs.setZoom(matches[0].id, 2); }, String(info.project.use.baseURL));
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(390);
    await page.getByRole("button", { name: "Show Labelled Details" }).click();
    await expect(page.locator('[data-pd-id="sportsbook.labelled-details"] article').first()).toBeVisible();
    await noPageOverflow(page);
    await page.getByRole("button", { name: "Show Full Table" }).click();
    await expect(page.locator('[data-pd-id="sportsbook.table-scroll"]')).toBeVisible();
    await noPageOverflow(page);
    await page.goto(`${String(info.project.use.baseURL)}/notifications`);
    await page.locator('[data-pd-id="notifications.history.loading-shell"]').waitFor({ state: "hidden", timeout: 45_000 });
    await expect(page.getByRole("combobox", { name: "Filter notifications by type" })).toBeVisible();
    await page.locator('[data-pd-id="notifications.history.advanced-filters"] summary').click();
    await expect(page.getByRole("searchbox", { name: "Search notifications by name or context" })).toBeVisible();
    await noPageOverflow(page);
  } finally {
    await context.close();
    await rm(scratch, { recursive: true, force: true });
  }
});

test("Sportsbook specialist editor uses the approved Lab step presentation", async ({ page }) => {
  await mkdir(evidence, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/design-lab");
  await page.locator('[data-pd-id="design-lab-connected.root"]').waitFor();
  const cookie = page.getByRole("button", { name: "Understood" });
  if (await cookie.isVisible()) await cookie.click();
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  await page.locator('[data-pd-id="lab.add.modal"]').click();
  await expect(page.getByRole("dialog", { name: "Quick Add Sportsbook Bet" })).toBeVisible();
  await page.screenshot({ path: join(evidence, "lab-sportsbook-quick-add-1440-light.png") });
  await page.getByRole("button", { name: "Open full workbench" }).click();
  const labStep = page.locator('[aria-label="Bet workbench sections"] button').first();
  const labStyle = await labStep.evaluate(element => ({ padding: getComputedStyle(element).padding, radius: getComputedStyle(element).borderRadius, minimumHeight: getComputedStyle(element).minHeight }));
  await page.screenshot({ path: join(evidence, "lab-sportsbook-workbench-1440-light.png") });

  await page.goto(`${profile}/sportsbook-bets`);
  await page.locator(".ledger-loading-overlay").first().waitFor({ state: "hidden", timeout: 45_000 });
  await page.locator('[data-pd-id="sportsbook.toolbar.add-row"]').click();
  const dialog = page.locator('[data-pd-id="sportsbook.editor.dialog"]');
  await expect(dialog).toBeVisible();
  const realStep = dialog.locator('[data-pd-id="ledger-editor.tabs"] button').first();
  const realStyle = await realStep.evaluate(element => ({ padding: getComputedStyle(element).padding, radius: getComputedStyle(element).borderRadius, minimumHeight: getComputedStyle(element).minHeight }));
  expect(realStyle).toEqual(labStyle);
  await page.screenshot({ path: join(evidence, "v2-sportsbook-add-1440-light.png") });
  await noPageOverflow(page);
});

for (const width of [1440, 390] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`notifications ${width} ${theme}: shared Lab surface and source actions`, async ({ page }) => {
      await mkdir(evidence, { recursive: true });
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/design-lab");
      await page.locator('[data-pd-id="design-lab-connected.root"]').waitFor();
      const cookie = page.getByRole("button", { name: "Understood" });
      if (await cookie.isVisible()) await cookie.click();
      await setTheme(page, theme);
      await page.locator('[data-pd-id="lab.header-trigger.notifications"]').click();
      const labDropdownRow = page.locator('[data-pd-id="lab.notifications"] [data-pd-id^="lab.notification."]').first();
      await expect(labDropdownRow).toBeVisible();
      const labDropdownStyle = await labDropdownRow.evaluate(element => ({ className: element.className, radius: getComputedStyle(element).borderRadius, padding: getComputedStyle(element).padding }));
      const labDropdownWidth = await page.locator('[data-pd-id="lab.header-menu"]').evaluate(element => element.getBoundingClientRect().width);
      await page.screenshot({ path: join(evidence, `lab-notifications-dropdown-${width}-${theme}.png`), fullPage: true });
      await page.locator('[data-pd-id="lab.notifications"]').getByRole("button", { name: "View All Notifications" }).click();
      const labPanel = page.locator('[data-pd-id="lab.notifications"]');
      const labRow = labPanel.locator('[data-pd-id^="lab.notification."]').first();
      await expect(labRow).toBeVisible();
      const labStyle = await labRow.evaluate(element => ({
        className: element.className,
        radius: getComputedStyle(element).borderRadius,
        padding: getComputedStyle(element).padding,
      }));
      const labTabsClass = await labPanel.getByRole("tablist", { name: "Notification Views" }).getAttribute("class");
      const labTypeClass = await labPanel.locator('label:has([data-pd-id="lab.notifications.type-filter"])').getAttribute("class");
      const labActionsClass = await labPanel.getByRole("button", { name: "Mark All Read" }).locator("..").getAttribute("class");
      await noPageOverflow(page);
      await page.screenshot({ path: join(evidence, `lab-notifications-page-${width}-${theme}.png`), fullPage: true });

      await page.goto("/notifications");
      await page.locator('[data-pd-id="notifications.history.loading-shell"]').waitFor({ state: "hidden", timeout: 45_000 });
      await setTheme(page, theme);
      await page.locator('[data-pd-id="notifications.trigger"]').click();
      const realDropdown = page.locator('[data-pd-id="notifications.v2.dropdown"]');
      await expect(realDropdown).toBeVisible();
      const realDropdownBoundary = page.locator('[data-pd-id="notifications.panel"]');
      expect(await realDropdownBoundary.evaluate(element => element.getBoundingClientRect().width)).toBe(labDropdownWidth);
      expect(await realDropdownBoundary.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
      const realDropdownRow = realDropdown.locator('[data-pd-id^="notifications.item."]').first();
      await expect(realDropdownRow).toBeVisible();
      expect(await realDropdownRow.evaluate(element => ({ className: element.className, radius: getComputedStyle(element).borderRadius, padding: getComputedStyle(element).padding }))).toEqual(labDropdownStyle);
      await expect(realDropdown.getByRole("button", { name: "Priority" })).toBeVisible();
      await expect(realDropdown.getByRole("button", { name: "History" })).toBeVisible();
      await expect(realDropdownRow.getByRole("link", { name: "Open Source" })).toHaveAttribute("href", /\S+/);
      await noPageOverflow(page);
      await page.screenshot({ path: join(evidence, `v2-notifications-dropdown-${width}-${theme}.png`), fullPage: true });
      await realDropdown.getByRole("button", { name: "Close" }).click();
      await expect(realDropdown).toBeHidden();
      const realPanel = page.locator('[data-pd-id="notifications.history"]');
      const realRow = realPanel.locator('[data-pd-id^="notifications.history.item."]').first();
      await expect(realRow).toBeVisible();
      const realStyle = await realRow.evaluate(element => ({
        className: element.className,
        radius: getComputedStyle(element).borderRadius,
        padding: getComputedStyle(element).padding,
      }));
      expect(realStyle).toEqual(labStyle);
      expect(await realPanel.getByRole("tablist", { name: "Notification Views" }).getAttribute("class")).toBe(labTabsClass);
      await expect(realRow.getByRole("link", { name: "Open Source" })).toHaveAttribute("href", /\S+/);
      await expect(realPanel.getByRole("combobox", { name: "Filter notifications by type" })).toBeVisible();
      expect(await realPanel.locator('label:has([data-pd-id="notifications.history.type"])').getAttribute("class")).toBe(labTypeClass);
      expect(await realPanel.getByRole("button", { name: "Mark filtered as read" }).locator("..").getAttribute("class")).toBe(labActionsClass);
      const advancedFilters = realPanel.locator('[data-pd-id="notifications.history.advanced-filters"]');
      await expect(advancedFilters).not.toHaveAttribute("open", "");
      await expect(realPanel.getByRole("button", { name: "View Today" })).toBeVisible();
      await noPageOverflow(page);
      await page.screenshot({ path: join(evidence, `v2-notifications-page-${width}-${theme}.png`), fullPage: true });
      await advancedFilters.locator("summary").click();
      await expect(advancedFilters.getByRole("searchbox", { name: "Search notifications by name or context" })).toBeVisible();
      await advancedFilters.getByRole("searchbox", { name: "Search notifications by name or context" }).fill("no such synthetic notice");
      await expect(realPanel.locator(".notification-empty-state")).toHaveText("No retained notifications match these filters.");
      await advancedFilters.getByRole("searchbox", { name: "Search notifications by name or context" }).fill("");
      const allTab = realPanel.getByRole("tab", { name: "All", exact: true });
      await allTab.focus();
      await page.keyboard.press("ArrowRight");
      await expect(realPanel.getByRole("tab", { name: "Action Required" })).toHaveAttribute("aria-selected", "true");
      await expect(realPanel.getByRole("tabpanel").locator('[data-pd-id^="notifications.history.item."]')).not.toHaveCount(0);
      await realPanel.getByRole("tab", { name: "System & Results" }).click();
      await expect(realPanel.getByRole("tab", { name: "System & Results" })).toHaveAttribute("aria-selected", "true");
      await noPageOverflow(page);
      await realPanel.getByRole("button", { name: "View Today" }).click();
      await expect(page.locator('[data-pd-id="tasks.page"]')).toBeVisible();
    });
  }
}

test("notifications V2 dropdown retains source-backed read and clear commands", async ({ page }) => {
  await page.goto("/notifications");
  await page.locator('[data-pd-id="notifications.history.loading-shell"]').waitFor({ state: "hidden", timeout: 45_000 });
  await page.locator('[data-pd-id="notifications.trigger"]').click();
  const dropdown = page.locator('[data-pd-id="notifications.v2.dropdown"]');
  const row = dropdown.getByRole("region", { name: "Action Required" }).locator('[data-pd-id^="notifications.item."]')
    .filter({ has: page.getByRole("button", { name: "Mark Read" }) }).first();
  await expect(row).toBeVisible();
  const id = await row.getAttribute("data-pd-id");
  expect(id).toBeTruthy();
  const retained = dropdown.locator(`[data-pd-id="${id}"]`);
  await row.getByRole("button", { name: "Mark Read" }).click();
  await expect(retained.getByText("Read", { exact: true })).toBeVisible();
  await page.reload();
  await page.locator('[data-pd-id="notifications.trigger"]').click();
  await expect(retained.getByText("Read", { exact: true })).toBeVisible();
  await retained.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(retained.getByText("Clear this notification? The source task remains available.")).toBeVisible();
  await retained.getByRole("button", { name: "Clear Notification" }).click();
  await expect(retained).toHaveCount(0);
  await page.reload();
  await page.locator('[data-pd-id="notifications.trigger"]').click();
  await expect(dropdown.locator(`[data-pd-id="${id}"]`)).toHaveCount(0);
  await dropdown.getByRole("button", { name: "History" }).click();
  await expect(dropdown.getByRole("button", { name: "History" })).toHaveAttribute("aria-pressed", "true");
  await dropdown.getByRole("button", { name: "View All Notifications" }).click();
  await expect(page).toHaveURL(/\/notifications$/);
});

test("Sportsbook floating and full editor use the integrated V2 surfaces", async ({ page }) => {
  await mkdir(evidence, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  const range = await page.request.put("/api/fund-manager/preferences/selected-range", { data: {
    selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null,
  } });
  expect(range.status()).toBe(200);
  await page.goto(`${profile}/sportsbook-bets`);
  await page.locator(".ledger-loading-overlay").first().waitFor({ state: "hidden" });
  await setTheme(page, "light");
  const cell = page.locator('td[data-ledger-row="CP117-CELL-001"][data-ledger-column="event_name"]');
  await expect(cell).toBeVisible();
  await cell.click();
  await page.keyboard.press("F2");
  const floating = page.locator('[data-pd-id="ledger.floating-editor"]');
  await expect(floating).toBeVisible();
  await noPageOverflow(page);
  await page.screenshot({ path: join(evidence, "v2-sportsbook-floating-1440-light.png"), fullPage: true });
  await floating.getByRole("button", { name: "Open full editor" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await noPageOverflow(page);
  await page.screenshot({ path: join(evidence, "v2-sportsbook-full-editor-1440-light.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 900 });
  await setTheme(page, "dark");
  const bounds = await dialog.boundingBox();
  expect(bounds).toBeTruthy();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await noPageOverflow(page);
  await page.screenshot({ path: join(evidence, "v2-sportsbook-full-editor-390-dark.png"), fullPage: true });
});

const integratedRoutes = [
  { name: "free-bets", path: `${profile}/free-bets` },
  { name: "casino-offers", path: `${profile}/casino-offers` },
  { name: "extra-place", path: `${profile}/each-way-extra-places` },
  { name: "cash-adjustments", path: `${profile}/cash-adjustments` },
  { name: "notifications", path: "/notifications" },
  { name: "profiles", path: "/profiles" },
  { name: "settings", path: "/settings" },
  { name: "profit-tracker", path: `${profile}/profit-tracker` },
  { name: "calculators", path: "/fund-manager/calculators" },
  { name: "oddsmatcher", path: "/oddsmatcher" },
] as const;
for (const route of integratedRoutes) {
  for (const width of [1440, 390] as const) {
    for (const theme of ["light", "dark"] as const) {
      test(`${route.name} ${width} ${theme}: integrated route presentation`, async ({ page }) => {
        await mkdir(evidence, { recursive: true });
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route.path);
        await page.locator("main").first().waitFor();
        if (route.name === "profiles") {
          await expect(page.locator('[data-pd-id="profiles.directory.panel"]')).toBeVisible({ timeout: 45_000 });
          await expect(page.locator('[data-pd-id="profiles.directory.panel"] .stat-strip')).not.toContainText(/Loading|Updating/, { timeout: 45_000 });
        }
        if (route.name === "settings") {
          await expect(page.locator('[data-pd-id="account-catalogue.section"]')).toHaveAttribute("aria-busy", "false", { timeout: 45_000 });
        }
        if (route.name === "notifications") {
          await page.locator('[data-pd-id="notifications.history.loading-shell"]').waitFor({ state: "hidden", timeout: 45_000 });
        }
        await setTheme(page, theme);
        await page.waitForTimeout(400);
        await noPageOverflow(page);
        await page.screenshot({ path: join(evidence, `v2-${route.name}-${width}-${theme}.png`), fullPage: true });
      });
    }
  }
}

test("Reports uses governed integrated points and source drilldown", async ({ page }) => {
  await mkdir(evidence, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/reports");
  await expect(page.locator('[data-pd-id="reports.explorer"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="reports.metrics"]')).not.toContainText(/Loading|Updating/, { timeout: 45_000 });
  await setTheme(page, "light");
  const explorer = page.locator('[data-pd-id="reports.explorer"]');
  await explorer.getByRole("button", { name: "Custom", exact: true }).click();
  await explorer.getByLabel("Explorer start").fill("2025-01-01");
  await explorer.getByLabel("Explorer end").fill("2026-12-31");
  await expect(explorer.locator('[data-pd-id="reports.explorer.total"]')).not.toContainText(/Loading|Unavailable/);
  const labChart = explorer.locator('[data-pd-id="reports.lab-chart"]');
  await expect(labChart).toBeVisible();
  await page.screenshot({ path: join(evidence, "v2-reports-real-points-1440-light.png"), fullPage: true });
  await labChart.getByRole("button", { name: /Open .* source records/ }).first().click();
  await expect(explorer.locator(".v2-report-source-detail")).toHaveAttribute("open", "");
  await expect(explorer.locator('[data-pd-id="reports.explorer.sources"]')).toBeVisible();
  await explorer.getByRole("combobox", { name: "Explorer metric" }).selectOption("count");
  await expect(explorer.locator('[data-pd-id="reports.lab-chart"]')).toHaveCount(0);
  await noPageOverflow(page);
});

for (const width of [1440, 390] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`reports ${width} ${theme}: shared Lab chart with governed points`, async ({ page }) => {
      await mkdir(evidence, { recursive: true });
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/design-lab");
      await page.locator('[data-pd-id="design-lab-connected.root"]').waitFor();
      const cookie = page.getByRole("button", { name: "Understood" });
      if (await cookie.isVisible()) await cookie.click();
      if (width < 761) await page.getByRole("button", { name: "Open navigation" }).click();
      await page.getByRole("button", { name: "Reports", exact: true }).first().click();
      await setTheme(page, theme);
      const lab = page.locator('[data-pd-id="lab.report-chart"]');
      await expect(lab).toBeVisible();
      const labStyle = await lab.evaluate(element => ({ className: element.className, radius: getComputedStyle(element).borderRadius, padding: getComputedStyle(element).padding }));
      await page.screenshot({ path: join(evidence, `lab-reports-chart-${width}-${theme}.png`), fullPage: true });
      await page.goto("/reports");
      const explorer = page.locator('[data-pd-id="reports.explorer"]');
      await explorer.getByRole("button", { name: "Custom", exact: true }).click();
      await explorer.getByLabel("Explorer start").fill("2026-01-01");
      await explorer.getByLabel("Explorer end").fill("2026-12-31");
      await setTheme(page, theme);
      const real = explorer.locator('[data-pd-id="reports.lab-chart"]');
      await expect(real).toBeVisible();
      const realStyle = await real.evaluate(element => ({ className: element.className, radius: getComputedStyle(element).borderRadius, padding: getComputedStyle(element).padding }));
      expect(realStyle).toEqual(labStyle);
      await real.getByRole("radio", { name: "Line" }).click();
      await expect(real.getByRole("radio", { name: "Line" })).toHaveAttribute("aria-checked", "true");
      await expect(real.getByRole("img", { name: /Line chart of authoritative daily realised P&L/ })).toBeVisible();
      await noPageOverflow(page);
      await page.screenshot({ path: join(evidence, `v2-reports-chart-${width}-${theme}.png`), fullPage: true });
    });
  }
}

for (const { width, theme } of [{ width: 1440, theme: "light" }, { width: 390, theme: "dark" }] as const) {
  test(`six complete ledger screens ${width} ${theme}: Lab and integrated V2`, async ({ page }) => {
    test.setTimeout(180_000);
    await mkdir(evidence, { recursive: true });
    await page.setViewportSize({ width, height: 900 });
    for (const ledger of ledgerSearchRoutes) {
      const labKey = "labKey" in ledger ? ledger.labKey : ledger.key;
      await page.goto("/design-lab");
      await page.locator('[data-pd-id="design-lab-connected.root"]').waitFor();
      const cookie = page.getByRole("button", { name: "Understood" });
      if (await cookie.isVisible()) await cookie.click();
      if (width < 761) await page.getByRole("button", { name: "Open navigation" }).click();
      await page.getByRole("button", { name: ledger.lab, exact: true }).first().click();
      const labRange = page.locator('[data-pd-id="lab.range"]');
      if (!await labRange.getByText("This Year", { exact: true }).count()) {
        await labRange.click();
        await page.getByRole("option", { name: "This Year", exact: true }).click();
      }
      await setTheme(page, theme);
      const labSurface = page.locator(`[data-pd-id="lab.ledger.${labKey}"]`);
      await expect(labSurface).toBeVisible();
      const labClass = await labSurface.evaluate(element => element.className);
      await noPageOverflow(page);
      await page.screenshot({ path: join(evidence, `lab-${ledger.key}-screen-${width}-${theme}.png`), fullPage: true });

      await page.goto(ledger.path);
      await page.locator(".ledger-loading-overlay").first().waitFor({ state: "hidden", timeout: 45_000 });
      const realRange = page.locator('[data-pd-id="tracker.range-card.select"]');
      if (await realRange.count() && !await realRange.getByText("This Year", { exact: true }).count()) {
        await realRange.click();
        await page.getByRole("option", { name: "This Year", exact: true }).click();
      }
      if (ledger.key === "extra-place") await expect(page.getByRole("region", { name: "Extra Place quick view" })).toHaveAttribute("aria-busy", "false", { timeout: 45_000 });
      await setTheme(page, theme);
      const realSurface = page.locator(`[data-pd-id="${ledger.key}.design-screen"]`);
      await expect(realSurface).toBeVisible();
      await expect(realSurface.getByRole("toolbar")).toBeVisible();
      await expect(realSurface.locator("table").first()).toBeVisible();
      expect(await realSurface.evaluate(element => element.className)).toBe(labClass);
      await noPageOverflow(page);
      await page.screenshot({ path: join(evidence, `v2-${ledger.key}-screen-${width}-${theme}.png`), fullPage: true });
    }
  });
}

for (const { width, theme } of [{ width: 1440, theme: "light" }, { width: 390, theme: "dark" }] as const) {
  test(`six native ledger editors ${width} ${theme}: real V2 handoff`, async ({ page }) => {
    test.setTimeout(180_000);
    await mkdir(evidence, { recursive: true });
    await page.setViewportSize({ width, height: 900 });
    for (const ledger of ledgerSearchRoutes) {
      await page.goto(ledger.path);
      await page.locator(".ledger-loading-overlay").first().waitFor({ state: "hidden", timeout: 45_000 });
      await setTheme(page, theme);
      await page.locator(`[data-pd-id="${ledger.key}.toolbar.add-row"]`).click();
      const editor = page.getByRole("dialog").first();
      await expect(editor).toBeVisible();
      await expect(editor.getByRole("button", { name: /close/i }).first()).toBeVisible();
      await noPageOverflow(page);
      const box = await editor.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
      await page.screenshot({ path: join(evidence, `v2-${ledger.key}-editor-${width}-${theme}.png`), fullPage: true });
    }
  });
}
