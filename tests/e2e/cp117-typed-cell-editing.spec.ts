import { chromium, expect, test, type Page } from "@playwright/test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";
const profileId = "profile-demo-001";
const modulePath = "each-way-extra-places";

async function seedDraft(page: Page, placedAt = "2026-08-24T12:00", ownerProfileId = profileId) {
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(authURL);
  const id = `CP117-TYPED-${Date.now()}`;
  const response = await page.request.post(`/api/profiles/${ownerProfileId}/${modulePath}`, { data: {
    each_way_extra_place_id: id, placed_at: placedAt, runner: "Typed synthetic runner",
    race: "Synthetic 14:30", bookmaker: "Bookmaker A", bookmaker_account: "Bookmaker A",
    mode: "Extra Place", each_way_stake: "10.00", back_odds: "6.00",
    place_term_numerator: "1", place_term_denominator: "5", bookmaker_places: "5", exchange_places: "4",
    win_exchange: "Exchange A", win_lay_odds: "2.30", place_exchange: "Exchange A", place_lay_odds: "4.50",
    status: "Prospecting", result: "Pending",
  } });
  expect(response.status(), await response.text()).toBe(201);
  return { id, initial: await response.json() as Record<string, unknown> };
}

test("eligible Extra Place date uses a datetime picker and persists in native and combined grids", async ({ page }) => {
  const { id, initial } = await seedDraft(page);
  await page.goto(`/profiles/${profileId}/tracker/${modulePath}?q=${id}`);
  const native = page.locator(`[data-pd-id="extra-place.table-scroll"] td[data-ledger-row="${id}"][data-ledger-column="date"]`);
  await expect(native).toBeVisible();
  await native.dblclick();
  const picker = page.locator('[data-pd-id="extra-place.cell-editor.date"]');
  await expect(picker).toHaveAttribute("type", "datetime-local");
  await picker.fill("2026-08-25T13:15");
  await picker.press("Enter");
  await expect(page.locator('[data-pd-id="ledger.floating-editor"]')).toHaveCount(0);
  await page.goto(`/tracker/${modulePath}?q=${id}`);
  const combined = page.locator(`[data-pd-id="combined.${modulePath}.table-scroll"] td[data-ledger-row="${profileId}::${id}"][data-ledger-column="date"]`);
  await expect(combined).toBeVisible();
  await combined.dblclick();
  const combinedPicker = page.locator(`[data-pd-id="combined.${modulePath}.cell-editor.date"]`);
  await expect(combinedPicker).toHaveAttribute("type", "datetime-local");
  await combinedPicker.fill("2026-08-26T14:30");
  await combinedPicker.press("Enter");
  await expect(page.locator('[data-pd-id="ledger.floating-editor"]')).toHaveCount(0);
  const saved = await (await page.request.get(`/api/profiles/${profileId}/${modulePath}/${id}`)).json() as Record<string, unknown>;
  expect(String(saved.placed_at)).toContain("2026-08-26T14:30");
  for (const key of ["runner", "race", "status", "result", "each_way_stake", "back_odds"]) expect(saved[key]).toEqual(initial[key]);
});

test("eligible Extra Place stake uses its validated numeric control and rejects invalid input", async ({ page }) => {
  const { id } = await seedDraft(page);
  await page.goto(`/tracker/${modulePath}?q=${id}`);
  const cell = page.locator(`[data-pd-id="combined.${modulePath}.table-scroll"] td[data-ledger-row="${profileId}::${id}"][data-ledger-column="stake"]`);
  await expect(cell).toBeVisible();
  await cell.dblclick();
  const field = page.locator(`[data-pd-id="combined.${modulePath}.cell-editor.stake"]`);
  await expect(field).toHaveAttribute("inputmode", "decimal");
  await field.fill("invalid");
  await field.press("Enter");
  await expect(page.locator('[data-pd-id="ledger.floating-editor"]')).toBeVisible();
  await field.fill("12.50");
  await field.press("Enter");
  await expect(page.locator('[data-pd-id="ledger.floating-editor"]')).toHaveCount(0);
  await page.reload();
  const saved = await (await page.request.get(`/api/profiles/${profileId}/${modulePath}/${id}`)).json() as Record<string, unknown>;
  expect(saved.each_way_stake).toBe("12.50");
});

test("typed stake retains a failed draft, retries once and rejects a stale write", async ({ page }) => {
  const { id } = await seedDraft(page);
  const endpoint = `/api/profiles/${profileId}/${modulePath}/${id}`;
  await page.goto(`/tracker/${modulePath}?q=${id}`);
  const cell = page.locator(`[data-pd-id="combined.${modulePath}.table-scroll"] td[data-ledger-row="${profileId}::${id}"][data-ledger-column="stake"]`);
  await expect(cell).toBeVisible();
  await cell.dblclick();
  const field = page.locator(`[data-pd-id="combined.${modulePath}.cell-editor.stake"]`);
  let rejectOnce = true;
  await page.route(`**/profiles/${profileId}/${modulePath}/${id}`, async route => {
    if (route.request().method() === "PUT" && rejectOnce) { rejectOnce = false; await route.fulfill({ status: 503, json: { detail: "Synthetic rejected Save" } }); }
    else await route.continue();
  });
  await field.fill("11.25");
  await field.press("Enter");
  await expect(page.locator('[data-pd-id="ledger.floating-editor"]')).toBeVisible();
  await expect(field).toHaveValue("11.25");
  await expect(page.locator('[data-pd-id="ledger.floating-editor"] [role="alert"]')).toContainText("Synthetic rejected Save");
  await field.press("Enter");
  await expect(page.locator('[data-pd-id="ledger.floating-editor"]')).toHaveCount(0);
  await page.unroute(`**/profiles/${profileId}/${modulePath}/${id}`);
  expect((await (await page.request.get(endpoint)).json()).each_way_stake).toBe("11.25");
  await cell.dblclick();
  const current = await (await page.request.get(endpoint)).json() as Record<string, unknown>;
  const other = await page.request.put(endpoint, { data: { ...current, each_way_stake: "13.00" } });
  expect(other.status(), await other.text()).toBe(200);
  await field.fill("14.00");
  await field.press("Enter");
  await expect(page.locator('[data-pd-id="ledger.floating-editor"] [role="alert"]')).toContainText("changed elsewhere");
  await expect(field).toHaveValue("14.00");
  expect((await (await page.request.get(endpoint)).json()).each_way_stake).toBe("13.00");
});

test("placed Extra Place stake explains its protected review path and foreign records stay inaccessible", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(authURL);
  await page.request.put("/api/fund-manager/preferences/selected-range", { data: { selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null } });
  await page.goto(`/tracker/${modulePath}?q=CP117-EP-001`);
  const cell = page.locator(`[data-pd-id="combined.${modulePath}.table-scroll"] td[data-ledger-row="${profileId}::CP117-EP-001"][data-ledger-column="stake"]`);
  await expect(cell).toBeVisible();
  await cell.dblclick();
  await expect(page.locator(`[data-pd-id="combined.${modulePath}.protected-cell"]`)).toContainText("review workflow");
  await expect(page.locator('[data-pd-id="ledger.floating-editor"]')).toHaveCount(0);
  expect((await page.request.get(`/api/profiles/profile-demo-002/${modulePath}/CP117-EP-001`)).status()).toBe(404);
});

test("eligible Extra Place bookmaker uses authorised account options and updates its coupled account", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(authURL);
  const label = `Synthetic Typed Choices ${Date.now()}`;
  const created = await page.request.post("/api/profiles/onboarding", { data: {
    accounts: [], display_name: label, profile_code: `TYPED-${Date.now()}`,
    enabled_modules: ["sportsbook-bets", "free-bets", "casino-offers", "cash-adjustments", "each-way-extra-places"],
    quick_actions: [], setup_path: "import", tracking_start_date: "2026-09-01",
    profile_relationship: "Personal", management_fee_percent: "0", investment_fee_percent: "0",
  } });
  expect(created.status(), await created.text()).toBe(201);
  const ownerProfileId = (await created.json()).profile.profile_id as string;
  try {
    for (const bookmaker of ["Bookmaker A", "Bookmaker B"]) {
      const account = await page.request.post(`/api/profiles/${ownerProfileId}/accounts`, { data: {
        account: bookmaker, type: "Bookie", status: "Active", lifecycle_status: "Active", channel: "Online",
        stake_access: "Normal", promo_access: "Full", restrictions: [], current_balance: "0.00", pending_withdrawal_amount: "0.00",
      } });
      expect(account.status(), await account.text()).toBe(201);
    }
    const { id } = await seedDraft(page, "2026-08-24T12:00", ownerProfileId);
    await page.goto(`/profiles/${ownerProfileId}/tracker/${modulePath}?q=${id}`);
    const native = page.locator(`[data-pd-id="extra-place.table-scroll"] td[data-ledger-row="${id}"][data-ledger-column="bookmaker"]`);
    await expect(native).toBeVisible();
    await native.dblclick();
    const choice = page.locator('[data-pd-id="extra-place.cell-editor.bookmaker"]');
    await expect(choice).toBeVisible();
    await choice.selectOption("Bookmaker B");
    await choice.press("Enter");
    await page.goto(`/tracker/${modulePath}?q=${id}`);
    const combined = page.locator(`[data-pd-id="combined.${modulePath}.table-scroll"] td[data-ledger-row="${ownerProfileId}::${id}"][data-ledger-column="bookmaker"]`);
    await expect(combined).toBeVisible();
    await combined.dblclick();
    const combinedChoice = page.locator(`[data-pd-id="combined.${modulePath}.cell-editor.bookmaker"]`);
    await expect(combinedChoice).toBeVisible();
    await combinedChoice.selectOption("Bookmaker A");
    await combinedChoice.press("Enter");
    await expect(page.locator('[data-pd-id="ledger.floating-editor"]')).toHaveCount(0);
    const saved = await (await page.request.get(`/api/profiles/${ownerProfileId}/${modulePath}/${id}`)).json() as Record<string, unknown>;
    expect(saved.bookmaker).toBe("Bookmaker A");
    expect(saved.bookmaker_account).toBe("Bookmaker A");
  } finally {
    const archived = await page.request.patch(`/api/profiles/${ownerProfileId}`, { data: { status: "Archived" } });
    expect(archived.status(), await archived.text()).toBe(200);
  }
});

for (const [module, nativePrefix, id] of [["free-bets", "free-bets", "CP117-FB-001"], ["casino-offers", "casino-offers", "CP117-CAS-001"]] as const) {
  test(`${module} expiry uses the native datetime Save in owned and combined cells`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
    await page.goto(authURL);
    const before = await (await page.request.get(`/api/profiles/${profileId}/${module}/${id}`)).json() as Record<string, unknown>;
    await page.request.put("/api/fund-manager/preferences/selected-range", { data: { selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null } });
    await page.goto(`/profiles/${profileId}/tracker/${module}`);
    const native = page.locator(`[data-pd-id="${nativePrefix}.table-scroll"] td[data-ledger-row="${id}"][data-ledger-column="expiry_datetime"]`);
    await expect(native).toBeVisible();
    await native.dblclick();
    const picker = page.locator(`[data-pd-id="${nativePrefix}.cell-editor.expiry_datetime"]`);
    await expect(picker).toHaveAttribute("type", "datetime-local");
    await picker.fill("2026-12-01T09:30");
    await picker.press("Enter");
    await expect(page.locator('[data-pd-id="ledger.floating-editor"]')).toHaveCount(0);
    await page.goto(`/tracker/${module}?q=${id}`);
    const combined = page.locator(`[data-pd-id="combined.${module}.table-scroll"] td[data-ledger-row="${profileId}::${id}"][data-ledger-column="expiry_datetime"]`);
    await expect(combined).toBeVisible();
    await combined.dblclick();
    const combinedPicker = page.locator(`[data-pd-id="combined.${module}.cell-editor.expiry_datetime"]`);
    await expect(combinedPicker).toHaveAttribute("type", "datetime-local");
    await combinedPicker.fill("2026-12-02T10:45");
    await combinedPicker.press("Enter");
    await expect(page.locator('[data-pd-id="ledger.floating-editor"]')).toHaveCount(0);
    const saved = await (await page.request.get(`/api/profiles/${profileId}/${module}/${id}`)).json() as Record<string, unknown>;
    expect(String(saved.expiry_datetime)).toContain("2026-12-02 10:45");
    for (const key of ["profile_id", "status", "result", "bookmaker", "offer_type", "offer_name", "event_name", "game", "free_bet_value", "back_odds", "cash_stake", "reward_type"]) if (key in before) expect(saved[key], key).toEqual(before[key]);
  });
}

test("typed date editor stays themed and contained beside the approved Lab at split and mobile widths", async ({ page }, info) => {
  test.setTimeout(90_000);
  const { id } = await seedDraft(page, "2026-11-07T14:30");
  await page.request.put("/api/fund-manager/preferences/selected-range", { data: { selected_range_preset: "This Year", selected_range_custom_start: null, selected_range_custom_end: null } });
  for (const [width, theme] of [[900, "dark"], [390, "light"], [390, "dark"]] as const) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/design-lab");
    await page.evaluate(value => { localStorage.setItem("openforge-theme", value); document.documentElement.dataset.theme = value; document.documentElement.style.colorScheme = value; }, theme);
    await page.locator('[data-pd-id="lab.nav.extraPlace"]').click();
    await page.getByRole("combobox", { name: /Selected Range/ }).click();
    await page.getByRole("option", { name: "This Year" }).click();
    await page.setViewportSize({ width, height: 900 });
    const labCell = page.locator('[data-lab-row-id] td[data-lab-column="0"]').first();
    await expect(labCell).toBeVisible();
    await labCell.dblclick();
    const labEditor = page.locator('[data-pd-id="lab.floating-cell-editor"]');
    await expect(labEditor).toBeVisible();
    const labSurface = await labEditor.evaluate(element => getComputedStyle(element).backgroundColor);
    await page.screenshot({ path: info.outputPath(`typed-date-lab-${width}-${theme}.png`) });
    await page.goto(`/profiles/${profileId}/tracker/${modulePath}?q=${id}`);
    await page.evaluate(value => { localStorage.setItem("openforge-theme", value); document.documentElement.dataset.theme = value; document.documentElement.style.colorScheme = value; }, theme);
    const cell = page.locator(`[data-pd-id="extra-place.table-scroll"] td[data-ledger-row="${id}"][data-ledger-column="date"]`);
    await expect(cell).toBeVisible();
    await cell.dblclick();
    const editor = page.locator('[data-pd-id="ledger.floating-editor"]');
    await expect(editor).toBeVisible();
    const actual = await editor.evaluate(element => ({ background: getComputedStyle(element).backgroundColor, bounds: element.getBoundingClientRect().toJSON(), inputType: element.querySelector("input")?.type }));
    expect(actual.background).toBe(labSurface);
    expect(actual.inputType).toBe("datetime-local");
    expect(actual.bounds.left).toBeGreaterThanOrEqual(0);
    expect(actual.bounds.right).toBeLessThanOrEqual(width + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath(`typed-date-native-${width}-${theme}.png`) });
    await page.goto(`/tracker/${modulePath}?q=${id}`);
    await page.evaluate(value => { localStorage.setItem("openforge-theme", value); document.documentElement.dataset.theme = value; document.documentElement.style.colorScheme = value; }, theme);
    const combinedCell = page.locator(`[data-pd-id="combined.${modulePath}.table-scroll"] td[data-ledger-row="${profileId}::${id}"][data-ledger-column="date"]`);
    await expect(combinedCell).toBeVisible();
    await combinedCell.dblclick();
    const combinedEditor = page.locator('[data-pd-id="ledger.floating-editor"]');
    await expect(combinedEditor).toBeVisible();
    const combinedSurface = await combinedEditor.evaluate(element => ({ background: getComputedStyle(element).backgroundColor, bounds: element.getBoundingClientRect().toJSON() }));
    expect(combinedSurface.background).toBe(labSurface);
    expect(combinedSurface.bounds.left).toBeGreaterThanOrEqual(0);
    expect(combinedSurface.bounds.right).toBeLessThanOrEqual(width + 1);
    await page.screenshot({ path: info.outputPath(`typed-date-combined-${width}-${theme}.png`) });
  }
});

test("actual Chromium 200% zoom keeps the typed date picker reachable", async ({}, info) => {
  const scratch = await mkdtemp(join(tmpdir(), "pd-typed-zoom-"));
  const extension = join(scratch, "extension"); await mkdir(extension);
  await writeFile(join(extension, "manifest.json"), JSON.stringify({ manifest_version: 3, name: "Temporary typed editor zoom check", version: "1.0", permissions: ["tabs"], background: { service_worker: "background.js" } }));
  await writeFile(join(extension, "background.js"), "chrome.runtime.onInstalled.addListener(() => {});");
  const context = await chromium.launchPersistentContext(join(scratch, "profile"), { baseURL: process.env.OPENFORGE_CP117_BASE_URL ?? "http://127.0.0.1:3127", channel: "chromium", headless: true, viewport: { width: 1440, height: 900 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try {
    await context.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
    const page = await context.newPage();
    const { id } = await seedDraft(page);
    await page.goto(`/profiles/${profileId}/tracker/${modulePath}?q=${id}`);
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    await worker.evaluate(async () => {
      const tabs = (globalThis as unknown as { chrome: { tabs: { query: (filter: { url: string }) => Promise<Array<{ id: number }>>; setZoom: (id: number, zoom: number) => Promise<void> } } }).chrome.tabs;
      const matches = await tabs.query({ url: "http://127.0.0.1:3127/*" });
      await tabs.setZoom(matches[0].id, 2);
    });
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(720);
    const cell = page.locator(`[data-pd-id="extra-place.table-scroll"] td[data-ledger-row="${id}"][data-ledger-column="date"]`);
    await cell.scrollIntoViewIfNeeded(); await cell.dblclick();
    await expect(page.locator('[data-pd-id="extra-place.cell-editor.date"]')).toHaveAttribute("type", "datetime-local");
    const editor = page.locator('[data-pd-id="ledger.floating-editor"]');
    const bounds = await editor.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(721);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(451);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath("typed-date-actual-200-percent.png") });
  } finally { await context.close(); await rm(scratch, { recursive: true, force: true }); }
});
