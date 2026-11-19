import { expect, test, type Page } from "@playwright/test";

const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";
const profile = "profile-demo-001";
const ledger = `/profiles/${profile}/tracker/sportsbook-bets`;

function notification(id: string, kind: string, date: string, source: "Sportsbook Bets" | "Free Bets") {
  return { audience: "fund_manager", security_tag: "fund_manager_only", kind: "task", task_state: "new",
    notification_id: id, notification_type: kind, title: `Review ${id}`, ledger_label: source,
    bookmaker_label: "Bookmaker A", message: `Recorded source ${id}.`, profile_id: profile,
    profile_name: "Subscriber Alpha", record_id: id, due_at: date, settles_at: "",
    created_at: new Date().toISOString(), href: `${source === "Free Bets" ? `/profiles/${profile}/tracker/free-bets` : ledger}?record=${id}`,
    completion_href: "", tone: "warning" };
}

async function installTasks(page: Page) {
  const now = Date.now();
  const tasks = [
    notification("SB-PART", "partial_lay_reminder", new Date(now + 2 * 3_600_000).toISOString(), "Sportsbook Bets"),
    notification("FB-EXP", "free_bet_expiry", new Date(now + 24 * 3_600_000).toISOString(), "Free Bets"),
    notification("SB-PAST", "settlement_review", new Date(now - 3 * 24 * 3_600_000).toISOString(), "Sportsbook Bets"),
  ];
  await page.route(/\/fund-manager\/notifications$/, route => route.fulfill({ status: 200, json: tasks }));
  await page.route(`**/profiles/${profile}/sportsbook-bets`, route => route.fulfill({ status: 200, json: [
    { profile_id: profile, sportsbook_bet_id: "SB-PART", status: "Placed", result: "Pending", lay_status: "Part Laid", calculated_liability_1: "42.50" },
    { profile_id: profile, sportsbook_bet_id: "SB-PAST", status: "Placed", result: "Pending", lay_status: "Fully Laid" },
  ] }));
  await page.route(`**/profiles/${profile}/free-bets`, route => route.fulfill({ status: 200, json: [
    { profile_id: profile, free_bet_id: "FB-EXP", status: "Available", expiry_datetime: tasks[1].due_at },
  ] }));
}

test.beforeEach(async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  expect(health.database_identity).toBe("cp117-integration-synthetic");
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(authURL);
  expect((await (await page.request.get("/api/auth/session")).json()).email).toBe("demo@example.invalid");
  expect((await page.request.put("/api/fund-manager/preferences/selected-range", { data: {
    selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null,
  } })).status()).toBe(200);
});

test("Today groups one eight-item page by recorded date and immediate review", async ({ page }) => {
  await installTasks(page);
  await page.goto("/tasks");
  await expect(page.locator('[data-pd-id="tasks.v2.collection"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Past Recorded Date" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Immediate Review" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Upcoming" })).toBeVisible();
  await expect(page.locator('[data-pd-id^="tasks.v2.row."]')).toHaveCount(3);
});

test("Today renders source-specific date and canonical provider/status evidence", async ({ page }) => {
  await installTasks(page);
  await page.goto("/tasks");
  await expect(page.locator('[data-pd-id="tasks.v2.row.FB-EXP"]')).toContainText(/Expires? \d/);
  await page.locator('[data-pd-id="tasks.v2.row.SB-PART"]').click();
  const detail = page.locator('[data-pd-id="tasks.v2.detail"]');
  await expect(detail.locator(".bookmaker-identity")).toBeVisible();
  await expect(detail.locator(".table-chip-status-placed")).toContainText("Placed");
});

test("authorised opportunities use the shared suggestion row instead of prose links", async ({ page }) => {
  await page.route(/\/fund-manager\/common-bet-combos\/profile-opportunities\/[^/]+$/, route => route.fulfill({ status: 200, json: route.request().url().endsWith(profile) ? [{ opportunity_key: "DEMO-OPP-001", label: "Review Demo Offer", bookmaker: "Bookmaker A", already_created: false, risk_warnings: [] }] : [] }));
  await page.goto("/opportunities");
  const overview = page.locator('[data-pd-id="opportunities.overview"]');
  await expect(overview.getByRole("button", { name: "Quick Capture" })).toBeVisible();
  await expect(overview.getByRole("button", { name: "Open Tracker" })).toBeVisible();
  await expect(page.locator('[data-pd-id="opportunities.source-list"]')).toBeVisible();
  const row = page.locator('[data-pd-id^="opportunities.item."]').first();
  await expect(row).toBeVisible();
  await expect(row.locator(".material-symbols-outlined").first()).toContainText("lightbulb");
  await expect(row.locator(".material-symbols-outlined").last()).toContainText("chevron_right");
  await expect(row.getByText("Open Profile opportunity")).toHaveCount(0);
});

test("Position financial table scrolls as a read-only region without opening an editor", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto("/");
  const table = page.locator('[data-pd-id="position.financial-table-scroll"]');
  await expect(table).toBeVisible();
  await expect(table).toHaveAttribute("role", "region");
  await expect(table).toHaveAttribute("aria-label", /Report table/);
  expect(await table.evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true);
  await table.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => table.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
  await table.locator("tbody td").first().dblclick();
  await expect(page.locator('[data-pd-id="ledger.floating-editor"]')).toHaveCount(0);
});

test("Sportsbook selection opens exactly one workbench only on a deliberate command", async ({ page }) => {
  await page.goto(ledger);
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
  const open = page.locator('[data-pd-id="sportsbook.toolbar.open-selected"]');
  await expect(open).toBeDisabled();
  const row = page.locator('tr:has(td[data-ledger-row="CP117-CELL-001"])');
  await row.locator('td[data-ledger-column="event_name"]').click();
  await expect(row).toHaveClass(/is-selected-row/);
  await expect(open).toBeEnabled();
  await expect(page.locator('[data-pd-id="sportsbook.editor.dialog"]')).toHaveCount(0);
  await open.click();
  await expect(page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]')).toHaveCount(1);
});

test("source-backed advisory opportunities track in a bounded isolated batch", async ({ page }) => {
  const initialResponse = await page.request.get("/api/fund-manager/tasks/annotations");
  expect(initialResponse.ok()).toBe(true);
  const initialRows = await initialResponse.json() as Array<{ occurrence_key: string; profile_id: string; version: number; tracked: boolean; reviewed_at: string | null; source_status: string; work_state: string; blocked_reason: string | null; review_date: string | null }>;
  const priorWork = initialRows.filter(row => row.occurrence_key.startsWith("profile-opportunity:") && row.source_status === "active" && (row.tracked || row.reviewed_at));
  if (priorWork.length) {
    const reset = await page.request.patch("/api/fund-manager/tasks/annotations", { data: { changes: priorWork.map(row => ({
      profile_id: row.profile_id, occurrence_key: row.occurrence_key, tracked: false, reviewed: false,
      work_state: row.work_state, blocked_reason: row.blocked_reason, review_date: row.review_date, expected_version: row.version,
    })) } });
    expect(reset.status()).toBe(200);
  }
  await page.goto("/tasks");
  await page.getByRole("button", { name: /Opportunities \/ Suggestions/ }).click();
  const section = page.locator('[data-pd-id="tasks.v2.suggestions"]');
  await expect(section.locator('[data-pd-id^="opportunities.item."]').filter({ hasText: "Demo advisory opportunity" })).toHaveCount(2);
  await expect(section.locator('[data-pd-id="tasks.v2.opportunity-summary"]')).toContainText("2 advisory · 2 shown · 2 eligible · 0 tracked");
  const bulk = section.getByRole("button", { name: /Track all 2 eligible untracked opportunities/ });
  await expect(bulk).toBeEnabled();
  await bulk.click();
  await expect.poll(async () => {
    const response = await page.request.get("/api/fund-manager/tasks/annotations");
    return (await response.json() as Array<{ occurrence_key: string; tracked: boolean }>).filter(row => row.tracked && row.occurrence_key.startsWith("profile-opportunity:")).length;
  }).toBe(2);
  await page.reload();
  await expect(page.locator('[data-pd-id="v2.active-task"]')).toContainText("Demo advisory opportunity");
  const response = await page.request.get("/api/fund-manager/tasks/annotations");
  const rows = await response.json() as Array<{ occurrence_key: string; profile_id: string; version: number; tracked: boolean }>;
  const tracked = rows.filter(row => row.tracked && row.occurrence_key.startsWith("profile-opportunity:"));
  expect(tracked).toHaveLength(2);
  const cleanup = await page.request.patch("/api/fund-manager/tasks/annotations", { data: { changes: tracked.map(row => ({
    profile_id: row.profile_id, occurrence_key: row.occurrence_key, tracked: false, work_state: "To Do", blocked_reason: null, review_date: null, expected_version: row.version,
  })) } });
  expect(cleanup.status()).toBe(200);
});

test("real Sportsbook ledger separates synchronized pagination from horizontal panning", async ({ page }) => {
  await page.goto(ledger);
  await expect(page.getByRole("heading", { name: "Sportsbook Bets", level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Quick Capture" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Bet Workbench" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Scroll table right" })).toHaveCount(0);
  await expect(page.getByLabel("Status Filter")).toBeVisible();
  const top = page.locator('[data-pd-id="sportsbook.pagination.top"]');
  const bottom = page.locator('[data-pd-id="sportsbook.pagination.bottom"]');
  await expect(top).toBeVisible();
  await expect(bottom).toBeVisible();
  await expect(bottom).toContainText(await top.locator('[aria-live="polite"]').innerText());
  const gridBottom = (await page.locator('[data-pd-id="sportsbook.table-scroll"]').boundingBox())!.y + (await page.locator('[data-pd-id="sportsbook.table-scroll"]').boundingBox())!.height;
  expect((await bottom.boundingBox())!.y).toBeGreaterThanOrEqual(gridBottom);
  await page.getByRole("button", { name: "Quick Capture" }).click();
  const quick = page.locator('[data-pd-id="sportsbook.quick-capture.dialog"]');
  await expect(quick).toBeVisible();
  await quick.getByLabel("Offer Name").fill("Demo Campaign");
  await quick.getByLabel("Event Name").fill("Demo Fixture");
  await expect(quick.getByRole("button", { name: "Save" })).toHaveCount(0);
  await quick.getByRole("button", { name: "Open full workbench" }).click();
  const full = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
  await expect(full).toBeVisible();
  await expect(full.getByLabel("Event name", { exact: true })).toHaveValue("Demo Fixture");
  await expect(full.getByLabel("Campaign tag (optional)")).toHaveValue("Demo Campaign");
});

for (const [name, slug, paginationId] of [
  ["Accounts", "accounts", "accounts"],
  ["Free Bets", "free-bets", "free-bets"],
  ["Casino Offers", "casino-offers", "casino-offers"],
  ["Extra Place", "each-way-extra-places", "extra-place"],
  ["Cash Adjustments", "cash-adjustments", "cash-adjustments"],
] as const) {
  test(`${name} keeps one synchronized pagination contract above and below its grid`, async ({ page }) => {
    await page.goto(`/profiles/${profile}/tracker/${slug}`);
    const top = page.locator(`[data-pd-id="${paginationId}.pagination.top"]`);
    const bottom = page.locator(`[data-pd-id="${paginationId}.pagination.bottom"]`);
    await expect(top).toBeVisible();
    await expect(bottom).toBeVisible();
    await expect(bottom.locator('[aria-live="polite"]')).toHaveText(await top.locator('[aria-live="polite"]').innerText());
    await expect(page.getByRole("button", { name: /Scroll table (left|right)/ })).toHaveCount(0);
    const topPageSize = top.locator(`[data-pd-id="${paginationId}.pagination.top.page-size"]`);
    const bottomPageSize = bottom.locator(`[data-pd-id="${paginationId}.pagination.bottom.page-size"]`);
    if (await topPageSize.count()) {
      await topPageSize.click();
      await page.getByRole("option", { name: "16 rows" }).click();
      await expect(bottomPageSize).toContainText("16 rows");
      await expect(bottom.locator('[aria-live="polite"]')).toHaveText(await top.locator('[aria-live="polite"]').innerText());
    }
  });
}

test("Sportsbook V2 opens one application workbench instead of the legacy primary modal", async ({ page }) => {
  await page.goto(ledger);
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
  const event = page.locator('td[data-ledger-row="CP117-CELL-001"][data-ledger-column="event_name"]');
  await event.click();
  await page.locator('[data-pd-id="sportsbook.toolbar.open-selected"]').click();
  const workbench = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
  await expect(workbench).toBeVisible();
  await expect(workbench.locator('[data-pd-id="bet-workbench.stages"] button')).toHaveCount(5);
  await expect(workbench.locator('[data-pd-id="bet-workbench.stage.offer"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="sportsbook.editor.dialog"]')).toHaveCount(0);
  await expect(page.locator('[role="dialog"][aria-modal="true"]')).toHaveCount(0);
});

test("Sportsbook workbench uses page scrolling, five stages and a normal-flow footer", async ({ page }, info) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await page.goto(ledger);
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
  await page.locator('td[data-ledger-row="SB-SEED-001"][data-ledger-column="event_name"]').click();
  await page.locator('[data-pd-id="sportsbook.toolbar.open-selected"]').click();
  const surface = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
  const stages = surface.locator('[data-pd-id="bet-workbench.stages"] button');
  await expect(stages).toHaveCount(5);
  await expect(stages).toHaveText([/Offer/, /Requirements/, /Matching/, /Placement/, /Finish \/ Review/]);
  await surface.locator('[data-pd-id="bet-workbench.stage.offer"]').click();
  await expect(surface.locator('[data-pd-id="ledger-editor.panel.setup"]')).toBeVisible();
  expect(await surface.evaluate(node => getComputedStyle(node).maxHeight)).toBe("none");
  await expect(surface.locator(".workflow-editor-body")).toHaveCSS("overflow-y", "visible");
  const footer = surface.locator('[data-pd-id="sportsbook.editor.actions"]');
  await expect(footer).toHaveCSS("position", "static");
  // Sample both rectangles in one layout frame: asynchronous source hydration can
  // otherwise move the page between two separate browser round trips.
  await expect.poll(() => surface.evaluate(node => {
    const body = node.querySelector(".workflow-editor-body");
    const actions = node.querySelector('[data-pd-id="sportsbook.editor.actions"]');
    if (!body || !actions) return -1;
    return actions.getBoundingClientRect().top - body.getBoundingClientRect().bottom;
  })).toBeGreaterThanOrEqual(-1);
  expect(await page.evaluate(() => document.scrollingElement!.scrollHeight)).toBeGreaterThan(700);
  await footer.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.scrollingElement!.scrollTop)).toBeGreaterThan(0);
  await page.screenshot({ path: info.outputPath("sportsbook-workbench-page-flow-900.png"), fullPage: true });
});

test("Lab and real cells pan over text without selecting it or opening an editor", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 850 });
  for (const route of [ledger, "/design-lab"] as const) {
    if (route === "/design-lab") await page.setViewportSize({ width: 1440, height: 850 });
    await page.goto(route);
    if (route === "/design-lab") { await page.locator('[data-pd-id="lab.nav.sportsbook"]').click(); await page.setViewportSize({ width: 900, height: 850 }); }
    const grid = page.locator(route === "/design-lab" ? '[data-pd-id="lab.ledger-pan.sportsbook"]' : '[data-pd-id="sportsbook.table-scroll"]');
    const cell = grid.locator("tbody td[tabindex]").filter({ hasText: /./ }).first();
    await cell.scrollIntoViewIfNeeded();
    expect(await cell.evaluate(node => getComputedStyle(node).cursor)).toBe("cell");
    await grid.evaluate(node => { node.scrollLeft = 0; window.getSelection()?.removeAllRanges(); });
    const box = (await cell.boundingBox())!;
    const x = Math.min(box.x + box.width - 12, Math.max(box.x + 16, 190));
    const y = box.y + Math.min(box.height / 2, 20);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 110, y, { steps: 8 });
    await page.mouse.up();
    expect(await grid.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.getSelection()?.toString() ?? "")).toBe("");
    await expect(page.getByRole("button", { name: "Scroll table right" })).toHaveCount(0);
    await expect(page.locator('[data-pd-id="ledger.floating-editor"]')).toHaveCount(0);
  }
});

test("Escape cancels a changed Sportsbook cell without Revert toast or Save", async ({ page }) => {
  await page.goto(ledger);
  const cell = page.locator('td[data-ledger-row="CP117-CELL-001"][data-ledger-column="event_name"]');
  await cell.dblclick();
  const input = page.locator('[data-pd-id="sportsbook.cell-editor.event_name"]');
  await expect(input).toBeVisible();
  const original = await input.inputValue();
  await input.fill(`${original} unsaved`);
  await input.press("Escape");
  await expect(page.locator('[data-pd-id="ledger.floating-editor"]')).toHaveCount(0);
  await expect(page.getByText(/Reverted unsaved changes for sportsbook bet/)).toHaveCount(0);
  await expect(cell).toContainText(original);
  await page.reload();
  const persisted = await (await page.request.get(`/api/profiles/${profile}/sportsbook-bets/CP117-CELL-001`)).json() as { event_name: string };
  expect(persisted.event_name).toBe(original);
});

test("eligible Sportsbook Settles cell exposes the native datetime control without opening a workbench", async ({ page }) => {
  await page.goto(ledger);
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
  await page.locator('td[data-ledger-row="CP117-CELL-001"][data-ledger-column="date_settled"]').dblclick();
  const editor = page.locator('[data-pd-id="ledger.floating-editor"]');
  await expect(editor).toBeVisible();
  await expect(editor.locator('[data-pd-id="sportsbook.cell-editor.date_settled"]')).toHaveAttribute("type", "datetime-local");
  await expect(page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]')).toHaveCount(0);
});

test("Sportsbook typed cells activate by F2 or Enter and Escape cancels without opening the workbench", async ({ page }) => {
  await page.goto(ledger);
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
  const bookmaker = page.locator('td[data-ledger-row="CP117-CELL-001"][data-ledger-column="bookmaker"]');
  await bookmaker.click();
  await page.keyboard.press("F2");
  await expect(page.locator('[data-pd-id="sportsbook.cell-editor.bookmaker"]')).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-pd-id="ledger.floating-editor"]')).toHaveCount(0);
  const settles = page.locator('td[data-ledger-row="CP117-CELL-001"][data-ledger-column="date_settled"]');
  await settles.click();
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-pd-id="sportsbook.cell-editor.date_settled"]')).toHaveAttribute("type", "datetime-local");
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-pd-id="ledger.floating-editor"]')).toHaveCount(0);
  await expect(page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]')).toHaveCount(0);
});

test("placed and settled Sportsbook cells explain their protected boundary before a deliberate workbench review", async ({ page }) => {
  const original = await (await page.request.get(`/api/profiles/${profile}/sportsbook-bets/CP117-CELL-001`)).json() as Record<string, unknown>;
  await page.route(`**/profiles/${profile}/sportsbook-bets`, route => route.fulfill({ status: 200, json: [
    { ...original, sportsbook_bet_id: "PROTECTED-PLACED", status: "Placed", actual_accepted_back_odds: "2.10" },
    { ...original, sportsbook_bet_id: "PROTECTED-SETTLED", status: "Settled", result: "Win" },
  ] }));
  await page.goto(ledger);
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
  for (const [rowId, column] of [["PROTECTED-PLACED", "bookmaker"], ["PROTECTED-SETTLED", "date_settled"]]) {
    await page.locator(`td[data-ledger-row="${rowId}"][data-ledger-column="${column}"]`).dblclick();
    await expect(page.locator('[data-pd-id="sportsbook.protected-cell"]')).toBeVisible();
    await expect(page.locator('[data-pd-id="ledger.floating-editor"]')).toHaveCount(0);
    await expect(page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]')).toHaveCount(0);
  }
});

test("Prospecting Sportsbook datetime commits through its native command in owned and combined scopes", async ({ page }) => {
  const source = await (await page.request.get(`/api/profiles/${profile}/sportsbook-bets/CP117-CELL-001`)).json() as Record<string, unknown>;
  await page.goto(ledger);
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
  await page.locator('td[data-ledger-row="CP117-CELL-001"][data-ledger-column="date_settled"]').dblclick();
  const owned = page.locator('[data-pd-id="sportsbook.cell-editor.date_settled"]');
  await expect(owned).toHaveAttribute("type", "datetime-local");
  await owned.fill("2026-11-04T13:30");
  await owned.press("Enter");
  await expect(page.locator('[data-pd-id="ledger.floating-editor"]')).toHaveCount(0);
  let saved = await (await page.request.get(`/api/profiles/${profile}/sportsbook-bets/CP117-CELL-001`)).json() as Record<string, unknown>;
  expect(String(saved.date_settled)).toContain("2026-11-04 13:30");
  for (const key of ["profile_id", "sportsbook_bet_id", "back_stake", "back_odds", "lay_odds_1", "status", "result"]) expect(saved[key]).toEqual(source[key]);
  await page.goto("/tracker/sportsbook-bets?q=CP117-CELL-001");
  const cell = page.locator('td[data-ledger-row="profile-demo-001::CP117-CELL-001"][data-ledger-column="date_settled"]');
  await expect(cell).toBeVisible();
  await cell.dblclick();
  const combined = page.locator('[data-pd-id="combined.sportsbook-bets.cell-editor.date_settled"]');
  await expect(combined).toHaveAttribute("type", "datetime-local");
  await combined.fill("2026-11-05T14:45");
  await combined.press("Enter");
  await expect(page.locator('[data-pd-id="ledger.floating-editor"]')).toHaveCount(0);
  saved = await (await page.request.get(`/api/profiles/${profile}/sportsbook-bets/CP117-CELL-001`)).json() as Record<string, unknown>;
  expect(String(saved.date_settled)).toContain("2026-11-05 14:45");
  for (const key of ["profile_id", "sportsbook_bet_id", "back_stake", "back_odds", "lay_odds_1", "status", "result"]) expect(saved[key]).toEqual(source[key]);
  await page.reload();
  await expect(cell).toContainText("5");
});

test("a rejected Sportsbook datetime Save retains its draft and retries without opening a workbench", async ({ page }) => {
  await page.goto(ledger);
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
  // This disposable source also runs after the persisted-date journey in the
  // complete suite. Always propose a different value so a retry is exercised.
  const current = await (await page.request.get(`/api/profiles/${profile}/sportsbook-bets/CP117-CELL-002`)).json() as Record<string, unknown>;
  const proposed = String(current.date_settled ?? "").includes("2026-11-06") ? "2026-11-07T16:15" : "2026-11-06T16:15";
  await page.locator('td[data-ledger-row="CP117-CELL-002"][data-ledger-column="date_settled"]').dblclick();
  const editor = page.locator('[data-pd-id="ledger.floating-editor"]');
  const input = editor.locator('[data-pd-id="sportsbook.cell-editor.date_settled"]');
  await input.fill(proposed);
  let rejected = false;
  await page.route("**/profiles/profile-demo-001/sportsbook-bets/CP117-CELL-002", async route => {
    if (route.request().method() === "PUT" && !rejected) {
      rejected = true;
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Synthetic transient Save failure" }) });
      return;
    }
    await route.continue();
  });
  await input.press("Enter");
  await expect(editor).toBeVisible();
  await expect(input).toHaveValue(proposed);
  await expect(editor.getByRole("alert")).toContainText(/Synthetic transient Save failure|not saved|failed/i);
  await expect(page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]')).toHaveCount(0);
  await input.press("Enter");
  await expect(editor).toHaveCount(0);
  const saved = await (await page.request.get(`/api/profiles/${profile}/sportsbook-bets/CP117-CELL-002`)).json() as Record<string, unknown>;
  expect(String(saved.date_settled)).toContain(`${proposed.slice(0, 10)} 16:15`);
});

test("Prospecting Sportsbook bookmaker opens an authorised selector in both scopes", async ({ page }) => {
  await page.goto(ledger);
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
  await page.locator('td[data-ledger-row="CP117-CELL-001"][data-ledger-column="bookmaker"]').dblclick();
  const owned = page.locator('[data-pd-id="sportsbook.cell-editor.bookmaker"]');
  await expect(owned).toBeVisible();
  await expect(owned.locator("option")).not.toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.goto("/tracker/sportsbook-bets?q=CP117-CELL-001");
  const cell = page.locator('td[data-ledger-row="profile-demo-001::CP117-CELL-001"][data-ledger-column="bookmaker"]');
  await expect(cell).toBeVisible();
  await cell.dblclick();
  const combined = page.locator('[data-pd-id="combined.sportsbook-bets.cell-editor.bookmaker"]');
  await expect(combined).toBeVisible();
  await expect(combined.locator("option")).toContainText("Bookmaker A");
});

test("Sportsbook bookmaker choices persist through owned and combined Profile commands", async ({ page }) => {
  const stamp = Date.now();
  const created = await page.request.post("/api/profiles/onboarding", { data: {
    accounts: [], display_name: `Synthetic Sportsbook choices ${stamp}`, profile_code: `SB-CHOICE-${stamp}`,
    enabled_modules: ["sportsbook-bets", "free-bets", "casino-offers", "cash-adjustments", "each-way-extra-places"],
    quick_actions: [], setup_path: "import", tracking_start_date: "2026-09-01",
    profile_relationship: "Personal", management_fee_percent: "0", investment_fee_percent: "0",
  } });
  expect(created.status(), await created.text()).toBe(201);
  const owner = (await created.json()).profile.profile_id as string;
  const rowId = `SB-CHOICE-${stamp}`;
  try {
    for (const bookmaker of ["Bookmaker A", "Bookmaker B"]) {
      const account = await page.request.post(`/api/profiles/${owner}/accounts`, { data: {
        account: bookmaker, type: "Bookie", status: "Active", lifecycle_status: "Active", channel: "Online",
        stake_access: "Normal", promo_access: "Full", restrictions: [], current_balance: "0.00", pending_withdrawal_amount: "0.00",
      } });
      expect(account.status(), await account.text()).toBe(201);
    }
    const seed = await page.request.post(`/api/profiles/${owner}/sportsbook-bets`, { data: {
      sportsbook_bet_id: rowId, event_name: "Synthetic choice fixture", offer_text: "Demo Offer", bookmaker: "Bookmaker A",
      offer_type: "Sign up / Welcome", bet_type: "Single", fixture_type: "Football", status: "Prospecting", result: "Pending",
      back_stake: "10.00", back_odds: "2.10", match_strategy: "Standard", lay_odds_1: "2.20", lay_commission_1: "0.02",
      date_settled: "2026-11-03 13:00", user_notes: "Synthetic disposable fixture",
    } });
    expect(seed.status(), await seed.text()).toBe(201);
    const original = await seed.json() as Record<string, unknown>;
    await page.goto(`/profiles/${owner}/tracker/sportsbook-bets`);
    await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
    await page.locator(`td[data-ledger-row="${rowId}"][data-ledger-column="bookmaker"]`).dblclick();
    const owned = page.locator('[data-pd-id="sportsbook.cell-editor.bookmaker"]');
    await expect(owned).toBeVisible();
    await owned.selectOption("Bookmaker B");
    await owned.press("Enter");
    await expect(page.locator('[data-pd-id="ledger.floating-editor"]')).toHaveCount(0);
    let saved = await (await page.request.get(`/api/profiles/${owner}/sportsbook-bets/${rowId}`)).json() as Record<string, unknown>;
    expect(saved.bookmaker).toBe("Bookmaker B");
    await page.goto(`/tracker/sportsbook-bets?q=${rowId}`);
    const combinedCell = page.locator(`td[data-ledger-row="${owner}::${rowId}"][data-ledger-column="bookmaker"]`);
    await expect(combinedCell).toBeVisible();
    await combinedCell.dblclick();
    const combined = page.locator('[data-pd-id="combined.sportsbook-bets.cell-editor.bookmaker"]');
    await expect(combined).toBeVisible();
    await combined.selectOption("Bookmaker A");
    await combined.press("Enter");
    await expect(page.locator('[data-pd-id="ledger.floating-editor"]')).toHaveCount(0);
    saved = await (await page.request.get(`/api/profiles/${owner}/sportsbook-bets/${rowId}`)).json() as Record<string, unknown>;
    expect(saved.bookmaker).toBe("Bookmaker A");
    for (const key of ["profile_id", "sportsbook_bet_id", "back_stake", "back_odds", "lay_odds_1", "status", "result"]) expect(saved[key]).toEqual(original[key]);
    const foreign = await page.request.put(`/api/profiles/profile-demo-002/sportsbook-bets/${rowId}`, { data: saved });
    expect([403, 404]).toContain(foreign.status());
  } finally {
    const archived = await page.request.patch(`/api/profiles/${owner}`, { data: { status: "Archived" } });
    expect(archived.status(), await archived.text()).toBe(200);
  }
});

test("Sportsbook workbench replaces the ledger and keeps its controls contained at narrow widths", async ({ page }, info) => {
  test.setTimeout(90_000);
  for (const [width, theme] of [[1440, "light"], [900, "dark"], [390, "light"]] as const) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(value => { localStorage.setItem("openforge-theme", value); document.documentElement.dataset.theme = value; }, theme);
    await page.goto("/design-lab");
    await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
    await page.locator('[data-pd-id="lab.add.modal"]').click();
    await page.getByRole("button", { name: "Open full workbench" }).click();
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({ path: info.outputPath(`sportsbook-lab-${width}-${theme}.png`), fullPage: true });
    await page.goto(ledger);
    await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
    await page.locator('[data-pd-id="sportsbook.toolbar.add-row"]').click();
    const surface = page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]');
    await expect(surface).toBeVisible();
    await expect(page.locator('[data-pd-id="sportsbook.design-screen"]')).toHaveCount(0);
    const setupFieldsetBorder = await surface.locator('.editor-section .section-fieldset').first().evaluate(element => getComputedStyle(element).borderTopWidth);
    expect(setupFieldsetBorder).toBe("0px");
    const geometry = await surface.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      const body = element.querySelector(".workflow-editor-body")!;
      const footer = element.querySelector(".workflow-editor-footer")?.getBoundingClientRect();
      return { left: bounds.left, right: bounds.right, width: bounds.width, bodyOverflow: getComputedStyle(body).overflowY, pageScrolls: document.scrollingElement!.scrollHeight > innerHeight, pageOverflow: document.documentElement.scrollWidth - innerWidth,
        footerTop: footer?.top ?? -Infinity, bodyBottom: body.getBoundingClientRect().bottom, viewportHeight: innerHeight };
    });
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(width + 1);
    expect(geometry.pageOverflow).toBeLessThanOrEqual(1);
    expect(geometry.bodyOverflow).toBe("visible");
    expect(geometry.pageScrolls).toBe(true);
    expect(geometry.footerTop).toBeGreaterThanOrEqual(geometry.bodyBottom - 1);
    await surface.locator('[data-pd-id="sportsbook.editor.actions"]').scrollIntoViewIfNeeded();
    for (const button of await surface.locator('[data-pd-id="sportsbook.editor.actions"] button:visible').all()) {
      const bounds = await button.boundingBox();
      expect(bounds?.y ?? Infinity).toBeGreaterThanOrEqual(0);
      expect((bounds?.y ?? Infinity) + (bounds?.height ?? Infinity)).toBeLessThanOrEqual(geometry.viewportHeight + 1);
    }
    await page.screenshot({ path: info.outputPath(`sportsbook-v2-${width}-${theme}.png`), fullPage: true });
    await surface.locator('[data-pd-id="sportsbook.editor.actions"]').getByRole("button", { name: "Cancel" }).click();
    await expect(surface).toHaveCount(0);
  }
});

test("native Sportsbook keeps governed row commands behind a compact action surface", async ({ page }) => {
  await page.goto(ledger);
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
  const row = page.locator('tr:has(td[data-ledger-row="CP117-CELL-001"])');
  await expect(row).toBeVisible();
  expect(await row.locator("td").last().evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
  await expect(row.locator("td").last().getByRole("button")).toHaveCount(2);
  await row.getByRole("button", { name: "More actions for CP117-CELL-001" }).click();
  const menu = page.getByRole("menu", { name: "Actions for CP117-CELL-001" });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Update outcome" })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Copy to Profiles" })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Delete sportsbook row" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(row.getByRole("button", { name: "More actions for CP117-CELL-001" })).toBeFocused();
  await row.getByRole("button", { name: "Open CP117-CELL-001" }).click();
  await expect(page.locator('[data-pd-id="sportsbook.editor.workbench-surface"]')).toBeVisible();
});

for (const item of [
  { module: "free-bets", rowId: "CP117-FB-001", secondary: "Review settlement" },
  { module: "casino-offers", rowId: "CP117-CAS-001", secondary: "Review settlement" },
  { module: "each-way-extra-places", rowId: "CP117-EP-001", secondary: "Delete Extra Place row" },
  { module: "cash-adjustments", rowId: "CA-SEED-001", secondary: "Delete cash-adjustment row" },
]) {
  test(`${item.module} uses the Lab row action and preserves its governed secondary command`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ colorScheme: "light" });
    await page.addInitScript(() => localStorage.setItem("openforge-theme", "light"));
    await page.goto(`/profiles/${profile}/tracker/${item.module}`);
    await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
    const row = page.locator(`tr:has(td[data-ledger-row="${item.rowId}"])`).first();
    await expect(row).toBeVisible();
    const actions = row.locator("td").last();
    await expect(actions.getByRole("button")).toHaveCount(2);
    expect(await actions.evaluate(element => getComputedStyle(element).backgroundColor)).toMatch(/^rgb\(/);
    if (item.module === "free-bets") {
      await page.screenshot({ path: "data/private/evidence/cp117-rejected-parity/free-bets-actions-after-1440-light.png", fullPage: true });
    }
    await actions.getByRole("button", { name: /More actions for/ }).click();
    const dialog = page.getByRole("menu", { name: /Actions for/ });
    await expect(dialog.getByRole("menuitem", { name: item.secondary })).toBeVisible();
    if (item.module === "free-bets" || item.module === "casino-offers") {
      await dialog.getByRole("menuitem", { name: item.secondary }).click();
      await expect(page.getByRole("dialog", { name: item.module === "free-bets" ? "Update free-bet outcome" : "Update casino outcome" })).toBeVisible();
      return;
    }
    if (item.module === "each-way-extra-places") {
      await dialog.getByRole("menuitem", { name: item.secondary }).click();
      await expect(page.getByRole("dialog", { name: "Confirm Extra Place deletion" })).toBeVisible();
      return;
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(actions.getByRole("button", { name: /More actions for/ })).toBeFocused();
  });
}

test("native Event Name uses the compact Lab scalar input", async ({ page }) => {
  await page.goto(ledger);
  const cell = page.locator('td[data-ledger-row="CP117-CELL-001"][data-ledger-column="event_name"]');
  await expect(cell).toBeVisible();
  await cell.dblclick();
  const editor = page.locator('[data-pd-id="ledger.floating-editor"]');
  await expect(editor).toBeVisible();
  await expect(editor.getByRole("textbox", { name: /Event Name/i })).toBeVisible();
  await expect(editor.getByRole("button", { name: "Save" })).toHaveCount(0);
  await expect(editor.getByRole("button", { name: "Open full editor" })).toHaveCount(0);
  await expect(editor.getByRole("button", { name: /Cancel.*Event Name edit/i })).toHaveCount(0);
});

test("combined Sportsbook Event Name opens the same compact input and retains scope", async ({ page }) => {
  await page.goto("/tracker/sportsbook-bets?q=CP117-CELL-001");
  const cell = page.locator('td[data-ledger-column="event_name"]').first();
  await expect(cell).toBeVisible();
  await cell.dblclick();
  const editor = page.locator('[data-pd-id="ledger.floating-editor"]');
  await expect(editor.getByRole("textbox", { name: "Event name" })).toBeVisible();
  await expect(editor.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
  await editor.getByRole("textbox", { name: "Event name" }).fill("Combined synthetic event");
  await editor.getByRole("textbox", { name: "Event name" }).press("Enter");
  await expect(editor).toHaveCount(0);
  await expect(page).toHaveURL(/\/tracker\/sportsbook-bets\?q=CP117-CELL-001/);
  await expect(cell).toContainText("Combined synthetic event");
});

test("combined scalar retries preserve Profile identity and unrelated financial fields", async ({ page }) => {
  for (const item of [
    { module: "free-bets", id: "CP117-FB-001", column: "event_name", label: "Event name", money: ["free_bet_value", "final_net_pnl", "lay_actual"] },
    { module: "casino-offers", id: "CP117-CAS-001", column: "game", label: "Game", money: ["cash_stake", "free_spins_value", "final_net_pnl"] },
    { module: "each-way-extra-places", id: "CP117-EP-001", column: "runner", label: "Runner", money: ["each_way_stake", "qualifying_loss", "final_value"] },
  ]) {
    const endpoint = `/api/profiles/${profile}/${item.module}/${item.id}`;
    const before = await (await page.request.get(endpoint)).json() as Record<string, unknown>;
    await page.goto(`/tracker/${item.module}?q=${item.id}`);
    const cell = page.locator(`td[data-ledger-column="${item.column}"]`).first();
    await expect(cell).toBeVisible(); await cell.dblclick();
    const editor = page.locator('[data-pd-id="ledger.floating-editor"]');
    const input = editor.getByRole("textbox", { name: item.label, exact: true });
    await expect(input).toHaveValue(String(before[item.column] ?? ""));
    const base = `Synthetic combined ${item.module} edit`;
    const next = before[item.column] === base ? `${base} revised` : base;
    await input.fill(next);
    const nextRace = item.module === "each-way-extra-places" ? `${String(before.race ?? "")} reviewed` : null;
    if (nextRace) await editor.getByRole("textbox", { name: "Race", exact: true }).fill(nextRace);
    let rejected = false;
    await page.route(`**${endpoint}`, async route => {
      if (route.request().method() === "PUT" && !rejected) { rejected = true; await route.fulfill({ status: 503, json: { detail: "Synthetic retry required" } }); }
      else await route.continue();
    });
    await input.press("Enter");
    await expect(editor.getByRole("alert")).toContainText("Synthetic retry required");
    await expect(input).toHaveValue(next);
    await input.press("Enter");
    await expect(editor).toHaveCount(0);
    const after = await (await page.request.get(endpoint)).json() as Record<string, unknown>;
    expect(after[item.column], item.module).toBe(next);
    if (nextRace) expect(after.race).toBe(nextRace);
    expect(after.profile_id).toBe(before.profile_id);
    for (const key of item.money) expect(after[key], `${item.module}.${key}`).toEqual(before[key]);
    await page.reload();
    await expect(page.locator(`td[data-ledger-column="${item.column}"]`).first()).toContainText(next);
    if (nextRace) await expect(page.locator(`td[data-ledger-column="${item.column}"]`).first()).toContainText(nextRace);
    await page.unroute(`**${endpoint}`);
  }
});

test("combined scalar rejects stale fields and confirms a lost response without another write", async ({ page }) => {
  const endpoint = `/api/profiles/${profile}/sportsbook-bets/CP117-CELL-001`;
  await page.goto("/tracker/sportsbook-bets?q=CP117-CELL-001");
  const cell = page.locator('td[data-ledger-column="event_name"]').first();
  await expect(cell).toBeVisible(); await cell.dblclick();
  const editor = page.locator('[data-pd-id="ledger.floating-editor"]');
  const input = editor.getByRole("textbox", { name: "Event name" });
  const current = await (await page.request.get(endpoint)).json() as Record<string, unknown>;
  const other = { ...current, event_name: "Synthetic concurrent edit" };
  expect((await page.request.put(endpoint, { data: other })).status()).toBe(200);
  await input.fill("Synthetic intended edit"); await input.press("Enter");
  await expect(editor.getByRole("alert")).toContainText("changed elsewhere");
  await expect(input).toHaveValue("Synthetic intended edit");
  expect((await (await page.request.get(endpoint)).json()).event_name).toBe("Synthetic concurrent edit");
  await input.press("Escape"); await expect(editor).toHaveCount(0);
  await page.reload(); await expect(cell).toContainText("Synthetic concurrent edit");
  await cell.dblclick(); await input.fill("Synthetic confirmed after lost response");
  let writes = 0;
  await page.route(`**${endpoint}`, async route => {
    if (route.request().method() !== "PUT") { await route.continue(); return; }
    writes += 1;
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    await route.fulfill({ status: 503, json: { detail: "Synthetic response lost" } });
  });
  await input.press("Enter");
  await expect(editor.getByRole("alert")).toContainText("Synthetic response lost");
  await input.press("Enter");
  await expect(editor).toHaveCount(0);
  expect(writes).toBe(1);
  expect((await (await page.request.get(endpoint)).json()).event_name).toBe("Synthetic confirmed after lost response");
});

test("combined row review uses source issue severity and Lab row surface", async ({ page }) => {
  const source = await (await page.request.get(`/api/profiles/${profile}/sportsbook-bets/CP117-CELL-001`)).json() as Record<string, unknown>;
  await page.route(`**/profiles/${profile}/sportsbook-bets`, route => route.fulfill({ status: 200, json: [{ ...source, status: "Placed", result: "Pending", is_overdue: true, date_settled: new Date().toISOString(), partial_lay_reminder_state: "Resolved" }] }));
  await page.goto("/tracker/sportsbook-bets?q=CP117-CELL-001");
  const row = page.locator('tr:has(td[data-ledger-row="profile-demo-001::CP117-CELL-001"])');
  await expect(row).toBeVisible();
  await expect(row).toContainText("Outcome Needed");
  const colour = await row.locator("td").first().evaluate(element => getComputedStyle(element).backgroundColor);
  expect(colour).not.toBe("rgba(0, 0, 0, 0)");
  await expect(row.getByRole("link", { name: /Open CP117-CELL-001/ })).toBeVisible();
});
