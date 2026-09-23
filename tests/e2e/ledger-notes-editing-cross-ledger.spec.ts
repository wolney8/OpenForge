import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";

test.use(process.env.OPENFORGE_E2E_COMPACT_DARK === "true"
  ? { colorScheme: "dark", viewport: { width: 760, height: 900 } }
  : { colorScheme: "light", viewport: { width: 1440, height: 1000 } });

const hostedOnly = () => test.skip(
  process.env.OPENFORGE_HOSTED_PREVIEW_GATE !== "true",
  "Explicit hosted Preview gate only",
);

test.beforeEach(async ({ page }) => {
  const baseURL = process.env.OPENFORGE_E2E_BASE_URL;
  const session = process.env.OPENFORGE_E2E_SESSION_TOKEN;
  const protection = process.env.OPENFORGE_E2E_VERCEL_COOKIE;
  if (!baseURL) return;
  const cookies = [
    ...(session ? [{ name: "pd_session", value: session, url: baseURL }] : []),
    ...(protection ? [{ name: "_vercel_jwt", value: protection, url: baseURL }] : []),
  ];
  if (cookies.length) await page.context().addCookies(cookies);
});

async function createProfile(request: APIRequestContext, ledger: string) {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const response = await request.post("/api/profiles/onboarding", { data: {
    accounts: [],
    display_name: `Synthetic CP034 ${ledger} notes ${suffix}`,
    enabled_modules: ["sportsbook-bets", "free-bets", "each-way-extra-places", "casino-offers", "cash-adjustments"],
    profile_code: `C34-${suffix}`.slice(0, 32),
    quick_actions: [],
    setup_path: "import",
    tracking_start_date: "2026-09-23",
  }});
  expect(response.status(), await response.text()).toBe(201);
  const id = ((await response.json()) as { profile: { profile_id: string } }).profile.profile_id;
  expect((await request.patch(`/api/profiles/${id}`, { data: { status: "Active" } })).ok()).toBeTruthy();
  return id;
}

async function addAccount(request: APIRequestContext, profileId: string, account: string, type: "Bookie" | "Exchange") {
  const response = await request.post(`/api/profiles/${profileId}/accounts`, { data: {
    account, type, status: "Active", lifecycle_status: "Active", channel: "Online",
    stake_access: "Normal", promo_access: "Full", restrictions: [],
    ...(type === "Exchange" ? { commission_rate: "0.02" } : {}),
  }});
  expect(response.status(), await response.text()).toBe(201);
  return response.json() as Promise<{ account_id: string }>;
}

async function archiveSyntheticProfile(request: APIRequestContext, profileId: string) {
  await request.patch(`/api/profiles/${profileId}`, {
    data: { status: "Archived" },
    timeout: 10_000,
  }).catch(() => undefined);
}

async function openRow(page: Page, route: string, rowText: string, dialogName: string) {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  const range = page.getByLabel(/Change tracker date range/);
  if (await range.isVisible().catch(() => false)) await range.selectOption({ label: "All Dates" });
  const row = page.locator(".data-table tbody tr", { hasText: rowText }).first();
  await expect(row).toBeVisible({ timeout: 90_000 });
  const editRow = row.getByRole("button", { name: /^Edit / });
  if (await editRow.isVisible().catch(() => false)) await editRow.click();
  else await row.click();
  const dialog = page.locator('[data-pd-id$=".editor.dialog"]');
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  await expect(dialog).toHaveAttribute("aria-label", dialogName);
  return dialog;
}

async function saveNote(
  page: Page,
  dialog: Locator,
  note: string,
  endpoint: string,
  tab: RegExp,
  label: string,
  advancedLabel?: string,
) {
  const edit = dialog.getByRole("button", { name: /Edit (settled|cash-adjustment) row/ });
  if (await edit.isVisible().catch(() => false)) await edit.click();
  await dialog.getByRole("tab", { name: tab }).click();
  const noteInput = page.locator("label").filter({ hasText: new RegExp(`^${label}`) }).locator("textarea, input").first();
  const noteIsInClosedDisclosure = await noteInput.evaluate((element) => Boolean(
    element.closest("[inert]") || element.closest("details:not([open])"),
  )).catch(() => true);
  if (advancedLabel && noteIsInClosedDisclosure) {
    const disclosure = dialog.getByText(advancedLabel, { exact: true });
    if (await disclosure.isVisible().catch(() => false)) await disclosure.click();
  }
  await expect(noteInput).toBeEnabled({ timeout: 30_000 });
  const save = page.getByRole("button", { name: /^(Save|Save Edits)$/ });
  const noteHandle = await noteInput.elementHandle();
  const saveHandle = await save.elementHandle();
  expect(noteHandle).not.toBeNull();
  expect(saveHandle).not.toBeNull();
  await noteHandle!.fill(note);
  expect(await noteHandle!.inputValue()).toBe(note);
  expect(await saveHandle!.isEnabled()).toBeTruthy();
  const response = page.waitForResponse((candidate) =>
    candidate.request().method() === "PUT" && candidate.url().endsWith(endpoint),
    { timeout: 30_000 },
  );
  await saveHandle!.focus();
  expect(await saveHandle!.evaluate((button) => document.activeElement === button)).toBeTruthy();
  await saveHandle!.press("Enter");
  const result = await response;
  expect(result.status(), await result.text()).toBe(200);
  await expect(save).toBeHidden({ timeout: 30_000 });
}

function expectOnlyNoteChanged(before: Record<string, unknown>, after: Record<string, unknown>, noteField: string, note: string) {
  expect(after[noteField]).toBe(note);
  for (const [key, value] of Object.entries(before)) {
    if ([noteField, "updated_at", "calculation_notes"].includes(key)) continue;
    if (
      ["adjustment_date", "date_started", "date_settling", "expiry_datetime", "placed_at"].includes(key) &&
      typeof value === "string" &&
      typeof after[key] === "string" &&
      value.replace("T", " ") === String(after[key]).replace("T", " ")
    ) continue;
    expect(after[key], key).toEqual(value);
  }
}

test("Free Bet Notes survive add, amend and clear on an incomplete existing record", async ({ page }) => {
  hostedOnly(); test.setTimeout(240_000);
  const profileId = await createProfile(page.request, "free-bet");
  const bookie = await addAccount(page.request, profileId, "Bet365", "Bookie");
  await addAccount(page.request, profileId, "Smarkets", "Exchange");
  const base = {
    event_name: "Synthetic Free Bet note row", offer_text: "Historical reward", bookmaker: "Bet365",
    offer_type: "Bet & Get", bet_type: "Single", offer_name: "", fixture_type: "Football",
    status: "Available", result: "Pending", retention_mode: "SNR", free_bet_value: "5.00", back_odds: "",
    match_strategy: "Standard", lay_odds_1: "", lay_actual: "", lay_matched_stake_1: "", lay_commission_1: "0.02",
    exchange_name: "Smarkets", expiry_datetime: "", date_settled: "", origin_qual_bet_id: "", offer_group_id: "",
    user_notes: "", manual_override_value: "", manual_override_reason: "",
  };
  const create = await page.request.post(`/api/profiles/${profileId}/free-bets`, { data: base });
  expect(create.status(), await create.text()).toBe(201);
  const record = await create.json() as Record<string, unknown> & { free_bet_id: string };
  await page.request.delete(`/api/profiles/${profileId}/accounts/${bookie.account_id}`);
  const route = `/profiles/${profileId}/tracker/free-bets`;
  const endpoint = `/api/profiles/${profileId}/free-bets/${record.free_bet_id}`;
  try {
    for (const note of ["Free Bet note", "Free Bet amended", ""]) {
      const dialog = await openRow(page, route, String(record.event_name), "Edit free-bet row");
      await saveNote(page, dialog, note, endpoint, /Settlement/, "Notes", "Advanced controls");
      const persisted = await (await page.request.get(endpoint)).json() as Record<string, unknown>;
      expectOnlyNoteChanged(record, persisted, "user_notes", note);
      record.user_notes = note; record.updated_at = persisted.updated_at;
    }
  } finally { await archiveSyntheticProfile(page.request, profileId); }
});

test("Extra Place Notes survive add, amend and clear on an imported missing-reference row", async ({ page }) => {
  hostedOnly(); test.setTimeout(240_000);
  const profileId = await createProfile(page.request, "extra-place");
  const payload = {
    placed_at: "2026-09-23T10:00", runner: "Synthetic Imported Runner", race: "Synthetic Race",
    bookmaker: "Missing Historical Bookie", bookmaker_account: "Missing Historical Bookie", mode: "Extra Place",
    each_way_stake: "5.00", back_odds: "6.00", place_term_numerator: "1", place_term_denominator: "5",
    bookmaker_places: "5", exchange_places: "4", win_exchange: "Synthetic Exchange", win_lay_odds: "6.20",
    win_commission: "0.02", actual_win_lay_stake: "4.84", place_exchange: "Synthetic Exchange",
    place_lay_odds: "5.00", place_commission: "0.02", actual_place_lay_stake: "1.00",
    status: "Settled", result: "Win", finishing_position: "1st", imported_historical_pnl: "4.50",
    calculation_provenance: "imported_historical", user_notes: "",
  };
  const create = await page.request.post(`/api/profiles/${profileId}/each-way-extra-places`, { data: payload });
  expect(create.status(), await create.text()).toBe(201);
  const record = await create.json() as Record<string, unknown> & { each_way_extra_place_id: string };
  const route = `/profiles/${profileId}/tracker/each-way-extra-places`;
  const endpoint = `/api/profiles/${profileId}/each-way-extra-places/${record.each_way_extra_place_id}`;
  try {
    for (const note of ["Extra Place note", "Extra Place amended", ""]) {
      const dialog = await openRow(page, route, String(record.runner), "Edit Extra Place row");
      await saveNote(page, dialog, note, endpoint, /Settlement/, "Notes", "Advanced");
      const persisted = await (await page.request.get(endpoint)).json() as Record<string, unknown>;
      expectOnlyNoteChanged(record, persisted, "user_notes", note);
      record.user_notes = note; record.updated_at = persisted.updated_at;
    }
  } finally { await archiveSyntheticProfile(page.request, profileId); }
});

test("Casino Notes survive add, amend and clear on an incomplete activity", async ({ page }) => {
  hostedOnly(); test.setTimeout(240_000);
  const profileId = await createProfile(page.request, "casino");
  await addAccount(page.request, profileId, "Bet365", "Bookie");
  const payload = {
    offer_group_id: "", date_started: "2026-09-23T10:00", date_settling: "", expiry_datetime: "",
    bookmaker: "Bet365", offer_type: "Free Spins", offer_name: "Synthetic incomplete casino note row", game: "Synthetic Slots",
    cash_stake: "", credit_amount: "", bonus_amount: "", wager_multiplier: "", wager_target: "", required_spins: "",
    spin_stake: "", free_spins_awarded: "", free_spins_value: "", wagering_base: "", custom_wager_base: "",
    wagering_completed: "", rtp_percent: "", reward_type: "", reward_wager_multiplier: "", reward_wager_target: "",
    reward_required_spins: "", reward_wagering_completed: "", reward_rtp_percent: "", expected_reward_cash_value: "",
    qualifying_expected_loss: "", reward_expected_loss: "", other_expected_costs: "", campaign_ev: "", own_cash_committed: "",
    cash_returned: "", settlement_other_costs: "", status: "Started", result: "Pending", calc_net_pnl: "0.00",
    final_net_pnl: "", user_notes: "",
  };
  const create = await page.request.post(`/api/profiles/${profileId}/casino-offers`, { data: payload });
  expect(create.status(), await create.text()).toBe(201);
  const created = await create.json() as { casino_offer_id: string };
  const route = `/profiles/${profileId}/tracker/casino-offers`;
  const endpoint = `/api/profiles/${profileId}/casino-offers/${created.casino_offer_id}`;
  const record = await (await page.request.get(endpoint)).json() as Record<string, unknown> & { casino_offer_id: string };
  try {
    for (const note of ["Casino note", "Casino amended", ""]) {
      const dialog = await openRow(page, route, String(record.offer_name), "Edit casino row");
      await saveNote(page, dialog, note, endpoint, /Advanced/, "Notes");
      const persisted = await (await page.request.get(endpoint)).json() as Record<string, unknown>;
      expectOnlyNoteChanged(record, persisted, "user_notes", note);
      record.user_notes = note; record.updated_at = persisted.updated_at;
    }
  } finally { await archiveSyntheticProfile(page.request, profileId); }
});

test("Cash Adjustment Notes survive add, amend and clear without changing money", async ({ page }) => {
  hostedOnly(); test.setTimeout(240_000);
  const profileId = await createProfile(page.request, "cash");
  const payload = { adjustment_date: "2026-09-23T10:00", direction: "In", amount: "6.00", adjustment_type: "Correction",
    affects_investment: false, affects_cash_snapshot: false, linked_account: "", description: "" };
  const create = await page.request.post(`/api/profiles/${profileId}/cash-adjustments`, { data: payload, headers: { "Idempotency-Key": `cp034-${Date.now()}` } });
  expect(create.status(), await create.text()).toBe(201);
  const created = await create.json() as { cash_adjustment_id: string };
  const route = `/profiles/${profileId}/tracker/cash-adjustments`;
  const endpoint = `/api/profiles/${profileId}/cash-adjustments/${created.cash_adjustment_id}`;
  const record = await (await page.request.get(endpoint)).json() as Record<string, unknown> & { cash_adjustment_id: string };
  try {
    for (const note of ["Cash note", "Cash amended", ""]) {
      const dialog = await openRow(page, route, note ? "6.00" : "Cash amended", "Edit cash adjustment");
      await saveNote(page, dialog, note, endpoint, /Notes/, "Description");
      const persisted = await (await page.request.get(endpoint)).json() as Record<string, unknown>;
      expectOnlyNoteChanged(record, persisted, "description", note);
      record.description = note; record.updated_at = persisted.updated_at;
    }
  } finally { await archiveSyntheticProfile(page.request, profileId); }
});
