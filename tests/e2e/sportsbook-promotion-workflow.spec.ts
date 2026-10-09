import { expect, test, type APIRequestContext } from "@playwright/test";

async function seedPromotion(request: APIRequestContext) {
  const created = await request.post("/api/profiles/onboarding", {
    data: {
      display_name: "Synthetic Refund Profile",
      profile_code: `PROMO-${Date.now()}`,
      profile_relationship: "Personal",
      management_fee_percent: "0",
      investment_fee_percent: "0",
      tracking_start_date: "2026-10-01",
      setup_path: "import",
      accounts: [],
      quick_actions: [],
      enabled_modules: [
        "sportsbook-bets",
        "free-bets",
        "casino-offers",
        "cash-adjustments",
      ],
    },
  });
  expect(created.status(), await created.text()).toBe(201);
  const profileId = (await created.json()).profile.profile_id as string;
  for (const [catalogue_id, account, type] of [
    ["BOOKMAKER-10BET", "10Bet", "Bookie"],
    ["EXCHANGE-SMARKETS", "Smarkets", "Exchange"],
  ]) {
    const accountResponse = await request.post(`/api/profiles/${profileId}/accounts`, {
      data: {
        catalogue_id,
        account,
        type,
        status: "Active",
        lifecycle_status: "Active",
        channel: "Online",
        stake_access: "Normal",
        promo_access: "Full",
        restrictions: [],
        ...(type === "Exchange" ? { commission_rate: "0" } : {}),
      },
    });
    expect(accountResponse.status(), await accountResponse.text()).toBe(201);
  }
  await request.put(`/api/profiles/${profileId}/exchange-commissions`, {
    data: { exchange_name: "Smarkets", commission_rate: "0" },
  });
  const offerGroupId = `OFG-SYNTHETIC-${Date.now()}`;
  const trigger = await request.post(`/api/profiles/${profileId}/sportsbook-bets`, {
    data: {
      sportsbook_bet_id: `SB-SYNTHETIC-${Date.now()}`,
      event_name: "Synthetic Fixture A",
      market: "Match Odds",
      offer_text: "50% refund up to £50; 2× wagering",
      bookmaker: "10Bet",
      offer_type: "Refund",
      bet_type: "Single",
      offer_name: "Synthetic Cashback",
      fixture_type: "Football",
      status: "Placed",
      result: "Pending",
      back_stake: "100",
      back_odds: "4.5",
      match_strategy: "Custom",
      lay_odds_1: "5.2",
      lay_actual: "79.81",
      lay_matched_stake_1: "79.81",
      lay_commission_1: "",
      exchange_name: "Smarkets",
      date_settled: "2026-10-10T18:00:00+01:00",
      user_notes: "Synthetic CP-075 release fixture",
      manual_override_value: "",
      manual_override_reason: "",
      bonus_trigger: "Lay Wins",
      maximum_bonus: "50",
      bonus_retention_rate: "70",
      offer_group_id: offerGroupId,
      bet_role: "Trigger",
      wagering_contribution: "",
      promotion_json: JSON.stringify({
        schema_version: "sportsbook-promotion-v1",
        reward_type: "BonusFunds",
        reward_calculation: "PercentOfLosingStake",
        refund_percent: "50",
        reward_cap: "50",
        reward_face_value: "50",
        reward_status: "Awarded",
        bonus_retention_percent: "70",
        wagering_required: true,
        wagering_multiplier: "2",
        wagering_basis: "Reward",
        wagering_funding_source: "RewardBalance",
        minimum_wagering_odds: "1.60",
        qualifying_scope: "SpecificFixture",
        qualifying_requirement: "Synthetic Fixture A",
      }),
    },
  });
  expect(trigger.status(), await trigger.text()).toBe(201);
  return { profileId, trigger: await trigger.json(), offerGroupId };
}

test("refund promotion stays concise and carries context into a wagering bet", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const { profileId, trigger, offerGroupId } = await seedPromotion(request);
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      json: {
        authenticated: true,
        role: "fund_manager",
        email: "owner@example.invalid",
        name: "Synthetic Owner",
        expires_at: Date.now() / 1000 + 3600,
        linked_profile_ids: [],
        session_policy: { auto_logout_enabled: false },
      },
    }),
  );
  await page.goto(
    `/profiles/${profileId}/tracker/sportsbook-bets?record=${trigger.sportsbook_bet_id}`,
  );
  const editor = page.getByRole("dialog", { name: "Edit sportsbook row" });
  await expect(editor.getByLabel("Bet role")).toHaveValue("Trigger");
  await expect(editor.getByLabel("Refund percentage")).toHaveValue("50");
  await expect(editor.getByLabel("Maximum refund")).toHaveValue("50");
  await expect(editor.getByRole("option", { name: "Released (Confirmed)" })).toHaveCount(1);
  await expect(editor).toContainText(
    "Choose Released only after the bookmaker confirms the promotional value is withdrawable.",
  );
  const position = editor.getByRole("region", { name: "Live promotion position" });
  await expect(position).toContainText("£ 14.81 projected");
  await expect(position).toContainText("£0.00 / £100.00");
  const addWagering = editor.getByRole("button", { name: "Add Wagering Bet" });
  await addWagering.focus();
  await expect(addWagering).toBeFocused();
  await addWagering.press("Enter");

  const wagering = page.getByRole("dialog", { name: "Create sportsbook row" });
  await expect(wagering.getByLabel("Bet role")).toHaveValue("Wagering");
  await expect(wagering.getByLabel("Wagering contribution (optional)")).toHaveAttribute(
    "placeholder",
    "Defaults to eligible actual stake",
  );
  await wagering.getByLabel("Event name", { exact: true }).fill("Synthetic Wagering Fixture");
  await wagering.getByRole("tab", { name: /Matching/ }).click();
  await wagering.getByLabel("Back stake", { exact: true }).fill("40");
  await wagering.getByLabel("Back odds", { exact: true }).fill("1.80");
  await wagering.getByRole("combobox", { name: /^Exchange/ }).selectOption("Smarkets");
  await wagering.getByLabel("Lay odds", { exact: true }).fill("1.90");
  await wagering.getByLabel("Actual matched stake", { exact: true }).fill("37.89");
  await wagering.getByLabel("Actual lay odds", { exact: true }).fill("1.90");
  await wagering.getByRole("button", { name: "Confirm actual placement", exact: true }).click();
  await wagering.getByRole("tab", { name: /Settlement/ }).click();
  await wagering.getByRole("textbox", { name: /^Settles/ }).fill("2026-10-11T18:00");
  await wagering.getByRole("button", { name: /^(Save|Save Edits)$/ }).click();
  await expect(wagering).toBeHidden();

  const rows = await (await request.get(`/api/profiles/${profileId}/sportsbook-bets`)).json();
  expect(rows.find((row: Record<string, string>) => row.event_name === "Synthetic Wagering Fixture"))
    .toMatchObject({
      offer_group_id: offerGroupId,
      bet_role: "Wagering",
      wagering_contribution: "",
    });
  const updated = await (
    await request.get(
      `/api/profiles/${profileId}/sportsbook-bets/promotion-position/${offerGroupId}`,
    )
  ).json();
  expect(updated.wagering_completed).toBe("40.00");
  expect(updated.wagering_remaining).toBe("60.00");

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.evaluate(() => localStorage.setItem("openforge-theme", "dark"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});
