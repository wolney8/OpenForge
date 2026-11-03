import { chromium, expect, test } from "@playwright/test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const evidence = process.env.OPENFORGE_DESIGN_LAB_EVIDENCE_DIR;
test.use({ video: "on" });

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async route => {
    if (route.request().url().endsWith("/api/auth/session")) {
      await route.fulfill({ json: { authenticated: true, email: "demo@example.invalid", role: "fund_manager", expires_at: 4102444800, session_policy: { absolute_expires_at: 4102444800, auto_logout_enabled: false, effective_expires_at: 4102444800, inactivity_expires_at: null, last_activity_at: 1, preference_configured: true, timeout_minutes: 30, valid_now: true } } });
      return;
    }
    if (route.request().url().endsWith("/api/auth/activity")) { await route.fulfill({ json: { ok: true } }); return; }
    throw new Error(`Unexpected Design Lab API call: ${route.request().url()}`);
  });
  await page.goto("/design-lab");
  await page.locator('[data-pd-id="lab.nav.tasks"]').click();
});

async function trackAllSections(page: import("@playwright/test").Page) {
  const today = page.locator('[data-pd-id="lab.today"]');
  for (const section of ["needs-action", "recurring-work", "opportunities-and-suggestions"]) {
    const button = today.locator(`[data-pd-id="lab.today.bulk.${section}"]`);
    if (await button.count()) await button.click();
  }
}

test("populated tracked preview stays bounded and urgent actions remain clickable", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const today = page.locator('[data-pd-id="lab.today"]');
  await expect(today.locator('[data-pd-id^="lab.today.bulk."]')).toHaveCount(3);
  await expect(today.getByRole("heading", { name: "Past Recorded Date" }).locator("..").locator("button")).toHaveCount(0);
  await trackAllSections(page);
  const trigger = page.locator('[data-pd-id="lab.header-trigger.tracked"]');
  const trackedCount = Number((await trigger.getAttribute("aria-label"))?.match(/(\d+) active/)?.[1]);
  expect(trackedCount).toBeGreaterThanOrEqual(13);
  await trigger.click();
  const panel = page.locator('[data-pd-id="lab.header-tracked-panel"]');
  await expect(panel.locator('[data-pd-id^="lab.header-tracked-task."]')).toHaveCount(5);
  await expect(trigger.locator("span").last()).toHaveText(String(trackedCount));
  if (evidence) await page.screenshot({ path: `${evidence}/cp117-today-tracked-preview-after.png`, fullPage: true, style: "nextjs-portal { display: none !important; }" });
  await expect(page.locator('[data-pd-id="lab.active-task"] [data-pd-id^="lab.tracked-task."]')).toHaveCount(0);
  const geometry = await panel.evaluate(panelNode => {
    const surface = panelNode.closest('[data-pd-id="lab.header-menu"]')!;
    const surfaceRect = surface.getBoundingClientRect();
    const rows = [...panelNode.querySelectorAll<HTMLElement>('[data-pd-id^="lab.header-tracked-task."]')];
    return { surface: { left: surfaceRect.left, right: surfaceRect.right, top: surfaceRect.top, bottom: surfaceRect.bottom }, rows: rows.map(row => {
      const rect = row.getBoundingClientRect();
      const buttons = [...row.querySelectorAll("button")].map(button => { const r = button.getBoundingClientRect(); return { left:r.left, right:r.right, top:r.top, bottom:r.bottom }; });
      return { left:rect.left, right:rect.right, top:rect.top, bottom:rect.bottom, buttons };
    }) };
  });
  expect(geometry.surface.left).toBeGreaterThanOrEqual(0);
  expect(geometry.surface.right).toBeLessThanOrEqual(1440);
  expect(geometry.surface.bottom).toBeLessThanOrEqual(900);
  for (const row of geometry.rows) {
    expect(row.right).toBeLessThanOrEqual(geometry.surface.right);
    for (const button of row.buttons) {
      expect(button.left).toBeGreaterThanOrEqual(row.left);
      expect(button.right).toBeLessThanOrEqual(row.right);
      expect(button.bottom).toBeLessThanOrEqual(row.bottom);
    }
  }
  const overdue = panel.locator('[data-pd-id="lab.header-tracked-task.task:LAB-SB-OVERDUE"]');
  const partial = panel.locator('[data-pd-id="lab.header-tracked-task.task:LAB-SB-PARTIAL"]');
  await expect(overdue).toHaveClass(/trackedUrgent/);
  await expect(partial).toHaveClass(/trackedUrgent/);
  await expect(overdue.getByRole("button", { name: /Mark .* Done/ })).toHaveCount(0);
  await expect(overdue.getByRole("button", { name: "Resolve Source" })).toBeVisible();
  await overdue.getByRole("button", { name: /Untrack/ }).click();
  await expect(trigger).toHaveAttribute("aria-label", `Tracked Tasks, ${trackedCount - 1} active`);
  await expect(partial.getByRole("button", { name: "Resolve Source" })).toBeFocused();
  await panel.getByRole("button", { name: "View All Tracked Tasks" }).click();
  await expect(today).toBeVisible();
  await expect(page.locator('[data-pd-id="lab.active-task"] [data-pd-id^="lab.tracked-task."]')).toHaveCount(trackedCount - 1);
  await expect(page.locator('[data-pd-id="lab.active-task.toggle"]')).toBeFocused();
  if (evidence) await page.screenshot({ path: `${evidence}/cp117-today-tracked-full-after.png`, fullPage: true, style: "nextjs-portal { display: none !important; }" });
  await trigger.click();
  const keyboardSource = page.locator('[data-pd-id="lab.header-tracked-task.task:LAB-SB-PARTIAL"]').getByRole("button", { name: "Resolve Source" });
  await keyboardSource.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-pd-id="lab.record-detail"]')).toContainText("LAB-SB-PARTIAL");
});

test("Board bulk tracking respects scope without duplicate identities", async ({ page }) => {
  const today = page.locator('[data-pd-id="lab.today"]');
  await today.getByRole("button", { name: "Board", exact: true }).click();
  const board = today.locator('[data-pd-id="lab.today.board"]');
  const todo = board.locator('[data-lab-board-state="To Do"]');
  await todo.locator('[data-pd-id="lab.today.bulk.to-do"]').click();
  const count = Number((await page.locator('[data-pd-id="lab.header-trigger.tracked"]').getAttribute("aria-label"))?.match(/(\d+) active/)?.[1]);
  expect(count).toBeGreaterThan(0);
  await expect(todo.locator('[data-pd-id="lab.today.bulk.to-do"]')).toContainText("Untrack All");
  await page.locator('[data-pd-id="lab.header-trigger.tracked"]').click();
  await expect(page.locator('[data-pd-id="lab.header-tracked-panel"] [data-pd-id^="lab.header-tracked-task."]')).toHaveCount(Math.min(5,count));
  if (evidence) await page.screenshot({ path: `${evidence}/cp117-today-board-after.png`, fullPage: true, style: "nextjs-portal { display: none !important; }" });
});

test("more than thirteen tracked tasks keep a five-item preview at narrow width", async ({ page }) => {
  await trackAllSections(page);
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  const strategy = page.locator('tr[data-lab-row-id="LAB-SB-PROSPECT-B"] td[data-lab-column="5"]');
  await strategy.dblclick();
  await page.locator('[data-pd-id="lab.floating-cell-editor"]').getByRole("option", { name: "Underlay", exact: true }).click();
  await page.locator('[data-pd-id="lab.nav.tasks"]').click();
  const review = page.locator('[data-pd-id="lab.task.review:LAB-SB-PROSPECT-B:dependencies"]');
  await review.click();
  await page.locator('[data-pd-id="lab.task-track.review:LAB-SB-PROSPECT-B:dependencies"]').click();
  const trigger = page.locator('[data-pd-id="lab.header-trigger.tracked"]');
  await expect(trigger).toHaveAttribute("aria-label", "Tracked Tasks, 14 active");
  await page.setViewportSize({ width: 390, height: 850 });
  await page.getByRole("button", { name: "Close Task Details" }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  if (evidence) await page.screenshot({ path: `${evidence}/cp117-today-tracked-14-mobile-before-open.png`, fullPage: true, style: "nextjs-portal { display: none !important; }" });
  await trigger.click();
  const surface = page.locator('[data-pd-id="lab.header-menu"]');
  const panel = page.locator('[data-pd-id="lab.header-tracked-panel"]');
  await expect(panel.locator('[data-pd-id^="lab.header-tracked-task."]')).toHaveCount(5);
  const rect = await surface.evaluate(node => { const r = node.getBoundingClientRect(); return { left:r.left, right:r.right, top:r.top, bottom:r.bottom }; });
  expect(rect.left).toBeGreaterThanOrEqual(0);
  expect(rect.right).toBeLessThanOrEqual(390);
  expect(rect.top).toBeGreaterThanOrEqual(0);
  expect(rect.bottom).toBeLessThanOrEqual(850);
  await panel.getByRole("button", { name: "View All Tracked Tasks" }).click();
  const bannerRows = page.locator('[data-pd-id="lab.active-task"] [data-pd-id^="lab.tracked-task."]');
  await expect(bannerRows).toHaveCount(14);
  const bannerGeometry = await page.locator('[data-pd-id="lab.active-task"] [class*="trackedRows"]').evaluate(node => {
    const rows = [...node.querySelectorAll<HTMLElement>('[data-pd-id^="lab.tracked-task."]')];
    return { scrollHeight: node.scrollHeight, clientHeight: node.clientHeight, rows: rows.map(row => {
      const bounds = row.getBoundingClientRect();
      const actions = row.querySelector<HTMLElement>('[class*="trackedActions"]')!.getBoundingClientRect();
      return { top: bounds.top, bottom: bounds.bottom, actionTop: actions.top, actionBottom: actions.bottom };
    }) };
  });
  expect(bannerGeometry.scrollHeight).toBeGreaterThan(bannerGeometry.clientHeight);
  for (const [index, row] of bannerGeometry.rows.entries()) {
    expect(row.actionTop).toBeGreaterThanOrEqual(row.top);
    expect(row.actionBottom).toBeLessThanOrEqual(row.bottom);
    if (index) expect(row.top).toBeGreaterThanOrEqual(bannerGeometry.rows[index - 1].bottom - 1);
  }
  if (evidence) await page.screenshot({ path: `${evidence}/cp117-today-tracked-14-mobile-after.png`, fullPage: true, style: "nextjs-portal { display: none !important; }" });
  await bannerRows.last().getByRole("button", { name: /Untrack/ }).click();
  await expect(trigger).toHaveAttribute("aria-label", "Tracked Tasks, 13 active");
});

test("thirteen tracked tasks remain actionable at actual Chromium 200% zoom", async ({}, info) => {
  const baseURL = String(info.project.use.baseURL);
  const scratch = await mkdtemp(join(tmpdir(), "pd-cp117-tracked-zoom-"));
  const extension = join(scratch, "extension");
  await mkdir(extension);
  await writeFile(join(extension, "manifest.json"), JSON.stringify({ manifest_version: 3, name: "Temporary tracked-task zoom check", version: "1.0", permissions: ["tabs"], background: { service_worker: "background.js" } }));
  await writeFile(join(extension, "background.js"), "chrome.runtime.onInstalled.addListener(() => {});");
  const context = await chromium.launchPersistentContext(join(scratch, "profile"), { channel: "chromium", headless: true, viewport: { width: 1440, height: 900 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try {
    await context.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
    const page = await context.newPage();
    await page.route("**/api/**", async route => {
      if (route.request().url().endsWith("/api/auth/session")) { await route.fulfill({ json: { authenticated: true, email: "demo@example.invalid", role: "fund_manager", expires_at: 4102444800, session_policy: { absolute_expires_at: 4102444800, auto_logout_enabled: false, effective_expires_at: 4102444800, inactivity_expires_at: null, last_activity_at: 1, preference_configured: true, timeout_minutes: 30, valid_now: true } } }); return; }
      if (route.request().url().endsWith("/api/auth/activity")) { await route.fulfill({ json: { ok: true } }); return; }
      throw new Error(`Unexpected Design Lab API call: ${route.request().url()}`);
    });
    await page.goto(`${baseURL}/design-lab`);
    await page.locator('[data-pd-id="lab.nav.tasks"]').click();
    await trackAllSections(page);
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    await worker.evaluate(async url => { const tabs = (globalThis as unknown as { chrome: { tabs: { query: (filter: { url: string }) => Promise<Array<{ id: number }>>; setZoom: (id: number, zoom: number) => Promise<void> } } }).chrome.tabs; const matches = await tabs.query({ url: `${url}/*` }); await tabs.setZoom(matches[0].id, 2); }, baseURL);
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(720);
    const trigger = page.locator('[data-pd-id="lab.header-trigger.tracked"]');
    await trigger.click();
    const panel = page.locator('[data-pd-id="lab.header-tracked-panel"]');
    await expect(panel.locator('[data-pd-id^="lab.header-tracked-task."]')).toHaveCount(5);
    const surface = page.locator('[data-pd-id="lab.header-menu"]');
    const box = await surface.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(720);
    expect(box!.y + box!.height).toBeLessThanOrEqual(450);
    const zoomGeometry = await panel.evaluate(node => ({
      panelWidth: node.clientWidth,
      panelScrollWidth: node.scrollWidth,
      rows: [...node.querySelectorAll<HTMLElement>('[data-pd-id^="lab.header-tracked-task."]')].map(row => {
        const rect = row.getBoundingClientRect();
        const title = row.querySelector("strong")!;
        const metadata = row.querySelector("small")!;
        return { left: rect.left, right: rect.right, scrollWidth: row.scrollWidth, clientWidth: row.clientWidth, titleClipped: title.scrollHeight > title.clientHeight + 1, metadataClipped: metadata.scrollHeight > metadata.clientHeight + 1, actions: [...row.querySelectorAll("button")].map(button => { const control = button.getBoundingClientRect(); return { left: control.left, right: control.right }; }) };
      }),
    }));
    expect(zoomGeometry.panelScrollWidth).toBeLessThanOrEqual(zoomGeometry.panelWidth + 1);
    for (const row of zoomGeometry.rows) {
      expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth + 1);
      expect(row.titleClipped).toBe(false);
      expect(row.metadataClipped).toBe(false);
      for (const action of row.actions) {
        expect(action.left).toBeGreaterThanOrEqual(row.left);
        expect(action.right).toBeLessThanOrEqual(row.right);
      }
    }
    await panel.locator('[data-pd-id="lab.header-tracked-task.task:LAB-SB-OVERDUE"]').getByRole("button", { name: "Resolve Source" }).click();
    await expect(page.locator('[data-pd-id="lab.record-detail"]')).toContainText("LAB-SB-OVERDUE");
  } finally {
    await context.close();
    await rm(scratch, { recursive: true, force: true });
  }
});
