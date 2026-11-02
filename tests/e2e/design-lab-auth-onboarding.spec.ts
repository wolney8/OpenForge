import { chromium, expect, test, type Page } from "@playwright/test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const evidence = process.env.OPENFORGE_DESIGN_LAB_EVIDENCE_DIR;
async function enter(page: Page) {
  await page.route("**/api/**", async route => {
    if (route.request().url().endsWith("/api/auth/session")) { await route.fulfill({ json: { authenticated: true, email: "demo@example.invalid", expires_at: 4102444800, name: "Synthetic Fund Manager", role: "fund_manager", session_policy: { absolute_expires_at: 4102444800, auto_logout_enabled: false, effective_expires_at: 4102444800, inactivity_expires_at: null, last_activity_at: 1, preference_configured: true, timeout_minutes: 30, valid_now: true } } }); return; }
    if (route.request().url().endsWith("/api/auth/activity")) { await route.fulfill({ json: { ok: true } }); return; }
    throw new Error(`Unexpected business API request in Design Lab: ${route.request().url()}`);
  });
  await page.goto("/design-lab");
  await expect(page.locator('[data-pd-id="design-lab-connected.root"]')).toBeVisible();
}

test("synthetic sign-out, session states and return context never invoke real auth", async ({ page }) => {
  await enter(page);
  await page.locator('[data-pd-id="lab.profile"]').click();
  await page.getByRole("option", { name: "Profile B" }).click();
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("button", { name: "Simulate Sign Out" }).click();
  const auth = page.locator('[data-pd-id="lab.auth-screen"]');
  await expect(auth).toContainText("Return to Today");
  if (evidence) { await mkdir(evidence, { recursive: true }); await page.screenshot({ path: join(evidence, "cp115b-signed-out-1440.png"), fullPage: true }); }
  await auth.getByRole("button", { name: "Sign in with Google · simulation" }).click();
  await expect(auth).toContainText("Signing in");
  await expect(page.locator('[data-pd-id="lab.today"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="lab.profile"]')).toContainText("Profile B");
  await page.getByText("Simulation controls").click();
  await page.getByRole("button", { name: "Simulate temporary session validation issue" }).click();
  await expect(auth).toContainText("We couldn't validate your session");
  await auth.getByRole("button", { name: "Retry validation" }).click();
  await expect(page.locator('[data-pd-id="lab.today"]')).toBeVisible();
  await page.getByText("Simulation controls").click();
  await page.getByRole("button", { name: "Simulate expired application session" }).click();
  await expect(auth).toContainText("Application session expired");
  await auth.getByRole("button", { name: "Sign in again" }).click();
  await expect(page.locator('[data-pd-id="lab.today"]')).toBeVisible();
});

test("notification read and clear do not resolve source work; history and recovery states", async ({ page }) => {
  await enter(page);
  await page.getByRole("button", { name: /Notifications, \d+ unread/ }).click();
  const bell = page.locator('[data-pd-id="lab.notifications"]');
  if (evidence) { await mkdir(evidence, { recursive: true }); await page.screenshot({ path: join(evidence, "cp115b-notifications-1440.png"), fullPage: true }); }
  const overdue = bell.locator('[data-pd-id="lab.notification.task:LAB-SB-OVERDUE"]');
  await expect(overdue).toContainText("Unread");
  await overdue.getByRole("button", { name: "Mark read" }).click();
  await expect(overdue).toContainText("Read");
  await overdue.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(overdue).toContainText("The source task remains open");
  await overdue.getByRole("button", { name: "Clear notification" }).click();
  await expect(overdue).toHaveCount(0);
  await bell.getByRole("button", { name: "History" }).click();
  await expect(overdue).toBeVisible();
  await bell.getByText("Test states").click();
  await bell.getByRole("button", { name: "Error" }).click();
  await expect(bell).toContainText("Notifications could not be loaded");
  await bell.getByRole("button", { name: "Retry" }).click();
  await bell.getByRole("button", { name: "View all in Today" }).click();
  await expect(page.locator('[data-pd-id="lab.task.task:LAB-SB-OVERDUE"]')).toBeVisible();
});

test("fresh onboarding validates commission, retains failed draft and creates only synthetic first-use state", async ({ page }) => {
  await enter(page);
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("button", { name: "Add Profile · simulation" }).click();
  const form = page.locator('[data-pd-id="lab.onboarding"]');
  if (evidence) { await mkdir(evidence, { recursive: true }); await page.screenshot({ path: join(evidence, "cp115b-onboarding-1440.png"), fullPage: true }); }
  await form.getByRole("button", { name: "Continue" }).click();
  await expect(form).toContainText("Enter a Profile name");
  await form.getByRole("textbox", { name: "Profile name" }).fill("Synthetic Personal");
  await form.getByRole("textbox", { name: "Stable Profile code" }).fill("DEMO-NEW");
  await form.getByRole("textbox", { name: "Starting bankroll (£)" }).fill("0.00");
  await form.getByRole("button", { name: "Continue" }).click();
  await form.getByRole("button", { name: "Continue" }).click();
  await form.getByRole("button", { name: "Continue" }).click();
  await expect(form).toContainText("Select at least one Exchange");
  await form.getByRole("checkbox", { name: /Exchange A · synthetic/ }).check();
  await form.getByRole("button", { name: "Continue" }).click();
  await expect(form).toContainText("explicit Exchange commission");
  await form.getByRole("textbox", { name: "Exchange A commission" }).fill("0.02");
  await form.getByRole("button", { name: "Continue" }).click();
  await form.getByRole("button", { name: "Continue" }).click();
  await expect(form).toContainText("£0.00 · no existing Profile balance changes");
  await form.getByRole("checkbox", { name: "Simulate creation failure on next attempt" }).check();
  await form.getByRole("button", { name: "Create Profile · simulation" }).click();
  await expect(form).toContainText("Your entries are retained");
  await expect(form).toContainText("Synthetic Personal");
  await form.getByRole("button", { name: "Create Profile · simulation" }).click();
  await expect(form.locator('[data-pd-id="lab.onboarding-created"]')).toContainText("Current cash");
  if (evidence) { await mkdir(evidence, { recursive: true }); await page.screenshot({ path: join(evidence, "cp115b-first-use-1440.png"), fullPage: true }); }
});

test("import onboarding accepts no Accounts and protects unsaved exit", async ({ page }) => {
  await enter(page);
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("button", { name: "Add Profile · simulation" }).click();
  const form = page.locator('[data-pd-id="lab.onboarding"]');
  await form.getByRole("combobox", { name: "Setup path Fresh setup" }).click();
  await page.getByRole("option", { name: "Import existing tracker" }).click();
  await form.getByRole("textbox", { name: "Profile name" }).fill("Synthetic Import");
  await form.getByRole("textbox", { name: "Stable Profile code" }).fill("DEMO-IMPORT");
  await form.getByRole("button", { name: "Exit onboarding" }).click();
  await expect(page.getByRole("dialog", { name: "Unsaved Profile setup" })).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await form.getByRole("button", { name: "Continue" }).click();
  await form.getByRole("button", { name: "Continue" }).click();
  await expect(form).toContainText("Import can start without Accounts");
  await form.getByRole("button", { name: "Continue" }).click();
  await form.getByRole("button", { name: "Continue" }).click();
  await form.getByRole("button", { name: "Create Profile · simulation" }).click();
  await expect(form.locator('[data-pd-id="lab.onboarding-created"]')).toContainText("Unknown · no reviewed Accounts");
  if (evidence) { await mkdir(evidence, { recursive: true }); await page.screenshot({ path: join(evidence, "cp115b-import-first-use-1440.png"), fullPage: true }); }
});

test("invited subscriber remains a bounded read-only preview", async ({ page }) => {
  await enter(page);
  await page.getByRole("button", { name: "See More" }).click();
  await page.getByRole("button", { name: "Profiles", exact: true }).click();
  await page.getByRole("button", { name: "Inspect preview" }).click();
  const preview = page.locator('[data-pd-id="lab.subscriber-preview"]');
  await preview.getByRole("button", { name: "Simulate acceptance" }).click();
  await preview.getByRole("button", { name: "Submit minimal application · simulation" }).click();
  await preview.getByRole("button", { name: "Request information" }).click();
  await preview.getByRole("button", { name: "Approve · simulation" }).click();
  await preview.getByRole("button", { name: "Link Pending Managed Profile · simulation" }).click();
  await preview.getByRole("button", { name: "Grant read-only access · simulation" }).click();
  await expect(preview.locator('[data-pd-id="lab.subscriber-restricted"]')).toContainText("Other Profiles");
  if (evidence) { await mkdir(evidence, { recursive: true }); await page.screenshot({ path: join(evidence, "cp115b-subscriber-preview-1440.png"), fullPage: true }); }
});

test("auth, onboarding and bell remain contained at desktop, intermediate and narrow widths", async ({ page }) => {
  await enter(page);
  for (const width of [1440, 900, 768, 430, 390]) {
    await page.setViewportSize({ width, height: 850 });
    await page.getByRole("button", { name: /Notifications, \d+ unread/ }).click();
    const panel = page.locator('[data-pd-id="lab.notifications"]');
    await expect(panel).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    const outer = await panel.locator("xpath=parent::section").boundingBox();
    expect(outer?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect((outer?.x ?? 0) + (outer?.width ?? 0)).toBeLessThanOrEqual(width + 1);
    if (evidence && width === 430) { await mkdir(evidence, { recursive: true }); await page.screenshot({ path: join(evidence, "cp115b-notifications-430.png"), fullPage: true }); }
    await page.keyboard.press("Escape");
  }
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("button", { name: "Add Profile · simulation" }).click();
  for (const width of [900, 430, 390]) {
    await page.setViewportSize({ width, height: 850 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    if (evidence && width === 390) await page.screenshot({ path: join(evidence, "cp115b-onboarding-390.png"), fullPage: true });
  }
  await page.getByRole("button", { name: "Exit onboarding" }).click();
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("button", { name: "Simulate Sign Out" }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  if (evidence) await page.screenshot({ path: join(evidence, "cp115b-signed-out-390.png"), fullPage: true });
});

test("actual Chromium 200% zoom contains onboarding", async () => {
  const baseURL = process.env.OPENFORGE_E2E_BASE_URL ?? "http://127.0.0.1:3010";
  const scratch = await mkdtemp(join(tmpdir(), "pd-cp115b-zoom-"));
  const extension = join(scratch, "extension");
  await mkdir(extension);
  await writeFile(join(extension, "manifest.json"), JSON.stringify({ manifest_version: 3, name: "Temporary CP-115B zoom check", version: "1.0", permissions: ["tabs"], background: { service_worker: "background.js" } }));
  await writeFile(join(extension, "background.js"), "chrome.runtime.onInstalled.addListener(() => {});");
  const context = await chromium.launchPersistentContext(join(scratch, "profile"), { channel: "chromium", headless: true, viewport: { width: 1440, height: 900 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try {
    const page = await context.newPage();
    await enter(page);
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    await worker.evaluate(async url => { const tabs = (globalThis as unknown as { chrome: { tabs: { query: (filter: { url: string }) => Promise<Array<{ id: number }>>; setZoom: (id: number, zoom: number) => Promise<void> } } }).chrome.tabs; const matches = await tabs.query({ url: `${url}/*` }); await tabs.setZoom(matches[0].id, 2); }, baseURL);
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(720);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).zoom)).toBe("1");
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("button", { name: "Add Profile · simulation" }).click();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    if (evidence) { await mkdir(evidence, { recursive: true }); await page.screenshot({ path: join(evidence, "cp115b-onboarding-actual-zoom-200.png"), fullPage: true }); }
  } finally { await context.close(); await rm(scratch, { recursive: true, force: true }); }
});

test("new notification, onboarding and session surfaces retain light theme and keyboard dismissal", async ({ page }) => {
  await enter(page);
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("switch", { name: "Dark Mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Account menu" })).toBeFocused();
  await page.setViewportSize({ width: 430, height: 850 });
  await page.getByRole("button", { name: /Notifications, \d+ unread/ }).click();
  await expect(page.locator('[data-pd-id="lab.notifications"]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  if (evidence) await page.screenshot({ path: join(evidence, "cp115b-notifications-light-430.png"), fullPage: true });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("button", { name: "Add Profile · simulation" }).click();
  await expect(page.locator('[data-pd-id="lab.onboarding"]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  if (evidence) await page.screenshot({ path: join(evidence, "cp115b-onboarding-light-430.png"), fullPage: true });
  await page.getByRole("button", { name: "Exit onboarding" }).click();
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("button", { name: "Simulate Sign Out" }).click();
  await expect(page.locator('[data-pd-id="lab.auth-screen"]')).toBeVisible();
  await expect.poll(() => page.locator('[data-pd-id="lab.auth-screen"] .brand-logo').evaluate(element => (element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth > 0)).toBe(true);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  if (evidence) await page.screenshot({ path: join(evidence, "cp115b-signed-out-light-430.png"), fullPage: true });
});
