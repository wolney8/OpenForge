import { expect, test, type Page } from "@playwright/test";

const baseURL = process.env.OPENFORGE_CP117_BASE_URL ?? "http://127.0.0.1:3127";
const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";
const legacy = process.env.OPENFORGE_CP117_VERIFY_LEGACY === "true";
const profile = "profile-demo-001";
const cases = [
  { module: "sportsbook-bets", id: "sportsbook", row: "CP117-CELL-001", idKey: "sportsbook_bet_id", column: "event_name", field: "event_name", label: "Event name", limit: 200, review: "displayed_value", dialog: "Edit sportsbook row", money: ["status", "result", "back_stake", "back_odds", "lay_odds_1", "lay_actual", "lay_matched_stake_1", "lay_commission_1", "projected_current_pnl", "final_net_pnl", "manual_override_value"] },
  { module: "free-bets", id: "free-bets", row: "CP117-FB-001", idKey: "free_bet_id", column: "event_name", field: "event_name", label: "Event name", limit: 200, review: "status", dialog: "Edit free-bet row", money: ["status", "result", "retention_mode", "free_bet_value", "back_odds", "lay_odds_1", "lay_actual", "lay_commission_1", "final_net_pnl", "manual_override_value"] },
  { module: "casino-offers", id: "casino-offers", row: "CP117-CAS-001", idKey: "casino_offer_id", column: "game", field: "game", label: "Game", limit: 200, review: "status", dialog: "Edit casino row", money: ["status", "result", "offer_type", "cash_stake", "free_spins_value", "own_cash_committed", "cash_returned", "final_net_pnl", "expected_reward_cash_value", "required_spins", "date_settling"] },
  { module: "each-way-extra-places", id: "extra-place", row: "CP117-EP-001", idKey: "each_way_extra_place_id", column: "runner", field: "runner", label: "Runner", limit: 240, review: "stake", dialog: "Edit Extra Place row", money: ["status", "result", "each_way_stake", "back_odds", "win_lay_odds", "place_lay_odds", "actual_win_lay_stake", "actual_place_lay_stake", "qualifying_loss", "current_value", "final_value", "win_liability", "place_liability", "bookmaker_account", "win_exchange", "place_exchange"] },
  { module: "cash-adjustments", id: "cash-adjustments", row: "CA-SEED-001", idKey: "cash_adjustment_id", column: "description", field: "description", label: "Description", limit: 2000, review: "amount", dialog: "Edit cash adjustment", money: ["adjustment_date", "amount", "direction", "adjustment_type", "affects_investment", "affects_cash_snapshot", "linked_account", "signed_amount"] },
] as const;
type Case = typeof cases[number];

async function ready(page: Page, module: string) {
  await page.goto(`${baseURL}/profiles/${profile}/tracker/${module}`);
  await expect(page.locator("section.content-panel[aria-busy=true]")).toHaveCount(0);
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
  if (module !== "accounts") {
    if (!legacy) {
      await expect(page.locator('[data-pd-id$=".design-screen"]')).toBeVisible();
      const range = page.locator('[data-pd-id="tracker.range-card.select"]');
      await expect(range).toBeVisible();
      if (!await range.getByText("All Dates", { exact: true }).count()) {
        await range.click();
        await page.getByRole("option", { name: "All Dates", exact: true }).click();
      }
      await expect(range).toContainText("All Dates");
    } else {
      if (module !== "each-way-extra-places") await expect(page.locator("section.content-panel[aria-busy=false]").first()).toBeVisible();
      const range = page.getByRole("combobox", { name: "Change tracker date range" });
      await expect(range).toBeVisible();
      await expect(range).toHaveValue("All Dates");
      await expect(range).toBeEnabled();
    }
  }
}
async function read(page: Page, item: Case) {
  const response = await page.request.get(`/api/profiles/${profile}/${item.module}`);
  expect(response.status()).toBe(200);
  const record = (await response.json()).find((row: Record<string, unknown>) => row[item.idKey] === item.row);
  expect(record).toBeTruthy(); return record as Record<string, unknown>;
}
function cell(page: Page, item: Case, column: string = item.column) { return page.locator(`td[data-ledger-row="${item.row}"][data-ledger-column="${column}"]`); }
const floating = (page: Page) => page.locator('[data-pd-id="ledger.floating-editor"]');

// No owner-token fixture or authentication bypass. The endpoint is a generated
// synthetic identity backed by the runner's isolated database and independent key.
test.beforeEach(async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated"); expect(health.database_identity).toBe("cp117-integration-synthetic");
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(authURL);
  const session = await (await page.request.get("/api/auth/session")).json();
  expect(session.authenticated).toBe(true); expect(session.email).toBe("demo@example.invalid");
  // Fixture scope is set through the existing preference authority before loading
  // the table; an initial settings fetch cannot race a synthetic range selection.
  const rangeSetup = await page.request.put("/api/fund-manager/preferences/selected-range", { data: {
    selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null,
  } });
  expect(rangeSetup.status()).toBe(200);
});

for (const item of cases) {
  test(`${item.module}: floating Save, authoritative invalid-input error, retry and specialist handoff`, async ({ page }) => {
    test.skip(legacy);
    await ready(page, item.module);
    const before = await read(page, item);
    const target = cell(page, item);
    await target.click(); await page.keyboard.press("F2");
    const editor = floating(page); await expect(editor).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    if (item.module === "cash-adjustments") await editor.getByRole("button", { name: "Edit cash-adjustment row", exact: true }).click();
    const input = editor.getByRole("textbox", { name: item.label, exact: true });
    await expect(input).toHaveValue(String(before[item.field] ?? ""));
    const originalGeometry = await target.boundingBox();
    const value = `Synthetic ${item.label} Reviewed ${Date.now()}`;
    await input.fill(value);
    await editor.getByRole("button", { name: "Save", exact: true }).click();
    await expect(editor).toHaveCount(0);
    const after = await read(page, item);
    expect(after[item.field]).toBe(value);
    for (const key of ["profile_id", item.idKey, ...item.money]) {
      expect(Object.hasOwn(before, key), `fixture response contains ${key}`).toBe(true);
      // Native full-form authorities normalize timestamp serialization, retaining
      // the same calendar/time value. No monetary/result assertion is relaxed.
      const normalized = (value: unknown) => typeof value === "string" && /^(adjustment_date|date_settling)$/.test(key)
        ? value.replace(" ", "T").replace(/:00Z$/, "").replace(/Z$/, "") : value;
      expect(normalized(after[key]), key).toEqual(normalized(before[key]));
    }
    await page.reload(); await ready(page, item.module);
    await target.dblclick(); await expect(input).toHaveValue(value);
    if (item.module === "cash-adjustments") await editor.getByRole("button", { name: "Edit cash-adjustment row", exact: true }).click();
    const geometry = await target.boundingBox(); expect(Math.abs(geometry!.height - originalGeometry!.height)).toBeLessThanOrEqual(1);
    // Real Pydantic field limits: invalid text is rejected by the existing Save API.
    await input.fill("X".repeat(item.limit + 1));
    await editor.getByRole("button", { name: "Save", exact: true }).click();
    await expect(editor.getByRole("alert")).toContainText(/characters|length|at most|less than/i);
    await expect(input).toHaveValue("X".repeat(item.limit + 1));
    expect((await read(page, item))[item.field]).toBe(value);
    await page.keyboard.press("Escape"); await expect(editor).toHaveCount(0); await expect(target).toBeFocused();
    await page.keyboard.press("Enter");
    if (item.module === "cash-adjustments") await editor.getByRole("button", { name: "Edit cash-adjustment row", exact: true }).click();
    await input.fill(`${value} Retry`);
    let rejected = false;
    await page.route(`**/api/profiles/${profile}/${item.module}/${item.row}`, async route => {
      if (route.request().method() === "PUT" && !rejected) { rejected = true; await route.fulfill({ status: 503, json: { detail: "Synthetic rejection: retry this field" } }); }
      else await route.continue();
    });
    await editor.getByRole("button", { name: "Save", exact: true }).click();
    await expect(editor.getByRole("alert")).toContainText("Synthetic rejection"); await expect(input).toHaveValue(`${value} Retry`);
    await editor.getByRole("button", { name: "Save", exact: true }).click(); await expect(editor).toHaveCount(0);
    expect((await read(page, item))[item.field]).toBe(`${value} Retry`);
    const foreignWrite = await page.request.put(`/api/profiles/profile-demo-002/${item.module}/${item.row}`, { data: await read(page, item) });
    expect([403, 404]).toContain(foreignWrite.status());
    const foreign = await page.request.get(`/api/profiles/profile-demo-002/${item.module}`);
    expect(foreign.status()).toBe(200); expect((await foreign.json()).some((row: Record<string, unknown>) => row[item.idKey] === item.row)).toBe(false);
    await cell(page, item, item.review).click(); await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: item.dialog, exact: true })).toBeVisible();
    await expect(floating(page)).toHaveCount(0); await page.keyboard.press("Escape");
  });
}

test("Accounts: bounded access-channel floating control, rejected draft and reload preserve money/identity", async ({ page }) => {
  test.skip(legacy); await ready(page, "accounts");
  const readAccount = async () => (await (await page.request.get(`/api/profiles/${profile}/accounts`)).json()).find((row: { account_id: string }) => row.account_id === "ACC-BOOK-A");
  const before = await readAccount();
  const channel = ["Mobile", "Retail", "Unknown", "Online"].find(value => !before.access_channels.includes(value)) ?? "Mobile";
  const adding = !before.access_channels.includes(channel);
  const target = page.locator('td[data-ledger-row="ACC-BOOK-A"][data-ledger-column="channel"]');
  await target.click(); await page.keyboard.press("Enter");
  const editor = floating(page); await expect(editor).toBeVisible();
  const combo = editor.getByRole("combobox", { name: "Access channels", exact: true });
  await expect(combo).toHaveAttribute("aria-expanded", "false");
  await combo.fill("not-an-authorised-channel"); await expect(editor).toContainText("No matches");
  await page.keyboard.press("Escape"); await expect(combo).toHaveAttribute("aria-expanded", "false"); await expect(editor).toBeVisible();
  await editor.getByRole("button", { name: "Show all access channels options", exact: true }).click();
  await editor.getByRole("option", { name: channel, exact: true }).click(); await expect(combo).toHaveAttribute("aria-expanded", "false");
  let rejected = false;
  await page.route(`**/api/profiles/${profile}/accounts/ACC-BOOK-A`, async route => {
    if (route.request().method() === "PUT" && !rejected) { rejected = true; await route.fulfill({ status: 409, json: { detail: "Synthetic invalid/stale access change. Retry." } }); }
    else await route.continue();
  });
  await editor.getByRole("button", { name: "Save", exact: true }).click(); await expect(editor.getByRole("alert")).toContainText("Synthetic invalid/stale");
  await expect(editor.getByRole("button", { name: `Remove ${channel}`, exact: true })).toHaveCount(adding ? 1 : 0);
  await editor.getByRole("button", { name: "Save", exact: true }).click(); await expect(editor).toHaveCount(0);
  const after = await readAccount(); expect(after.access_channels.includes(channel)).toBe(adding);
  for (const key of ["profile_id", "account_id", "catalogue_id", "account", "type", "status", "current_balance", "pending_withdrawal_amount", "counts_in_cash_total"]) expect(after[key], key).toEqual(before[key]);
  await page.reload(); await ready(page, "accounts"); await target.dblclick(); await expect(editor.getByRole("button", { name: `Remove ${channel}`, exact: true })).toHaveCount(adding ? 1 : 0);
  await page.keyboard.press("Escape");
  await page.locator('td[data-ledger-row="ACC-BOOK-A"][data-ledger-column="current_balance"]').click(); await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Edit account", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
});

test("pending floating Save rejects duplicate submissions, Escape and competing actions", async ({ page }) => {
  test.skip(legacy); const item = cases[0]; await ready(page, item.module); await cell(page, item).dblclick();
  const editor = floating(page); const input = editor.getByRole("textbox", { name: "Event name", exact: true }); await input.fill("Synthetic held edit");
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; }); let writes = 0;
  await page.route(`**/api/profiles/${profile}/${item.module}/${item.row}`, async route => { if (route.request().method() === "PUT") { writes += 1; await gate; } await route.continue(); });
  await editor.getByRole("button", { name: "Save", exact: true }).click(); await expect(input).toBeDisabled();
  await page.keyboard.press("Enter"); await page.keyboard.press("Escape"); await expect(editor).toBeVisible();
  await expect(editor.getByRole("button", { name: "Open full editor", exact: true })).toBeDisabled(); expect(writes).toBe(1);
  release(); await expect(editor).toHaveCount(0); expect((await read(page, item)).event_name).toBe("Synthetic held edit");
});

test("floating Tab, click-away rejection and full-editor transition retain one native draft", async ({ page }) => {
  test.skip(legacy); const item = cases[0]; await ready(page, item.module); const target = cell(page, item); await target.dblclick();
  const editor = floating(page); const input = editor.getByRole("textbox", { name: "Event name", exact: true });
  await input.fill("Synthetic handoff draft"); await editor.getByRole("button", { name: "Open full editor", exact: true }).click();
  const full = page.getByRole("dialog", { name: "Edit sportsbook row", exact: true });
  await expect(full.getByRole("textbox", { name: "Event name", exact: true })).toHaveValue("Synthetic handoff draft");
  await full.getByRole("button", { name: "Save", exact: true }).click(); await expect(full).toHaveCount(0);
  await target.dblclick(); await input.fill("Synthetic Tab saved"); await page.keyboard.press("Tab"); await expect(editor).toHaveCount(0);
  await expect(target).not.toBeFocused(); expect((await read(page, item)).event_name).toBe("Synthetic Tab saved");
  await target.dblclick(); await input.fill("X".repeat(201)); await page.getByRole("heading", { name: "Sportsbook Bets", exact: true, level: 1 }).click();
  await expect(editor).toBeVisible(); await expect(editor.getByRole("alert")).toContainText(/characters|length|at most|less than/i);
  await page.keyboard.press("Escape");
});

for (const theme of ["light", "dark"]) {
  test(`six-ledger ${theme} floating geometry, selection and specialist reachability at 390px`, async ({ page }) => {
    test.setTimeout(120_000);
    test.skip(legacy); await page.setViewportSize({ width: 390, height: 844 });
    for (const item of [...cases, {module: "accounts", row: "ACC-BOOK-A", column: "channel"}]) {
      await ready(page, item.module); await page.evaluate(theme => document.documentElement.setAttribute("data-theme", theme), theme);
      const target = page.locator(`td[data-ledger-row="${item.row}"][data-ledger-column="${item.column}"]`); await target.click(); await page.keyboard.press("F2"); const editor = floating(page); await expect(editor).toBeVisible();
      const box = await editor.boundingBox(); expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(await page.evaluate(() => Math.min(document.documentElement.clientWidth, document.body.clientWidth))); expect(box!.y).toBeGreaterThanOrEqual(0); expect(box!.y + box!.height).toBeLessThanOrEqual(845);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await expect(editor.getByRole("button", { name: "Save", exact: true })).toBeInViewport();
      const close = editor.locator(".modal-close-button");
      const closeGeometry = await close.boundingBox();
      const heading = await editor.locator(".workflow-panel-header strong").boundingBox();
      expect(Math.abs((heading!.y + heading!.height / 2) - (closeGeometry!.y + closeGeometry!.height / 2))).toBeLessThanOrEqual(1);
      if (item.module === "cash-adjustments") await editor.getByRole("button", {name:"Edit cash-adjustment row",exact:true}).click();
      await expect.poll(() => editor.getByRole("button",{name:"Save",exact:true}).evaluate(element => {
        const style = getComputedStyle(element);
        const luminance = (value: string) => {
          const channels = value.match(/[\d.]+/g)!.slice(0,3).map(Number).map(channel => { const v=channel/255; return v<=.04045 ? v/12.92 : ((v+.055)/1.055)**2.4; });
          return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
        };
        const a=luminance(style.color), b=luminance(style.backgroundColor);
        return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      })).toBeGreaterThanOrEqual(4.5);
      expect(closeGeometry!.width).toBeCloseTo(closeGeometry!.height, 0);
      expect(closeGeometry!.width).toBeGreaterThanOrEqual(24);
      for (const control of await editor.locator("input,textarea,select,button").all()) {
        if (!await control.isVisible()) continue;
        const bounds = await control.boundingBox();
        expect(bounds!.x).toBeGreaterThanOrEqual(box!.x);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(box!.x + box!.width + 1);
      }
      await page.keyboard.press("Escape"); await expect(target).toBeFocused();
    }
  });
}

test("all six ledgers reuse roving cell arrows, Home/End and explicit activation", async ({ page }) => {
  test.skip(legacy);
  for (const item of [...cases, {module: "accounts", row: "ACC-BOOK-A", column: "channel"}]) {
    await ready(page, item.module);
    const target = page.locator(`td[data-ledger-row="${item.row}"][data-ledger-column="${item.column}"]`);
    await target.click(); await expect(target).toBeFocused(); await expect(floating(page)).toHaveCount(0);
    await page.keyboard.press("ArrowRight"); await expect(target).not.toBeFocused();
    await page.keyboard.press("ArrowLeft"); await expect(target).toBeFocused();
    await page.keyboard.press("Home"); await page.keyboard.press("End");
    expect(await page.locator(`td[data-ledger-row="${item.row}"][data-ledger-selected=true]`).count()).toBe(1);
    await target.click(); await page.keyboard.press("Enter"); await expect(floating(page)).toBeVisible();
    await page.keyboard.press("Escape"); await expect(target).toBeFocused();
  }
});

test("settled rows and legacy Casino preparation preserve populated correction gates", async ({ page }) => {
  test.skip(legacy);
  for (const item of [
    { module: "sportsbook-bets", row: "SB-SEED-001", column: "event_name", dialog: "Edit sportsbook row", label: "Event name" },
    { module: "free-bets", row: "FB-SEED-001", column: "event_name", dialog: "Edit free-bet row", label: "Event name" },
    { module: "casino-offers", row: "CO-SEED-001", column: "game", dialog: "Edit casino row", label: "Game / slot" },
  ]) {
    await ready(page, item.module);
    await page.locator(`td[data-ledger-row="${item.row}"][data-ledger-column="${item.column}"]`).dblclick();
    await expect(floating(page)).toHaveCount(0);
    const dialog = page.getByRole("dialog", { name: item.dialog, exact: true }); await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("textbox", {name:item.label,exact:true})).toBeDisabled();
    await page.keyboard.press("Escape");
  }
  const item = cases[4]; await ready(page,item.module); await cell(page,item).dblclick();
  const editor = floating(page); await expect(editor.getByRole("textbox",{name:"Description",exact:true})).toBeDisabled();
  await expect(editor.getByRole("button",{name:"Save",exact:true})).toBeDisabled();
  await editor.getByRole("button",{name:"Edit cash-adjustment row",exact:true}).click();
  await expect(editor.getByRole("textbox",{name:"Description",exact:true})).toBeEnabled();
  await page.keyboard.press("Escape");
});

test("integrated shell reaches Calculators, Oddsmatcher and Reports without provider activity", async ({ page }) => {
  test.skip(legacy); await ready(page, "sportsbook-bets");
  let providerCalls = 0;
  page.on("request", request => { if (/api\.the-odds-api\.com/.test(request.url())) providerCalls += 1; });
  for (const tool of ["calculators", "oddsmatcher"]) {
    await page.locator('[data-pd-id="ux-v2.launcher.trigger"]').click(); await page.locator(`[data-pd-id="ux-v2.launcher.${tool}"]`).click();
    await expect(page.locator('[data-pd-id="ux-v2.sidebar"]')).toBeVisible();
    await expect(page).toHaveURL(tool === "calculators" ? /calculators/ : /oddsmatcher/);
  }
  await page.locator('[data-pd-id="ux-v2.nav.reports"]').click(); await expect(page).toHaveURL(/\/reports$/);
  await expect(page.locator('[data-pd-id="ux-v2.sidebar"]')).toBeVisible();
  expect(providerCalls).toBe(0);
});

test("flag OFF: all six ledgers preserve native editor activation and no floating adapter", async ({ page }) => {
  test.skip(!legacy);
  for (const item of cases) {
    await ready(page, item.module);
    const search = page.locator(`[data-pd-id="${item.id}.toolbar.search"]`);
    await expect(search).toBeVisible();
    await expect(search.locator(".material-symbols-outlined")).toBeHidden();
    await cell(page, item).click(); await expect(page.getByRole("dialog", { name: item.dialog, exact: true })).toBeVisible(); await expect(floating(page)).toHaveCount(0); await page.keyboard.press("Escape");
  }
  await ready(page, "accounts");
  await expect(page.locator('[data-pd-id="accounts.toolbar.search"] .material-symbols-outlined')).toBeHidden();
  await page.locator('td[data-ledger-row="ACC-BOOK-A"][data-ledger-column="channel"]').click(); await expect(page.getByRole("dialog", { name: "Edit account", exact: true })).toBeVisible(); await expect(floating(page)).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.goto("/notifications");
  await expect(page.locator('[data-pd-id="notifications.history"]')).toBeVisible();
  await expect(page.locator('[data-pd-id^="notifications.history.tab."]')).toHaveCount(0);
  await expect(page.locator(".hero-panel").getByRole("heading", { name: "Notifications" })).toBeVisible();
  await page.locator('[data-pd-id="notifications.trigger"]').click();
  await expect(page.locator('[data-pd-id="notifications.panel"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="notifications.v2.dropdown"]')).toHaveCount(0);
});
