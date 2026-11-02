import { chromium, expect, test } from "@playwright/test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const evidence = process.env.OPENFORGE_DESIGN_LAB_EVIDENCE_DIR;
async function capture(page: import("@playwright/test").Page, name: string) {
  if (!evidence) return;
  await mkdir(evidence, { recursive: true });
  await page.screenshot({ path: join(evidence, name), fullPage: true, style: "nextjs-portal { display: none !important; }" });
}
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

test("tracks three unique tasks across navigation and untracks one", async ({ page }) => {
  const ids = ["task:LAB-SB-OVERDUE", "reload", "casino-daily-a"];
  for (const id of ids) {
    if (id === "casino-daily-a") await page.locator('[data-pd-id="lab.today.recurring-free-spins"]').click();
    await page.locator(`[data-pd-id="lab.task.${id}"]`).click();
    const track = page.locator(`[data-pd-id="lab.task-track.${id}"]`);
    await track.click();
    await expect(track).toHaveText("Untrack");
  }
  const tray = page.locator('[data-pd-id="lab.active-task"]');
  await expect(tray).toContainText("Tracked Tasks (3)");
  await expect(tray.locator('[data-pd-id^="lab.tracked-task."]')).toHaveCount(3);
  await tray.getByRole("button", { name: "Collapse Tracked Tasks" }).click();
  await expect(tray).toContainText("Tracked Tasks (3)");
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  await expect(tray).toContainText("Tracked Tasks (3)");
  await tray.getByRole("button", { name: "Expand Tracked Tasks" }).click();
  await tray.locator('[data-pd-id="lab.tracked-task.reload"]').getByRole("button", { name: /Untrack/ }).click();
  await expect(tray).toContainText("Tracked Tasks (2)");
  await expect(tray.locator('[data-pd-id="lab.tracked-task.reload"]')).toHaveCount(0);
  await capture(page, "tracked-three-desktop-dark.png");
});

test("Board keeps five fixed columns, suggestions and scroll under overlay drawer", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 850 });
  const today = page.locator('[data-pd-id="lab.today"]');
  await today.getByRole("button", { name: "Board", exact: true }).click();
  const board = today.locator('[data-pd-id="lab.today.board"]');
  const columns = board.locator('[data-lab-board-state]');
  await expect(columns).toHaveCount(5);
  expect(await columns.evaluateAll(nodes => nodes.map(node => Math.round(node.getBoundingClientRect().width)))).toEqual([280,280,280,280,280]);
  await expect(board.locator('[data-pd-id="lab.task.signup"]')).toContainText("Advisory");
  const widthBefore = await board.evaluate(node => node.getBoundingClientRect().width);
  const card = board.locator('[data-pd-id="lab.task.task:LAB-SB-OVERDUE"]');
  await card.click();
  await expect(today.getByRole("complementary", { name: "Task Details" })).toBeVisible();
  expect(await board.evaluate(node => node.getBoundingClientRect().width)).toBe(widthBefore);
  await board.evaluate(node => { node.scrollLeft = 500; });
  await expect.poll(() => board.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
  await capture(page, "board-drawer-900-dark.png");
  await page.keyboard.press("Escape");
  await expect(card).toBeFocused();
  await expect.poll(() => board.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
});

test("urgent source surface persists through work states and metadata stays separate", async ({ page }) => {
  const task = page.locator('[data-pd-id="lab.task.task:LAB-SB-OVERDUE"]');
  await task.click();
  const selectedUrgent = await task.evaluate(node => getComputedStyle(node).backgroundColor);
  const detail = page.locator('[data-pd-id="lab.today.detail"]');
  const select = detail.getByRole("combobox", { name: /Work State/ });
  await select.click(); await page.getByRole("option", { name: "Blocked" }).click();
  await detail.getByRole("textbox", { name: /blocked reason/i }).fill("Awaiting external result");
  await select.click(); await page.getByRole("option", { name: "Do Later" }).click();
  await detail.getByLabel(/resume date/i).fill("2026-11-04");
  await expect(detail).toContainText("Review Date");
  await expect(detail).toContainText("Blocked Reason");
  await expect(detail).toContainText("Event passed 30 Oct");
  expect(await task.evaluate(node => getComputedStyle(node).backgroundColor)).toBe(selectedUrgent);
  await page.locator('[data-pd-id="lab.today"]').getByRole("button", { name: "Board", exact: true }).click();
  await expect(page.locator('[data-lab-board-state="Do Later"] [data-pd-id="lab.task.task:LAB-SB-OVERDUE"]')).toContainText("Review 2026-11-04");
  await expect(page.locator('[data-lab-board-state="Do Later"] [data-pd-id="lab.task.task:LAB-SB-OVERDUE"]')).toContainText("Event passed 30 Oct");
  await capture(page, "board-do-later-1440-dark.png");
});

test("both themes and narrow Board keep local scrolling without page overflow", async ({ page }) => {
  const today = page.locator('[data-pd-id="lab.today"]');
  await today.getByRole("button", { name: "Board", exact: true }).click();
  for (const width of [1440, 768, 430, 390]) {
    await page.setViewportSize({ width, height: 850 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await expect(today.locator('[data-pd-id="lab.today.board"]')).toBeVisible();
    await capture(page, `board-${width}-dark.png`);
  }
  await page.locator('[data-pd-id="lab.header-trigger.identity"]').click();
  await page.locator('[data-pd-id="lab.identity.dark-mode"]').click();
  await page.keyboard.press("Escape");
  await capture(page, "board-390-light.png");
});

test("actual Chromium 200% zoom keeps Board and tracked tray contained", async () => {
  const baseURL = process.env.OPENFORGE_E2E_BASE_URL ?? "http://127.0.0.1:3010";
  const scratch = await mkdtemp(join(tmpdir(), "pd-cp118c-zoom-"));
  const extension = join(scratch, "extension");
  await mkdir(extension);
  await writeFile(join(extension,"manifest.json"),JSON.stringify({manifest_version:3,name:"Temporary CP-118C zoom check",version:"1.0",permissions:["tabs"],background:{service_worker:"background.js"}}));
  await writeFile(join(extension,"background.js"),"chrome.runtime.onInstalled.addListener(() => {});");
  const context = await chromium.launchPersistentContext(join(scratch,"profile"),{channel:"chromium",headless:true,viewport:{width:1440,height:900},args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
  try {
    const page = await context.newPage();
    await page.route("**/api/**", async route => {
      if (route.request().url().endsWith("/api/auth/session")) { await route.fulfill({json:{authenticated:true,email:"demo@example.invalid",role:"fund_manager",expires_at:4102444800,session_policy:{absolute_expires_at:4102444800,auto_logout_enabled:false,effective_expires_at:4102444800,inactivity_expires_at:null,last_activity_at:1,preference_configured:true,timeout_minutes:30,valid_now:true}}}); return; }
      if (route.request().url().endsWith("/api/auth/activity")) { await route.fulfill({json:{ok:true}}); return; }
      throw new Error(`Unexpected Design Lab API call: ${route.request().url()}`);
    });
    await page.goto(`${baseURL}/design-lab`);
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    await worker.evaluate(async url => { const tabs=(globalThis as unknown as {chrome:{tabs:{query:(filter:{url:string})=>Promise<Array<{id:number}>>;setZoom:(id:number,zoom:number)=>Promise<void>}}}).chrome.tabs;const matches=await tabs.query({url:`${url}/*`});await tabs.setZoom(matches[0].id,2); },baseURL);
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(720);
    await page.getByRole("button",{name:"Open navigation"}).click();
    await page.locator('[data-pd-id="lab.nav.tasks"]').click();
    await page.locator('[data-pd-id="lab.today"]').getByRole("button",{name:"Board",exact:true}).click();
    await page.locator('[data-pd-id="lab.task.task:LAB-SB-OVERDUE"]').click();
    await page.locator('[data-pd-id="lab.today.detail"]').getByRole("button",{name:"Track Task"}).click();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    await expect(page.locator('[data-pd-id="lab.active-task"]')).toBeVisible();
    await capture(page,"board-actual-200-percent.png");
  } finally { await context.close(); await rm(scratch,{recursive:true,force:true}); }
});
