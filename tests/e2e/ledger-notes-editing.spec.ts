import { expect, test, type APIRequestContext } from "@playwright/test";

const hostedOnly = () => test.skip(
  process.env.OPENFORGE_HOSTED_PREVIEW_GATE !== "true",
  "Explicit hosted Preview gate only",
);

async function createProfile(request: APIRequestContext) {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const response = await request.post("/api/profiles/onboarding", { data: {
    accounts: [],
    display_name: `Synthetic CP033 ledger notes ${suffix}`,
    enabled_modules: ["sportsbook-bets", "free-bets", "cash-adjustments"],
    profile_code: `C33-${suffix}`.slice(0, 32),
    quick_actions: [],
    setup_path: "import",
    tracking_start_date: "2026-09-23",
  }});
  expect(response.status(), await response.text()).toBe(201);
  const profileId = ((await response.json()) as { profile: { profile_id: string } }).profile.profile_id;
  expect((await request.patch(`/api/profiles/${profileId}`, { data: { status: "Active" } })).ok()).toBeTruthy();
  return profileId;
}

async function addAccount(
  request: APIRequestContext,
  profileId: string,
  account: string,
  type: "Bookie" | "Exchange",
) {
  const response = await request.post(`/api/profiles/${profileId}/accounts`, { data: {
    account,
    type,
    status: "Active",
    lifecycle_status: "Active",
    channel: "Online",
    stake_access: "Normal",
    promo_access: "Full",
    restrictions: [],
    ...(type === "Exchange" ? { commission_rate: "0.02" } : {}),
  }});
  expect(response.status()).toBe(201);
  return response.json() as Promise<{ account_id: string }>;
}

test("existing Sportsbook Notes save retains an archived Account and award draft", async ({ page }) => {
  hostedOnly();
  test.setTimeout(300_000);
  const profileId = await createProfile(page.request);
  const bookie = await addAccount(page.request, profileId, "Bet365", "Bookie");
  await addAccount(page.request, profileId, "Smarkets", "Exchange");
  const payload = {
    event_name: "Synthetic CP033 Account retention",
    offer_text: "Bet and get",
    bookmaker: "Bet365",
    offer_type: "Bet & Get",
    bet_type: "Single",
    offer_name: "",
    fixture_type: "Football",
    market: "Match Odds",
    status: "Placed",
    result: "Pending",
    back_stake: "10.00",
    back_odds: "2.10",
    match_strategy: "Standard",
    lay_odds_1: "2.20",
    lay_actual: "9.54",
    lay_matched_stake_1: "9.54",
    lay_commission_1: "0.02",
    exchange_name: "Smarkets",
    date_settled: "",
    user_notes: "",
    manual_override_value: "",
    manual_override_reason: "",
  };
  const createdResponse = await page.request.post(`/api/profiles/${profileId}/sportsbook-bets`, { data: payload });
  expect(createdResponse.status()).toBe(201);
  const created = await createdResponse.json() as typeof payload & { sportsbook_bet_id: string; reporting_value: string };
  expect((await page.request.delete(`/api/profiles/${profileId}/accounts/${bookie.account_id}`)).status()).toBe(200);

  try {
    await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets`, {
      waitUntil: "domcontentloaded",
    });
    await page.getByRole("row", { name: /Synthetic CP033 Account retention/ }).click();
    const editor = page.getByRole("dialog", { name: "Edit sportsbook row" });
    await expect(editor).toBeVisible({ timeout: 90_000 });
    await editor.getByRole("tab", { name: /Settlement/ }).click();
    const settlement = editor.locator('[data-pd-id="ledger-editor.panel.settlement"]');
    await settlement.getByText("Advanced controls", { exact: true }).click();
    await settlement.getByLabel("Notes").fill("Synthetic ordinary note");
    await editor.getByRole("tab", { name: "Free Bet" }).click();
    const awardDraft = editor.locator('[data-pd-id="ledger-editor.panel.free_bet"]');
    await awardDraft.getByLabel("Notes").fill("Synthetic future award note");
    const saveResponse = page.waitForResponse((response) =>
      response.request().method() === "PUT" &&
      response.url().endsWith(`/api/profiles/${profileId}/sportsbook-bets/${created.sportsbook_bet_id}`)
    );
    await editor.locator('[data-pd-id="sportsbook.editor.actions"]').getByRole("button", { name: "Save", exact: true }).click();
    expect((await saveResponse).status()).toBe(200);

    const persisted = await (await page.request.get(
      `/api/profiles/${profileId}/sportsbook-bets/${created.sportsbook_bet_id}`
    )).json() as typeof created;
    expect(persisted.user_notes).toBe("Synthetic ordinary note");
    for (const field of ["profile_id", "bookmaker", "status", "result", "back_stake", "back_odds", "lay_actual", "lay_matched_stake_1", "exchange_name", "reporting_value"] as const) {
      expect(persisted[field]).toBe(created[field]);
    }
    const freeBets = await (await page.request.get(`/api/profiles/${profileId}/free-bets`)).json() as unknown[];
    expect(freeBets).toEqual([]);

    await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets`);
    await page.getByRole("row", { name: /Synthetic CP033 Account retention/ }).click();
    const reopened = page.getByRole("dialog", { name: "Edit sportsbook row" });
    await reopened.getByRole("tab", { name: "Free Bet" }).click();
    await expect(reopened.locator('[data-pd-id="ledger-editor.panel.free_bet"]').getByLabel("Notes"))
      .toHaveValue("Synthetic future award note");
  } finally {
    await page.request.patch(`/api/profiles/${profileId}`, { data: { status: "Archived" } });
  }
});
