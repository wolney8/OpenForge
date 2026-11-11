import { chromium, expect, test, type Page } from "@playwright/test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";
const evidence = "data/private/evidence/cp117-category-b";
const profile = "/profiles/profile-demo-001/tracker";

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate(value => { localStorage.setItem("openforge-theme", value); document.documentElement.dataset.theme = value; document.documentElement.style.colorScheme = value; }, theme);
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}

async function box(page: Page, selector: string) {
  return page.locator(selector).first().evaluate(node => { const rect = node.getBoundingClientRect(); return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom }; });
}

test.beforeEach(async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  expect(health.database_identity).toBe("cp117-integration-synthetic");
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(authURL);
  expect((await (await page.request.get("/api/auth/session")).json()).email).toBe("demo@example.invalid");
});

for (const route of [
  { name: "position", lab: "Position", real: "/", head: "position.page-head" },
  { name: "today", lab: "Today", real: "/tasks", head: "tasks.page-header" },
  { name: "reports", lab: "Reports", real: "/reports", head: "reports.page-head" },
  { name: "sportsbook", lab: "Sportsbook Bets", real: `${profile}/sportsbook-bets`, head: "sportsbook.design-screen" },
] as const) {
  test(`${route.name} uses the Lab shell gutters at 900px Split View`, async ({ page }) => {
    test.setTimeout(90_000);
    await mkdir(evidence, { recursive: true });
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto("/design-lab");
    await expect(page.locator('[data-pd-id="lab.breadcrumb"]')).toBeVisible();
    if (route.lab !== "Position") {
      const menu = page.getByRole("button", { name: "Open navigation" });
      if (await menu.isVisible()) await menu.click();
      await page.getByRole("button", { name: route.lab, exact: true }).first().click();
    }
    await setTheme(page, "dark");
    const lab = { profile: await box(page, '[data-pd-id="lab.profile"]'), breadcrumb: await box(page, '[data-pd-id="lab.breadcrumb"]'), head: await box(page, 'main[data-pd-id="lab.main"] h1') };
    await page.screenshot({ path: `${evidence}/lab-${route.name}-900-dark.png`, fullPage: true });
    await page.goto(route.real);
    await expect(page.locator(`[data-pd-id="${route.head}"]`)).toBeVisible({ timeout: 45_000 });
    if (route.name === "reports") await expect(page.getByText("Loading combined profile reporting")).toBeHidden({ timeout: 45_000 });
    if (route.name === "sportsbook") await expect(page.getByText("Loading sportsbook ledger")).toBeHidden({ timeout: 45_000 });
    await setTheme(page, "dark");
    const real = { profile: await box(page, '[data-pd-id="ux-v2.profile-scope"]'), breadcrumb: await box(page, '[data-pd-id="ux-v2.breadcrumbs"]'), head: await box(page, route.name === "sportsbook" ? "main h1" : `[data-pd-id="${route.head}"] h1`) };
    await page.screenshot({ path: `${evidence}/v2-${route.name}-900-dark.png`, fullPage: true });
    expect(Math.abs(real.profile.y - lab.profile.y)).toBeLessThanOrEqual(8);
    expect(Math.abs(real.breadcrumb.x - lab.breadcrumb.x)).toBeLessThanOrEqual(8);
    expect(Math.abs(real.head.x - lab.head.x)).toBeLessThanOrEqual(8);
    expect(Math.abs((real.head.y - real.breadcrumb.bottom) - (lab.head.y - lab.breadcrumb.bottom))).toBeLessThanOrEqual(16);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
}

test("full Notifications keeps current rows when history fails and confirms Clear", async ({ page }) => {
  await mkdir(evidence, { recursive: true });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/notifications");
  await expect(page.locator('[data-pd-id="ux-v2.breadcrumbs"]')).toContainText("Notifications");
  const list = page.locator('[data-pd-id="notifications.history.list"]');
  await expect(list).toBeVisible({ timeout: 45_000 });
  await setTheme(page, "dark");
  await page.screenshot({ path: `${evidence}/v2-notifications-390-dark.png`, fullPage: true });
  const clear = list.getByRole("button", { name: "Clear", exact: true }).first();
  await expect(clear).toBeVisible();
  await clear.click();
  await expect(list.getByText("Clear this notification? Its financial source remains unchanged.")).toBeVisible();
  await list.getByRole("button", { name: "Keep" }).click();
  await expect(list.getByText("Clear this notification? Its financial source remains unchanged.")).toHaveCount(0);
  await page.locator('[data-pd-id="notifications.history.tab.history"]').click();
  await expect(page.locator('[data-pd-id="notifications.history.source-limit"]')).toContainText("Cleared notifications may no longer be returned");
  await page.route(/\/fund-manager\/notifications\/history(?:\?.*)?$/, route => route.fulfill({ status: 503, json: { detail: "synthetic history failure" } }));
  await page.reload();
  await expect(page.locator('[data-pd-id="notifications.history.partial-read"]')).toBeVisible({ timeout: 45_000 });
  await expect(list).toBeVisible();
  await page.locator('[data-pd-id="notifications.history.tab.history"]').click();
  await expect(page.locator('[data-pd-id="notifications.history.partial-read"]')).toContainText("incomplete");
});

for (const module of ["sportsbook-bets", "free-bets", "casino-offers", "each-way-extra-places", "cash-adjustments"] as const) {
  test(`${module} separates native V2 filters, columns and governed paging`, async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto(`${profile}/${module}`);
    const toolbar = page.getByRole("toolbar", { name: /ledger controls|Extra Place controls/ });
    const columnToolbar = page.getByRole("toolbar", { name: /column controls$/i });
    await expect(toolbar).toBeVisible({ timeout: 45_000 });
    await expect(toolbar.getByRole("button", { name: "Filters", exact: true })).toBeVisible();
    await expect(toolbar.getByRole("button", { name: "Columns", exact: true })).toHaveCount(0);
    await expect(columnToolbar.getByRole("button", { name: "Columns", exact: true })).toBeVisible();
    await expect(columnToolbar.getByRole("button", { name: "Restore Default Columns", exact: true })).toBeVisible();
    await expect(toolbar).not.toHaveClass(/sportsbook-review-bar/);
    await columnToolbar.getByRole("button", { name: "Columns", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: /column controls/ });
    await expect(dialog.getByText("Visible columns")).toBeVisible();
    await expect(dialog.getByText("Filter records", { exact: true })).toHaveCount(0);
    const closeName = { "sportsbook-bets": "Close Sportsbook column controls", "free-bets": "Close Free Bet column controls", "casino-offers": "Close Casino column controls", "each-way-extra-places": "Close Extra Place column controls", "cash-adjustments": "Close Cash Adjustment column controls" }[module];
    await dialog.getByRole("button", { name: closeName, exact: true }).click();
    const pager = page.locator('[data-pd-id$=".pagination.top"]').first();
    await expect(pager).toContainText(/Showing \d+–\d+ of \d+/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
}

test("combined ledgers keep owned rows with separate filters, columns and one pager", async ({ page }) => {
  for (const module of ["accounts", "sportsbook-bets", "free-bets", "casino-offers", "each-way-extra-places", "cash-adjustments"] as const) {
    await page.goto(`/tracker/${module}`);
    const toolbar = page.locator(`[data-pd-id="combined.${module}.toolbar"]`);
    await expect(toolbar).toBeVisible({ timeout: 45_000 });
    await toolbar.getByRole("button", { name: "Filters", exact: true }).click();
    await expect(page.locator(`[data-pd-id="combined.${module}.sort"]`)).toBeVisible();
    await page.locator(`[data-pd-id="combined.${module}.secondary-toolbar"]`).getByRole("button", { name: "Columns", exact: true }).click();
    await expect(page.locator(`[data-pd-id="combined.${module}.control-panel"]`)).toContainText("Visible columns");
    await expect(page.locator(`[data-pd-id="combined.${module}.pagination.top"]`)).toBeVisible({ timeout: 45_000 });
    await expect(page.locator(`[data-pd-id="combined.${module}.table-scroll"] thead th`).last()).toHaveText("Actions");
  }
});

test("Reports advanced Profile and formal controls remain contained and discoverable", async ({ page }) => {
  await mkdir(evidence, { recursive: true });
  for (const width of [900, 390] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/reports");
    await expect(page.locator('[data-pd-id="reports.page-head"]')).toBeVisible({ timeout: 45_000 });
    const profilePicker = page.locator('[data-pd-id="reports.profile-scope"]');
    await profilePicker.locator("summary").click();
    await expect(profilePicker.getByRole("combobox", { name: "Report Profile scope" })).toBeVisible();
    const picker = await profilePicker.locator("fieldset").boundingBox();
    expect(picker).not.toBeNull();
    expect(picker!.x + picker!.width).toBeLessThanOrEqual(width + 1);
    await profilePicker.locator("summary").click();
    const formal = page.locator('[data-pd-id="reports.formal.advanced"]');
    await formal.locator("summary").click();
    await expect(formal).toHaveAttribute("open", "");
    await page.screenshot({ path: `${evidence}/v2-reports-advanced-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});

test("Reports advanced controls and ledger filters remain usable at actual Chromium 200% zoom", async ({}, info) => {
  test.setTimeout(90_000);
  const baseURL = String(info.project.use.baseURL);
  const scratch = await mkdtemp(join(tmpdir(), "pd-presentation-closeout-zoom-"));
  const extension = join(scratch, "extension");
  await mkdir(extension);
  await writeFile(join(extension, "manifest.json"), JSON.stringify({ manifest_version: 3, name: "Disposable presentation zoom check", version: "1.0", permissions: ["tabs"], background: { service_worker: "background.js" } }));
  await writeFile(join(extension, "background.js"), "chrome.runtime.onInstalled.addListener(() => {});");
  const context = await chromium.launchPersistentContext(join(scratch, "profile"), { channel: "chromium", headless: true, viewport: { width: 1440, height: 900 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try {
    const page = await context.newPage();
    await page.goto(authURL);
    await page.goto(`${baseURL}/reports`);
    await expect(page.locator('[data-pd-id="reports.page-head"]')).toBeVisible();
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    await worker.evaluate(async url => {
      const tabs = (globalThis as unknown as { chrome: { tabs: { query: (filter: { url: string }) => Promise<Array<{ id: number }>>; setZoom: (id: number, zoom: number) => Promise<void> } } }).chrome.tabs;
      const matches = await tabs.query({ url: `${url}/*` });
      await tabs.setZoom(matches[0].id, 2);
    }, baseURL);
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(720);
    const profilePicker = page.locator('[data-pd-id="reports.profile-scope"]');
    await profilePicker.locator("summary").click();
    await expect(profilePicker.getByRole("combobox", { name: "Report Profile scope" })).toBeVisible();
    await profilePicker.locator("summary").click();
    await page.locator('[data-pd-id="reports.formal.advanced"] summary').click();
    await expect(page.locator('[data-pd-id="reports.formal.advanced"]')).toHaveAttribute("open", "");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.goto(`${baseURL}${profile}/sportsbook-bets`);
    const toolbar = page.getByRole("toolbar", { name: /ledger controls/ });
    await expect(toolbar.getByRole("button", { name: "Filters", exact: true })).toBeVisible({ timeout: 45_000 });
    await page.getByRole("toolbar", { name: "Sportsbook column controls" }).getByRole("button", { name: "Columns", exact: true }).click();
    await expect(page.getByRole("dialog", { name: /column controls/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.goto(`${baseURL}${profile}/free-bets`);
    await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
    const freeBetRange = page.locator('[data-pd-id="tracker.range-card.select"]');
    await freeBetRange.click();
    await page.getByRole("option", { name: "All Dates", exact: true }).click();
    await expect(freeBetRange).toContainText("All Dates");
    const row = page.locator('tr:has(td[data-ledger-row="CP117-FB-001"])');
    await row.getByRole("button", { name: /More actions for/ }).click();
    const actions = page.getByRole("dialog", { name: /Actions for/ });
    await expect(actions.getByRole("button", { name: "Review settlement" })).toBeVisible();
    const box = await actions.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(720);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  } finally {
    await context.close();
    await rm(scratch, { recursive: true, force: true });
  }
});
