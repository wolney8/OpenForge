import { expect, test } from "@playwright/test";

test("isolated native PUT accepts a source record with one allowlisted scalar change", async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  expect(health.database_identity).toBe("cp117-integration-synthetic");
  await page.goto(process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/");
  for (const item of [
    { module: "sportsbook-bets", id: "CP117-CELL-001", field: "event_name" },
    { module: "sportsbook-bets", id: "CP117-CELL-001", field: "offer_name" },
    { module: "free-bets", id: "CP117-FB-001", field: "event_name" },
    { module: "free-bets", id: "CP117-FB-001", field: "offer_name" },
    { module: "casino-offers", id: "CP117-CAS-001", field: "offer_name" },
    { module: "casino-offers", id: "CP117-CAS-001", field: "game" },
    { module: "each-way-extra-places", id: "CP117-EP-001", field: "runner" },
    { module: "each-way-extra-places", id: "CP117-EP-001", field: "race" },
    { module: "cash-adjustments", id: "CA-SEED-001", field: "description" },
  ]) {
    const url = `/api/profiles/profile-demo-001/${item.module}/${item.id}`;
    const response = await page.request.get(url);
    expect(response.status(), item.module).toBe(200);
    const original = await response.json() as Record<string, unknown>;
    const prior = String(original[item.field] ?? "");
    const next = prior.endsWith(" · probe") ? prior.slice(0, -8) : `${prior} · probe`;
    const headers = item.module === "cash-adjustments" ? { "Idempotency-Key": crypto.randomUUID() } : undefined;
    const saved = await page.request.put(url, { data: { ...original, [item.field]: next }, headers });
    expect(saved.status(), `${item.module}: ${await saved.text()}`).toBe(200);
    const after = await (await page.request.get(url)).json() as Record<string, unknown>;
    expect(after[item.field], item.module).toBe(next);
    for (const [key, value] of Object.entries(original)) {
      if (key !== item.field && !(key.endsWith("updated_at") || key.endsWith("_version"))) expect(after[key], `${item.module}.${key}`).toEqual(value);
    }
    const restored = await page.request.put(url, { data: { ...after, [item.field]: prior }, headers: item.module === "cash-adjustments" ? { "Idempotency-Key": crypto.randomUUID() } : undefined });
    expect(restored.status(), `${item.module}: restore probe value`).toBe(200);
    expect((await (await page.request.get(url)).json() as Record<string, unknown>)[item.field]).toBe(prior);
  }
});

test("combined resolved Cash Description retains the native explicit Edit gate", async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  await page.goto(process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/");
  expect((await page.request.put("/api/fund-manager/preferences/selected-range", { data: {
    selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null,
  } })).status()).toBe(200);
  await page.goto("/tracker/cash-adjustments?q=CA-SEED-001");
  const cell = page.locator('td[data-ledger-column="description"]').first();
  await expect(cell).toBeVisible();
  await cell.dblclick();
  await expect(page.locator('[data-pd-id="combined.cash-adjustments.cell-editor.description"]')).toHaveCount(0);
  const native = page.getByRole("dialog", { name: "Edit cash adjustment" });
  await expect(native).toBeVisible();
  await expect(native.getByRole("button", { name: "Edit cash-adjustment row" })).toBeVisible();
});

test("a persisted synthetic Cash row remains resolved and uses the governed combined Edit handoff", async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  expect(health.database_identity).toBe("cp117-integration-synthetic");
  await page.goto(process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/");
  const seed = await (await page.request.get("/api/profiles/profile-demo-001/cash-adjustments/CA-SEED-001")).json() as Record<string, unknown>;
  const id = `CP117-CASH-PERSIST-${crypto.randomUUID()}`;
  const payload = {
    cash_adjustment_id: id,
    adjustment_date: seed.adjustment_date,
    direction: seed.direction,
    amount: seed.amount,
    adjustment_type: seed.adjustment_type,
    affects_investment: seed.affects_investment,
    affects_cash_snapshot: seed.affects_cash_snapshot,
    linked_account: seed.linked_account,
    description: "Synthetic persisted Cash gate probe",
  };
  const created = await page.request.post("/api/profiles/profile-demo-001/cash-adjustments", { data: payload, headers: { "Idempotency-Key": crypto.randomUUID() } });
  expect(created.status(), await created.text()).toBe(201);
  expect((await created.json()).calculation_state).toBe("resolved");
  const invalid = await page.request.post("/api/profiles/profile-demo-001/cash-adjustments", { data: { ...payload, cash_adjustment_id: `${id}-INVALID`, amount: "" } });
  expect(invalid.status()).toBe(422);
  expect((await (await page.request.get(`/api/profiles/profile-demo-001/cash-adjustments/${id}`)).json()).calculation_state).toBe("resolved");
  expect((await page.request.put("/api/fund-manager/preferences/selected-range", { data: {
    selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null,
  } })).status()).toBe(200);
  await page.goto(`/tracker/cash-adjustments?q=${id}`);
  const cell = page.locator('td[data-ledger-column="description"]').first();
  await expect(cell).toContainText(payload.description);
  await cell.dblclick();
  await expect(page.locator('[data-pd-id="combined.cash-adjustments.cell-editor.description"]')).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "Edit cash adjustment" })).toBeVisible();
});

test("eligible combined Cash Description retries with one audited operation identity", async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  await page.goto(process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/");
  expect((await page.request.put("/api/fund-manager/preferences/selected-range", { data: {
    selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null,
  } })).status()).toBe(200);
  const endpoint = "/api/profiles/profile-demo-001/cash-adjustments/CA-SEED-001";
  const original = await (await page.request.get(endpoint)).json() as Record<string, unknown>;
  const eligible = { ...original, calculation_state: "incomplete" };
  const keys: string[] = [];
  const next = "Synthetic eligible description edit";
  await page.route(/\/profiles\/profile-demo-001\/cash-adjustments$/, route => route.fulfill({ status: 200, json: [eligible] }));
  await page.route(`**${endpoint}`, route => {
    if (route.request().method() === "GET") return route.fulfill({ status: 200, json: eligible });
    keys.push(route.request().headers()["idempotency-key"] ?? "");
    return route.fulfill(keys.length === 1 ? { status: 503, json: { detail: "Synthetic retry required" } } : {
      status: 200, json: { ...eligible, description: next },
    });
  });
  await page.goto("/tracker/cash-adjustments?q=CA-SEED-001");
  const cell = page.locator('td[data-ledger-column="description"]').first();
  await expect(cell).toBeVisible();
  await cell.dblclick();
  const input = page.locator('[data-pd-id="combined.cash-adjustments.cell-editor.description"]');
  await input.fill(next);
  await input.press("Enter");
  await expect(page.locator('[data-pd-id="ledger.floating-editor"] [role="alert"]')).toContainText("Synthetic retry required");
  await expect(input).toHaveValue(next);
  await input.press("Enter");
  await expect(input).toHaveCount(0);
  expect(keys).toHaveLength(2);
  expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/i);
  expect(keys[1]).toBe(keys[0]);
  await expect(cell).toContainText(next);
});

test("combined scalar keyboard, click-away and pending Save preserve acknowledged focus and source identity", async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  await page.goto(process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/");
  expect((await page.request.put("/api/fund-manager/preferences/selected-range", { data: {
    selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null,
  } })).status()).toBe(200);
  const endpoint = "/api/profiles/profile-demo-001/sportsbook-bets/CP117-CELL-001";
  const original = await (await page.request.get(endpoint)).json() as Record<string, unknown>;
  await page.goto("/tracker/sportsbook-bets?q=CP117-CELL-001");
  const cell = page.locator('td[data-ledger-column="event_name"]').first();
  const input = page.locator('[data-pd-id="combined.sportsbook-bets.cell-editor.event_name"]');
  await cell.click();
  await expect(cell).toHaveAttribute("data-ledger-selected", "true");
  await cell.press("F2");
  await expect(input).toHaveValue(String(original.event_name ?? ""));
  await input.fill("Cancelled synthetic draft");
  await input.press("Escape");
  await expect(input).toHaveCount(0);
  await expect(cell).toContainText(String(original.event_name ?? ""));

  const tabValue = "Synthetic Tab commit";
  await cell.dblclick();
  await input.fill(tabValue);
  await input.press("Tab");
  await expect(input).toHaveCount(0);
  await expect(cell).toContainText(tabValue);
  expect((await (await page.request.get(endpoint)).json()).event_name).toBe(tabValue);

  const reverseTabValue = "Synthetic Shift Tab commit";
  await cell.dblclick();
  await input.fill(reverseTabValue);
  await input.press("Shift+Tab");
  await expect(input).toHaveCount(0);
  expect((await (await page.request.get(endpoint)).json()).event_name).toBe(reverseTabValue);

  const outsideValue = "Synthetic click-away commit";
  await cell.dblclick();
  await input.fill(outsideValue);
  await page.locator('[data-pd-id="combined.sportsbook-bets.design-screen"] h2').click();
  await expect(input).toHaveCount(0);
  expect((await (await page.request.get(endpoint)).json()).event_name).toBe(outsideValue);

  const finalValue = "Synthetic pending one-write commit";
  let writes = 0;
  await page.route(`**${endpoint}`, async route => {
    if (route.request().method() !== "PUT") { await route.continue(); return; }
    writes += 1;
    await new Promise(resolve => setTimeout(resolve, 300));
    await route.continue();
  });
  await cell.dblclick();
  await input.fill(finalValue);
  await input.press("Enter");
  await page.keyboard.press("Enter");
  await expect(input).toHaveCount(0);
  expect(writes).toBe(1);
  const after = await (await page.request.get(endpoint)).json() as Record<string, unknown>;
  expect(after.event_name).toBe(finalValue);
  expect(after.profile_id).toBe(original.profile_id);
  for (const key of ["back_stake", "back_odds", "lay_actual", "status", "result", "date_settled"]) expect(after[key], key).toEqual(original[key]);
  await page.unroute(`**${endpoint}`);
  expect((await page.request.put(endpoint, { data: { ...after, event_name: original.event_name } })).status()).toBe(200);
});
