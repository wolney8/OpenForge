import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";

test.beforeEach(async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(authURL);
});

test("empty tracked collection does not place a pager beneath opportunity details", async ({ page }) => {
  await page.goto("/tasks");
  await page.locator('[data-pd-id="tasks.v2.filter-toggle"]').click();
  await page.getByRole("searchbox", { name: "Search Daily Tasks" }).fill("no-such-synthetic-task-999");
  await expect(page.locator('[data-pd-id="tasks.v2.collection"] h2')).toContainText("0");
  await page.getByRole("button", { name: /Opportunities \/ Suggestions/ }).click();
  await page.locator('[data-pd-id^="opportunities.item."]').first().click();
  await expect(page.locator('[data-pd-id="tasks.v2.opportunity-detail"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="tasks.v2.pagination"]')).toHaveCount(0);
  await expect(page.getByText("Showing 0–0 of 0")).toHaveCount(0);
});

test("opportunity inspector uses one concise Task Details heading and stays in viewport", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 720 });
  await page.goto("/tasks");
  await page.locator('[data-pd-id="tasks.v2.filter-toggle"]').click();
  await page.getByRole("searchbox", { name: "Search Daily Tasks" }).fill("no-such-synthetic-task-999");
  await page.getByRole("button", { name: /Opportunities \/ Suggestions/ }).click();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.locator('[data-pd-id^="opportunities.item."]').first().click();
  const inspector = page.locator('[data-pd-id="tasks.v2.inspector"]');
  await expect(inspector).toBeVisible();
  await expect(inspector.getByText("Opportunity Details · Review Reload")).toBeVisible();
  await expect(inspector.getByRole("heading", { name: /Demo advisory opportunity/i })).toHaveCount(1);
  const rect = await inspector.boundingBox();
  expect(rect).toBeTruthy();
  expect(rect!.y).toBeGreaterThanOrEqual(0);
  expect(rect!.y + rect!.height).toBeLessThanOrEqual(721);
  await inspector.evaluate(node => node.scrollTop = node.scrollHeight);
  await expect(inspector.getByRole("link", { name: "Open Accounts" })).toBeInViewport();
});

test("banner X reconciles a newer personal annotation before Untrack", async ({ page }) => {
  const profileId = "profile-demo-001";
  const opportunities = await (await page.request.get(`/api/fund-manager/common-bet-combos/profile-opportunities/${profileId}`)).json() as Array<{ opportunity_key: string; period_key: string }>;
  const occurrence = `profile-opportunity:${profileId}:${opportunities[0].opportunity_key}:${opportunities[0].period_key}`;
  const getRow = async () => {
    const rows = await (await page.request.get("/api/fund-manager/tasks/annotations")).json() as Array<{ profile_id: string; occurrence_key: string; version: number; tracked: boolean; work_state: string; notes: string | null }>;
    return rows.find(row => row.profile_id === profileId && row.occurrence_key === occurrence);
  };
  const before = await getRow();
  expect((await page.request.patch("/api/fund-manager/tasks/annotations", { data: { changes: [{ profile_id: profileId, occurrence_key: occurrence, tracked: true, reviewed: false, work_state: before?.work_state ?? "To Do", expected_version: before?.version ?? 0 }] } })).status()).toBe(200);
  await page.goto("/tasks");
  const banner = page.locator('[data-pd-id="v2.active-task"]');
  await expect(banner).toBeVisible();
  await banner.locator('[data-pd-id="v2.active-task.toggle"]').click();
  const current = await getRow();
  expect((await page.request.patch("/api/fund-manager/tasks/annotations", { data: { changes: [{ profile_id: profileId, occurrence_key: occurrence, tracked: true, work_state: current!.work_state, notes: "Synthetic concurrent note", expected_version: current!.version }] } })).status()).toBe(200);
  await banner.locator(`[data-pd-id="tracked-task.${profileId}.${occurrence}"]`).getByRole("button", { name: /Untrack/ }).click();
  await expect.poll(async () => (await getRow())?.tracked).toBe(false);
  expect((await getRow())?.notes).toBe("Synthetic concurrent note");
});

test("four disposable opportunities stay distinct from an empty Needs Action collection", async ({ page }, info) => {
  const created: Array<{ profile: string; id: string }> = [];
  try {
    await page.setViewportSize({ width: 900, height: 720 });
    for (const [profile, kind, label] of [
      ["profile-demo-001", "Signup", "Demo Bookmaker signup opportunity"],
      ["profile-demo-002", "Free Bet", "Demo Reward opportunity"],
    ]) {
      const response = await page.request.post(`/api/fund-manager/common-bet-combos/profile-actions/${profile}`, { data: {
        ledger_type: "Sportsbook", label, enabled_fields: ["offerName"],
        defaults: { bookmaker: "Bookmaker A", opportunityEnabled: "true", opportunityKind: kind, opportunityRecurrence: "One Off", opportunityReminderEnabled: "false" },
        enabled: true, is_favourite: false,
      } });
      expect(response.status(), await response.text()).toBe(201);
      created.push({ profile, id: (await response.json()).preset_id });
    }
    await page.route("**/fund-manager/notifications", route => route.fulfill({ status: 200, json: [] }));
    await page.goto("/tasks");
    await expect(page.locator('[data-pd-id="tasks.v2.toolbar"]')).toContainText("0 Needs Attention");
    await page.getByRole("button", { name: /Opportunities \/ Suggestions/ }).click();
    await expect(page.locator('[data-pd-id^="opportunities.item."]')).toHaveCount(4);
    await expect(page.locator('[data-pd-id="tasks.v2.pagination"]')).toHaveCount(0);
    await page.getByRole("button", { name: /Inspect Demo Bookmaker signup opportunity/ }).click();
    const detail = page.locator('[data-pd-id="tasks.v2.opportunity-detail"]');
    await expect(detail.getByText("Opportunity Details · Review Bookmaker")).toBeVisible();
    await expect(detail.getByRole("heading", { name: "Demo Bookmaker signup opportunity" })).toHaveCount(1);
    await expect(detail.getByText(/Availability is unverified/)).toHaveCount(1);
    await page.screenshot({ path: info.outputPath("today-empty-with-four-opportunities-and-inspector.png"), fullPage: true });
  } finally {
    for (const item of created) await page.request.delete(`/api/fund-manager/common-bet-combos/profile-actions/${item.profile}/${item.id}`);
  }
});

test("frozen Lab advisory inspector remains the presentation comparison", async ({ page }, info) => {
  await page.setViewportSize({ width: 900, height: 720 });
  await page.goto("/design-lab");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.locator('[data-pd-id="lab.nav.tasks"]').click();
  await page.getByRole("button", { name: /Opportunities \/ Suggestions/ }).first().click();
  await expect(page.locator('[data-pd-id="lab.task.advisory"]')).toBeVisible();
  await page.locator('[data-pd-id="lab.task.advisory"]').click();
  await page.screenshot({ path: info.outputPath("lab-advisory-task-inspector.png"), fullPage: true });
});

test("a pending personal note flushes before banner X and survives Untrack", async ({ page }, info) => {
  await page.goto("/tasks");
  await page.getByRole("button", { name: /Opportunities \/ Suggestions/ }).click();
  await page.locator('[data-pd-id^="opportunities.item."]').first().click();
  const detail = page.locator('[data-pd-id="tasks.v2.opportunity-detail"]');
  if (await detail.getByRole("button", { name: "Reopen" }).isVisible()) await detail.getByRole("button", { name: "Reopen" }).click();
  const track = detail.locator('[data-pd-id="opportunity.track"]');
  if (await track.getAttribute("aria-pressed") === "false") await track.click();
  await expect(track).toHaveAttribute("aria-pressed", "true");
  const note = `Pending synthetic note ${Date.now()}`;
  await detail.getByRole("textbox", { name: "Personal Notes" }).fill(note);
  const requests: Array<{ kind: string; durationMs: number | null }> = [];
  page.on("requestfinished", request => {
    const path = new URL(request.url()).pathname;
    const kind = path.endsWith("/tasks/annotations") ? `${request.method()} annotations` : path.endsWith("/notifications") || path.includes("profile-opportunities") ? `${request.method()} source context` : "";
    if (kind) requests.push({ kind, durationMs: request.timing().responseEnd >= 0 ? Math.round(request.timing().responseEnd) : null });
  });
  const banner = page.locator('[data-pd-id="v2.active-task"]');
  await banner.locator('[data-pd-id="v2.active-task.toggle"]').click();
  const started = Date.now();
  await banner.locator('[data-pd-id^="tracked-task.profile-demo-001."]').first().getByRole("button", { name: /Untrack/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "Untracked" }).first()).toBeVisible();
  const acknowledgedMs = Date.now() - started;
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await writeFile(info.outputPath("annotation-untrack-timing.json"), JSON.stringify({ acknowledgedMs, settledMs: Date.now() - started, requests }, null, 2));
  const rows = await (await page.request.get("/api/fund-manager/tasks/annotations")).json() as Array<{ notes: string | null; tracked: boolean }>;
  expect(rows.find(row => row.notes === note)).toMatchObject({ tracked: false });
});

test("banner X failure keeps the item and exposes a working Retry", async ({ page }) => {
  await page.goto("/tasks");
  await page.getByRole("button", { name: /Opportunities \/ Suggestions/ }).click();
  await page.locator('[data-pd-id^="opportunities.item."]').first().click();
  if (await page.getByRole("button", { name: "Reopen" }).isVisible()) await page.getByRole("button", { name: "Reopen" }).click();
  const track = page.locator('[data-pd-id="opportunity.track"]');
  if (await track.getAttribute("aria-pressed") === "false") await track.click();
  await expect(track).toHaveAttribute("aria-pressed", "true");
  const banner = page.locator('[data-pd-id="v2.active-task"]');
  await banner.locator('[data-pd-id="v2.active-task.toggle"]').click();
  const card = banner.locator('[data-pd-id^="tracked-task.profile-demo-001."]').first();
  const cardIdentity = await card.getAttribute("data-pd-id");
  expect(cardIdentity).toBeTruthy();
  const header = page.locator('[data-pd-id="ux-v2.header.tasks"]');
  const activeBefore = Number((await header.getAttribute("aria-label"))?.match(/(\d+) active/)?.[1] ?? -1);
  expect(activeBefore).toBeGreaterThan(0);
  let fail = true;
  await page.route("**/fund-manager/tasks/annotations", async route => {
    if (route.request().method() === "PATCH" && fail) { fail = false; await route.fulfill({ status: 503, contentType: "application/json", body: '{"detail":"Synthetic failure"}' }); }
    else await route.continue();
  });
  await card.getByRole("button", { name: /Untrack/ }).click();
  await expect(banner.getByRole("alert")).toContainText("Retry Untrack");
  await expect(card.getByRole("button", { name: /Untrack/ })).toBeVisible();
  await banner.getByRole("button", { name: "Retry Untrack" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Untracked" }).first()).toBeVisible();
  await expect(banner.locator(`[data-pd-id="${cardIdentity}"]`)).toHaveCount(0);
  await expect(header).toHaveAttribute("aria-label", new RegExp(`${activeBefore - 1} active`));
});

test("a genuine concurrent version conflict leaves banner X retriable", async ({ page }) => {
  const profileId = "profile-demo-001";
  const opportunities = await (await page.request.get(`/api/fund-manager/common-bet-combos/profile-opportunities/${profileId}`)).json() as Array<{ opportunity_key: string; period_key: string }>;
  const occurrence = `profile-opportunity:${profileId}:${opportunities[0].opportunity_key}:${opportunities[0].period_key}`;
  const getRow = async () => {
    const rows = await (await page.request.get("/api/fund-manager/tasks/annotations")).json() as Array<{ profile_id: string; occurrence_key: string; version: number; work_state: string; tracked: boolean; notes: string | null }>;
    return rows.find(row => row.profile_id === profileId && row.occurrence_key === occurrence);
  };
  const before = await getRow();
  expect((await page.request.patch("/api/fund-manager/tasks/annotations", { data: { changes: [{ profile_id: profileId, occurrence_key: occurrence, tracked: true, reviewed: false, work_state: before?.work_state ?? "To Do", expected_version: before?.version ?? 0 }] } })).status()).toBe(200);
  await page.goto("/tasks");
  const banner = page.locator('[data-pd-id="v2.active-task"]');
  await banner.locator('[data-pd-id="v2.active-task.toggle"]').click();
  let conflicted = false;
  await page.route("**/fund-manager/tasks/annotations", async route => {
    if (route.request().method() === "PATCH" && !conflicted) {
      conflicted = true;
      const latest = await getRow();
      expect((await page.request.patch("/api/fund-manager/tasks/annotations", { data: { changes: [{ profile_id: profileId, occurrence_key: occurrence, tracked: true, work_state: latest!.work_state, notes: "Concurrent synthetic note", expected_version: latest!.version }] } })).status()).toBe(200);
    }
    await route.continue();
  });
  const card = banner.locator(`[data-pd-id="tracked-task.${profileId}.${occurrence}"]`);
  await card.getByRole("button", { name: /Untrack/ }).click();
  await expect(banner.getByRole("alert")).toContainText("Retry Untrack");
  expect((await getRow())?.tracked).toBe(true);
  await banner.getByRole("button", { name: "Retry Untrack" }).click();
  await expect.poll(async () => (await getRow())?.tracked).toBe(false);
  expect((await getRow())?.notes).toBe("Concurrent synthetic note");
});

test("Track and Untrack keep a stable button while a synthetic PATCH is pending", async ({ page }) => {
  await page.goto("/tasks");
  await page.getByRole("button", { name: /Opportunities \/ Suggestions/ }).click();
  await page.locator('[data-pd-id^="opportunities.item."]').first().click();
  const detail = page.locator('[data-pd-id="tasks.v2.opportunity-detail"]');
  if (await detail.getByRole("button", { name: "Reopen" }).isVisible()) await detail.getByRole("button", { name: "Reopen" }).click();
  const track = detail.locator('[data-pd-id="opportunity.track"]');
  if (await track.getAttribute("aria-pressed") === "true") { await track.click(); await expect(track).toHaveAttribute("aria-pressed", "false"); }
  let delayed = false;
  let releasePatch: (() => void) | undefined;
  const heldPatch = new Promise<void>(resolve => { releasePatch = resolve; });
  await page.route("**/fund-manager/tasks/annotations", async route => {
    if (route.request().method() === "PATCH" && !delayed) {
      delayed = true;
      await heldPatch;
    }
    await route.continue();
  });
  const before = await track.boundingBox();
  await track.click();
  try {
    await expect(track).toContainText(/Track$/);
    await expect(track).toBeDisabled();
    await expect(track).toHaveAttribute("aria-busy", "true");
    await expect(detail.locator('[data-pd-id="opportunity.save-status"]')).toContainText("Saving personal review");
    const during = await track.boundingBox();
    expect(Math.abs(during!.width - before!.width)).toBeLessThanOrEqual(1);
  } finally { releasePatch?.(); }
  await expect(track).toHaveText("Untrack");
  await expect(track).toBeEnabled();
  await expect(detail.getByRole("status").filter({ hasText: "Tracked" }).first()).toBeVisible();
  await track.click();
  await expect(track).toHaveAttribute("aria-pressed", "false");
});

test("compact banner reserves its position during the initial annotation read", async ({ page }) => {
  const profileId = "profile-demo-001";
  const opportunities = await (await page.request.get(`/api/fund-manager/common-bet-combos/profile-opportunities/${profileId}`)).json() as Array<{ opportunity_key: string; period_key: string }>;
  const occurrence = `profile-opportunity:${profileId}:${opportunities[0].opportunity_key}:${opportunities[0].period_key}`;
  const rows = await (await page.request.get("/api/fund-manager/tasks/annotations")).json() as Array<{ profile_id: string; occurrence_key: string; version: number; work_state: string }>;
  const current = rows.find(row => row.profile_id === profileId && row.occurrence_key === occurrence);
  expect((await page.request.patch("/api/fund-manager/tasks/annotations", { data: { changes: [{ profile_id: profileId, occurrence_key: occurrence, tracked: true, reviewed: false, work_state: current?.work_state ?? "To Do", expected_version: current?.version ?? 0 }] } })).status()).toBe(200);
  await page.route("**/fund-manager/tasks/annotations", async route => {
    if (route.request().method() === "GET") await new Promise(resolve => setTimeout(resolve, 450));
    await route.continue();
  });
  await page.goto("/tasks");
  const loading = page.locator('[data-pd-id="v2.active-task.loading"]');
  await expect(loading).toBeVisible();
  const before = await loading.boundingBox();
  const banner = page.locator('[data-pd-id="v2.active-task"]');
  await expect(banner).toBeVisible();
  await expect(banner.locator('[data-pd-id="v2.active-task.toggle"]')).toHaveAttribute("aria-expanded", "false");
  const after = await banner.boundingBox();
  expect(Math.abs(after!.y - before!.y)).toBeLessThanOrEqual(2);
  expect(Math.abs(after!.height - before!.height)).toBeLessThanOrEqual(6);
});
