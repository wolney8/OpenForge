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
  await expect(page.locator('[data-pd-id="opportunities.source-list"]')).toBeVisible();
  const row = page.locator('[data-pd-id^="opportunities.item."]').first();
  await expect(row).toBeVisible();
  await expect(row.locator(".material-symbols-outlined").first()).toContainText("lightbulb");
  await expect(row.locator(".material-symbols-outlined").last()).toContainText("chevron_right");
  await expect(row.getByText("Open Profile opportunity")).toHaveCount(0);
});

test("source-backed advisory opportunities track in a bounded isolated batch", async ({ page }) => {
  await page.goto("/tasks");
  await page.getByRole("button", { name: /Opportunities \/ Suggestions/ }).click();
  const section = page.locator('[data-pd-id="tasks.v2.suggestions"]');
  await expect(section.locator('[data-pd-id^="opportunities.item."]').filter({ hasText: "Demo advisory opportunity" })).toHaveCount(2);
  const bulk = section.getByRole("button", { name: /Track all 2 source-backed opportunities/ });
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

test("real Sportsbook ledger has the Lab entry modes and horizontal controls", async ({ page }) => {
  await page.goto(ledger);
  await expect(page.getByRole("heading", { name: "Sportsbook Bets", level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Quick Capture" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Bet Workbench" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Scroll table right" })).toBeVisible();
  await expect(page.getByLabel("Status Filter")).toBeVisible();
  const controls = await page.locator('[data-pd-id="sportsbook.table-scroll.scroll-controls"]').boundingBox();
  const table = await page.locator('[data-pd-id="sportsbook.table-scroll"]').boundingBox();
  expect(controls && table && controls.y + controls.height <= table.y).toBeTruthy();
  await page.getByRole("button", { name: "Quick Capture" }).click();
  const quick = page.locator('[data-pd-id="sportsbook.quick-capture.dialog"]');
  await expect(quick).toBeVisible();
  await quick.getByLabel("Offer Name").fill("Demo Campaign");
  await quick.getByLabel("Event Name").fill("Demo Fixture");
  await expect(quick.getByRole("button", { name: "Save" })).toHaveCount(0);
  await quick.getByRole("button", { name: "Open full workbench" }).click();
  const full = page.locator('[data-pd-id="sportsbook.editor.dialog"]');
  await expect(full).toBeVisible();
  await expect(full.getByLabel("Event name", { exact: true })).toHaveValue("Demo Fixture");
  await expect(full.getByLabel("Campaign tag (optional)")).toHaveValue("Demo Campaign");
});

test("native Sportsbook keeps governed row commands behind a compact action surface", async ({ page }) => {
  await page.goto(ledger);
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
  const row = page.locator('tr:has(td[data-ledger-row="CP117-CELL-001"])');
  await expect(row).toBeVisible();
  expect(await row.locator("td").last().evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
  await expect(row.locator("td").last().getByRole("button")).toHaveCount(2);
  await row.getByRole("button", { name: "More actions for CP117-CELL-001" }).click();
  const menu = page.getByRole("dialog", { name: "Actions for CP117-CELL-001" });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("button", { name: "Update outcome" })).toBeVisible();
  await expect(menu.getByRole("button", { name: "Copy to Profiles" })).toBeVisible();
  await expect(menu.getByRole("button", { name: "Delete sportsbook row" })).toBeVisible();
  await menu.getByRole("button", { name: "Close sportsbook actions" }).click();
  await expect(menu).toHaveCount(0);
  await row.getByRole("button", { name: "Open CP117-CELL-001" }).click();
  await expect(page.getByRole("dialog", { name: "Edit sportsbook row" })).toBeVisible();
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
    const dialog = page.getByRole("dialog", { name: /Actions for/ });
    await expect(dialog.getByRole("button", { name: item.secondary })).toBeVisible();
    if (item.module === "free-bets" || item.module === "casino-offers") {
      await dialog.getByRole("button", { name: item.secondary }).click();
      await expect(page.getByRole("dialog", { name: item.module === "free-bets" ? "Update free-bet outcome" : "Update casino outcome" })).toBeVisible();
      return;
    }
    if (item.module === "each-way-extra-places") {
      await dialog.getByRole("button", { name: item.secondary }).click();
      await expect(page.getByRole("dialog", { name: "Confirm Extra Place deletion" })).toBeVisible();
      return;
    }
    await dialog.getByRole("button", { name: "Close row actions" }).click();
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
    expect(after.profile_id).toBe(before.profile_id);
    for (const key of item.money) expect(after[key], `${item.module}.${key}`).toEqual(before[key]);
    await page.reload();
    await expect(page.locator(`td[data-ledger-column="${item.column}"]`).first()).toContainText(next);
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
