import { chromium, expect, test } from "@playwright/test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const evidence = process.env.OPENFORGE_DESIGN_LAB_EVIDENCE_DIR;
async function capture(page: import("@playwright/test").Page, name: string) {
  if (evidence) await page.screenshot({ path: `${evidence}/${name}`, fullPage: true, style: "nextjs-portal { display: none !important; }" });
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

async function track(page: import("@playwright/test").Page, id: string) {
  if (id === "casino-daily-a") await page.locator('[data-pd-id="lab.today.recurring-free-spins"]').click();
  await page.locator(`[data-pd-id="lab.task.${id}"]`).click();
  await page.locator(`[data-pd-id="lab.task-track.${id}"]`).click();
}

test("header tracked panel, three banner states, X removal and source urgency", async ({ page }) => {
  for (const id of ["task:LAB-SB-OVERDUE", "reload", "casino-daily-a"]) await track(page,id);
  const trigger = page.locator('[data-pd-id="lab.header-trigger.tracked"]');
  const banner = page.locator('[data-pd-id="lab.active-task"]');
  await expect(trigger).toHaveAttribute("aria-label", "Tracked Tasks, 3 active");
  await expect(banner.locator('[data-pd-id="lab.tracked-task.task:LAB-SB-OVERDUE"]')).toHaveClass(/trackedUrgent/);
  await banner.getByRole("button",{name:"Collapse Tracked Tasks"}).click();
  await expect(banner.locator('[data-pd-id^="lab.tracked-task."]')).toHaveCount(0);
  await banner.getByRole("button",{name:"Expand Tracked Tasks"}).click();
  await banner.getByRole("button",{name:"Hide Tracked Tasks Banner"}).click();
  await expect(banner).toHaveCount(0);
  await trigger.click();
  const panel = page.locator('[data-pd-id="lab.header-tracked-panel"]');
  await expect(panel.locator('[data-pd-id^="lab.header-tracked-task."]')).toHaveCount(3);
  await panel.locator('[data-pd-id="lab.header-tracked-task.reload"]').getByRole("button",{name:/Untrack/}).click();
  await expect(trigger).toHaveAttribute("aria-label", "Tracked Tasks, 2 active");
  await panel.getByRole("button",{name:"Show Full Banner"}).click();
  await expect(banner.locator('[data-pd-id^="lab.tracked-task."]')).toHaveCount(2);
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  await expect(trigger).toHaveAttribute("aria-label", "Tracked Tasks, 2 active");
  await capture(page,"tracked-banner-desktop-dark.png");
});

test("Board click-away, trigger switching and typed Today counts", async ({ page }) => {
  const today = page.locator('[data-pd-id="lab.today"]');
  await expect(today).toContainText("3 Needs Attention");
  await expect(today).toContainText("2 Routine Checks Due");
  await expect(today).toContainText("4 Upcoming");
  await today.getByRole("button",{name:"Board",exact:true}).click();
  const board = today.locator('[data-pd-id="lab.today.board"]');
  await board.locator('[data-pd-id="lab.task.task:LAB-SB-OVERDUE"]').click();
  await expect(today.getByRole("complementary",{name:"Task Details"})).toBeVisible();
  await board.locator('[data-lab-board-state="To Do"] h2').click();
  await expect(today.getByRole("complementary",{name:"Task Details"})).toHaveCount(0);
  await board.locator('[data-pd-id="lab.task.task:LAB-SB-PARTIAL"]').click();
  await expect(today.locator('[data-pd-id="lab.today.detail"]')).toContainText("Review Partial Lay");
  await page.locator('[data-pd-id="lab.header-trigger.notifications"]').click();
  await expect(page.getByRole("region",{name:"Notifications"})).toBeVisible();
  await page.locator('[data-pd-id="lab.header-trigger.launcher"]').click();
  await expect(page.getByRole("region",{name:"Notifications"})).toHaveCount(0);
  await expect(page.getByRole("region",{name:"App launcher"})).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-pd-id="lab.header-trigger.launcher"]')).toBeFocused();
  await capture(page,"board-detail-desktop-dark.png");
});

test("resolved tracked Account remains visible without recreating source task", async ({ page }) => {
  await track(page,"task:LAB-ACCOUNT-C");
  await page.locator('[data-pd-id="lab.today.detail"]').getByRole("button",{name:"Review Account"}).click();
  await page.locator('[data-pd-id="lab.record-detail"]').getByRole("button",{name:"Review balance"}).click();
  await page.getByLabel("Observed Current Balance").fill("0.00");
  await page.getByRole("button",{name:/Confirm balance observation/}).click();
  await expect(page.locator('[data-pd-id="lab.today"]')).not.toContainText("Confirm Account Balance");
  const row = page.locator('[data-pd-id="lab.tracked-task.task:LAB-ACCOUNT-C"]');
  await expect(row).toHaveCount(0);
  await expect(page.locator('[data-pd-id="lab.header-trigger.tracked"]')).toHaveAttribute("aria-label","Tracked Tasks, 0 active");
  await page.locator('[data-pd-id="lab.header-trigger.tracked"]').click();
  await page.getByText("Completed History (1)").click();
  const history = page.locator('[data-pd-id="lab.header-tracked-task.task:LAB-ACCOUNT-C"]');
  await expect(history).toContainText("Source Resolved");
  await history.getByRole("button",{name:"View Source"}).click();
  await expect(page.locator('[data-pd-id="lab.record-detail"]')).toContainText("LAB-ACCOUNT-C");
});

test("dirty Account form ignores outside click", async ({ page }) => {
  await page.locator('[data-pd-id="lab.task.task:LAB-ACCOUNT-C"]').click();
  await page.locator('[data-pd-id="lab.today.detail"]').getByRole("button",{name:"Review Account"}).click();
  await page.locator('[data-pd-id="lab.record-detail"]').getByRole("button",{name:"Review balance"}).click();
  await page.getByLabel("Observed Current Balance").fill("12.34");
  await page.locator("dialog.modal-boundary").click({position:{x:2,y:2}});
  await expect(page.getByLabel("Observed Current Balance")).toHaveValue("12.34");
  await page.getByRole("button",{name:"Close Account review"}).click();
  await expect(page.getByRole("heading",{name:"Unsaved changes"})).toBeVisible();
});

test("header task trigger and panel remain contained at responsive widths and in both themes", async ({ page }) => {
  await track(page,"task:LAB-SB-OVERDUE");
  await page.getByRole("button",{name:"Close Task Details"}).click();
  for (const width of [1440,900,768,430,390]) {
    await page.setViewportSize({width,height:850});
    const trigger = page.locator('[data-pd-id="lab.header-trigger.tracked"]');
    await expect(trigger).toBeVisible();
    await trigger.click();
    const panel = page.locator('[data-pd-id="lab.header-menu"]');
    await expect(panel).toBeVisible();
    const geometry = await panel.evaluate(node => ({left:node.getBoundingClientRect().left,right:node.getBoundingClientRect().right}));
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(width);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    await capture(page,`tracked-panel-${width}-dark.png`);
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  }
  await page.locator('[data-pd-id="lab.header-trigger.identity"]').click();
  await page.locator('[data-pd-id="lab.identity.dark-mode"]').click();
  await page.keyboard.press("Escape");
  await page.locator('[data-pd-id="lab.header-trigger.tracked"]').click();
  await capture(page,"tracked-panel-390-light.png");
});

test("actual Chromium 200% zoom contains the tracked-task header overlay", async () => {
  const baseURL = process.env.OPENFORGE_E2E_BASE_URL ?? "http://127.0.0.1:3010";
  const scratch = await mkdtemp(join(tmpdir(),"pd-cp118d-zoom-"));
  const extension = join(scratch,"extension");
  await mkdir(extension);
  await writeFile(join(extension,"manifest.json"),JSON.stringify({manifest_version:3,name:"Temporary CP-118D zoom check",version:"1.0",permissions:["tabs"],background:{service_worker:"background.js"}}));
  await writeFile(join(extension,"background.js"),"chrome.runtime.onInstalled.addListener(() => {});");
  const context = await chromium.launchPersistentContext(join(scratch,"profile"),{channel:"chromium",headless:true,viewport:{width:1440,height:900},args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
  try {
    const page = await context.newPage();
    await page.route("**/api/**",async route => {
      if (route.request().url().endsWith("/api/auth/session")) { await route.fulfill({json:{authenticated:true,email:"demo@example.invalid",role:"fund_manager",expires_at:4102444800,session_policy:{absolute_expires_at:4102444800,auto_logout_enabled:false,effective_expires_at:4102444800,inactivity_expires_at:null,last_activity_at:1,preference_configured:true,timeout_minutes:30,valid_now:true}}}); return; }
      if (route.request().url().endsWith("/api/auth/activity")) { await route.fulfill({json:{ok:true}}); return; }
      throw new Error(`Unexpected Design Lab API call: ${route.request().url()}`);
    });
    await page.goto(`${baseURL}/design-lab`);
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    await worker.evaluate(async url => { const tabs=(globalThis as unknown as {chrome:{tabs:{query:(filter:{url:string})=>Promise<Array<{id:number}>>;setZoom:(id:number,zoom:number)=>Promise<void>}}}).chrome.tabs;const matches=await tabs.query({url:`${url}/*`});await tabs.setZoom(matches[0].id,2); },baseURL);
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(720);
    const trigger = page.locator('[data-pd-id="lab.header-trigger.tracked"]');
    await trigger.click();
    const box = await page.locator('[data-pd-id="lab.header-menu"]').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x+box!.width).toBeLessThanOrEqual(720);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    await capture(page,"tracked-panel-200-percent.png");
  } finally { await context.close(); await rm(scratch,{recursive:true,force:true}); }
});
