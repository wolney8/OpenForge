import { chromium, expect, test } from "@playwright/test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";
test.use({ video: "on", trace: "retain-on-failure", screenshot: "only-on-failure" });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(authURL);
  await expect.poll(async () => {
    const response = await page.request.get("/api/auth/session");
    if (!response.ok()) return "unavailable";
    return (await response.json() as { email?: string }).email;
  }).toBe("demo@example.invalid");
});

for (const width of [900, 390] as const) for (const theme of ["light", "dark"] as const) {
  test(`Sportsbook Lab, native and combined at ${width}px ${theme}`, async ({ page }, info) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 900 });
    const setTheme = async () => page.evaluate(value => { localStorage.setItem("openforge-theme", value); document.documentElement.dataset.theme = value; document.documentElement.style.colorScheme = value; }, theme);
    const range = await page.request.put("/api/fund-manager/preferences/selected-range", { data: { selected_range_preset: "This Year", selected_range_custom_start: null, selected_range_custom_end: null } });
    expect(range.status()).toBe(200);
    await page.goto("/design-lab");
    await page.locator('[data-pd-id="design-lab-connected.root"]').waitFor();
    const openNavigation = page.getByRole("button", { name: "Open navigation" });
    await expect(openNavigation).toBeVisible();
    await openNavigation.click();
    await page.getByRole("button", { name: "Sportsbook Bets", exact: true }).first().click();
    await page.getByRole("combobox", { name: /Selected Range/ }).click();
    await page.getByRole("option", { name: "This Year" }).click();
    await setTheme();
    await page.screenshot({ path: info.outputPath(`lab-sportsbook-${width}-${theme}.png`), fullPage: true });
    await page.goto("/profiles/profile-demo-001/tracker/sportsbook-bets");
    await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
    await expect(page.locator('[data-pd-id="ux-v2.profile-scope"]')).toContainText("Subscriber Alpha");
    await expect(page.locator('[data-pd-id="sportsbook.table-scroll"] tbody tr').first()).toBeVisible();
    await setTheme();
    const native = page.locator('[data-pd-id="sportsbook.table-scroll"]');
    const nativeStyle = await native.locator("tbody td").first().evaluate(node => ({ padding: getComputedStyle(node).padding, fontSize: getComputedStyle(node).fontSize, lineHeight: getComputedStyle(node).lineHeight }));
    await page.screenshot({ path: info.outputPath(`native-sportsbook-${width}-${theme}.png`), fullPage: true });
    await page.goto("/tracker/sportsbook-bets");
    const combined = page.locator('[data-pd-id="combined.sportsbook-bets.table-scroll"]');
    await expect(combined.locator("tbody tr").first()).toHaveCount(1);
    await expect(combined.locator("tbody tr").first()).toBeVisible();
    if (width === 390) {
      await page.getByRole("button", { name: "Show Labelled Details" }).click();
      await expect(page.locator('[data-pd-id="combined.sportsbook-bets.details"] article').first()).toBeVisible();
    }
    await setTheme();
    const combinedStyle = await combined.locator('tbody td[data-ledger-column="bookmaker"]').first().evaluate(node => ({ padding: getComputedStyle(node).padding, fontSize: getComputedStyle(node).fontSize, lineHeight: getComputedStyle(node).lineHeight }));
    expect(combinedStyle).toEqual(nativeStyle);
    await expect(combined.locator("thead th").last()).toHaveCSS("position", "sticky");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath(`combined-sportsbook-${width}-${theme}.png`), fullPage: true });
  });
}

test("actual Chromium 200% zoom retains combined details, full table and Actions", async ({}, info) => {
  const scratch = await mkdtemp(join(tmpdir(), "pd-cp138-zoom-"));
  const extension = join(scratch, "extension");
  await mkdir(extension);
  await writeFile(join(extension, "manifest.json"), JSON.stringify({ manifest_version: 3, name: "Disposable combined ledger zoom check", version: "1.0", permissions: ["tabs"], background: { service_worker: "background.js" } }));
  await writeFile(join(extension, "background.js"), "chrome.runtime.onInstalled.addListener(() => {});");
  const context = await chromium.launchPersistentContext(join(scratch, "profile"), { channel: "chromium", headless: true, viewport: { width: 780, height: 900 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try {
    const page = await context.newPage();
    await page.goto(authURL);
    const baseURL = String(info.project.use.baseURL);
    await page.goto(`${baseURL}/tracker/sportsbook-bets`);
    const combined = page.locator('[data-pd-id="combined.sportsbook-bets.table-scroll"]');
    await expect(combined.locator("tbody tr").first()).toBeVisible();
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    await worker.evaluate(async url => { const tabs = (globalThis as unknown as { chrome: { tabs: { query: (filter: { url: string }) => Promise<Array<{ id: number }>>; setZoom: (id: number, zoom: number) => Promise<void> } } }).chrome.tabs; const matches = await tabs.query({ url: `${url}/*` }); await tabs.setZoom(matches[0].id, 2); }, baseURL);
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(390);
    await page.getByRole("button", { name: "Show Labelled Details" }).click();
    await expect(page.locator('[data-pd-id="combined.sportsbook-bets.details"] article').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.getByRole("button", { name: "Show Full Table" }).click();
    await expect(combined.locator("thead th").last()).toHaveCSS("position", "sticky");
    await page.screenshot({ path: info.outputPath("combined-sportsbook-actual-200-percent.png"), fullPage: true });
  } finally { await context.close(); await rm(scratch, { recursive: true, force: true }); }
});
