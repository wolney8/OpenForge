import { chromium, expect, test, type Page } from "@playwright/test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";
const evidence = "data/private/evidence/cp133";
const profile = "profile-demo-001";

function syntheticQueue() {
  const now = Date.now();
  const due = (hours: number) => new Date(now + hours * 3_600_000).toISOString();
  const task = (id: string, type: string, hours: number, ledger = "Sportsbook Bets") => ({
    audience: "fund_manager", security_tag: "fund_manager_only", kind: "task", task_state: "new",
    notification_id: id, notification_type: type, title: `Review ${id}`, ledger_label: ledger,
    bookmaker_label: "Bookmaker A", message: `Source evidence for ${id}.`, profile_id: profile,
    profile_name: "Subscriber Alpha", record_id: id, due_at: due(hours), settles_at: "",
    created_at: due(-1), href: `/profiles/${profile}/tracker/${ledger === "Free Bets" ? "free-bets" : "sportsbook-bets"}?record=${id}`,
    completion_href: "", tone: "warning",
  });
  const tasks = [
    task("SB-PART", "partial_lay_reminder", 2),
    task("FB-EXP", "free_bet_expiry", 24, "Free Bets"),
    task("SB-QUAL", "settlement_review", -2),
    ...Array.from({ length: 24 }, (_, index) => task(`SB-HIST-${index + 1}`, "settlement_review", -24 * 45)),
  ];
  const info = Array.from({ length: 4 }, (_, index) => ({ ...task(`INFO-${index + 1}`, "database_backup_reminder", -1), kind: "information", ledger_label: "Database Backups", title: `Information ${index + 1}` }));
  const sportsbook = [
    { profile_id: profile, sportsbook_bet_id: "SB-PART", status: "Placed", lay_status: "Part Laid", calculated_liability_1: "42.50" },
    { profile_id: profile, sportsbook_bet_id: "SB-QUAL", status: "Placed", lay_status: "Fully Laid", calculated_liability_1: null },
    ...Array.from({ length: 24 }, (_, index) => ({ profile_id: profile, sportsbook_bet_id: `SB-HIST-${index + 1}`, status: "Placed", lay_status: "Fully Laid", calculated_liability_1: null })),
  ];
  const freeBets = [
    { profile_id: profile, free_bet_id: "FB-EXP", status: "Available", origin_qual_bet_source_namespace: "", origin_qual_bet_native_id: "", origin_qual_bet_resolution_state: "not_applicable" },
    { profile_id: profile, free_bet_id: "FB-LINK", status: "Available", origin_qual_bet_source_namespace: "sportsbook", origin_qual_bet_native_id: "SB-QUAL", origin_qual_bet_resolution_state: "resolved" },
  ];
  return { notifications: [...tasks, ...info], sportsbook, freeBets };
}

async function installQueue(page: Page) {
  const fixture = syntheticQueue();
  await page.route(/\/fund-manager\/notifications$/, route => route.fulfill({ status: 200, json: fixture.notifications }));
  await page.route(`**/profiles/${profile}/sportsbook-bets`, route => route.fulfill({ status: 200, json: fixture.sportsbook }));
  await page.route(`**/profiles/${profile}/free-bets`, route => route.fulfill({ status: 200, json: fixture.freeBets }));
}

test.beforeEach(async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  expect(health.database_identity).toBe("cp117-integration-synthetic");
  await page.goto(authURL);
  const session = await (await page.request.get("/api/auth/session")).json();
  expect(session.email).toBe("demo@example.invalid");
  await page.evaluate(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
});

for (const [width, mode] of [[1440, "light"], [390, "dark"]] as const) {
  test(`CP-133 populated Today and notification triage ${width} ${mode}`, async ({ page }) => {
    await mkdir(evidence, { recursive: true });
    await page.setViewportSize({ width, height: 900 });
    await installQueue(page);
    await page.goto("/tasks");
    await page.evaluate(value => localStorage.setItem("openforge-theme", value), mode);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", mode);
    await expect(page.locator('[data-pd-id="tasks.v2.row.SB-PART"]')).toBeVisible();
    await expect(page.locator('[data-pd-id="tasks.v2.row.SB-PART"]')).toContainText("£42.50 calculated lay liability");
    const rows = page.locator('[data-pd-id^="tasks.v2.row."]');
    await expect(rows).toHaveCount(16);
    expect(await rows.first().getAttribute("data-pd-id")).toBe("tasks.v2.row.SB-PART");
    expect(await rows.nth(1).getAttribute("data-pd-id")).toBe("tasks.v2.row.FB-EXP");
    expect(await rows.nth(2).getAttribute("data-pd-id")).toBe("tasks.v2.row.SB-QUAL");
    await expect(page.locator('[data-pd-id="tasks.v2.pagination"]')).toContainText("Showing 1–16 of 27");
    const gap = await rows.first().evaluate(element => {
      const next = element.closest('[role="listitem"]')?.nextElementSibling?.querySelector("button");
      return next ? next.getBoundingClientRect().top - element.getBoundingClientRect().bottom : 0;
    });
    expect(gap).toBeGreaterThanOrEqual(5);
    if (width <= 700) await page.getByRole("button", { name: "Open navigation" }).click();
    await page.screenshot({ path: `${evidence}/today-${width}-${mode}.png`, fullPage: true });
    if (width <= 700) await page.getByRole("button", { name: "Close navigation" }).click();
    await page.locator('[data-pd-id="tasks.v2.pagination"] button').last().click();
    await expect(page.locator('[data-pd-id="tasks.v2.pagination"]')).toContainText("Showing 17–27 of 27");
    await page.evaluate(() => scrollTo(0, 0));
    await page.locator('[data-pd-id="notifications.trigger"]').click();
    const panel = page.locator('[data-pd-id="notifications.v2.dropdown"]');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText("27 actionable · 4 info");
    await expect(panel.locator('[data-pd-id^="notifications.item."]')).toHaveCount(5);
    await expect(panel.locator('[data-pd-id="notifications.item.SB-PART"]')).toContainText("£42.50 calculated lay liability");
    await page.screenshot({ path: `${evidence}/notifications-initial-${width}-${mode}.png`, fullPage: true });
    await panel.locator('[data-pd-id="notifications.show-more"]').click();
    await expect(panel.locator('[data-pd-id^="notifications.item."]')).toHaveCount(10);
    if (width === 1440) {
      await panel.locator('[data-pd-id="notifications.show-more"]').click();
      await panel.locator('[data-pd-id="notifications.show-more"]').click();
      await expect(panel.locator('[data-pd-id^="notifications.item."]')).toHaveCount(20);
      await expect(panel.locator('[data-pd-id="notifications.show-more"]')).toHaveCount(0);
      await expect(panel).toContainText("More notifications are available on the full page.");
    }
    await expect(panel.locator('[data-pd-id="notifications.view-actionable"]')).toBeVisible();
    await expect(panel.locator('[data-pd-id="notifications.view-all"]')).toBeVisible();
    expect(await panel.evaluate(element => element.getBoundingClientRect().right - innerWidth)).toBeLessThanOrEqual(1);
    const panelRight = await panel.evaluate(element => element.getBoundingClientRect().right);
    for (const selector of ['[data-pd-id="notifications.view-actionable"]', '[data-pd-id="notifications.view-all"]', ':scope > div:first-child > span']) {
      expect(await panel.locator(selector).evaluate(element => element.getBoundingClientRect().right)).toBeLessThanOrEqual(panelRight + 1);
    }
    await page.screenshot({ path: `${evidence}/notifications-expanded-${width}-${mode}.png`, fullPage: true });
    await panel.locator('[data-pd-id="notifications.view-actionable"]').click();
    await expect(page).toHaveURL(/\/tasks\?view=actionable$/);
    await expect(page.locator('[data-pd-id="tasks.v2.pagination"]')).toContainText("Showing 1–16 of 27");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.locator('[data-pd-id="notifications.trigger"]').click();
    await page.locator('[data-pd-id="notifications.view-all"]').click();
    await expect(page).toHaveURL(/\/notifications$/);
  });
}

test("CP-133 Profile-dependent route requires explicit authorised choice", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const accounts = page.locator('[data-pd-id="ux-v2.nav.accounts"]');
  await expect(accounts).toHaveAttribute("aria-haspopup", "dialog");
  await accounts.click();
  const chooser = page.locator('[data-pd-id="ux-v2.profile-picker"]');
  await expect(chooser).toContainText("Choose an authorised Profile");
  await expect(chooser.getByRole("button", { name: "Subscriber Alpha" })).toBeVisible();
  await expect(chooser.getByRole("button", { name: "Subscriber Bravo" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(accounts).toBeFocused();
  await accounts.click();
  await chooser.getByRole("button", { name: "Subscriber Bravo" }).click();
  await expect(page).toHaveURL(/\/profiles\/profile-demo-002\/tracker\/accounts$/);
  await expect(page.locator('[data-pd-id="ux-v2.nav.accounts"]')).toHaveAttribute("href", "/profiles/profile-demo-002/tracker/accounts");
});

test("CP-133 chooser excludes Profiles absent from the authorised list and Opportunities opens Accounts", async ({ page }) => {
  await page.route(/\/profiles$/, route => route.fulfill({ status: 200, json: [{ profile_id: profile, display_name: "Subscriber Alpha", status: "Active" }] }));
  await page.goto("/");
  await page.locator('[data-pd-id="ux-v2.nav.opportunities"]').click();
  const chooser = page.locator('[data-pd-id="ux-v2.profile-picker"]');
  await expect(chooser.getByRole("button", { name: "Subscriber Alpha" })).toBeVisible();
  await expect(chooser.getByRole("button", { name: "Subscriber Bravo" })).toHaveCount(0);
  await chooser.getByRole("button", { name: "Subscriber Alpha" }).click();
  await expect(page).toHaveURL(/\/profiles\/profile-demo-001\/tracker\/accounts#profile-opportunities$/);
});

test("CP-133 unread state remains separate from source-backed task state", async ({ page }) => {
  await installQueue(page);
  let state = { read_keys: [] as string[], dismissed_ids: [] as string[] };
  await page.route(/\/fund-manager\/notifications\/state$/, async route => {
    if (route.request().method() === "PUT") state = route.request().postDataJSON() as typeof state;
    await route.fulfill({ status: 200, json: state });
  });
  await page.goto("/tasks");
  await expect(page.locator('[data-pd-id="tasks.v2.pagination"]')).toContainText("of 27");
  await page.locator('[data-pd-id="notifications.trigger"]').click();
  const panel = page.locator('[data-pd-id="notifications.v2.dropdown"]');
  await expect(panel).toContainText("31 unread · 27 actionable · 4 info");
  await panel.getByRole("button", { name: "Mark All Read" }).click();
  await expect(panel).toContainText("0 unread · 27 actionable · 4 info");
  await panel.locator('[data-pd-id="notifications.view-actionable"]').click();
  await expect(page.locator('[data-pd-id="tasks.v2.pagination"]')).toContainText("of 27");
  await page.locator('[data-pd-id="tasks.v2.filter-toggle"]').click();
  await page.locator('[data-pd-id="tasks.v2.page-size"]').selectOption("8");
  await expect(page.locator('[data-pd-id^="tasks.v2.row."]')).toHaveCount(8);
  await expect(page.locator('[data-pd-id="tasks.v2.pagination"]')).toContainText("Showing 1–8 of 27");
});

test("CP-133 Today and Profile chooser remain contained at actual Chromium 200% zoom", async ({}, info) => {
  const baseURL = String(info.project.use.baseURL);
  const scratch = await mkdtemp(join(tmpdir(), "pd-cp133-zoom-"));
  const extension = join(scratch, "extension");
  await mkdir(extension);
  await writeFile(join(extension, "manifest.json"), JSON.stringify({ manifest_version: 3, name: "Temporary CP-133 zoom check", version: "1.0", permissions: ["tabs"], background: { service_worker: "background.js" } }));
  await writeFile(join(extension, "background.js"), "chrome.runtime.onInstalled.addListener(() => {});");
  const context = await chromium.launchPersistentContext(join(scratch, "profile"), { channel: "chromium", headless: true, viewport: { width: 1440, height: 900 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try {
    const page = await context.newPage();
    await page.goto(authURL);
    await installQueue(page);
    await page.goto(`${baseURL}/tasks`);
    await expect(page.locator('[data-pd-id="tasks.v2.row.SB-PART"]')).toBeVisible();
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    await worker.evaluate(async url => {
      const tabs = (globalThis as unknown as { chrome: { tabs: { query: (filter: { url: string }) => Promise<Array<{ id: number }>>; setZoom: (id: number, zoom: number) => Promise<void> } } }).chrome.tabs;
      const matches = await tabs.query({ url: `${url}/*` });
      await tabs.setZoom(matches[0].id, 2);
    }, baseURL);
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(720);
    await expect(page.locator('[data-pd-id="tasks.v2.pagination"]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `${evidence}/today-200-percent.png`, fullPage: true });
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.locator('[data-pd-id="ux-v2.nav.accounts"]').click();
    await expect(page.locator('[data-pd-id="ux-v2.profile-picker"]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.keyboard.press("Escape");
  } finally {
    await context.close();
    await rm(scratch, { recursive: true, force: true });
  }
});
