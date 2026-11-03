import { chromium, expect, test, type Page } from "@playwright/test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseURL = process.env.OPENFORGE_CP117_BASE_URL ?? "http://127.0.0.1:3127";
const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";

const profile = "/profiles/profile-demo-001/tracker/";
const legacy = process.env.OPENFORGE_CP117_VERIFY_LEGACY === "true";

async function ready(page: Page, module: "sportsbook-bets" | "accounts") {
  await page.goto(`${profile}${module}`);
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
  if (module === "sportsbook-bets") {
    if (!legacy) {
      const range = page.locator('[data-pd-id="tracker.range-card.select"]');
      await expect(range).toBeVisible();
      if (!await range.getByText("All Dates", { exact: true }).count()) {
        await range.click();
        await page.getByRole("option", { name: "All Dates", exact: true }).click();
      }
      await expect(range).toContainText("All Dates");
    } else {
      await expect(page.getByRole("combobox", { name: "Change tracker date range" })).toHaveValue("All Dates");
    }
  }
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
}

test.beforeEach(async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  expect(health.database_identity).toBe("cp117-integration-synthetic");
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  // The bootstrap issues only an independently signed synthetic session in memory.
  await page.goto(authURL);
  const auth = await (await page.request.get("/api/auth/session")).json();
  expect(auth.authenticated).toBe(true);
  expect(auth.email).toBe("demo@example.invalid");
  // Fixture scope is set through the existing preference authority before loading
  // the table; an initial settings fetch cannot race a synthetic range selection.
  const rangeSetup = await page.request.put("/api/fund-manager/preferences/selected-range", { data: {
    selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null,
  } });
  expect(rangeSetup.status()).toBe(200);
});

for (const module of ["sportsbook-bets", "accounts"] as const) {
  test(`${module}: select, navigate and open the existing editor with focus return`, async ({ page }) => {
    test.skip(legacy);
    await ready(page, module);
    const id = module === "accounts" ? "accounts" : "sportsbook";
    const viewport = page.locator(`[data-pd-id="${id}.table-scroll"]`);
    let writes = 0;
    page.on("request", request => {
      const path = new URL(request.url()).pathname;
      const preview = /\/sportsbook-bets\/(preview|payout-odds-preview)$/.test(path);
      if (!preview && /\/api\/profiles\/.*\/(accounts|sportsbook-bets)/.test(path) && ["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) writes += 1;
    });
    const cell = module === "accounts"
      ? viewport.locator('td[data-ledger-row="ACC-BOOK-A"][data-ledger-column="account_id"]')
      : viewport.locator('td[data-ledger-row="CP117-CELL-001"][data-ledger-column="date_settled"]');
    await cell.click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(cell).toHaveAttribute("data-ledger-selected", "true");
    const bounds = await cell.boundingBox();
    expect(await viewport.locator('td[data-ledger-column][tabindex="0"]').count()).toBe(1);
    await page.keyboard.press("ArrowRight");
    await expect(cell).not.toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(cell).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(cell).not.toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(cell).toBeFocused();
    await page.keyboard.press("F2");
    const editor = page.getByRole("dialog", { name: module === "accounts" ? "Edit account" : "Edit sportsbook row", exact: true });
    await expect(editor).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(editor).toHaveCount(0);
    await expect(cell).toBeFocused();
    const restored = await cell.boundingBox();
    expect(Math.abs(bounds!.height - restored!.height)).toBeLessThanOrEqual(1);
    await cell.dblclick();
    await expect(editor).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(editor).toHaveCount(0);
    await expect(cell).toBeFocused();
    await page.keyboard.press("Home");
    await expect(viewport.locator('tbody td[data-ledger-column][tabindex="0"]')).toBeFocused();
    await page.keyboard.press("End");
    await expect(viewport.locator('td[data-ledger-selected="true"]')).not.toHaveAttribute("data-ledger-column", "actions");
    await page.keyboard.press("Escape");
    await expect(viewport.locator('[data-ledger-selected="true"]')).toHaveCount(0);
    expect(writes).toBe(0);
    await cell.click();
    await page.getByRole("heading").first().click();
    await expect(viewport.locator('[data-ledger-selected="true"]')).toHaveCount(0);
  });
}

test("Sportsbook cell handoff saves through the real API and retains a failed draft", async ({ page }) => {
  test.skip(legacy);
  await ready(page, "sportsbook-bets");
  const endpoint = "/api/profiles/profile-demo-001/sportsbook-bets/CP117-CELL-001";
  const before = await (await page.request.get(endpoint)).json();
  const cell = page.locator('td[data-ledger-row="CP117-CELL-001"][data-ledger-column="event_name"]');
  await cell.click(); await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Open full editor", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Edit sportsbook row", exact: true });
  const input = editor.getByRole("textbox", { name: "Event name", exact: true });
  const next = before.event_name.endsWith("Reviewed") ? "Synthetic cell review 1" : "Synthetic cell review 1 Reviewed";
  await expect(input).toHaveValue(before.event_name);
  await input.fill(next);
  let rejected = false;
  await page.route(`**${endpoint}`, async route => {
    if (route.request().method() === "PUT" && !rejected) { rejected = true; await route.fulfill({ status: 503, json: { detail: "Synthetic retry check" } }); }
    else await route.continue();
  });
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editor).toBeVisible(); await expect(input).toHaveValue(next);
  await expect(editor).toContainText("Synthetic retry check");
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editor).toHaveCount(0);
  const after = await (await page.request.get(endpoint)).json();
  expect(after.event_name).toBe(next);
  for (const key of ["profile_id", "status", "result", "back_stake", "back_odds", "lay_odds_1", "lay_commission_1", "exchange_name", "manual_override_value", "projected_current_pnl"]) expect(after[key]).toBe(before[key]);
  await page.reload(); await ready(page, "sportsbook-bets");
  await cell.click(); await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Open full editor", exact: true }).click();
  await expect(input).toHaveValue(next);
  await page.keyboard.press("Escape");
  expect((await page.request.get('/api/profiles/profile-demo-002/sportsbook-bets/CP117-CELL-001')).status()).toBe(404);
});

test("Accounts cell handoff persists notes without changing balances or identity", async ({ page }) => {
  test.skip(legacy);
  await ready(page, "accounts");
  const endpoint = "/api/profiles/profile-demo-001/accounts";
  let before = (await (await page.request.get(endpoint)).json()).find((row: { account_id: string }) => row.account_id === "ACC-BOOK-A");
  // The committed import seed predates catalogue links. Prepare that synthetic
  // relationship through the existing API before asserting a canonical notes edit.
  // Legacy first-save catalogue binding remains an existing editor behaviour.
  if (!before.catalogue_id) {
    const prepared = await page.request.put(`${endpoint}/ACC-BOOK-A`, { data: { ...before, catalogue_id: "BOOKMAKER-DEMO-001" } });
    expect(prepared.status()).toBe(200);
    before = await prepared.json();
    await ready(page, "accounts");
  }
  const cell = page.locator('td[data-ledger-row="ACC-BOOK-A"][data-ledger-column="account_id"]');
  await cell.click(); await page.keyboard.press("Enter");
  const editor = page.getByRole("dialog", { name: "Edit account", exact: true });
  const notes = editor.getByRole("textbox", { name: "Notes", exact: true }).last();
  const next = before.notes === "Synthetic cell review saved" ? "Synthetic cell review saved again" : "Synthetic cell review saved";
  await notes.fill(next);
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editor).toHaveCount(0);
  const after = (await (await page.request.get(endpoint)).json()).find((row: { account_id: string }) => row.account_id === "ACC-BOOK-A");
  expect(after.notes).toBe(next);
  for (const key of ["profile_id", "account_id", "account", "catalogue_id", "current_balance", "pending_withdrawal_amount", "status"]) expect(after[key]).toBe(before[key]);
  await page.reload(); await ready(page, "accounts");
  await cell.dblclick(); await expect(notes).toHaveValue(next);
  await page.keyboard.press("Escape");
});

test("cell navigation preserves drag-to-pan and explicit row actions", async ({ page }) => {
  test.skip(legacy);
  await ready(page, "sportsbook-bets");
  const viewport = page.locator('[data-pd-id="sportsbook.table-scroll"]');
  await viewport.scrollIntoViewIfNeeded();
  const cell = viewport.locator('td[data-ledger-row="CP117-CELL-001"][data-ledger-column="event_name"]');
  const rect = await cell.boundingBox();
  await page.mouse.move(rect!.x + rect!.width / 2, rect!.y + rect!.height - 3);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(rect!.x + rect!.width / 2 - 100, rect!.y + rect!.height - 3, { steps: 8 });
  await page.mouse.up({ button: "middle" });
  await expect.poll(() => viewport.evaluate(element => element.scrollLeft)).toBeGreaterThan(70);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await ready(page, "accounts");
  const row = page.locator('tr').filter({ has: page.locator('td[data-ledger-row="ACC-BOOK-A"]') });
  const action = row.getByRole("button", { name: "Edit Bookmaker A", exact: true });
  await action.click();
  const editor = page.getByRole("dialog", { name: "Edit account", exact: true });
  await expect(editor).toBeVisible();
  await page.keyboard.press("Escape"); await expect(action).toBeFocused();
});

for (const theme of ["light", "dark"]) {
  test(`V2 ${theme} keyboard selection, reflow, panning and actions stay contained`, async ({ page }) => {
    test.skip(legacy);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const module of ["sportsbook-bets", "accounts"] as const) {
        await ready(page, module);
        await page.evaluate(theme => { document.documentElement.setAttribute("data-theme", theme); }, theme);
        const viewport = page.locator(`[data-pd-id="${module === 'accounts' ? 'accounts' : 'sportsbook'}.table-scroll"]`);
        const cell = viewport.locator("td[data-ledger-column]").first();
        await cell.click();
        const outline = await cell.evaluate(element => ({ style: getComputedStyle(element).outlineStyle, width: getComputedStyle(element).outlineWidth }));
        expect(outline).toEqual({ style: "solid", width: "2px" });
        await page.keyboard.press("End");
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
        const selected = viewport.locator('[data-ledger-selected="true"]');
        const box = await selected.boundingBox();
        const pinned = await selected.evaluate(element => {
          const actions = element.parentElement!.lastElementChild!;
          const header = element.closest("table")!.querySelector("thead th:last-child")!;
          const cell = element.getBoundingClientRect();
          const viewport = element.closest('.table-scroll')!.getBoundingClientRect();
          const right = Math.min(cell.right, actions.getBoundingClientRect().left);
          const left = Math.max(cell.left, viewport.left);
          const hit = document.elementFromPoint((left + right) / 2, cell.top + cell.height / 2);
          return { visibleWidth: right - left, availableWidth: actions.getBoundingClientRect().left - viewport.left, reachable: hit?.closest('td') === element, actionsRight: actions.getBoundingClientRect().right, headerRight: header.getBoundingClientRect().right };
        });
        expect(pinned.visibleWidth).toBeGreaterThanOrEqual(Math.min(box!.width, pinned.availableWidth) - 1);
        expect(pinned.reachable).toBe(true);
        expect(Math.abs(pinned.actionsRight - pinned.headerRight)).toBeLessThanOrEqual(1);
        await viewport.focus(); const prior = await viewport.evaluate(element => element.scrollLeft);
        await page.keyboard.press("ArrowLeft");
        expect(await viewport.evaluate(element => element.scrollLeft)).toBeLessThan(prior);
      }
    }
  });
}

test("actual Chromium 200% zoom keeps selected cells and native editors reachable", async ({}, info) => {
  test.skip(legacy);
  const scratch = await mkdtemp(join(tmpdir(), "pd-cp117-independent-zoom-"));
  const extension = join(scratch, "extension"); await mkdir(extension);
  await writeFile(join(extension, "manifest.json"), JSON.stringify({ manifest_version: 3, name: "Temporary ledger zoom check", version: "1.0", permissions: ["tabs"], background: { service_worker: "background.js" } }));
  await writeFile(join(extension, "background.js"), "chrome.runtime.onInstalled.addListener(() => {});");
  const context = await chromium.launchPersistentContext(join(scratch, "profile"), { channel: "chromium", headless: true, viewport: { width: 1440, height: 1000 }, recordVideo: { dir: info.outputPath("actual-zoom-recording") }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try {
    await context.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
    const page = await context.newPage(); await page.goto(authURL);
    await page.goto(`${baseURL}${profile}sportsbook-bets`);
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    await worker.evaluate(async (baseURL) => {
      const tabs = (globalThis as unknown as { chrome: { tabs: { query: (filter: { url: string }) => Promise<Array<{ id: number }>>; setZoom: (id: number, zoom: number) => Promise<void> } } }).chrome.tabs;
      const matches = await tabs.query({ url: `${baseURL}/*` }); await tabs.setZoom(matches[0].id, 2);
    }, baseURL);
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(720);
    for (const module of ["sportsbook-bets", "accounts"] as const) {
      await page.goto(`${baseURL}${profile}${module}`);
      await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0);
      const range = page.getByRole("combobox", { name: "Change tracker date range" });
      if (await range.count()) await range.selectOption({ label: "All Dates" });
      const cell = page.locator('td[data-ledger-column]').first();
      await cell.click(); await page.keyboard.press("Enter");
      const editor = page.getByRole("dialog", { name: module === "accounts" ? "Edit account" : "Edit sportsbook row", exact: true });
      await expect(editor).toBeVisible();
      const rect = await editor.boundingBox();
      expect(rect!.x).toBeGreaterThanOrEqual(0); expect(rect!.x + rect!.width).toBeLessThanOrEqual(721);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.keyboard.press("Escape"); await expect(cell).toBeFocused();
      const supportedCell = page.locator(module === "accounts"
        ? 'td[data-ledger-row="ACC-BOOK-A"][data-ledger-column="channel"]'
        : 'td[data-ledger-row="CP117-CELL-001"][data-ledger-column="event_name"]');
      await supportedCell.dblclick();
      const floating = page.locator('[data-pd-id="ledger.floating-editor"]');
      await expect(floating).toBeVisible();
      const floatingBounds = await floating.boundingBox();
      expect(floatingBounds!.x).toBeGreaterThanOrEqual(0);
      expect(floatingBounds!.x + floatingBounds!.width).toBeLessThanOrEqual(721);
      expect(floatingBounds!.y + floatingBounds!.height).toBeLessThanOrEqual(501);
      await expect(floating.getByRole("button", {name:"Save",exact:true})).toBeInViewport();
      await page.keyboard.press("Escape"); await expect(supportedCell).toBeFocused();
    }
  } finally { await context.close(); await rm(scratch, { recursive: true, force: true }); }
});

test("flag OFF retains original row activation and no cell navigation", async ({ page }) => {
  test.skip(!legacy);
  for (const module of ["sportsbook-bets", "accounts"] as const) {
    await ready(page, module);
    expect(await page.locator('html').getAttribute('data-ux-shell')).not.toBe('v2');
    const cell = module === 'accounts' ? page.locator('td[data-ledger-row="ACC-BOOK-A"][data-ledger-column="account_id"]') : page.locator('td[data-ledger-row="CP117-CELL-001"][data-ledger-column="event_name"]');
    await expect(cell).not.toHaveAttribute('tabindex', '0');
    await cell.click();
    await expect(page.getByRole('dialog', { name: module === 'accounts' ? 'Edit account' : 'Edit sportsbook row', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
  }
});
