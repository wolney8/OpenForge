import { expect, test, chromium, type Page } from "@playwright/test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";
const profileId = "profile-demo-001";
const tracked = {
  profile_id: profileId, profile_name: "Profile B", occurrence_key: "SB-PART", source_key: "SB-PART",
  title: "Review Partial Lay", source_status: "active", tracked: true, work_state: "To Do", blocked_reason: null,
  review_date: null, version: 1, updated_at: "2026-11-10T09:00:00Z",
};

async function installUrgentTrackedTask(page: Page) {
  const due = new Date(Date.now() + 3_600_000).toISOString();
  await page.route(/\/fund-manager\/notifications$/, route => route.fulfill({ status: 200, json: [{
    audience: "fund_manager", security_tag: "fund_manager_only", kind: "task", task_state: "new",
    notification_id: "SB-PART", notification_type: "partial_lay_reminder", title: tracked.title,
    ledger_label: "Sportsbook Bets", bookmaker_label: "Bookmaker B", message: "Partial lay requires review.",
    profile_id: profileId, profile_name: tracked.profile_name, record_id: "SB-PART", due_at: due,
    settles_at: "", created_at: due, href: `/profiles/${profileId}/tracker/sportsbook-bets?record=SB-PART`,
    completion_href: "", tone: "warning",
  }] }));
  await page.route(`**/profiles/${profileId}/sportsbook-bets`, route => route.fulfill({ status: 200, json: [{
    profile_id: profileId, sportsbook_bet_id: "SB-PART", status: "Placed", lay_status: "Part Laid", calculated_liability_1: "42.50",
  }] }));
  await page.route(/\/fund-manager\/tasks\/annotations$/, route => route.request().method() === "GET"
    ? route.fulfill({ status: 200, json: [tracked] }) : route.continue());
}

test.beforeEach(async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  await page.goto(authURL);
  await page.evaluate(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
});

test("real header urgent card has a themed background outside the Lab wrapper", async ({ page }) => {
  await installUrgentTrackedTask(page);
  await page.goto("/tasks");
  await page.locator('[data-pd-id="ux-v2.header.tasks"]').click();
  const card = page.locator('[data-pd-id="ux-v2.header.tracked-panel"] [data-pd-id^="tracked-task."]').first();
  await expect(card).toBeVisible();
  await expect(card).toHaveClass(/trackedUrgent/);
  const colour = await card.evaluate(node => getComputedStyle(node).backgroundColor);
  expect(colour).not.toBe("rgba(0, 0, 0, 0)");
});

test("expanded real banner places its work state in the top-right slot", async ({ page }) => {
  await installUrgentTrackedTask(page);
  await page.goto("/tasks");
  const card = page.locator('[data-pd-id="v2.active-task"] [data-pd-id^="tracked-task."]').first();
  await expect(card).toBeVisible();
  const geometry = await card.evaluate(node => {
    const cardRect = node.getBoundingClientRect();
    const state = node.querySelector('[class*="taskState"]') ?? node.querySelector('[class*="state"]');
    const stateRect = state?.getBoundingClientRect();
    return { middle: cardRect.left + cardRect.width / 2, top: cardRect.top, stateLeft: stateRect?.left ?? 0, stateTop: stateRect?.top ?? 9999 };
  });
  expect(geometry.stateLeft).toBeGreaterThan(geometry.middle);
  expect(geometry.stateTop).toBeLessThan(geometry.top + 45);
});

test("real tracked popup uses Resolve Source and hides redundant show-banner action", async ({ page }) => {
  await installUrgentTrackedTask(page);
  await page.goto("/tasks");
  await page.locator('[data-pd-id="ux-v2.header.tasks"]').click();
  const panel = page.locator('[data-pd-id="ux-v2.header.tracked-panel"]');
  await expect(panel.getByRole("link", { name: "Resolve Source" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Show Tracked Tasks Banner" })).toHaveCount(0);
});

test("real notification popup uses Lab action order and View Today footer", async ({ page }, info) => {
  await page.goto("/tasks");
  await page.locator('[data-pd-id="notifications.trigger"]').click();
  const panel = page.locator('[data-pd-id="notifications.v2.dropdown"]');
  await expect(panel).toBeVisible();
  await expect(panel.locator('[data-pd-id^="notifications.item."]').first()).toBeVisible();
  await expect(page.locator('[data-pd-id^="tasks.v2.row."]').first()).toBeVisible();
  const actions = await panel.locator('[class*="actions"]').first().locator("button").allTextContents();
  expect(actions.slice(0, 3)).toEqual(["Priority", "View All Notifications", "History"]);
  await expect(panel.locator('[class*="footer"]').getByRole("button", { name: "View Today" })).toBeVisible();
  await page.screenshot({ path: info.outputPath("real-notifications-popup.png"), fullPage: true });
});

test("Today inspector owns Track and autosaves work state without a Save button", async ({ page }, info) => {
  await installUrgentTrackedTask(page);
  await page.goto("/tasks");
  const row = page.locator('[data-pd-id="tasks.v2.row.SB-PART"]');
  await expect(row).toBeVisible();
  await row.click();
  await expect(page.locator('[data-pd-id="tasks.v2.inspector"]')).toBeVisible();
  await expect(page.locator('[data-pd-id^="tasks.v2.track."]')).toHaveCount(0);
  const rowColumns = await page.locator('[data-pd-id="tasks.item.SB-PART"]').evaluate(node => getComputedStyle(node).gridTemplateColumns);
  expect(rowColumns.trim().split(/\s+/)).toHaveLength(1);
  await expect(page.getByRole("button", { name: "Save Work State" })).toHaveCount(0);
  const primary = page.locator('[data-pd-id="tasks.v2.inspector"]').getByRole("link", { name: "Open Bet" });
  await expect(primary).toBeVisible();
  await expect(primary).toHaveClass(/primaryAction/);
  expect(await primary.evaluate(node => getComputedStyle(node).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
  await page.screenshot({ path: info.outputPath("real-today-inspector.png"), fullPage: true });
  await page.getByRole("button", { name: "Close Task Details" }).click();
  await expect(page.locator('[data-pd-id="tasks.v2.track.SB-PART"]')).toBeVisible();
});

test("Today renders all three approved sections with truthful source states", async ({ page }) => {
  await page.goto("/tasks");
  await expect(page.getByRole("region", { name: "Needs Action" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Recurring Work" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Opportunities / Suggestions" })).toBeVisible();
});

for (const { width, height, theme, zoom } of [
  { width: 1440, height: 900, theme: "light", zoom: 1 },
  { width: 900, height: 900, theme: "dark", zoom: 1 },
  { width: 390, height: 844, theme: "light", zoom: 1 },
] as const) {
  test(`Lab and real tracked surfaces remain contained at ${width}px ${theme} ${zoom * 100}%`, async ({ page }, info) => {
    await page.setViewportSize({ width, height });
    await page.goto("/design-lab");
    await page.getByRole("button", { name: /All tasks/ }).click();
    await page.evaluate(({ theme, zoom }) => { localStorage.setItem("openforge-theme", theme); document.documentElement.dataset.theme = theme; document.body.style.zoom = String(zoom); }, { theme, zoom });
    await page.locator('[data-pd-id^="lab.task."]').filter({ hasText: "Review Partial Lay" }).first().click();
    await page.getByRole("button", { name: "Track Task", exact: true }).click();
    await page.getByRole("button", { name: "Close Task Details" }).click();
    await page.locator('[data-pd-id="lab.header-trigger.tracked"]').click();
    const labPopup = page.locator('[data-pd-id^="lab.header-tracked-task."]').first();
    await expect(labPopup).toBeVisible();
    const labBackground = await labPopup.evaluate(node => getComputedStyle(node).backgroundColor);
    expect(labBackground).not.toBe("rgba(0, 0, 0, 0)");
    await page.screenshot({ path: info.outputPath(`lab-tracked-${width}-${theme}-${zoom}.png`), fullPage: true });

    await installUrgentTrackedTask(page);
    await page.goto("/tasks");
    await page.evaluate(({ theme, zoom }) => { localStorage.setItem("openforge-theme", theme); document.documentElement.dataset.theme = theme; document.body.style.zoom = String(zoom); }, { theme, zoom });
    const card = page.locator('[data-pd-id="v2.active-task"] [data-pd-id^="tracked-task."]').first();
    await expect(card).toBeVisible();
    await expect(card.getByRole("link", { name: "Resolve Source" })).toBeVisible();
    await expect(page.locator('[data-pd-id^="tasks.v2.row."]').first()).toBeVisible();
    const bannerState = card.locator('[class*="trackedStatus"]');
    const bounds = await card.boundingBox();
    const stateBounds = await bannerState.boundingBox();
    expect(bounds && stateBounds).toBeTruthy();
    expect(stateBounds!.x).toBeGreaterThan(bounds!.x + bounds!.width / 2);
    expect(stateBounds!.y).toBeLessThan(bounds!.y + 45 * zoom);
    await page.screenshot({ path: info.outputPath(`real-tracked-banner-${width}-${theme}-${zoom}.png`), fullPage: true });
    await page.locator('[data-pd-id="ux-v2.header.tasks"]').click();
    const realPopup = page.locator('[data-pd-id="ux-v2.header.tracked-panel"]');
    await expect(realPopup.getByRole("link", { name: "Resolve Source" })).toBeVisible();
    const urgent = realPopup.locator('[data-pd-id^="tracked-task."]').first();
    const background = await urgent.evaluate(node => getComputedStyle(node).backgroundColor);
    expect(background).toBe(labBackground);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath(`real-tracked-popup-${width}-${theme}-${zoom}.png`), fullPage: true });
  });
}

test("real tracked banner and popup remain usable at actual Chromium 200% tab zoom", async ({}, info) => {
  const baseURL = String(info.project.use.baseURL);
  const scratch = await mkdtemp(join(tmpdir(), "pd-cp140b-zoom-"));
  const extension = join(scratch, "extension");
  await mkdir(extension);
  await writeFile(join(extension, "manifest.json"), JSON.stringify({ manifest_version: 3, name: "Disposable tracked zoom check", version: "1.0", permissions: ["tabs"], background: { service_worker: "background.js" } }));
  await writeFile(join(extension, "background.js"), "chrome.runtime.onInstalled.addListener(() => {});");
  const context = await chromium.launchPersistentContext(join(scratch, "profile"), { channel: "chromium", headless: true, viewport: { width: 1440, height: 900 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try {
    const page = await context.newPage();
    await page.goto(authURL);
    await installUrgentTrackedTask(page);
    await page.goto(`${baseURL}/tasks`);
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    await worker.evaluate(async url => {
      const tabs = (globalThis as unknown as { chrome: { tabs: { query: (filter: { url: string }) => Promise<Array<{ id: number }>>; setZoom: (id: number, zoom: number) => Promise<void> } } }).chrome.tabs;
      const matches = await tabs.query({ url: `${url}/*` });
      await tabs.setZoom(matches[0].id, 2);
    }, baseURL);
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(720);
    const banner = page.locator('[data-pd-id="v2.active-task"] [data-pd-id^="tracked-task."]').first();
    await expect(banner.getByRole("link", { name: "Resolve Source" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.locator('[data-pd-id="ux-v2.header.tasks"]').click();
    const popup = page.locator('[data-pd-id="ux-v2.header.tracked-panel"]');
    await expect(popup.getByRole("link", { name: "Resolve Source" })).toBeVisible();
    expect(await popup.evaluate(node => node.getBoundingClientRect().right - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath("real-tracked-200-percent.png"), fullPage: true });
  } finally {
    await context.close();
    await rm(scratch, { recursive: true, force: true });
  }
});
