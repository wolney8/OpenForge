import { expect, test, chromium } from "@playwright/test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";

test.beforeEach(async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  expect(health.database_identity).toBe("cp117-integration-synthetic");
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(authURL);
  expect((await (await page.request.get("/api/auth/session")).json()).email).toBe("demo@example.invalid");
});

test("non-notification advisory row opens Opportunity Details without tracking or navigation", async ({ page }) => {
  await page.goto("/tasks");
  await page.getByRole("button", { name: /Opportunities \/ Suggestions/ }).click();
  const row = page.locator('[data-pd-id^="opportunities.item."]').first();
  await expect(row).toBeVisible();
  const before = await (await page.request.get("/api/fund-manager/tasks/annotations")).json() as unknown[];
  await row.click();
  await expect(page.locator('[data-pd-id="tasks.v2.opportunity-detail"] h2')).toBeFocused();
  await expect(page).toHaveURL(/\/tasks(?:\?|$)/);
  expect(await (await page.request.get("/api/fund-manager/tasks/annotations")).json()).toEqual(before);
  await page.getByRole("link", { name: "Open Accounts" }).click();
  await expect(page).toHaveURL(/\/profiles\/profile-demo-001\/tracker\/accounts#profile-opportunities/);
});

test("tracked banner ignores an old expanded preference on page load", async ({ page }) => {
  const profileId = "profile-demo-001";
  const opportunities = await (await page.request.get(`/api/fund-manager/common-bet-combos/profile-opportunities/${profileId}`)).json() as Array<{ opportunity_key: string; period_key: string }>;
  const item = opportunities[0];
  expect(item).toBeTruthy();
  const occurrence = `profile-opportunity:${profileId}:${item.opportunity_key}:${item.period_key}`;
  const initial = await (await page.request.get("/api/fund-manager/tasks/annotations")).json() as Array<{ profile_id: string; occurrence_key: string; version: number; tracked: boolean }>;
  const existing = initial.find(row => row.profile_id === profileId && row.occurrence_key === occurrence);
  const tracked = await page.request.patch("/api/fund-manager/tasks/annotations", { data: { changes: [{ profile_id: profileId, occurrence_key: occurrence, tracked: true, work_state: "To Do", expected_version: existing?.version ?? 0 }] } });
  expect(tracked.status()).toBe(200);
  try {
    await page.addInitScript(() => localStorage.setItem("plum-duff:v2-tracked-banner-visibility", "expanded"));
    await page.goto("/tasks");
    const banner = page.locator('[data-pd-id="v2.active-task"]');
    await expect(banner).toBeVisible();
    await expect(banner.locator('[data-pd-id="v2.active-task.toggle"]')).toHaveAttribute("aria-expanded", "false");
    await banner.locator('[data-pd-id="v2.active-task.toggle"]').click();
    await page.evaluate(() => window.dispatchEvent(new Event("pd:task-annotations-refresh")));
    await expect(banner.locator('[data-pd-id="v2.active-task.toggle"]')).toHaveAttribute("aria-expanded", "true");
    await page.reload();
    await expect(banner.locator('[data-pd-id="v2.active-task.toggle"]')).toHaveAttribute("aria-expanded", "false");
  } finally {
    const rows = await (await page.request.get("/api/fund-manager/tasks/annotations")).json() as Array<{ profile_id: string; occurrence_key: string; version: number; tracked: boolean }>;
    const current = rows.find(row => row.profile_id === profileId && row.occurrence_key === occurrence);
    if (current?.tracked) await page.request.patch("/api/fund-manager/tasks/annotations", { data: { changes: [{ profile_id: profileId, occurrence_key: occurrence, tracked: false, work_state: "To Do", expected_version: current.version }] } });
  }
});

test("personal opportunity notes, review and reopen persist without changing the source", async ({ page }) => {
  await page.goto("/tasks");
  await page.getByRole("button", { name: /Opportunities \/ Suggestions/ }).click();
  const row = page.locator('[data-pd-id^="opportunities.item."]').first();
  await row.click();
  const details = page.locator('[data-pd-id="tasks.v2.opportunity-detail"]');
  await expect(details).toBeVisible();
  if (await details.getByRole("button", { name: "Reopen" }).isVisible()) await details.getByRole("button", { name: "Reopen" }).click();
  const nextAction = details.getByRole("textbox", { name: "Personal Next action" });
  const notes = details.getByRole("textbox", { name: "Personal Notes" });
  await nextAction.fill("Check current provider terms");
  await notes.fill("Private synthetic review note");
  await notes.blur();
  await expect(details.getByText("Personal review saved")).toBeVisible();
  if (await details.getByRole("button", { name: "Track", exact: true }).isVisible()) {
    await expect(details.getByRole("button", { name: "Track", exact: true })).toBeEnabled();
    await details.getByRole("button", { name: "Track", exact: true }).click();
  }
  await expect(details.getByRole("button", { name: "Untrack", exact: true })).toBeVisible();
  await details.getByRole("combobox", { name: /Personal work state/ }).click();
  await page.getByRole("option", { name: "In Progress" }).click();
  await expect(details.getByText("Personal review saved")).toBeVisible();
  const annotations = await (await page.request.get("/api/fund-manager/tasks/annotations")).json() as Array<{ occurrence_key: string; tracked: boolean; work_state: string; next_action: string | null; notes: string | null; source_status: string; reviewed_at: string | null }>;
  const saved = annotations.find(item => item.next_action === "Check current provider terms");
  expect(saved).toMatchObject({ tracked: true, work_state: "In Progress", notes: "Private synthetic review note", source_status: "active", reviewed_at: null });
  const occurrence = saved!.occurrence_key;
  await page.goto(`/tasks?opportunity=${encodeURIComponent(occurrence)}`);
  await expect(page.locator('[data-pd-id="tasks.v2.opportunity-detail"] h2')).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Personal Notes" })).toHaveValue("Private synthetic review note");
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(page.getByRole("button", { name: "Reopen" })).toBeVisible();
  await page.getByRole("button", { name: /Opportunities \/ Suggestions/ }).click();
  await expect(page.getByRole("button", { name: /Track all [01] eligible untracked opportunit/ })).toBeVisible();
  const reviewed = await (await page.request.get("/api/fund-manager/tasks/annotations")).json() as typeof annotations;
  expect(reviewed.find(item => item.occurrence_key === occurrence)).toMatchObject({ tracked: true, notes: "Private synthetic review note", source_status: "active" });
  expect(reviewed.find(item => item.occurrence_key === occurrence)?.reviewed_at).toBeTruthy();
  await page.reload();
  await expect(page.getByRole("button", { name: "Reopen" })).toBeVisible();
  await page.context().clearCookies();
  await page.goto(authURL);
  await page.goto(`/tasks?opportunity=${encodeURIComponent(occurrence)}`);
  await expect(page.getByRole("button", { name: "Reopen" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Personal Notes" })).toHaveValue("Private synthetic review note");
  await page.getByRole("button", { name: "Reopen" }).click();
  await expect(page.getByRole("button", { name: "Mark reviewed" })).toBeVisible();
  const reopened = await (await page.request.get("/api/fund-manager/tasks/annotations")).json() as typeof annotations;
  expect(reopened.find(item => item.occurrence_key === occurrence)?.reviewed_at).toBeNull();
});

test("switching between opportunity rows flushes pending personal notes", async ({ page }) => {
  await page.goto("/tasks");
  await page.getByRole("button", { name: /Opportunities \/ Suggestions/ }).click();
  const rows = page.locator('[data-pd-id^="opportunities.item."]');
  await expect(rows).toHaveCount(2);
  await rows.first().click();
  await page.getByRole("textbox", { name: "Personal Notes" }).fill("Review before switching");
  await rows.nth(1).click();
  await expect(page.locator('[data-pd-id="tasks.v2.opportunity-detail"] h2')).toBeVisible();
  await rows.first().click();
  await expect(page.getByRole("textbox", { name: "Personal Notes" })).toHaveValue("Review before switching");
});

test("an external Untrack is not undone by a pending personal note", async ({ page }) => {
  await page.goto("/tasks");
  await page.getByRole("button", { name: /Opportunities \/ Suggestions/ }).click();
  await page.locator('[data-pd-id^="opportunities.item."]').first().click();
  const details = page.locator('[data-pd-id="tasks.v2.opportunity-detail"]');
  if (await details.getByRole("button", { name: "Reopen" }).isVisible()) await details.getByRole("button", { name: "Reopen" }).click();
  if (await details.getByRole("button", { name: "Track", exact: true }).isVisible()) await details.getByRole("button", { name: "Track", exact: true }).click();
  await expect(details.getByRole("button", { name: "Untrack", exact: true })).toBeVisible();
  const before = await (await page.request.get("/api/fund-manager/tasks/annotations")).json() as Array<{ profile_id: string; occurrence_key: string; version: number; tracked: boolean; work_state: string; notes: string | null }>;
  const opportunities = await (await page.request.get("/api/fund-manager/common-bet-combos/profile-opportunities/profile-demo-001")).json() as Array<{ opportunity_key: string; period_key: string }>;
  const occurrence = `profile-opportunity:profile-demo-001:${opportunities[0].opportunity_key}:${opportunities[0].period_key}`;
  const current = before.find(item => item.profile_id === "profile-demo-001" && item.occurrence_key === occurrence && item.tracked);
  expect(current).toBeTruthy();
  await details.getByRole("textbox", { name: "Personal Notes" }).fill("Keep this note without tracking");
  const untrack = await page.request.patch("/api/fund-manager/tasks/annotations", { data: { changes: [{ profile_id: current!.profile_id, occurrence_key: current!.occurrence_key, tracked: false, work_state: current!.work_state, expected_version: current!.version }] } });
  expect(untrack.status()).toBe(200);
  await page.evaluate(() => window.dispatchEvent(new Event("pd:task-annotations-refresh")));
  await expect(details.locator('[data-pd-id="opportunity.save-status"]')).toContainText(/Personal review (was not saved|saved)/);
  if (await details.getByRole("button", { name: "Retry personal review" }).isVisible()) {
    await expect(details.getByRole("textbox", { name: "Personal Notes" })).toHaveValue("Keep this note without tracking");
    await details.getByRole("button", { name: "Retry personal review" }).click();
  }
  await expect.poll(async () => (await (await page.request.get("/api/fund-manager/tasks/annotations")).json() as typeof before).find(item => item.occurrence_key === current!.occurrence_key)?.notes).toBe("Keep this note without tracking");
  const after = await (await page.request.get("/api/fund-manager/tasks/annotations")).json() as typeof before;
  expect(after.find(item => item.occurrence_key === current!.occurrence_key)?.tracked).toBe(false);
});

test("failed personal review keeps the item active and offers a retry", async ({ page }) => {
  await page.goto("/tasks");
  await page.getByRole("button", { name: /Opportunities \/ Suggestions/ }).click();
  await page.locator('[data-pd-id^="opportunities.item."]').first().click();
  const details = page.locator('[data-pd-id="tasks.v2.opportunity-detail"]');
  if (await details.getByRole("button", { name: "Reopen" }).isVisible()) await details.getByRole("button", { name: "Reopen" }).click();
  await expect(details.getByRole("button", { name: "Mark reviewed" })).toBeVisible();
  let rejectOnce = true;
  await page.route("**/fund-manager/tasks/annotations", async route => {
    if (route.request().method() === "PATCH" && rejectOnce) {
      rejectOnce = false;
      await route.fulfill({ status: 503, contentType: "application/json", body: '{"detail":"Synthetic read-only failure"}' });
    } else await route.continue();
  });
  await details.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(details.getByRole("alert")).toContainText("Retry");
  await expect(details.getByRole("button", { name: "Mark reviewed" })).toBeVisible();
  await details.getByRole("button", { name: "Retry personal review" }).click();
  await expect(details.getByRole("button", { name: "Reopen" })).toBeVisible();
});

test("tracked opportunity banner View details deep links to its own inspector", async ({ page }) => {
  await page.goto("/tasks");
  await page.getByRole("button", { name: /Opportunities \/ Suggestions/ }).click();
  const row = page.locator('[data-pd-id^="opportunities.item."]').first();
  await row.click();
  const details = page.locator('[data-pd-id="tasks.v2.opportunity-detail"]');
  if (await details.getByRole("button", { name: "Reopen" }).isVisible()) await details.getByRole("button", { name: "Reopen" }).click();
  await details.getByRole("textbox", { name: "Personal Next action" }).fill("Check current terms");
  await details.getByRole("textbox", { name: "Personal Next action" }).blur();
  await expect(details.getByText("Personal review saved")).toBeVisible();
  if (await details.getByRole("button", { name: "Track", exact: true }).isVisible()) await details.getByRole("button", { name: "Track", exact: true }).click();
  await expect(details.getByRole("button", { name: "Untrack", exact: true })).toBeVisible();
  await details.getByRole("button", { name: "Close Opportunity Details" }).click();
  const banner = page.locator('[data-pd-id="v2.active-task"]');
  await banner.locator('[data-pd-id="v2.active-task.toggle"]').click();
  await expect(banner).toContainText("Next action · Check current terms");
  await banner.getByRole("link", { name: "View details" }).first().click();
  await expect(page.locator('[data-pd-id="tasks.v2.opportunity-detail"] h2')).toBeVisible();
  await page.reload();
  await expect(page.locator('[data-pd-id="tasks.v2.opportunity-detail"] h2')).toBeVisible();
  await page.locator('[data-pd-id="ux-v2.header.tasks"]').click();
  await page.locator('[data-pd-id="ux-v2.header.tracked-panel"] a[href*="opportunity="]').first().click();
  await expect(page.locator('[data-pd-id="tasks.v2.opportunity-detail"] h2')).toBeVisible();
});

for (const { width, theme } of [
  { width: 1440, theme: "light" },
  { width: 900, theme: "dark" },
  { width: 390, theme: "light" },
  { width: 390, theme: "dark" },
]) {
  test(`opportunity inspector and compact banner remain contained at ${width}px ${theme}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(value => localStorage.setItem("openforge-theme", value), theme);
    const opportunities = await (await page.request.get("/api/fund-manager/common-bet-combos/profile-opportunities/profile-demo-002")).json() as Array<{ opportunity_key: string; period_key: string }>;
    const occurrence = `profile-opportunity:profile-demo-002:${opportunities[0].opportunity_key}:${opportunities[0].period_key}`;
    const annotations = await (await page.request.get("/api/fund-manager/tasks/annotations")).json() as Array<{ profile_id: string; occurrence_key: string; version: number; tracked: boolean; reviewed_at: string | null; work_state: string }>;
    const current = annotations.find(item => item.profile_id === "profile-demo-002" && item.occurrence_key === occurrence);
    if (!current?.tracked || current.reviewed_at) {
      const result = await page.request.patch("/api/fund-manager/tasks/annotations", { data: { changes: [{ profile_id: "profile-demo-002", occurrence_key: occurrence, tracked: true, reviewed: false, work_state: current?.work_state ?? "To Do", expected_version: current?.version ?? 0 }] } });
      expect(result.status()).toBe(200);
    }
    await page.goto("/tasks");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const banner = page.locator('[data-pd-id="v2.active-task"]');
    await expect(banner).toBeVisible();
    await expect(banner.locator('[data-pd-id="v2.active-task.toggle"]')).toHaveAttribute("aria-expanded", "false");
    await page.getByRole("button", { name: /Opportunities \/ Suggestions/ }).click();
    await page.locator('[data-pd-id^="opportunities.item."]').first().click();
    const inspector = page.locator('[data-pd-id="tasks.v2.inspector"]');
    await expect(inspector).toBeVisible();
    await expect(inspector.locator("h2")).toBeVisible();
    const bounds = await inspector.boundingBox();
    expect(bounds).toBeTruthy();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
    if (width === 390) await expect(inspector.getByRole("link", { name: "Open Accounts" })).toBeVisible();
    await page.screenshot({ path: info.outputPath(`opportunity-inspector-${width}-${theme}.png`), fullPage: width !== 390 });
  });
}

test("Design Lab tracked banner also starts compact", async ({ page }) => {
  await page.goto("/design-lab");
  await page.locator('[data-pd-id="lab.nav.tasks"]').click();
  await page.locator('[data-pd-id="lab.task.task:LAB-SB-OVERDUE"]').click();
  await page.locator('[data-pd-id="lab.task-track.task:LAB-SB-OVERDUE"]').click();
  const banner = page.locator('[data-pd-id="lab.active-task"]');
  await expect(banner).toBeVisible();
  await expect(banner.locator('[data-pd-id="lab.active-task.toggle"]')).toHaveAttribute("aria-expanded", "false");
});

test("opportunity inspector remains usable at actual Chromium 200% tab zoom", async ({}, info) => {
  const baseURL = String(info.project.use.baseURL);
  const scratch = await mkdtemp(join(tmpdir(), "pd-opportunity-zoom-"));
  const extension = join(scratch, "extension");
  await mkdir(extension);
  await writeFile(join(extension, "manifest.json"), JSON.stringify({ manifest_version: 3, name: "Disposable opportunity zoom check", version: "1.0", permissions: ["tabs"], background: { service_worker: "background.js" } }));
  await writeFile(join(extension, "background.js"), "chrome.runtime.onInstalled.addListener(() => {});");
  const context = await chromium.launchPersistentContext(join(scratch, "profile"), { channel: "chromium", headless: true, viewport: { width: 1440, height: 900 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try {
    const page = await context.newPage();
    await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
    await page.goto(authURL);
    expect((await (await page.request.get(`${baseURL}/api/auth/session`)).json()).email).toBe("demo@example.invalid");
    await page.goto(`${baseURL}/tasks`);
    await expect(page).toHaveURL(/\/tasks(?:\?|$)/);
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    await worker.evaluate(async url => {
      const tabs = (globalThis as unknown as { chrome: { tabs: { query: (filter: { url: string }) => Promise<Array<{ id: number }>>; setZoom: (id: number, zoom: number) => Promise<void> } } }).chrome.tabs;
      const matches = await tabs.query({ url: `${url}/*` });
      await tabs.setZoom(matches[0].id, 2);
    }, baseURL);
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(720);
    await page.getByRole("button", { name: /Opportunities \/ Suggestions/ }).click();
    await page.locator('[data-pd-id^="opportunities.item."]').first().click();
    const inspector = page.locator('[data-pd-id="tasks.v2.inspector"]');
    await expect(inspector.locator("h2")).toBeVisible();
    const bounds = await inspector.boundingBox();
    expect(bounds).toBeTruthy();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(721);
    await inspector.evaluate(node => node.scrollTop = node.scrollHeight);
    await expect(inspector.getByRole("link", { name: "Open Accounts" })).toBeInViewport();
    await expect(inspector.getByRole("button", { name: "Close Opportunity Details" })).toBeInViewport();
    await page.screenshot({ path: info.outputPath("opportunity-inspector-200-percent.png"), fullPage: true });
  } finally { await context.close(); await rm(scratch, { recursive: true, force: true }); }
});
