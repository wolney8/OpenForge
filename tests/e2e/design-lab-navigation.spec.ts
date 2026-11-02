import { chromium, expect, test, type Page } from "@playwright/test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const evidence = process.env.OPENFORGE_DESIGN_LAB_EVIDENCE_DIR;

async function enterLab(page: Page) {
  await page.route("**/api/**", async route => {
    if (route.request().url().endsWith("/api/auth/session")) {
      await route.fulfill({ json: { authenticated: true, email: "demo@example.invalid", expires_at: 4102444800, name: "Synthetic Fund Manager", role: "fund_manager", session_policy: { absolute_expires_at: 4102444800, auto_logout_enabled: false, effective_expires_at: 4102444800, inactivity_expires_at: null, last_activity_at: 1, preference_configured: true, timeout_minutes: 30, valid_now: true } } });
      return;
    }
    if (route.request().url().endsWith("/api/auth/activity")) { await route.fulfill({ json: { ok: true } }); return; }
    throw new Error(`Unexpected API request: ${route.request().url()}`);
  });
  await page.goto("/design-lab");
  await expect(page.locator('[data-pd-id="design-lab-connected.root"]')).toBeVisible();
}

async function capture(page: Page, name: string) {
  if (!evidence) return;
  await mkdir(evidence, { recursive: true });
  await page.screenshot({ path: join(evidence, name), fullPage: false, style: "nextjs-portal { display: none !important; }" });
}

test("persistent navigation, breadcrumbs and All Profiles source return", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterLab(page);
  await capture(page, "after-position-1440.png");
  const sidebar = page.getByRole("navigation", { name: "Primary destinations" });
  await page.locator('[data-pd-id="lab.nav.tasks"]').click();
  await expect(sidebar.getByRole("button", { name: "Position" })).toBeVisible();
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  await expect(page.locator('[data-pd-id="lab.ledger.sportsbook"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="lab.nav.tracker"]')).not.toHaveAttribute("aria-current", "page");
  await expect(page.locator('[data-pd-id="lab.nav.sportsbook"]')).toHaveAttribute("aria-current", "page");
  await expect(page.locator('[data-pd-id="lab.breadcrumb"]')).toContainText("Position");
  await expect(page.locator('[data-pd-id="lab.breadcrumb"]')).toContainText("Tracker");
  await capture(page, "after-tracker-1440.png");
  await page.locator('[data-pd-id="lab.nav.reports"]').click();
  await page.locator('[data-pd-id="lab.range"]').click();
  await page.getByRole("option", { name: "This Year" }).click();
  await expect(sidebar.getByRole("button", { name: "Today" })).toBeVisible();
  await expect(page.locator('[data-pd-id="lab.breadcrumb"]')).not.toContainText("Tracker");
  await capture(page, "after-reports-1440.png");
  await page.getByRole("button", { name: /Open 8 Oct source record/ }).click();
  await expect(page.locator('[data-pd-id="lab.profile"]')).toContainText("All Profiles");
  await expect(page.locator('[data-pd-id="lab.record-detail"]')).toContainText("Owner:");
  await page.getByRole("button", { name: "Back to Reports" }).click();
  await expect(page.locator('[data-pd-id="lab.reports"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="lab.profile"]')).toContainText("All Profiles");
  await expect(page.locator('[data-pd-id="lab.range"]')).toContainText("This Year");
});

test("sidebar and launcher remain contained across widths, themes and reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await enterLab(page);
  for (const theme of ["light", "dark"] as const) {
    if (await page.locator("html").getAttribute("data-theme") !== theme) {
      await page.locator('[data-pd-id="lab.header-trigger.identity"]').click();
      await page.locator('[data-pd-id="lab.identity.dark-mode"]').click();
      await page.keyboard.press("Escape");
    }
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    for (const width of [1440, 900, 768, 430, 390]) {
      await page.setViewportSize({ width, height: 900 });
      if (width <= 900) await page.getByRole("button", { name: "Open navigation" }).click();
      await expect(page.locator('[data-pd-id="lab.nav.tracker"]')).toBeVisible();
      await expect(page.locator('[data-pd-id="lab.nav.reports"]')).toBeVisible();
      if (width <= 900) await page.getByRole("complementary", { name: "Design Lab navigation" }).getByRole("button", { name: "Close navigation" }).click();
      await page.locator('[data-pd-id="lab.header-trigger.launcher"]').click();
      const boxes = await page.evaluate(() => {
        const menu = document.querySelector('[data-pd-id="lab.header-menu"]')!.getBoundingClientRect();
        return { scroll: document.documentElement.scrollWidth, viewport: innerWidth, menuLeft: menu.left, menuRight: menu.right };
      });
      expect(boxes.scroll).toBeLessThanOrEqual(boxes.viewport + 1);
      expect(boxes.menuLeft).toBeGreaterThanOrEqual(0);
      expect(boxes.menuRight).toBeLessThanOrEqual(boxes.viewport + 1);
      await page.keyboard.press("Escape");
      await expect(page.locator('[data-pd-id="lab.header-trigger.launcher"]')).toBeFocused();
      if (evidence && (width === 900 || width === 390)) await capture(page, `after-position-${width}-${theme}.png`);
    }
  }
});

test("actual Chromium 200% browser zoom retains global navigation", async () => {
  const baseURL = process.env.OPENFORGE_E2E_BASE_URL ?? "http://127.0.0.1:3010";
  const scratch = await mkdtemp(join(tmpdir(), "pd-cp115c-zoom-"));
  const extension = join(scratch, "extension");
  await mkdir(extension);
  await writeFile(join(extension, "manifest.json"), JSON.stringify({ manifest_version: 3, name: "Temporary CP-115C zoom check", version: "1.0", permissions: ["tabs"], background: { service_worker: "background.js" } }));
  await writeFile(join(extension, "background.js"), "chrome.runtime.onInstalled.addListener(() => {});");
  const context = await chromium.launchPersistentContext(join(scratch, "profile"), { channel: "chromium", headless: true, viewport: { width: 1440, height: 900 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try {
    const page = await context.newPage();
    await enterLab(page);
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    await worker.evaluate(async url => { const tabs = (globalThis as unknown as { chrome: { tabs: { query: (filter: { url: string }) => Promise<Array<{ id: number }>>; setZoom: (id: number, zoom: number) => Promise<void> } } }).chrome.tabs; const matches = await tabs.query({ url: `${url}/*` }); await tabs.setZoom(matches[0].id, 2); }, baseURL);
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(720);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).zoom)).toBe("1");
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.locator('[data-pd-id="lab.nav.reports"]')).toBeVisible();
    await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
    await expect(page.locator('[data-pd-id="lab.ledger.sportsbook"]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    if (evidence) await capture(page, "after-sportsbook-actual-zoom-200.png");
  } finally { await context.close(); await rm(scratch, { recursive: true, force: true }); }
});

test("Tracker expansion and launcher previews keep a direct Position route", async ({ page }) => {
  await enterLab(page);
  const expand = page.locator('[data-pd-id="lab.nav.tracker-expand"]');
  await expand.click();
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator('[data-pd-id="lab.nav.sportsbook"]')).toHaveCount(0);
  await expand.click();
  await expect(page.locator('[data-pd-id="lab.nav.sportsbook"]')).toBeVisible();
  const launcher = page.locator('[data-pd-id="lab.header-trigger.launcher"]');
  for (const id of ["calculators", "oddsmatcher", "subscribers"] as const) {
    await launcher.click();
    await expect(page.locator('[data-pd-id="lab.launcher"]')).toBeVisible();
    await page.locator(`[data-pd-id="lab.launcher.${id}"]`).click();
    await expect(page.locator(`[data-pd-id="lab.tool.${id}"]`)).toBeVisible();
    await page.locator('[data-pd-id="lab.nav.home"]').click();
  }
  await launcher.click();
  await page.keyboard.press("Escape");
  await expect(launcher).toBeFocused();
});

test("search inspection preserves global scope and navigation on narrow layouts", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 900 });
  await enterLab(page);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.locator('[data-pd-id="lab.nav.reports"]').click();
  await expect(page.locator('[data-pd-id="lab.breadcrumb"]')).not.toContainText("Tracker");
  await page.getByRole("button", { name: "Open search" }).click();
  await page.locator('[data-pd-id="lab.search"]').fill("Profile B example");
  await expect(page.locator('[data-pd-id="lab.search-results"]')).toContainText("Profile B");
  await page.locator('[data-pd-id="lab.search-results"]').getByRole("button", { name: /Profile B example/ }).first().click();
  await expect(page.locator('[data-pd-id="lab.record-detail"]')).toContainText("Owner: Profile B");
  await expect(page.locator('[data-pd-id="lab.profile"]')).toContainText("All Profiles");
  await page.getByRole("button", { name: "Back to Reports" }).click();
  await expect(page.locator('[data-pd-id="lab.reports"]')).toBeVisible();
  await capture(page, "after-reports-430.png");
  const geometry = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  expect(geometry.scroll).toBeLessThanOrEqual(geometry.width);
  if (evidence) await writeFile(join(evidence, "navigation-430-geometry.json"), JSON.stringify(geometry, null, 2));
});
