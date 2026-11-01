import { chromium, expect, test, type Page } from "@playwright/test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const evidence = process.env.OPENFORGE_DESIGN_LAB_EVIDENCE_DIR;

async function enter(page: Page, theme: "light" | "dark" = "dark") {
  await page.route("**/api/**", async route => {
    if (route.request().url().endsWith("/api/auth/session")) {
      await route.fulfill({ json: { authenticated: true, email: "demo@example.invalid", expires_at: 4102444800, name: "Synthetic Fund Manager", role: "fund_manager", session_policy: { absolute_expires_at: 4102444800, auto_logout_enabled: false, effective_expires_at: 4102444800, inactivity_expires_at: null, last_activity_at: 1, preference_configured: true, timeout_minutes: 30, valid_now: true } } });
      return;
    }
    if (route.request().url().endsWith("/api/auth/activity")) { await route.fulfill({ json: { ok: true } }); return; }
    throw new Error(`Unexpected API request from Design Lab: ${route.request().url()}`);
  });
  await page.addInitScript(value => localStorage.setItem("openforge-theme", value), theme);
  await page.goto("/design-lab");
  await expect(page.locator('[data-pd-id="design-lab-connected.root"]')).toBeVisible();
}

test("Today separates derived source tasks, reminders and uncertain advice", async ({ page }) => {
  await enter(page);
  await page.getByRole("button", { name: "Today", exact: true }).click();
  const today = page.locator('[data-pd-id="lab.today"]');
  await expect(today.getByRole("region", { name: "Needs Action" })).toContainText("Review overdue unsettled bet");
  await expect(today).toContainText("Review partial Lay");
  await expect(today).toContainText("Review expiring Free Bet");
  await expect(today).not.toContainText("LAB-FB-001");
  await expect(today.getByRole("region", { name: "Recurring Work" })).toContainText("current promotion availability unverified");
  await expect(today.getByRole("region", { name: "Opportunities / Suggestions" })).toContainText("current availability unverified");
  await today.locator('[data-pd-id="lab.task.casino-daily-a"]').getByRole("button", { name: "Mark check done" }).click();
  await expect(today.locator('[data-pd-id="lab.task.casino-daily-a"]')).toContainText("Check recorded · lab only");
  await expect(today.locator('[data-pd-id="lab.task.casino-daily-b"]')).toContainText("Mark check done");
  await expect(today.locator('[data-pd-id="lab.task.task:LAB-SB-OVERDUE"]')).not.toContainText("Mark check done");
  await today.locator('[data-pd-id="lab.task.task:LAB-SB-OVERDUE"]').getByRole("button", { name: "Open bet" }).click();
  await expect(page.locator('[data-pd-id="lab.record-detail"]')).toContainText("LAB-SB-OVERDUE");
  await page.getByRole("button", { name: "Back to Today" }).click();
  await expect(page.locator('[data-pd-id="lab.profile"]')).toContainText("All Profiles");
  await expect(today.locator('[data-pd-id="lab.task.casino-daily-a"]')).toContainText("Check recorded · lab only");
});

test("shared reload creates separate Prospecting rows, blocks C and recovers a partial result", async ({ page }) => {
  await enter(page);
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await page.locator('[data-pd-id="lab.task.reload"]').getByRole("button", { name: "Review offer" }).click();
  const workflow = page.locator('[data-pd-id="lab.offer-workflow"]');
  await expect(workflow).toContainText("Current availability");
  await expect(workflow).toContainText("Unverified · human check required");
  await expect(workflow.getByLabel("Select Profile C · offer review only")).toBeDisabled();
  await workflow.getByLabel("I reviewed Profile B's Limited Account warning").check();
  await workflow.getByRole("button", { name: "Preview per-Profile drafts" }).click();
  await expect(workflow.locator('[data-pd-id="lab.offer-preview"]')).toContainText("New separate Prospecting row; execution fields unset");
  if (evidence) { await mkdir(evidence, { recursive: true }); await page.screenshot({ path: join(evidence, "cp115-offer-preview-1440-dark.png"), fullPage: true, style: "nextjs-portal { display: none !important; }" }); }
  await workflow.getByLabel("Simulate Profile B save failure on this attempt").check();
  await workflow.getByRole("button", { name: "Confirm simulated copy" }).click();
  await expect(workflow).toContainText("Failed");
  await expect(workflow).toContainText("Blocked");
  await workflow.getByRole("button", { name: "Retry failed target" }).click();
  await expect(workflow).toContainText("Already created; duplicate prevented");
  if (evidence) { await page.screenshot({ path: join(evidence, "cp115-offer-results-1440-dark.png"), fullPage: true, style: "nextjs-portal { display: none !important; }" }); }
  await page.setViewportSize({ width: 430, height: 900 });
  const targetGeometry = await workflow.getByText("Profile B", { exact: true }).first().locator("xpath=ancestor::label").evaluate(label => {
    const badge = label.querySelectorAll("span")[1].getBoundingClientRect();
    const reason = label.querySelector(":scope > small")!.getBoundingClientRect();
    return { badgeBottom: badge.bottom, reasonTop: reason.top };
  });
  expect(targetGeometry.reasonTop).toBeGreaterThanOrEqual(targetGeometry.badgeBottom);
  if (evidence) await page.screenshot({ path: join(evidence, "cp115-offer-results-430-dark.png"), fullPage: true, style: "nextjs-portal { display: none !important; }" });
  await expect(workflow.getByRole("button", { name: "Open LAB-COPY-RELOAD-LAB-PROFILE-B" })).toBeVisible();
  await workflow.getByRole("button", { name: "Open LAB-COPY-RELOAD-LAB-PROFILE-B" }).click();
  await expect(page.locator('[data-pd-id="lab.record-detail"]')).toContainText("Owner: Profile B");
  await expect(page.locator('[data-pd-id="lab.record-detail"]')).toContainText("Not confirmed");
  await page.getByRole("button", { name: "Back to Recurring Offers" }).click();
  await workflow.getByRole("button", { name: "Back to Today" }).click();
  await expect(page.locator('[data-pd-id="lab.profile"]')).toContainText("All Profiles");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  const ledger = page.locator('[data-pd-id="lab.ledger.sportsbook"]');
  const copied = ledger.locator("tbody tr").filter({ hasText: "Weekly Bookmaker A reload" });
  await expect(copied).toHaveCount(2);
  await expect(copied.nth(0)).toContainText("Profile A");
  await expect(copied.nth(1)).toContainText("Profile B");
});

test("Account source completion resolves its derived task and returns to Today", async ({ page }) => {
  await enter(page);
  await page.locator('[data-pd-id="lab.nav.tasks"]').click();
  await page.locator('[data-pd-id="lab.task.task:LAB-ACCOUNT-C"]').getByRole("button", { name: "Review Account" }).click();
  await expect(page.locator('[data-pd-id="lab.record-detail"]')).toContainText("LAB-ACCOUNT-C");
  await page.locator('[data-pd-id="lab.record-detail"]').getByRole("button", { name: "Review balance" }).click();
  await page.getByLabel("Observed Current Balance").fill("0.00");
  await page.getByRole("button", { name: /Confirm balance observation/ }).click();
  await expect(page.locator('[data-pd-id="lab.today"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="lab.today"]')).not.toContainText("Confirm Account balance");
  await expect(page.locator('[data-pd-id="lab.profile"]')).toContainText("All Profiles");
});

test("Position keeps Personal fees zero and managed estimates distinct from earned and available", async ({ page }) => {
  await enter(page);
  const table = page.locator('[data-pd-id="lab.position-profiles"]');
  await expect(table).toContainText("Personal · 0% fees");
  await expect(table).toContainText("Oct · awaiting confirmation");
  await expect(table).toContainText("Sep · crystallised");
  await expect(table).toContainText("No validated current-value fixture");
  await table.getByText("Fee source and limits").click();
  await expect(table).toContainText("£9 earned, £5 withdrawn, £4 outstanding");
});

test("Today and Position remain contained at desktop and narrow widths in both themes", async ({ page }) => {
  await enter(page);
  if (evidence) await mkdir(evidence, { recursive: true });
  for (const width of [1440, 900, 430, 390]) for (const theme of ["dark", "light"] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(value => document.documentElement.setAttribute("data-theme", value), theme);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    if (evidence) await page.screenshot({ path: join(evidence, `cp115-position-${width}-${theme}.png`), fullPage: true });
    if (width <= 900) await page.getByRole("button", { name: "Open navigation" }).click();
    await page.locator('[data-pd-id="lab.nav.tasks"]').click();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    if (evidence) await page.screenshot({ path: join(evidence, `cp115-today-${width}-${theme}.png`), fullPage: true });
    await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("button", { name: "Position" }).click();
  }
});

test("actual Chromium 200% zoom contains Today and the offer preview", async () => {
  const baseURL = process.env.OPENFORGE_E2E_BASE_URL ?? "http://127.0.0.1:3010";
  const scratch = await mkdtemp(join(tmpdir(), "pd-cp115-zoom-"));
  const extension = join(scratch, "extension");
  await mkdir(extension);
  await writeFile(join(extension, "manifest.json"), JSON.stringify({ manifest_version: 3, name: "Temporary CP-115 zoom check", version: "1.0", permissions: ["tabs"], background: { service_worker: "background.js" } }));
  await writeFile(join(extension, "background.js"), "chrome.runtime.onInstalled.addListener(() => {});");
  const context = await chromium.launchPersistentContext(join(scratch, "profile"), { channel: "chromium", headless: true, viewport: { width: 1440, height: 900 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try {
    const page = await context.newPage();
    await enter(page);
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    await worker.evaluate(async url => { const tabs = (globalThis as unknown as { chrome: { tabs: { query: (filter: { url: string }) => Promise<Array<{ id: number }>>; setZoom: (id: number, zoom: number) => Promise<void> } } }).chrome.tabs; const matches = await tabs.query({ url: `${url}/*` }); await tabs.setZoom(matches[0].id, 2); }, baseURL);
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(720);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).zoom)).toBe("1");
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.locator('[data-pd-id="lab.nav.tasks"]').click();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    if (evidence) await page.screenshot({ path: join(evidence, "cp115-today-actual-zoom-200.png"), fullPage: true });
    await page.locator('[data-pd-id="lab.task.reload"]').getByRole("button", { name: "Review offer" }).click();
    await page.getByRole("button", { name: "Preview per-Profile drafts" }).click();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    if (evidence) await page.screenshot({ path: join(evidence, "cp115-offer-actual-zoom-200.png"), fullPage: true });
  } finally { await context.close(); await rm(scratch, { recursive: true, force: true }); }
});
