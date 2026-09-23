import { expect, test } from "@playwright/test";

const hostedOnly = () => test.skip(
  process.env.OPENFORGE_HOSTED_PREVIEW_GATE !== "true",
  "Explicit hosted Preview gate only",
);

test.beforeEach(async ({ page }) => {
  const baseURL = process.env.OPENFORGE_E2E_BASE_URL;
  if (!baseURL) return;
  const session = process.env.OPENFORGE_E2E_SESSION_TOKEN;
  const protection = process.env.OPENFORGE_E2E_VERCEL_COOKIE;
  await page.context().addCookies([
    ...(session ? [{ name: "pd_session", value: session, url: baseURL }] : []),
    ...(protection ? [{ name: "_vercel_jwt", value: protection, url: baseURL }] : []),
  ]);
});

test("Free Bet-step Notes remain a dirty draft until explicit Save", async ({ page }) => {
  hostedOnly();
  test.setTimeout(180_000);
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const profileResponse = await page.request.post("/api/profiles/onboarding", { data: {
    accounts: [], display_name: `Synthetic CP035 explicit save ${suffix}`,
    enabled_modules: ["sportsbook-bets", "free-bets", "cash-adjustments"], profile_code: `C35-${suffix}`.slice(0, 32),
    quick_actions: [], setup_path: "import", tracking_start_date: "2026-09-23",
  }});
  expect(profileResponse.status(), await profileResponse.text()).toBe(201);
  const profileId = (await profileResponse.json() as { profile: { profile_id: string } }).profile.profile_id;
  await page.request.patch(`/api/profiles/${profileId}`, { data: { status: "Active" } });
  for (const [account, type] of [["Bet365", "Bookie"], ["Smarkets", "Exchange"]] as const) {
    const response = await page.request.post(`/api/profiles/${profileId}/accounts`, { data: {
      account, type, status: "Active", lifecycle_status: "Active", channel: "Online",
      stake_access: "Normal", promo_access: "Full", restrictions: [],
      ...(type === "Exchange" ? { commission_rate: "0.02" } : {}),
    }});
    expect(response.status(), await response.text()).toBe(201);
  }
  const payload = {
    event_name: "Synthetic explicit-save owner reproduction", offer_text: "Bet and get",
    bookmaker: "Bet365", offer_type: "Bet & Get", bet_type: "Single", offer_name: "",
    fixture_type: "Football", market: "Match Odds", status: "Placed", result: "Pending",
    back_stake: "10.00", back_odds: "2.10", match_strategy: "Standard", lay_odds_1: "2.20",
    lay_actual: "9.54", lay_matched_stake_1: "9.54", lay_commission_1: "0.02",
    exchange_name: "Smarkets", date_settled: "", user_notes: "", manual_override_value: "",
    manual_override_reason: "",
  };
  const createdResponse = await page.request.post(`/api/profiles/${profileId}/sportsbook-bets`, { data: payload });
  expect(createdResponse.status(), await createdResponse.text()).toBe(201);
  const created = await createdResponse.json() as { sportsbook_bet_id: string };
  let updateRequests = 0;
  page.on("request", (request) => {
    if (request.method() === "PUT" && request.url().endsWith(`/sportsbook-bets/${created.sportsbook_bet_id}`)) {
      updateRequests += 1;
    }
  });
  try {
    await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: `Copy ${created.sportsbook_bet_id} to free bets` }).click();
    const editor = page.getByRole("dialog", { name: "Edit sportsbook row" });
    await editor.getByRole("tab", { name: "Free Bet" }).click();
    const awardNotes = editor.locator('[data-pd-id="ledger-editor.panel.free_bet"]').getByLabel("Notes");
    await awardNotes.fill("gggg");
    await awardNotes.blur();
    await page.waitForTimeout(1_200);
    expect(updateRequests).toBe(0);
    await expect(editor.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
    await editor.getByRole("button", { name: "Close sportsbook editor" }).click();
    const confirmation = page.locator('[data-pd-id="unsaved-changes.dialog"]');
    await expect(confirmation).toContainText("You have unsaved changes.");
    await confirmation.getByRole("button", { name: "Keep Editing", exact: true }).click();
    await expect(awardNotes).toHaveValue("gggg");
    await editor.getByRole("button", { name: "Close sportsbook editor" }).click();
    await confirmation.getByRole("button", { name: "Discard Changes" }).click();
    await expect(editor).toBeHidden();

    await page.getByRole("button", { name: `Copy ${created.sportsbook_bet_id} to free bets` }).click();
    const reopened = page.getByRole("dialog", { name: "Edit sportsbook row" });
    await reopened.getByRole("tab", { name: "Free Bet" }).click();
    const reopenedNotes = reopened.locator('[data-pd-id="ledger-editor.panel.free_bet"]').getByLabel("Notes");
    await expect(reopenedNotes).toHaveValue("");
    await reopenedNotes.fill("saved explicitly");
    await reopened.getByRole("button", { name: "Save", exact: true }).click();
    await expect(reopened).toBeHidden();

    await page.getByRole("button", { name: `Copy ${created.sportsbook_bet_id} to free bets` }).click();
    const savedEditor = page.getByRole("dialog", { name: "Edit sportsbook row" });
    await savedEditor.getByRole("tab", { name: "Free Bet" }).click();
    const savedNotes = savedEditor.locator('[data-pd-id="ledger-editor.panel.free_bet"]').getByLabel("Notes");
    await expect(savedNotes).toHaveValue("saved explicitly");
    await savedNotes.fill("saved and closed");
    await savedEditor.getByRole("button", { name: "Close sportsbook editor" }).click();
    await confirmation.getByRole("button", { name: "Save and close" }).click();
    await expect(savedEditor).toBeHidden();
    expect(updateRequests).toBe(0);
  } finally {
    await page.request.patch(`/api/profiles/${profileId}`, { data: { status: "Archived" } }).catch(() => undefined);
  }
});
