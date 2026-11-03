import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, expect, test } from "@playwright/test";

test.use({ video: "on", trace: "retain-on-failure", screenshot: "only-on-failure" });

test("flagged real ledger keeps header and row Actions aligned while scrolling", async ({ page }, info) => {
  const tokenPath = process.env.OPENFORGE_CP117_ISOLATED_SESSION_FILE;
  test.skip(!tokenPath, "Requires the disposable CP-117 authenticated API fixture");
  await page.context().addCookies([{ name: "pd_session", value: readFileSync(tokenPath!, "utf8").trim(), url: String(info.project.use.baseURL) }]);
  await page.setViewportSize({ width: 1440, height: 900 });
  const settingsLoaded = page.waitForResponse((response) => response.url().includes("/profiles/profile-notification-acceptance/tracker-settings") && response.request().method() === "GET" && response.ok());
  await page.goto("/profiles/profile-notification-acceptance/tracker/sportsbook-bets");
  await settingsLoaded;
  await page.getByRole("combobox", { name: "Change tracker date range" }).selectOption({ label: "All Dates" });
  await expect(page.getByRole("combobox", { name: "Change tracker date range" })).toHaveValue("All Dates");
  const dismissToast = page.getByRole("button", { name: "Dismiss notification" });
  if (await dismissToast.isVisible()) await dismissToast.click();
  const scroll = page.locator('[data-pd-id="sportsbook.table-scroll"]');
  const row = scroll.locator("table > tbody > tr > td:last-child:not([colspan])").first();
  await expect(row).toBeVisible();
  await expect(page.locator('[data-pd-id="sportsbook.view-context"]')).toContainText(/\d+ of \d+ Rows?/);
  expect(await row.evaluate((element) => parseFloat(getComputedStyle(element).paddingTop))).toBeLessThan(15);
  const initial = await scroll.evaluate((element) => {
    const head = element.querySelector("table > thead > tr > th:last-child")!.getBoundingClientRect();
    const cell = element.querySelector("table > tbody > tr > td:last-child:not([colspan])")!.getBoundingClientRect();
    return { max: element.scrollWidth - element.clientWidth, headRight: head.right, cellRight: cell.right, headWidth: head.width, cellWidth: cell.width };
  });
  expect(initial.max).toBeGreaterThan(50);
  await scroll.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
  await expect.poll(() => scroll.evaluate((element) => element.scrollLeft)).toBeGreaterThan(50);
  const scrolled = await scroll.evaluate((element) => {
    const viewport = element.getBoundingClientRect();
    const head = element.querySelector("table > thead > tr > th:last-child")!.getBoundingClientRect();
    const cell = element.querySelector("table > tbody > tr > td:last-child:not([colspan])")!.getBoundingClientRect();
    return { viewportRight: viewport.right, headRight: head.right, cellRight: cell.right, headWidth: head.width, cellWidth: cell.width };
  });
  expect(Math.abs(scrolled.headRight - scrolled.viewportRight)).toBeLessThanOrEqual(2);
  expect(Math.abs(scrolled.cellRight - scrolled.viewportRight)).toBeLessThanOrEqual(2);
  expect(Math.abs(scrolled.headRight - scrolled.cellRight)).toBeLessThanOrEqual(1);
  expect(Math.abs(scrolled.headWidth - initial.headWidth)).toBeLessThanOrEqual(1);
  expect(Math.abs(scrolled.cellWidth - initial.cellWidth)).toBeLessThanOrEqual(1);
  expect(await row.evaluate((element) => getComputedStyle(element).position)).toBe("sticky");
  await expect(row.locator("button, a").first()).toBeVisible();
  await scroll.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("sportsbook-actions-scrolled.png") });
  await row.locator("button, a").first().focus();
  await expect(row.locator("button, a").first()).toBeFocused();
});

test("flagged real Accounts ledger pins row actions at intermediate width", async ({ page }, info) => {
  const tokenPath = process.env.OPENFORGE_CP117_ISOLATED_SESSION_FILE;
  test.skip(!tokenPath, "Requires the disposable CP-117 authenticated API fixture");
  await page.context().addCookies([{ name: "pd_session", value: readFileSync(tokenPath!, "utf8").trim(), url: String(info.project.use.baseURL) }]);
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto("/profiles/profile-notification-acceptance/tracker/accounts");
  const scroll = page.locator('[data-pd-id="accounts.table-scroll"]');
  const row = scroll.locator("table > tbody > tr > td:last-child:not([colspan])").first();
  await expect(row).toBeVisible();
  await scroll.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
  const receipt = await scroll.evaluate((element) => {
    const viewport = element.getBoundingClientRect();
    const header = element.querySelector("thead th:last-child")!.getBoundingClientRect();
    const cell = element.querySelector("tbody td:last-child:not([colspan])")!.getBoundingClientRect();
    return { max: element.scrollWidth - element.clientWidth, viewportRight: viewport.right, headerRight: header.right, cellRight: cell.right };
  });
  expect(receipt.max).toBeGreaterThan(50);
  expect(Math.abs(receipt.headerRight - receipt.viewportRight)).toBeLessThanOrEqual(2);
  expect(Math.abs(receipt.cellRight - receipt.viewportRight)).toBeLessThanOrEqual(2);
  await scroll.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("accounts-actions-scrolled.png") });
  await expect(row.locator("button, a").first()).toBeVisible();
});

test("flagged real Sportsbook search keeps an honest row count and recoverable table", async ({ page }, info) => {
  const tokenPath = process.env.OPENFORGE_CP117_ISOLATED_SESSION_FILE;
  test.skip(!tokenPath, "Requires the disposable CP-117 authenticated API fixture");
  await page.context().addCookies([{ name: "pd_session", value: readFileSync(tokenPath!, "utf8").trim(), url: String(info.project.use.baseURL) }]);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/profiles/profile-notification-acceptance/tracker/sportsbook-bets");
  const search = page.getByRole("searchbox", { name: "Search sportsbook rows" });
  await expect(search).toBeVisible();
  const context = page.locator('[data-pd-id="sportsbook.view-context"]');
  await expect(context).toContainText(/\d+ of \d+ Rows?/);
  const rowCount = (await context.textContent())!.match(/of (\d+) Rows?/)![1];
  await search.fill("no synthetic record matches this search");
  await expect(context).toContainText(`0 of ${rowCount} Row`);
  await expect(context).toContainText("Search Active");
  await expect(page.getByText("No sportsbook rows match the current filter.")).toBeVisible();
  await search.clear();
  await expect(context).toContainText(`of ${rowCount} Row`);
  await expect(context).not.toContainText("Search Active");
  await page.screenshot({ path: info.outputPath("sportsbook-v2-table-filtered-recovered.png") });
});

test("flagged Accounts keeps the complete table accessible at mobile width", async ({ page }, info) => {
  const tokenPath = process.env.OPENFORGE_CP117_ISOLATED_SESSION_FILE;
  test.skip(!tokenPath, "Requires the disposable CP-117 authenticated API fixture");
  await page.context().addCookies([{ name: "pd_session", value: readFileSync(tokenPath!, "utf8").trim(), url: String(info.project.use.baseURL) }]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/profiles/profile-notification-acceptance/tracker/accounts");
  const scroll = page.locator('[data-pd-id="accounts.table-scroll"]');
  await expect(scroll).toBeVisible();
  await expect(page.locator('[data-pd-id="accounts.card-list"]')).toBeHidden();
  await expect(page.locator('[data-pd-id="accounts.view-context"]')).toContainText(/\d+ of \d+ Rows?/);
  const before = await scroll.evaluate((element) => ({ left: element.scrollLeft, max: element.scrollWidth - element.clientWidth }));
  expect(before.max).toBeGreaterThan(100);
  await scroll.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
  await expect.poll(() => scroll.evaluate((element) => element.scrollLeft)).toBeGreaterThan(100);
  await expect(scroll.locator("tbody td:last-child button").first()).toBeVisible();
  await scroll.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("accounts-v2-mobile-table-scrolled.png") });
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
  await expect(scroll.locator("tbody td:last-child button").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: info.outputPath("accounts-v2-mobile-table-scrolled-light.png") });
});

test("flagged Sportsbook Actions remain pinned at actual Chromium 200% zoom", async ({}, info) => {
  const tokenPath = process.env.OPENFORGE_CP117_ISOLATED_SESSION_FILE;
  test.skip(!tokenPath, "Requires the disposable CP-117 authenticated API fixture");
  const baseURL = String(info.project.use.baseURL);
  const scratch = await mkdtemp(join(tmpdir(), "pd-cp117-ledger-zoom-"));
  const extension = join(scratch, "extension");
  await mkdir(extension);
  await writeFile(join(extension, "manifest.json"), JSON.stringify({ manifest_version: 3, name: "Temporary ledger zoom check", version: "1.0", permissions: ["tabs"], background: { service_worker: "background.js" } }));
  await writeFile(join(extension, "background.js"), "chrome.runtime.onInstalled.addListener(() => {});");
  const context = await chromium.launchPersistentContext(join(scratch, "profile"), { channel: "chromium", headless: true, viewport: { width: 1440, height: 900 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try {
    await context.addCookies([{ name: "pd_session", value: readFileSync(tokenPath!, "utf8").trim(), url: baseURL }]);
    const page = await context.newPage();
    await page.goto(`${baseURL}/profiles/profile-notification-acceptance/tracker/sportsbook-bets`);
    await expect(page.locator('[data-pd-id="sportsbook.table-scroll"]')).toBeVisible();
    await page.getByRole("combobox", { name: "Change tracker date range" }).selectOption({ label: "All Dates" });
    await expect(page.locator('[data-pd-id="sportsbook.table-scroll"] tbody td:last-child:not([colspan])').first()).toBeVisible();
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    await worker.evaluate(async (url) => { const tabs = (globalThis as unknown as { chrome: { tabs: { query: (filter: { url: string }) => Promise<Array<{ id: number }>>; setZoom: (id: number, zoom: number) => Promise<void> } } }).chrome.tabs; const matches = await tabs.query({ url: `${url}/*` }); await tabs.setZoom(matches[0].id, 2); }, baseURL);
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(720);
    const scroll = page.locator('[data-pd-id="sportsbook.table-scroll"]');
    await scroll.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
    const geometry = await scroll.evaluate((element) => {
      const header = element.querySelector("thead th:last-child")!.getBoundingClientRect();
      const cell = element.querySelector("tbody td:last-child:not([colspan])")!.getBoundingClientRect();
      return { headerRight: header.right, cellRight: cell.right, viewportRight: element.getBoundingClientRect().right };
    });
    expect(Math.abs(geometry.headerRight - geometry.cellRight)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.cellRight - geometry.viewportRight)).toBeLessThanOrEqual(2);
    await scroll.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath("sportsbook-v2-actual-zoom-200-scrolled.png") });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  } finally {
    await context.close();
    await rm(scratch, { recursive: true, force: true });
  }
});
