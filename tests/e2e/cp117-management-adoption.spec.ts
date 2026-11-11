import { chromium, expect, test } from "@playwright/test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";
const profile = "/profiles/profile-demo-001";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("pd-required-storage-notice", "acknowledged");
    localStorage.setItem("openforge-theme", "dark");
  });
  await page.goto(authURL);
});

test("Profile directory retains governed filters and analytics behind the Lab list", async ({ page }) => {
  await page.goto("/profiles");
  const directory = page.locator('[data-pd-id="profiles.design-screen"]');
  await expect(directory).toBeVisible({ timeout: 45_000 });
  await expect(directory.getByRole("link", { name: /Add Profile/ })).toBeVisible();
  await expect(page.locator('[data-pd-id="profiles.directory.filters"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="profiles.directory.search"]')).toBeHidden();
  await page.locator('[data-pd-id="profiles.directory.filters"] > summary').click();
  await expect(page.locator('[data-pd-id="profiles.directory.search"]')).toBeVisible();
  await page.locator('[data-pd-id="profiles.directory.search"]').fill("Subscriber Alpha");
  await expect(page.locator('[data-pd-id="profiles.design-list"]')).toContainText("Subscriber Alpha");
  await page.locator('[data-pd-id="profiles.directory.details"] > summary').click();
  await page.locator('[data-pd-id="profiles.directory.row.profile-demo-001"]').click();
  const detail = page.getByRole("dialog", { name: /Profile details for/ });
  await expect(detail).toBeVisible();
  const title = await detail.getByRole("heading", { name: "Subscriber Alpha" }).boundingBox();
  const close = await detail.getByRole("button", { name: "Close profile details" }).boundingBox();
  expect(Math.abs(title!.y - close!.y)).toBeLessThanOrEqual(44);
  await detail.getByRole("button", { name: "Close profile details" }).click();
  await page.locator('[data-pd-id="profiles.analytics.navigation"] > summary').click();
  await page.getByRole("tab", { name: "Performance" }).click();
  await expect(page).toHaveURL("/");
});

for (const width of [900, 390] as const) {
  test(`management navigation and field geometry remain contained at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    if (width === 390) {
      await page.goto("/profiles");
      const rowLink = page.locator('[data-pd-id="profiles.design-list"] a').first();
      await expect(rowLink).toBeVisible({ timeout: 45_000 });
      const rowWidth = await rowLink.locator("..").evaluate(element => element.getBoundingClientRect().width);
      const linkWidth = await rowLink.evaluate(element => element.getBoundingClientRect().width);
      expect(Math.abs(rowWidth - linkWidth)).toBeLessThanOrEqual(2);
    }
    await page.goto(`${profile}/manage`);
    const management = page.locator('[data-pd-id="profile-management.design-screen"]');
    await expect(management).toBeVisible({ timeout: 45_000 });
    const tabs = page.locator('[data-pd-id="profile-management.navigation.tabs"]');
    await expect(tabs.getByRole("tab", { name: "Lifecycle" })).toBeVisible();
    await expect(tabs.getByRole("tab", { name: "Overview" })).toHaveCSS("min-height", "44px");
    await expect(management.locator(".field-control > span:not(.sr-only)").first()).toHaveCSS("text-transform", "none");
    await tabs.getByRole("tab", { name: "Financial / Fees" }).click();
    await expect(page.getByRole("tabpanel", { name: "Financial / Fees" })).toBeVisible();
    await page.reload();
    await expect(tabs.getByRole("tab", { name: "Financial / Fees" })).toHaveAttribute("aria-selected", "true");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.goto("/settings");
    const settings = page.locator('[data-pd-id="fund-manager-settings.tabs"]');
    await expect(settings.getByRole("tab", { name: "Exchange Commissions" })).toBeVisible();
    await settings.getByRole("tab", { name: "Lists", exact: true }).click();
    await expect(page.getByRole("tabpanel", { name: "Lists" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.goto(`${profile}/tracker/settings`);
    await expect(page.locator('[data-pd-id="profile-settings.design-screen"]')).toBeVisible();
    await page.locator('[data-pd-id="profile-settings.navigation.tabs"]').getByRole("tab", { name: "Defaults" }).click();
    await expect(page.getByRole("tabpanel", { name: "Defaults" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
}

test("onboarding keeps Lab field geometry and existing setup choices", async ({ page }) => {
  await page.goto("/profiles/new");
  await expect(page.getByRole("heading", { name: "Create a Profile" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Onboarding progress" })).toBeVisible();
  await expect(page.locator('[data-pd-id="profile-onboarding.setup-path"]')).toBeVisible();
  const label = page.locator('[data-pd-id="founder-onboarding.page"] .field-control > span:not(.sr-only)').first();
  await expect(label).toHaveCSS("text-transform", "none");
  await expect(label).toHaveCSS("font-size", "16px");
  await expect(page.getByRole("combobox", { name: "Profile relationship" })).not.toHaveCSS("background-image", "none");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Complete the Profile identity and fee percentages.")).toBeVisible();
});

test("Accounts keeps its native Add dialog and governed fields", async ({ page }) => {
  await page.goto(`${profile}/tracker/accounts`);
  await expect(page.locator('[data-pd-id="accounts.design-screen"]')).toBeVisible({ timeout: 45_000 });
  await page.locator('[data-pd-id="accounts.toolbar.add-row"]').click();
  const editor = page.getByRole("dialog", { name: "Create account" });
  await expect(editor).toBeVisible();
  await expect(editor.locator('[data-pd-id="accounts.editor.sections"]')).toBeVisible();
  await expect(editor.locator('[data-pd-id="accounts.editor.footer"]')).toBeVisible();
  await expect(editor.locator(".field-control > span:not(.sr-only)").first()).toHaveCSS("text-transform", "none");
  await expect(editor.getByRole("combobox", { name: "Account", exact: true })).not.toHaveCSS("background-image", "none");
  await page.keyboard.press("Escape");
  await expect(editor).toHaveCount(0);
});

test("Profile Accounts uses the Lab toolbar hierarchy with compact governed paging", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto(`${profile}/tracker/accounts`);
  const screen = page.locator('[data-pd-id="accounts.design-screen"]');
  await expect(screen).toBeVisible({ timeout: 45_000 });
  const toolbar = page.locator('[data-pd-id="accounts.table-toolbar"]');
  await expect(toolbar).toBeVisible({ timeout: 45_000 });
  await expect(toolbar.locator('[data-pd-id="accounts.toolbar.search"]')).toBeVisible();
  await expect(toolbar.locator('[data-pd-id="accounts.toolbar.status"]')).toBeVisible();
  await expect(toolbar.locator('[data-pd-id="accounts.toolbar.filter"]')).toHaveText("Filters");
  await expect(toolbar.locator('[data-pd-id="accounts.toolbar.columns"]')).toHaveText("Columns");
  await expect(screen.locator('[data-pd-id="accounts.table-loadouts"]')).toHaveCount(0);
  await expect(screen.locator('[data-pd-id="accounts.pagination.top"]')).toContainText(/Showing \d+–\d+ of \d+/);
  await expect(screen.locator('[data-pd-id="accounts.pagination.bottom"]')).toHaveCount(0);
  for (const width of [900, 390] as const) {
    await page.setViewportSize({ width, height: 900 });
    const pager = page.locator('[data-pd-id="accounts.pagination.top"]');
    const select = (await pager.locator('[data-pd-id="accounts.pagination.top.page-size"]').boundingBox())!;
    const previous = (await pager.getByRole("button", { name: "Previous" }).boundingBox())!;
    const overlap = select.x < previous.x + previous.width && previous.x < select.x + select.width && select.y < previous.y + previous.height && previous.y < select.y + select.height;
    expect(overlap, `Page size overlaps Previous at ${width}px`).toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});

test("Accounts paging and status filters operate on one bounded read", async ({ page }) => {
  const response = await page.request.get(`/api/profiles/profile-demo-001/accounts`);
  expect(response.ok(), await response.text()).toBe(true);
  const records = await response.json() as Array<Record<string, unknown>>;
  expect(records.length).toBeGreaterThan(0);
  const rows = Array.from({ length: 17 }, (_, index) => ({
    ...records[0],
    account_id: `SYN-ACCOUNT-${String(index + 1).padStart(2, "0")}`,
    account: `Synthetic Account ${index + 1}`,
    catalogue_id: "",
    status: index < 13 ? "Active" : "Limited",
    lifecycle_status: index < 13 ? "Active" : "Limited",
  }));
  await page.route(/\/profiles\/profile-demo-001\/accounts(?:\?.*)?$/, async route => {
    if (route.request().method() === "GET") await route.fulfill({ status: 200, json: rows });
    else await route.continue();
  });
  await page.goto(`${profile}/tracker/accounts`);
  const pager = page.locator('[data-pd-id="accounts.pagination.top"]');
  await expect(pager).toContainText("Showing 1–8 of 17", { timeout: 45_000 });
  await pager.getByRole("button", { name: "Next" }).click();
  await expect(pager).toContainText("Showing 9–16 of 17");
  await page.locator('[data-pd-id="accounts.toolbar.status"]').click();
  await page.getByRole("option", { name: "Limited" }).click();
  await expect(pager).toContainText("Showing 1–4 of 4 · Page 1 of 1");
  await page.locator('[data-pd-id="accounts.toolbar.clear-filters"]').click();
  await expect(pager).toContainText("Showing 1–8 of 17");
  await pager.locator('[data-pd-id="accounts.pagination.top.page-size"]').click();
  await page.getByRole("option", { name: "16 rows" }).click();
  await expect(pager).toContainText("Showing 1–16 of 17");
});

test("Accounts keeps search, secondary review filters, columns and owned-row handoff", async ({ page }) => {
  const response = await page.request.get(`/api/profiles/profile-demo-001/accounts`);
  expect(response.ok(), await response.text()).toBe(true);
  const records = await response.json() as Array<{ account_id: string; account: string }>;
  expect(records.length).toBeGreaterThan(0);
  await page.goto(`${profile}/tracker/accounts`);
  await expect(page.locator('[data-pd-id="accounts.table-toolbar"]')).toBeVisible({ timeout: 45_000 });
  const search = page.getByRole("searchbox", { name: "Search accounts" });
  await search.fill(records[0].account_id);
  const pager = page.locator('[data-pd-id="accounts.pagination.top"]');
  await expect(pager).toContainText("Showing 1–1 of 1");
  await page.locator('[data-pd-id="accounts.toolbar.filter"]').click();
  const filters = page.getByRole("dialog", { name: "Filter accounts" });
  await expect(filters.getByRole("combobox", { name: "View" })).toBeVisible();
  await expect(filters.getByRole("combobox", { name: "Issues" })).toBeVisible();
  await filters.getByRole("button", { name: "Done" }).click();
  const row = page.locator('[data-pd-id="accounts.table-scroll"] tbody tr').filter({ hasText: records[0].account_id });
  await row.getByRole("button", { name: /^(Edit|Review attention for) / }).click();
  await expect(page.getByRole("dialog", { name: "Edit account" })).toBeVisible();
  await page.getByRole("button", { name: "Close account editor" }).click();
  await expect(page.getByRole("dialog", { name: "Edit account" })).toHaveCount(0);
  await page.locator('[data-pd-id="accounts.toolbar.clear-filters"]').click();
  await expect(search).toHaveValue("");
  await page.locator('[data-pd-id="accounts.toolbar.columns"]').click();
  const columns = page.getByRole("dialog", { name: "Account columns" });
  await columns.getByRole("button", { name: "Hide Channel" }).click();
  await columns.getByRole("button", { name: "Done" }).click();
  await expect(page.locator('[data-pd-id="accounts.table-scroll"] th').filter({ hasText: "Channel" })).toHaveCount(0);
  await page.locator('[data-pd-id="accounts.toolbar.restore-columns"]').click();
  await expect(page.locator('[data-pd-id="accounts.table-scroll"] th').filter({ hasText: "Channel" })).toHaveCount(1);
  await search.fill("No matching synthetic Account");
  await expect(pager).toContainText("Showing 0–0 of 0");
  await expect(page.getByText("No account rows match the current filter.").first()).toBeVisible();
});

test("Accounts read failure does not present an empty result as complete", async ({ page }) => {
  await page.route(/\/profiles\/profile-demo-001\/accounts(?:\?.*)?$/, async route => {
    if (route.request().method() === "GET") await route.fulfill({ status: 503, json: { detail: "Synthetic read failure" } });
    else await route.continue();
  });
  await page.goto(`${profile}/tracker/accounts`);
  await expect(page.locator('[data-pd-id="accounts.read-error"]')).toBeVisible({ timeout: 45_000 });
  await expect(page.locator('[data-pd-id="accounts.design-screen"]')).toContainText("Account rows unavailable");
  await expect(page.locator('[data-pd-id="accounts.pagination.top"]')).toHaveCount(0);
  await page.unroute(/\/profiles\/profile-demo-001\/accounts(?:\?.*)?$/);
  await page.getByRole("button", { name: "Retry Accounts read" }).click();
  await expect(page.locator('[data-pd-id="accounts.pagination.top"]')).toBeVisible({ timeout: 45_000 });
});

test("Profile overview preserves input after rejected Save and persists on retry", async ({ page }) => {
  await page.goto(`${profile}/manage`);
  const name = page.getByRole("textbox", { name: "Display name" });
  await expect(name).toBeVisible({ timeout: 45_000 });
  const original = await name.inputValue();
  const changed = "Synthetic Management Review";
  try {
    await name.fill(changed);
    await page.route(`**/profiles/profile-demo-001`, async route => {
      if (route.request().method() === "PATCH") await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Synthetic temporary failure" }) });
      else await route.continue();
    });
    await page.getByRole("button", { name: "Save overview" }).click();
    await expect(page.getByText("Synthetic temporary failure")).toBeVisible();
    await expect(name).toHaveValue(changed);
    await page.unroute(`**/profiles/profile-demo-001`);
    await page.getByRole("button", { name: "Save overview" }).click();
    await expect(page.getByText("Profile overview saved.")).toBeVisible();
    await page.reload();
    await expect(name).toHaveValue(changed);
  } finally {
    await page.unroute(`**/profiles/profile-demo-001`);
    const restored = await page.request.patch(`/api/profiles/profile-demo-001`, { data: { display_name: original } });
    expect(restored.ok(), await restored.text()).toBe(true);
  }
});

test("Profile Settings retains readable surfaces and section controls in both themes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${profile}/tracker/settings`);
  const surface = page.locator('[data-pd-id="profile-settings.design-screen"]');
  await expect(surface).toBeVisible({ timeout: 45_000 });
  for (const theme of ["dark", "light"] as const) {
    await page.evaluate(value => { document.documentElement.dataset.theme = value; localStorage.setItem("openforge-theme", value); }, theme);
    await expect(page.locator('[data-pd-id="profile-settings.navigation.tabs"]').getByRole("tab", { name: "Subscriber" })).toBeVisible();
    const colour = await surface.evaluate(element => getComputedStyle(element).backgroundColor);
    expect(colour).not.toBe("rgba(0, 0, 0, 0)");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});

test("management tabs remain usable at actual Chromium 200% zoom", async ({}, info) => {
  const baseURL = String(info.project.use.baseURL);
  const scratch = await mkdtemp(join(tmpdir(), "pd-management-zoom-"));
  const extension = join(scratch, "extension");
  await mkdir(extension);
  await writeFile(join(extension, "manifest.json"), JSON.stringify({ manifest_version: 3, name: "Temporary management zoom check", version: "1.0", permissions: ["tabs"], background: { service_worker: "background.js" } }));
  await writeFile(join(extension, "background.js"), "chrome.runtime.onInstalled.addListener(() => {});");
  const context = await chromium.launchPersistentContext(join(scratch, "profile"), { channel: "chromium", headless: true, viewport: { width: 1440, height: 900 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try {
    const page = await context.newPage();
    await page.goto(authURL);
    await page.goto(`${baseURL}${profile}/manage`);
    await expect(page.locator('[data-pd-id="profile-management.navigation.tabs"]')).toBeVisible();
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    await worker.evaluate(async url => {
      const tabs = (globalThis as unknown as { chrome: { tabs: { query: (filter: { url: string }) => Promise<Array<{ id: number }>>; setZoom: (id: number, zoom: number) => Promise<void> } } }).chrome.tabs;
      const matches = await tabs.query({ url: `${url}/*` });
      await tabs.setZoom(matches[0].id, 2);
    }, baseURL);
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(720);
    await expect(page.getByRole("tab", { name: "Lifecycle" })).toBeVisible();
    await page.getByRole("tab", { name: "Security", exact: true }).click();
    await expect(page.getByRole("tabpanel", { name: "Security" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.goto(`${baseURL}/settings`);
    await expect(page.getByRole("tab", { name: "Quick Actions" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.goto(`${baseURL}${profile}/tracker/accounts`);
    const pager = page.locator('[data-pd-id="accounts.pagination.top"]');
    await expect(pager).toBeVisible({ timeout: 45_000 });
    const size = (await pager.locator('[data-pd-id="accounts.pagination.top.page-size"]').boundingBox())!;
    const previous = (await pager.getByRole("button", { name: "Previous" }).boundingBox())!;
    expect(size.x < previous.x + previous.width && previous.x < size.x + size.width && size.y < previous.y + previous.height && previous.y < size.y + size.height).toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  } finally {
    await context.close();
    await rm(scratch, { recursive: true, force: true });
  }
});
