import { expect, test, type Page } from "@playwright/test";

const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";

async function storedAnnotation(page: Page, id: string) {
  const response = await page.request.get("http://127.0.0.1:8127/fund-manager/tasks/annotations");
  expect(response.ok()).toBe(true);
  const rows = await response.json() as Array<{ occurrence_key: string; profile_id: string; tracked: boolean; work_state: string; version: number }>;
  const item = rows.find(value => value.occurrence_key === id);
  expect(item).toBeTruthy();
  return item!;
}

async function chooseWorkState(page: Page, id: string, state: "To Do" | "In Progress" | "Blocked") {
  await page.locator(`[data-pd-id="tasks.v2.work-state.${id}"]`).click();
  await page.getByRole("option", { name: state, exact: true }).click();
  await expect(page.locator('[data-pd-id="tasks.v2.work-save-status"]')).toHaveText("Work state saved");
}

async function ensureRowTracking(page: Page, id: string, tracked: boolean) {
  const control = page.locator(`[data-pd-id="tasks.v2.track.${id}"]`);
  await expect(control).toBeVisible();
  if (await control.getAttribute("aria-pressed") !== String(tracked)) await control.click();
  await expect(control).toHaveAttribute("aria-pressed", String(tracked));
}

test("CP-134 tracked Today persists through refresh and header navigation", async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  expect(health.database_identity).toBe("cp117-integration-synthetic");
  await page.goto(authURL);
  await page.goto("/tasks");
  await expect(page.locator('[data-pd-id="tasks.v2.collections"]')).toBeVisible();
  const rows = page.locator('[data-pd-id^="tasks.v2.row."]');
  await expect(rows.first()).toBeVisible();
  await page.locator('[data-pd-id="tasks.v2.filter-toggle"]').click();
  await expect(page.locator('[data-pd-id="tasks.v2.page-size"]')).toHaveValue("8");
  await page.locator('[data-pd-id="tasks.v2.filter-toggle"]').click();
  const pagination = await page.locator('[data-pd-id="tasks.v2.pagination"]').innerText();
  const total = Number(pagination.match(/of (\d+)/)?.[1] ?? 0);
  expect(total).toBeGreaterThan(0);
  await expect(rows).toHaveCount(Math.min(8, total));
  const first = rows.first();
  const id = (await first.getAttribute("data-pd-id"))!.replace("tasks.v2.row.", "");
  await page.locator(`[data-pd-id="tasks.v2.track.${id}"]`).click();
  await expect(page.locator(`[data-pd-id="tasks.v2.track.${id}"]`)).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.locator(`[data-pd-id="tasks.v2.track.${id}"]`)).toHaveAttribute("aria-pressed", "true");
  const separateContext = await page.context().browser()!.newContext();
  try {
    const newPage = await separateContext.newPage();
    await newPage.goto(authURL);
    await newPage.goto(`${new URL(page.url()).origin}/tasks`);
    await expect(newPage.locator(`[data-pd-id="tasks.v2.track.${id}"]`)).toHaveAttribute("aria-pressed", "true");
  } finally { await separateContext.close(); }
  await page.locator('[data-pd-id="ux-v2.header.tasks"]').click();
  await expect(page.locator('[data-pd-id="ux-v2.header.tracked-panel"]')).toContainText("Tracked Tasks (1)");
  await page.locator('[data-pd-id="ux-v2.header.tracked-panel"] a[href*="&task="]').click();
  await expect(page.locator('[data-pd-id="tasks.v2.inspector"]')).toBeVisible();
  await page.locator('[data-pd-id="ux-v2.header.tasks"]').click();
  await page.locator('[data-pd-id="ux-v2.header.tracked-view-all"]').click();
  await expect(page).toHaveURL(/collection=tracked/);
  await expect(page.locator('[data-pd-id="tasks.v2.collections"]')).toContainText("Tracked Tasks (1)");
  await expect(page.locator('[data-pd-id^="tasks.v2.row."]')).toHaveCount(1);
  await rows.first().click();
  await expect(page.getByRole("button", { name: "Untrack", exact: true })).toBeVisible();
  await page.locator(`[data-pd-id="tasks.v2.work-state.${id}"]`).click();
  await page.getByRole("option", { name: "Blocked" }).click();
  await page.locator('[data-pd-id="tasks.v2.inspector"] input[aria-label$="blocked reason"]').fill("Awaiting synthetic evidence");
  await page.locator('[data-pd-id="tasks.v2.inspector"] input[aria-label$="blocked reason"]').blur();
  await expect(page.locator('[data-pd-id="tasks.v2.work-save-status"]')).toHaveText("Work state saved");
  await expect(page.locator('[data-pd-id="tasks.v2.inspector"]')).toContainText("Blocked");
  await page.reload();
  await rows.first().click();
  await expect(page.locator('[data-pd-id="tasks.v2.inspector"] input[aria-label$="blocked reason"]')).toHaveValue("Awaiting synthetic evidence");
  await page.locator(`[data-pd-id="tasks.v2.work-state.${id}"]`).click();
  await page.getByRole("option", { name: "Do Later" }).click();
  const rejectOnce = async (route: import("@playwright/test").Route) => {
    if (route.request().method() === "PATCH") await route.fulfill({ status: 409, json: { detail: "Version conflict" } });
    else await route.continue();
  };
  await page.route(/\/fund-manager\/tasks\/annotations$/, rejectOnce);
  await page.locator('[data-pd-id="tasks.v2.inspector"] input[type="date"]').fill("2026-11-12");
  await expect(page.locator('[data-pd-id="tasks.v2.inspector"] [role="alert"]')).toContainText("Refresh and retry");
  await expect(page.locator('[data-pd-id="tasks.v2.inspector"] input[type="date"]')).toHaveValue("2026-11-12");
  await page.unroute(/\/fund-manager\/tasks\/annotations$/, rejectOnce);
  await page.getByRole("button", { name: "Retry Work State" }).click();
  await expect(page.locator('[data-pd-id="tasks.v2.work-save-status"]')).toHaveText("Work state saved");
  await expect(page.locator('[data-pd-id="tasks.v2.inspector"] input[type="date"]')).toHaveValue("2026-11-12");
  await page.getByRole("button", { name: "Close Task Details" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => localStorage.setItem("openforge-theme", "dark"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(`[data-pd-id="tasks.v2.track.${id}"]`)).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.locator('[data-pd-id="tasks.v2.row.' + id + '"]').click();
  await expect(page.locator('[data-pd-id="tasks.v2.inspector"]')).toContainText("Do Later");
  await page.getByRole("button", { name: "Close Task Details" }).click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('[data-pd-id="tasks.v2.row.' + id + '"]').click();
  await page.getByRole("button", { name: "Untrack", exact: true }).click();
  await expect(page.locator('[data-pd-id="tasks.v2.collections"]')).toContainText("Tracked Tasks (0)");
});

test("CP-140B autosave uses the acknowledged Untrack version and membership without reload", async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  expect(health.database_identity).toBe("cp117-integration-synthetic");
  await page.goto(authURL);
  await page.goto("/tasks");
  const row = page.locator('[data-pd-id^="tasks.v2.row."]').first();
  await expect(row).toBeVisible();
  const id = (await row.getAttribute("data-pd-id"))!.replace("tasks.v2.row.", "");
  await page.locator(`[data-pd-id="tasks.v2.track.${id}"]`).click();
  await expect(page.locator(`[data-pd-id="tasks.v2.track.${id}"]`)).toHaveAttribute("aria-pressed", "true");
  await row.click();
  const selector = page.locator(`[data-pd-id="tasks.v2.work-state.${id}"]`);
  await selector.click();
  await page.getByRole("option", { name: "In Progress" }).click();
  await expect(page.locator('[data-pd-id="tasks.v2.work-save-status"]')).toHaveText("Work state saved");
  const stored = async () => {
    const response = await page.request.get("http://127.0.0.1:8127/fund-manager/tasks/annotations");
    expect(response.ok()).toBe(true);
    const rows = await response.json() as Array<{ occurrence_key: string; tracked: boolean; work_state: string; version: number }>;
    const item = rows.find(value => value.occurrence_key === id);
    expect(item).toBeTruthy();
    return item!;
  };
  const savedState = await stored();
  expect(savedState).toMatchObject({ tracked: true, work_state: "In Progress" });
  await page.getByRole("button", { name: "Untrack", exact: true }).click();
  await expect(page.getByRole("button", { name: "Track Task" })).toBeVisible();
  const untracked = await stored();
  expect(untracked).toMatchObject({ tracked: false, work_state: "In Progress", version: savedState.version + 1 });
  await selector.click();
  await page.getByRole("option", { name: "Blocked" }).click();
  await expect(page.locator('[data-pd-id="tasks.v2.work-save-status"]')).toHaveText("Work state saved");
  await expect(page.getByRole("button", { name: "Retry Work State" })).toHaveCount(0);
  const afterSave = await stored();
  expect(afterSave).toMatchObject({ tracked: false, work_state: "Blocked", version: untracked.version + 1 });
  await page.reload();
  await page.locator(`[data-pd-id="tasks.v2.row.${id}"]`).click();
  await expect(page.locator(`[data-pd-id="tasks.v2.work-state.${id}"]`)).toContainText("Blocked");
  await expect(page.getByRole("button", { name: "Track Task" })).toBeVisible();
});

test("CP-140B autosave retains tracked membership after an untracked state Save and Track", async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  await page.goto(authURL);
  await page.goto("/tasks");
  const row = page.locator('[data-pd-id^="tasks.v2.row."]').first();
  await expect(row).toBeVisible();
  const id = (await row.getAttribute("data-pd-id"))!.replace("tasks.v2.row.", "");
  await ensureRowTracking(page, id, false);
  await row.click();
  const selector = page.locator(`[data-pd-id="tasks.v2.work-state.${id}"]`);
  const firstState = (await selector.innerText()).includes("In Progress") ? "Blocked" : "In Progress";
  await chooseWorkState(page, id, firstState);
  const untracked = await storedAnnotation(page, id);
  expect(untracked).toMatchObject({ tracked: false, work_state: firstState });
  await page.getByRole("button", { name: "Track Task" }).click();
  await expect(page.getByRole("button", { name: "Untrack", exact: true })).toBeVisible();
  const tracked = await storedAnnotation(page, id);
  expect(tracked).toMatchObject({ tracked: true, work_state: firstState, version: untracked.version + 1 });
  const finalState = firstState === "In Progress" ? "Blocked" : "In Progress";
  await chooseWorkState(page, id, finalState);
  await expect(page.getByRole("button", { name: "Retry Work State" })).toHaveCount(0);
  expect(await storedAnnotation(page, id)).toMatchObject({ tracked: true, work_state: finalState, version: tracked.version + 1 });
  await page.reload();
  await page.locator(`[data-pd-id="tasks.v2.row.${id}"]`).click();
  await expect(page.locator(`[data-pd-id="tasks.v2.work-state.${id}"]`)).toContainText(finalState);
  await expect(page.getByRole("button", { name: "Untrack", exact: true })).toBeVisible();
});

for (const surface of ["header", "banner"] as const) {
  test(`CP-140B ${surface} Untrack is acknowledged before inspector autosave`, async ({ page }) => {
    const health = await (await page.request.get("/api/healthz")).json();
    expect(health.database_classification).toBe("isolated");
    await page.goto(authURL);
    await page.goto("/tasks");
    const row = page.locator('[data-pd-id^="tasks.v2.row."]').first();
    await expect(row).toBeVisible();
    const id = (await row.getAttribute("data-pd-id"))!.replace("tasks.v2.row.", "");
    await ensureRowTracking(page, id, true);
    await row.click();
    const selector = page.locator(`[data-pd-id="tasks.v2.work-state.${id}"]`);
    const firstState = (await selector.innerText()).includes("In Progress") ? "Blocked" : "In Progress";
    await chooseWorkState(page, id, firstState);
    const savedState = await storedAnnotation(page, id);
    expect(savedState.tracked).toBe(true);
    if (surface === "header") {
      await page.locator('[data-pd-id="ux-v2.header.tasks"]').click();
      await page.locator('[data-pd-id="ux-v2.header.tracked-panel"]').locator(`[data-pd-id="tracked-task.${savedState.profile_id}.${id}"]`).getByRole("button", { name: /^Untrack / }).click();
      await page.keyboard.press("Escape");
    } else {
      await page.locator('[data-pd-id="v2.active-task.toggle"]').click();
      await page.locator('[data-pd-id="v2.active-task"]').locator(`[data-pd-id="tracked-task.${savedState.profile_id}.${id}"]`).getByRole("button", { name: /^Untrack / }).click();
    }
    await expect(page.getByRole("button", { name: "Track Task" })).toBeVisible();
    const untracked = await storedAnnotation(page, id);
    expect(untracked).toMatchObject({ tracked: false, work_state: firstState, version: savedState.version + 1 });
    const finalState = firstState === "In Progress" ? "Blocked" : "In Progress";
    await chooseWorkState(page, id, finalState);
    await expect(page.getByRole("button", { name: "Retry Work State" })).toHaveCount(0);
    expect(await storedAnnotation(page, id)).toMatchObject({ tracked: false, work_state: finalState, version: untracked.version + 1 });
    await page.reload();
    await page.locator(`[data-pd-id="tasks.v2.row.${id}"]`).click();
    await expect(page.locator(`[data-pd-id="tasks.v2.work-state.${id}"]`)).toContainText(finalState);
    await expect(page.getByRole("button", { name: "Track Task" })).toBeVisible();
  });
}

test("CP-140B rapid work-state selections serialize and persist the latest acknowledged choice", async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  await page.goto(authURL);
  await page.goto("/tasks");
  const row = page.locator('[data-pd-id^="tasks.v2.row."]').first();
  await expect(row).toBeVisible();
  const id = (await row.getAttribute("data-pd-id"))!.replace("tasks.v2.row.", "");
  await page.locator(`[data-pd-id="tasks.v2.track.${id}"]`).click();
  await expect(page.locator(`[data-pd-id="tasks.v2.track.${id}"]`)).toHaveAttribute("aria-pressed", "true");
  await row.click();
  let delayed = false;
  await page.route(/\/fund-manager\/tasks\/annotations$/, async route => {
    if (route.request().method() === "PATCH" && !delayed) {
      delayed = true;
      await new Promise(resolve => setTimeout(resolve, 600));
    }
    await route.continue();
  });
  const selector = page.locator(`[data-pd-id="tasks.v2.work-state.${id}"]`);
  await selector.click();
  await page.getByRole("option", { name: "In Progress" }).click();
  await selector.click();
  await page.getByRole("option", { name: "Blocked" }).click();
  await expect(page.locator('[data-pd-id="tasks.v2.work-save-status"]')).toHaveText("Work state saved");
  await page.reload();
  await page.locator(`[data-pd-id="tasks.v2.row.${id}"]`).click();
  await expect(page.locator(`[data-pd-id="tasks.v2.work-state.${id}"]`)).toContainText("Blocked");
});

test("CP-140B genuine concurrent annotation version conflict retains input and retries", async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  await page.goto(authURL);
  await page.goto("/tasks");
  const row = page.locator('[data-pd-id^="tasks.v2.row."]').first();
  await expect(row).toBeVisible();
  const id = (await row.getAttribute("data-pd-id"))!.replace("tasks.v2.row.", "");
  await ensureRowTracking(page, id, true);
  await row.click();
  const selector = page.locator(`[data-pd-id="tasks.v2.work-state.${id}"]`);
  const firstState = (await selector.innerText()).includes("In Progress") ? "Blocked" : "In Progress";
  await chooseWorkState(page, id, firstState);
  const beforeConflict = await storedAnnotation(page, id);
  const secondContext = await page.context().browser()!.newContext();
  try {
    const secondPage = await secondContext.newPage();
    await secondPage.goto(authURL);
    const external = await secondPage.request.patch("http://127.0.0.1:8127/fund-manager/tasks/annotations", { data: { changes: [{
      profile_id: beforeConflict.profile_id, occurrence_key: id, tracked: true, work_state: "To Do",
      blocked_reason: null, review_date: null, expected_version: beforeConflict.version,
    }] } });
    expect(external.status()).toBe(200);
    expect(await storedAnnotation(page, id)).toMatchObject({ tracked: true, work_state: "To Do", version: beforeConflict.version + 1 });
    const intended = firstState === "In Progress" ? "Blocked" : "In Progress";
    await selector.click();
    await page.getByRole("option", { name: intended, exact: true }).click();
    await expect(page.locator('[data-pd-id="tasks.v2.work-save-status"]')).toHaveText("Work state was not saved.");
    await expect(page.getByRole("button", { name: "Retry Work State" })).toBeVisible();
    await expect(selector).toContainText(intended);
    await page.getByRole("button", { name: "Retry Work State" }).click();
    await expect(page.locator('[data-pd-id="tasks.v2.work-save-status"]')).toHaveText("Work state saved");
    expect(await storedAnnotation(page, id)).toMatchObject({ tracked: true, work_state: intended, version: beforeConflict.version + 2 });
    await page.reload();
    await page.locator(`[data-pd-id="tasks.v2.row.${id}"]`).click();
    await expect(page.locator(`[data-pd-id="tasks.v2.work-state.${id}"]`)).toContainText(intended);
    await expect(page.getByRole("button", { name: "Untrack", exact: true })).toBeVisible();
  } finally { await secondContext.close(); }
});

test("CP-140B delayed annotation read cannot replace a later acknowledged work state", async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  await page.goto(authURL);
  await page.goto("/tasks");
  const row = page.locator('[data-pd-id^="tasks.v2.row."]').first();
  await expect(row).toBeVisible();
  const id = (await row.getAttribute("data-pd-id"))!.replace("tasks.v2.row.", "");
  await ensureRowTracking(page, id, true);
  await row.click();
  const selector = page.locator(`[data-pd-id="tasks.v2.work-state.${id}"]`);
  const firstState = (await selector.innerText()).includes("In Progress") ? "Blocked" : "In Progress";
  await chooseWorkState(page, id, firstState);
  const snapshotResponse = await page.request.get("http://127.0.0.1:8127/fund-manager/tasks/annotations");
  expect(snapshotResponse.ok()).toBe(true);
  const staleRows = await snapshotResponse.json();
  let intercept = true;
  let held = 0;
  let fulfilled = 0;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const delayedRead = async (route: import("@playwright/test").Route) => {
    if (route.request().method() !== "GET" || !intercept) return route.continue();
    held += 1;
    await gate;
    await route.fulfill({ status: 200, json: staleRows });
    fulfilled += 1;
  };
  await page.route(/\/fund-manager\/tasks\/annotations$/, delayedRead);
  await page.evaluate(() => window.dispatchEvent(new Event("pd:task-annotations-refresh")));
  await expect.poll(() => held).toBeGreaterThan(0);
  intercept = false;
  const intended = firstState === "In Progress" ? "Blocked" : "In Progress";
  await chooseWorkState(page, id, intended);
  release();
  await expect.poll(() => fulfilled).toBeGreaterThan(0);
  await expect(page.locator('[data-pd-id="tasks.v2.inspector"] dt').filter({ hasText: "Work State" }).locator("..").locator("dd")).toContainText(intended);
  expect(await storedAnnotation(page, id)).toMatchObject({ tracked: true, work_state: intended });
  await page.unroute(/\/fund-manager\/tasks\/annotations$/, delayedRead);
});

test("CP-140B header Untrack returns keyboard focus to the stable collection action", async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  await page.goto(authURL);
  await page.goto("/tasks");
  const row = page.locator('[data-pd-id^="tasks.v2.row."]').first();
  await expect(row).toBeVisible();
  const id = (await row.getAttribute("data-pd-id"))!.replace("tasks.v2.row.", "");
  await page.locator(`[data-pd-id="tasks.v2.track.${id}"]`).click();
  await expect(page.locator(`[data-pd-id="tasks.v2.track.${id}"]`)).toHaveAttribute("aria-pressed", "true");
  await page.locator('[data-pd-id="ux-v2.header.tasks"]').click();
  const panel = page.locator('[data-pd-id="ux-v2.header.tracked-panel"]');
  const card = panel.locator('[data-pd-id^="tracked-task."]').first();
  const cardId = await card.getAttribute("data-pd-id");
  expect(cardId).toBeTruthy();
  await card.getByRole("button", { name: /^Untrack / }).click();
  await expect(panel.locator('[data-pd-id="ux-v2.header.tracked-view-all"]')).toBeFocused();
  await expect(panel.locator(`[data-pd-id="${cardId}"]`)).toHaveCount(0);
});

test("CP-136 saved tracking remains visible when its source occurrence changes", async ({ page }) => {
  await page.goto(authURL);
  await page.goto("/tasks");
  const first = page.locator('[data-pd-id^="tasks.v2.row."]').first();
  await expect(first).toBeVisible();
  const id = (await first.getAttribute("data-pd-id"))!.replace("tasks.v2.row.", "");
  await page.locator(`[data-pd-id="tasks.v2.track.${id}"]`).click();
  await expect(page.locator(`[data-pd-id="tasks.v2.track.${id}"]`)).toHaveAttribute("aria-pressed", "true");
  const storedResponse = await page.request.get("http://127.0.0.1:8127/fund-manager/tasks/annotations");
  expect(storedResponse.ok()).toBe(true);
  const storedRows = await storedResponse.json() as Array<{ occurrence_key: string; source_status: string; tracked: boolean }>;
  const stored = storedRows.find(row => row.occurrence_key === id && row.tracked);
  expect(stored).toBeTruthy();
  const changedSource = async (route: import("@playwright/test").Route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({ status: 200, json: [{ ...stored, source_status: "changed" }] });
  };
  await page.route(/\/fund-manager\/tasks\/annotations$/, changedSource);
  await page.reload();
  await page.locator('[data-pd-id="tasks.v2.collections"]').getByRole("button", { name: /Tracked Tasks/ }).click();
  await expect(page.locator('[data-pd-id="tasks.v2.collections"]')).toContainText("Tracked Tasks (1)");
  const history = page.locator('[data-pd-id="tasks.v2.tracked-history"]');
  await expect(history).toHaveAttribute("open", "");
  await expect(history).toContainText("Source Changed");
  await page.locator('[data-pd-id="ux-v2.header.tasks"]').click();
  await expect(page.locator('[data-pd-id="ux-v2.header.tracked-panel"]')).toContainText("Source history and unavailable tasks (1)");
  await page.locator('[data-pd-id="ux-v2.header.tasks"]').click();
  await page.unroute(/\/fund-manager\/tasks\/annotations$/, changedSource);
  await history.getByRole("button", { name: /Untrack .* from history/ }).click();
});

test("CP-134 page-two tracking and bulk controls affect only the visible page", async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  await page.goto(authURL);
  const due = new Date(Date.now() - 3_600_000).toISOString();
  const tasks = Array.from({ length: 20 }, (_, index) => ({
    audience: "fund_manager", security_tag: "fund_manager_only", kind: "task", task_state: "new",
    notification_id: `SYN-TRACK-${index + 1}`, notification_type: "settlement_review",
    title: `Review synthetic record ${index + 1}`, ledger_label: "Sportsbook Bets",
    bookmaker_label: "Bookmaker A", message: "Synthetic source evidence", profile_id: "profile-demo-001",
    profile_name: "Subscriber Alpha", record_id: `SYN-TRACK-${index + 1}`, due_at: due,
    settles_at: "", created_at: due, href: "/profiles/profile-demo-001/tracker/sportsbook-bets",
    completion_href: "", tone: "warning",
  }));
  const saved = new Map<string, Record<string, unknown>>();
  await page.route(/\/fund-manager\/notifications$/, route => route.fulfill({ status: 200, json: tasks }));
  await page.route(/\/fund-manager\/tasks\/annotations$/, async route => {
    if (route.request().method() === "PATCH") {
      const changes = (route.request().postDataJSON() as { changes: Record<string, unknown>[] }).changes;
      for (const change of changes) {
        const id = String(change.occurrence_key);
        saved.set(id, { ...change, source_key: `settlement_review:profile-demo-001:${id}`,
          title: `Review synthetic record ${id.replace("SYN-TRACK-", "")}`,
          profile_name: "Subscriber Alpha",
          source_status: "active", version: Number(saved.get(id)?.version ?? 0) + 1,
          updated_at: new Date().toISOString() });
      }
      await route.fulfill({ status: 200, json: changes.map(change => saved.get(String(change.occurrence_key))) });
    } else await route.fulfill({ status: 200, json: [...saved.values()] });
  });
  await page.goto("/tasks");
  const next = page.getByRole("button", { name: "Next Today page" });
  await expect(next).toBeEnabled();
  await next.click();
  const pageTwoRow = page.locator('[data-pd-id^="tasks.v2.row."]').first();
  const id = (await pageTwoRow.getAttribute("data-pd-id"))!.replace("tasks.v2.row.", "");
  await page.locator(`[data-pd-id="tasks.v2.track.${id}"]`).click();
  await page.getByRole("button", { name: "Previous Today page" }).click();
  await page.locator('[data-pd-id="tasks.v2.bulk-track"]').click();
  await expect(page.locator('[data-pd-id="tasks.v2.collections"]')).toContainText("Tracked Tasks (9)");
  await page.locator('[data-pd-id="ux-v2.header.tasks"]').click();
  await expect(page.locator('[data-pd-id="ux-v2.header.tracked-panel"] a[href*="&task="]')).toHaveCount(5);
  await page.locator('[data-pd-id="ux-v2.header.tasks"]').click();
  await page.locator('[data-pd-id="tasks.v2.bulk-track"]').click();
  await expect(page.locator('[data-pd-id="tasks.v2.collections"]')).toContainText("Tracked Tasks (1)");
  await page.reload();
  await next.click();
  await expect(page.locator(`[data-pd-id="tasks.v2.track.${id}"]`)).toHaveAttribute("aria-pressed", "true");
});
