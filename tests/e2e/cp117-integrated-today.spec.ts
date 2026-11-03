import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, expect, test } from "@playwright/test";

test.use({ video: "on", trace: "retain-on-failure", screenshot: "only-on-failure" });

test("flagged real Today keeps urgent work visible and opens source details", async ({ page }, info) => {
  if (process.env.OPENFORGE_CP117_ISOLATED_SESSION_FILE) {
    await page.context().addCookies([{ name: "pd_session", value: readFileSync(process.env.OPENFORGE_CP117_ISOLATED_SESSION_FILE, "utf8").trim(), url: String(info.project.use.baseURL) }]);
  }
  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const task = (id: string, title: string, dueAt = "") => ({
    audience: "fund_manager", security_tag: "fund_manager_only", kind: "task", task_state: "new",
    notification_id: id, notification_type: "settlement_review", title,
    ledger_label: "Sportsbook Bets", bookmaker_label: "Bookmaker A", message: `Recorded evidence for ${title}.`,
    profile_id: "PROFILE-A", profile_name: "Profile Alpha", record_id: id, due_at: dueAt,
    settles_at: "", created_at: now.toISOString(), href: `/profiles/PROFILE-A/tracker/sportsbook-bets?record=${id}`,
    completion_href: "", tone: "warning",
  });
  const tasks = [task("TASK-CURRENT", "Review current bet"), task("TASK-OVERDUE", "Review overdue bet", yesterday.toISOString())];
  const state = { read_keys: [] as string[], dismissed_ids: [] as string[] };
  await page.route("**/api/auth/session", (route) => route.fulfill({ status: 200, json: { authenticated: true, role: "fund_manager", email: "owner@example.invalid", name: "Synthetic Owner", linked_profile_ids: ["PROFILE-A"], expires_at: 4102444800, session_policy: { auto_logout_enabled: false } } }));
  await page.route("**/fund-manager/notifications/state", (route) => route.fulfill({ status: 200, json: state }));
  await page.route("**/fund-manager/notifications/preferences", (route) => route.fulfill({ status: 200, json: { preferences: { settlement_review: true } } }));
  await page.route("**/fund-manager/notifications", (route) => route.fulfill({ status: 200, json: tasks }));

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/tasks");
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Needs Action 2/ })).toBeVisible();
  await expect(page.locator('[data-pd-id="tasks.v2.row.TASK-OVERDUE"]')).toBeVisible();
  const titles = await page.locator('[data-pd-id^="tasks.v2.row."] strong').allTextContents();
  expect(titles).toEqual(["Review overdue bet", "Review current bet"]);
  await page.locator('[data-pd-id="tasks.v2.row.TASK-OVERDUE"]').click();
  await expect(page.locator('[data-pd-id="tasks.v2.inspector"]')).toContainText("Recorded evidence for Review overdue bet");
  await expect(page.locator('[data-pd-id="tasks.v2.inspector"]')).toContainText("Profile Alpha");
  await page.screenshot({ path: info.outputPath("today-v2-desktop.png") });
  await page.getByRole("button", { name: "Close Task Details" }).click();
  await expect(page.locator('[data-pd-id="tasks.v2.row.TASK-OVERDUE"]')).toBeFocused();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-pd-id="tasks.v2.row.TASK-CURRENT"]').click();
  await expect(page.locator('[data-pd-id="tasks.v2.inspector"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.locator('[data-pd-id="tasks.v2.inspector"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("today-v2-mobile.png") });
});

test("flagged real Today remains contained at actual Chromium 200% zoom", async ({}, info) => {
  const tokenPath = process.env.OPENFORGE_CP117_ISOLATED_SESSION_FILE;
  test.skip(!tokenPath, "Requires the disposable CP-117 authenticated API fixture");
  const baseURL = String(info.project.use.baseURL);
  const scratch = await mkdtemp(join(tmpdir(), "pd-cp117-zoom-"));
  const extension = join(scratch, "extension");
  await mkdir(extension);
  await writeFile(join(extension, "manifest.json"), JSON.stringify({ manifest_version: 3, name: "Temporary CP-117 zoom check", version: "1.0", permissions: ["tabs"], background: { service_worker: "background.js" } }));
  await writeFile(join(extension, "background.js"), "chrome.runtime.onInstalled.addListener(() => {});");
  const context = await chromium.launchPersistentContext(join(scratch, "profile"), { channel: "chromium", headless: true, viewport: { width: 1440, height: 900 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try {
    await context.addCookies([{ name: "pd_session", value: readFileSync(tokenPath!, "utf8").trim(), url: baseURL }]);
    const page = await context.newPage();
    await page.goto(`${baseURL}/tasks`);
    await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
    const acceptCookieNotice = page.getByRole("button", { name: "Understood" });
    if (await acceptCookieNotice.isVisible()) await acceptCookieNotice.click();
    await expect(page.getByRole("tab", { name: /Upcoming [1-9]/ })).toBeVisible();
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    await worker.evaluate(async (url) => { const tabs = (globalThis as unknown as { chrome: { tabs: { query: (filter: { url: string }) => Promise<Array<{ id: number }>>; setZoom: (id: number, zoom: number) => Promise<void> } } }).chrome.tabs; const matches = await tabs.query({ url: `${url}/*` }); await tabs.setZoom(matches[0].id, 2); }, baseURL);
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(720);
    await page.getByRole("tab", { name: /Upcoming [1-9]/ }).click();
    await page.locator('[data-pd-id^="tasks.v2.row."]').first().click();
    await page.locator('[data-pd-id="tasks.v2.inspector"]').scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).zoom)).toBe("1");
  } finally {
    await context.close();
    await rm(scratch, { recursive: true, force: true });
  }
});
