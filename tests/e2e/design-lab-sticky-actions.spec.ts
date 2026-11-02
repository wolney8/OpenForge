import { chromium, expect, test } from "@playwright/test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const evidence = process.env.OPENFORGE_DESIGN_LAB_EVIDENCE_DIR;
const phase = process.env.OPENFORGE_LEDGER_PIN_PHASE ?? "after";
const ledgers = ["sportsbook", "freeBets", "casino", "extraPlace", "cash", "accounts"] as const;
async function openLedger(page: import("@playwright/test").Page, ledger: typeof ledgers[number]) {
  const destination = page.locator(`[data-pd-id="lab.nav.${ledger}"]`);
  if (!(await destination.isVisible())) await page.getByRole("button", { name: "Open navigation" }).click();
  await destination.click();
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async route => {
    if (route.request().url().endsWith("/api/auth/session")) return route.fulfill({ json: { authenticated: true, email: "demo@example.invalid", expires_at: 4102444800, role: "fund_manager", session_policy: { absolute_expires_at: 4102444800, auto_logout_enabled: false, effective_expires_at: 4102444800, inactivity_expires_at: null, last_activity_at: 1, preference_configured: true, timeout_minutes: 30, valid_now: true } } });
    if (route.request().url().endsWith("/api/auth/activity")) return route.fulfill({ json: { ok: true } });
    throw new Error(`Unexpected lab API request: ${route.request().url()}`);
  });
  await page.goto("/design-lab");
  await expect(page.locator('[data-pd-id="design-lab-connected.root"]')).toBeVisible();
});

test("Actions header and row cells stay aligned while every lab ledger scrolls", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 900 });
  for (const ledger of ledgers) {
    await openLedger(page, ledger);
    const scroll = page.locator(`[data-pd-id="lab.ledger-pan.${ledger}"]`);
    await expect(scroll.locator("tbody tr").first()).toBeVisible();
    const geometry = await scroll.evaluate(node => {
      const scroller = node as HTMLElement;
      const max = scroller.scrollWidth - scroller.clientWidth;
      scroller.scrollLeft = Math.min(180, max / 2);
      const header = scroller.querySelector("thead th:last-child") as HTMLElement;
      const cell = scroller.querySelector("tbody tr td:last-child") as HTMLElement;
      const h = header.getBoundingClientRect(), c = cell.getBoundingClientRect(), s = scroller.getBoundingClientRect();
      const action = cell.querySelector("button")?.getBoundingClientRect();
      return { max, left: scroller.scrollLeft, headerRight: h.right, cellRight: c.right, headerWidth: h.width, cellWidth: c.width, viewportRight: s.right, cellPosition: getComputedStyle(cell).position, actionRight: action?.right ?? 0, actionVisible: !!action };
    });
    expect(geometry.max, ledger).toBeGreaterThan(80);
    expect(geometry.left, ledger).toBeGreaterThan(0);
    if (ledger === "sportsbook") console.log(JSON.stringify({ phase, ledger, geometry }));
    if (evidence && (ledger === "sportsbook" || ledger === "freeBets")) {
      await mkdir(evidence, { recursive: true });
      await page.screenshot({ path: join(evidence, `${phase}-${ledger}-scrolled-900-dark.png`), fullPage: false, style: "nextjs-portal { display: none !important; }" });
    }
    if (phase === "before") continue;
    expect(geometry.cellPosition, ledger).toBe("sticky");
    expect(Math.abs(geometry.cellRight - geometry.headerRight), ledger).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.cellWidth - geometry.headerWidth), ledger).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.cellRight - geometry.viewportRight), ledger).toBeLessThanOrEqual(3);
    expect(geometry.actionVisible, ledger).toBe(true);
    expect(geometry.actionRight, ledger).toBeLessThanOrEqual(geometry.viewportRight);
    await expect(scroll.locator("tbody tr").first().locator("td:last-child button")).toBeVisible();
    if (ledger === "sportsbook") {
      await scroll.locator("tbody tr").first().locator("td:last-child button").click();
      await expect(page.locator('[data-pd-id="lab.record-detail"]')).toBeVisible();
      await page.getByRole("button", { name: "Back to Sportsbook Bets" }).click();
      expect(await scroll.evaluate(node => (node as HTMLElement).scrollLeft)).toBeGreaterThan(0);
    }
  }
});

test("actual Chromium 200% zoom keeps scrolled Actions aligned and clickable", async () => {
  if (phase === "before") return;
  const baseURL = process.env.OPENFORGE_E2E_BASE_URL ?? "http://127.0.0.1:3010";
  const scratch = await mkdtemp(join(tmpdir(), "pd-actions-zoom-"));
  const extension = join(scratch, "extension");
  await mkdir(extension);
  await writeFile(join(extension, "manifest.json"), JSON.stringify({ manifest_version: 3, name: "Temporary ledger zoom check", version: "1.0", permissions: ["tabs"], background: { service_worker: "background.js" } }));
  await writeFile(join(extension, "background.js"), "chrome.runtime.onInstalled.addListener(() => {});");
  const context = await chromium.launchPersistentContext(join(scratch, "profile"), { channel: "chromium", headless: true, viewport: { width: 1440, height: 900 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try {
    const page = await context.newPage();
    await page.route("**/api/**", async route => {
      if (route.request().url().endsWith("/api/auth/session")) return route.fulfill({ json: { authenticated: true, email: "demo@example.invalid", expires_at: 4102444800, role: "fund_manager", session_policy: { absolute_expires_at: 4102444800, auto_logout_enabled: false, effective_expires_at: 4102444800, inactivity_expires_at: null, last_activity_at: 1, preference_configured: true, timeout_minutes: 30, valid_now: true } } });
      if (route.request().url().endsWith("/api/auth/activity")) return route.fulfill({ json: { ok: true } });
      throw new Error(`Unexpected lab API request: ${route.request().url()}`);
    });
    await page.goto(`${baseURL}/design-lab`);
    await page.getByRole("button", { name: "Open Sportsbook" }).click();
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    await worker.evaluate(async url => { const tabs = (globalThis as unknown as { chrome: { tabs: { query: (filter: { url: string }) => Promise<Array<{ id: number }>>; setZoom: (id: number, zoom: number) => Promise<void> } } }).chrome.tabs; const matches = await tabs.query({ url: `${url}/*` }); await tabs.setZoom(matches[0].id, 2); }, baseURL);
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(720);
    const scroll = page.locator('[data-pd-id="lab.ledger-pan.sportsbook"]');
    const delta = await scroll.evaluate(node => { const scroller = node as HTMLElement; scroller.scrollLeft = 180; const h = scroller.querySelector("thead th:last-child")!.getBoundingClientRect(), c = scroller.querySelector("tbody tr td:last-child")!.getBoundingClientRect(); return Math.abs(h.right - c.right); });
    expect(delta).toBeLessThanOrEqual(1);
    if (evidence) { await mkdir(evidence, { recursive: true }); await scroll.scrollIntoViewIfNeeded(); await scroll.evaluate(node => { (node as HTMLElement).scrollLeft = 180; }); await page.screenshot({ path: join(evidence, "after-sportsbook-scrolled-actual-zoom-200.png"), fullPage: false }); }
    await scroll.locator("tbody tr").first().locator("td:last-child button").click();
    await expect(page.locator('[data-pd-id="lab.record-detail"]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  } finally { await context.close(); await rm(scratch, { recursive: true, force: true }); }
});

test("pinned Actions remain visible in both themes and narrow table view", async ({ page }) => {
  await openLedger(page, "sportsbook");
  for (const width of [1440, 430, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["dark", "light"]) {
      await page.evaluate(value => document.documentElement.setAttribute("data-theme", value), theme);
      const scroll = page.locator('[data-pd-id="lab.ledger-pan.sportsbook"]');
      const geometry = await scroll.evaluate(node => {
        const scroller = node as HTMLElement;
        scroller.scrollLeft = Math.min(180, (scroller.scrollWidth - scroller.clientWidth) / 2);
        const header = scroller.querySelector("thead th:last-child") as HTMLElement;
        const cell = scroller.querySelector("tbody tr td:last-child") as HTMLElement;
        return { headerRight: header.getBoundingClientRect().right, cellRight: cell.getBoundingClientRect().right, position: getComputedStyle(cell).position, width: cell.getBoundingClientRect().width };
      });
      if (evidence && (width === 1440 || width === 390)) {
        await mkdir(evidence, { recursive: true });
        if (width === 390) { await scroll.scrollIntoViewIfNeeded(); await scroll.evaluate(node => { (node as HTMLElement).scrollLeft = 180; }); }
        await page.screenshot({ path: join(evidence, `${phase}-sportsbook-scrolled-${width}-${theme}.png`), fullPage: false });
      }
      if (phase === "before") continue;
      expect(geometry.position, `${width}/${theme}`).toBe("sticky");
      expect(Math.abs(geometry.cellRight - geometry.headerRight), `${width}/${theme}`).toBeLessThanOrEqual(1);
      expect(geometry.width, `${width}/${theme}`).toBeGreaterThanOrEqual(60);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${width}/${theme}`).toBeLessThanOrEqual(1);
    }
  }
});
