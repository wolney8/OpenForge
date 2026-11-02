import { chromium, expect, test } from "@playwright/test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const syntheticSession = {
  authenticated: true,
  email: "demo@example.invalid",
  name: "Synthetic Fund Manager",
  role: "fund_manager",
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/session", (route) => route.fulfill({ json: syntheticSession }));
  await page.route("**/api/auth/activity", (route) => route.fulfill({ status: 204 }));
  await page.route("**/api/profiles", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/fund-manager/**", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/account-catalogue/source", (route) => route.fulfill({ json: { records: [] } }));
  await page.route("**/api/profiles/*/bookmaker-display-settings", (route) => route.fulfill({ json: { resolved_mode: "Name" } }));
  await page.route("**/api/profiles/*/accounts", (route) => route.fulfill({ json: [] }));
});

test("normal-app old-shell baseline is guarded and renders at representative widths", async ({ page }) => {
  test.skip(process.env.OPENFORGE_CP117_EXPECT_V2 === "true", "Runs against the default-off server");
  for (const width of [1440, 900, 768, 430, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/profiles");
    await expect(page.locator('[data-pd-id="app-shell.top-bar"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Open navigation drawer" })).toBeVisible();
    const evidenceDir = process.env.OPENFORGE_CP117_EVIDENCE_DIR;
    if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/before-${width}.png`, fullPage: true });
  }
  await page.goto("/profiles/profile-demo-001/tracker/sportsbook-bets?source=report-explorer");
  await expect(page.locator('[data-ux-shell="legacy"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="ux-v2.sidebar"]')).toHaveCount(0);
});

test("server-enabled shell keeps the sidebar stable and anchors the launcher", async ({ page }) => {
  test.skip(process.env.OPENFORGE_CP117_EXPECT_V2 !== "true", "Runs against the explicitly enabled test server");
  for (const width of [1440, 900, 768, 430, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/profiles");
    await expect(page.locator('[data-ux-shell="v2"]')).toBeVisible();
    const sidebar = page.locator('[data-pd-id="ux-v2.sidebar"]');
    if (width > 760) await expect(sidebar).toBeInViewport();
    else {
      await page.getByRole("button", { name: "Open navigation drawer" }).click();
      await expect(sidebar).toBeInViewport();
      await expect(page.locator('[data-pd-id="ux-v2.nav.profiles"]')).toHaveAttribute("aria-current", "page");
      await page.getByRole("button", { name: "Close navigation" }).click();
      await expect(sidebar).not.toBeInViewport();
    }
    if (width > 760) await expect(page.locator('[data-pd-id="ux-v2.nav.profiles"]')).toHaveAttribute("aria-current", "page");
    await page.getByRole("button", { name: "Open application launcher" }).click();
    const panel = page.getByRole("dialog", { name: "Application launcher" });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("link", { name: "Oddsmatcher" })).toHaveAttribute("href", "/oddsmatcher");
    const trigger = await page.getByRole("button", { name: "Open application launcher" }).boundingBox();
    const overlay = await panel.boundingBox();
    expect(trigger && overlay && overlay.y >= trigger.y + trigger.height - 1).toBeTruthy();
    expect(overlay && overlay.x >= 0 && overlay.x + overlay.width <= width + 1).toBeTruthy();
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await page.locator('[data-pd-id="notifications.trigger"]').click();
    const notifications = page.locator('[data-pd-id="notifications.panel"]');
    await expect(notifications).toBeVisible();
    const notificationBox = await notifications.boundingBox();
    expect(notificationBox && notificationBox.x >= 0 && notificationBox.x + notificationBox.width <= width + 1).toBeTruthy();
    await page.keyboard.press("Escape");
    await expect(notifications).toBeHidden();
    const evidenceDir = process.env.OPENFORGE_CP117_EVIDENCE_DIR;
    if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/after-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
  }
});

test("server-enabled shell navigates, preserves source Back and keeps menus distinct", async ({ page }) => {
  test.skip(process.env.OPENFORGE_CP117_EXPECT_V2 !== "true", "Runs against the explicitly enabled test server");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/profiles");
  await page.locator('[data-pd-id="ux-v2.nav.today"]').click();
  await expect(page).toHaveURL(/\/tasks$/);
  await expect(page.locator('[data-pd-id="ux-v2.nav.today"]')).toHaveAttribute("aria-current", "page");
  await page.locator('[data-pd-id="ux-v2.nav.reports"]').click();
  await expect(page).toHaveURL(/\/reports$/);
  await expect(page.locator('[data-pd-id="ux-v2.nav.reports"]')).toHaveAttribute("aria-current", "page");
  await page.goto("/profiles/profile-demo-001/tracker/sportsbook-bets?source=report-explorer");
  await expect(page.locator('[data-pd-id="ux-v2.nav.sportsbook"]')).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "Back to Reports" })).toBeVisible();
  await page.getByRole("link", { name: "Back to Reports" }).click();
  await expect(page).toHaveURL(/\/reports$/);
  await page.getByRole("button", { name: /Open account menu/ }).click();
  const evidenceDir = process.env.OPENFORGE_CP117_EVIDENCE_DIR;
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/after-account-menu-1440.png`, fullPage: false });
  const themeSwitch = page.getByRole("switch", { name: "Dark mode" });
  await expect(themeSwitch).toBeVisible();
  await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
  const previousTheme = await page.locator("html").getAttribute("data-theme");
  await themeSwitch.click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", previousTheme ?? "");
  if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/after-theme-${await page.locator("html").getAttribute("data-theme")}-1440.png`, fullPage: false });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Fund Manager account menu" })).toBeHidden();
  await expect(page.getByRole("button", { name: /Open account menu/ })).toBeFocused();
});

test("server-enabled search uses the existing authorised result groups", async ({ page }) => {
  test.skip(process.env.OPENFORGE_CP117_EXPECT_V2 !== "true", "Runs against the explicitly enabled test server");
  const requests: string[] = [];
  await page.route(/\/search\?query=/, (route) => {
    requests.push(route.request().url());
    return route.fulfill({ json: [{ result_id: "profile-demo", group: "Profiles", title: "Demo Profile", subtitle: "Synthetic", href: "/profiles", icon: "group" }] });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/profiles");
  await page.getByRole("combobox", { name: "Search profiles, accounts and Fund Manager pages" }).fill("demo");
  await expect(page.getByRole("listbox", { name: "Global search results" })).toContainText("Demo Profile");
  expect(requests.length).toBe(1);
  expect(new URL(requests[0]).searchParams.get("query")).toBe("demo");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox", { name: "Global search results" })).toBeHidden();
});

test("source-origin Back restores the All Profiles report URL", async ({ page }) => {
  test.skip(process.env.OPENFORGE_CP117_EXPECT_V2 !== "true", "Runs against the explicitly enabled test server");
  await page.goto("/reports?view=by-ledger&sort=date");
  await expect(page.locator('[data-pd-id="ux-v2.breadcrumbs"]')).toBeVisible();
  await page.locator("#main-content").evaluate((main) => {
    const link = document.createElement("a");
    link.href = "/profiles/profile-demo-001/tracker/sportsbook-bets?source=report-explorer";
    link.textContent = "Synthetic report source";
    main.prepend(link);
    link.click();
  });
  await expect(page).toHaveURL(/\/profiles\/profile-demo-001\/tracker\/sportsbook-bets/);
  await expect(page.getByRole("link", { name: "Back to Reports" })).toHaveAttribute("href", "/reports?view=by-ledger&sort=date");
  await expect(page.locator('[data-pd-id="ux-v2.breadcrumbs"]')).toContainText("All Profiles view");
  await page.getByRole("link", { name: "Back to Reports" }).click();
  await expect(page).toHaveURL(/\/reports\?view=by-ledger&sort=date$/);
});

test("actual Chromium 200% zoom contains the new shell", async () => {
  test.skip(process.env.OPENFORGE_CP117_EXPECT_V2 !== "true", "Runs against the explicitly enabled test server");
  const baseURL = process.env.OPENFORGE_E2E_BASE_URL ?? "http://localhost:3213";
  const scratch = await mkdtemp(join(tmpdir(), "pd-cp117-zoom-"));
  const extension = join(scratch, "extension");
  await mkdir(extension);
  await writeFile(join(extension, "manifest.json"), JSON.stringify({ manifest_version: 3, name: "Temporary CP-117 zoom check", version: "1.0", permissions: ["tabs"], background: { service_worker: "background.js" } }));
  await writeFile(join(extension, "background.js"), "chrome.runtime.onInstalled.addListener(() => {});");
  const context = await chromium.launchPersistentContext(join(scratch, "profile"), { channel: "chromium", headless: true, viewport: { width: 1440, height: 900 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try {
    const page = await context.newPage();
    await page.route("**/api/auth/session", (route) => route.fulfill({ json: syntheticSession }));
    await page.route("**/api/auth/activity", (route) => route.fulfill({ status: 204 }));
    await page.route("**/api/profiles", (route) => route.fulfill({ json: [] }));
    await page.route("**/api/fund-manager/**", (route) => route.fulfill({ json: [] }));
    await page.route("**/api/account-catalogue/source", (route) => route.fulfill({ json: { records: [] } }));
    await page.route("**/api/profiles/*/bookmaker-display-settings", (route) => route.fulfill({ json: { resolved_mode: "Name" } }));
    await page.route("**/api/profiles/*/accounts", (route) => route.fulfill({ json: [] }));
    await page.goto(`${baseURL}/profiles`);
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    await worker.evaluate(async (url) => { const tabs = (globalThis as unknown as { chrome: { tabs: { query: (filter: { url: string }) => Promise<Array<{ id: number }>>; setZoom: (id: number, zoom: number) => Promise<void> } } }).chrome.tabs; const matches = await tabs.query({ url: `${url}/*` }); await tabs.setZoom(matches[0].id, 2); }, baseURL);
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(720);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).zoom)).toBe("1");
    await expect(page.getByRole("button", { name: "Open application launcher" })).toBeInViewport();
    await expect(page.getByRole("button", { name: /Open account menu/ })).toBeInViewport();
    await page.getByRole("button", { name: "Open navigation drawer" }).click();
    await expect(page.locator('[data-pd-id="ux-v2.sidebar"]')).toBeInViewport();
    await page.getByRole("button", { name: "Close navigation" }).click();
    await expect(page.locator('[data-pd-id="ux-v2.sidebar"]')).not.toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    const evidenceDir = process.env.OPENFORGE_CP117_EVIDENCE_DIR;
    if (evidenceDir) await page.screenshot({ path: `${evidenceDir}/after-actual-browser-zoom-200.png`, fullPage: true });
  } finally { await context.close(); await rm(scratch, { recursive: true, force: true }); }
});
