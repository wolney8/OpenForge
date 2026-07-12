import { expect, test } from "@playwright/test";

test("Sportsbook outcome modal only shows offer-type valid result options", async ({
  page,
  request,
}) => {
  const profileId = "profile-demo-001";

  const cashbackResponse = await request.post(
    `http://127.0.0.1:8010/profiles/${profileId}/sportsbook-bets`,
    {
      data: {
        event_name: "Outcome Branch Cashback Match",
        offer_text: "Outcome branch cashback",
        bookmaker: "Bookmaker A",
        offer_type: "Cashback",
        bet_type: "Single",
        offer_name: "Outcome Branch Cashback",
        fixture_type: "Racing",
        market: "Win",
        status: "Placed",
        result: "Pending",
        back_stake: "10.00",
        back_odds: "4.00",
        match_strategy: "Underlay",
        lay_odds_1: "4.20",
        lay_actual: "9.10",
        lay_matched_stake_1: "9.10",
        lay_commission_1: "",
        exchange_name: "Matchbook",
        bonus_trigger: "Lay Wins",
        date_settled: "2026-07-21T15:00",
        user_notes: "",
        manual_override_value: "",
        manual_override_reason: "",
      },
    }
  );
  expect(cashbackResponse.ok()).toBeTruthy();

  const ddhhResponse = await request.post(`http://127.0.0.1:8010/profiles/${profileId}/sportsbook-bets`, {
    data: {
      event_name: "Outcome Branch DDHH Match",
      offer_text: "Outcome branch ddhh",
      bookmaker: "Bookmaker A",
      offer_type: "Double Delight / Hat-trick Heaven",
      bet_type: "Single",
      offer_name: "Outcome Branch DDHH",
      fixture_type: "Football",
      market: "First Goalscorer",
      status: "Placed",
      result: "Pending",
      back_stake: "10.00",
      back_odds: "8.00",
      match_strategy: "Underlay",
      lay_odds_1: "9.00",
      lay_actual: "8.20",
      lay_matched_stake_1: "8.20",
      lay_commission_1: "",
      exchange_name: "Matchbook",
      date_settled: "2026-07-21T19:00",
      user_notes: "",
      manual_override_value: "",
      manual_override_reason: "",
    },
  });
  expect(ddhhResponse.ok()).toBeTruthy();

  await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets`);
  await page.waitForLoadState("networkidle");

  const cashbackRow = page.locator(".data-table tbody tr", { hasText: "Outcome Branch Cashback Match" }).first();
  await cashbackRow.locator(".table-action-button").first().click();
  const cashbackModal = page.locator('.modal-panel[aria-label="Update sportsbook outcome"]');
  await expect(cashbackModal).toBeVisible();
  const cashbackOutcome = cashbackModal.getByLabel("Outcome");
  await expect(cashbackOutcome.locator('option[value="Lay Won + Cashback"]')).toHaveCount(1);
  await expect(cashbackOutcome.locator('option[value="Back Won + Cashback"]')).toHaveCount(0);
  await expect(cashbackOutcome.locator('option[value="Outcome 1 Won"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Close outcome modal" }).click();

  const ddhhRow = page.locator(".data-table tbody tr", { hasText: "Outcome Branch DDHH Match" }).first();
  await ddhhRow.locator(".table-action-button").first().click();
  const ddhhModal = page.locator('.modal-panel[aria-label="Update sportsbook outcome"]');
  await expect(ddhhModal).toBeVisible();
  const ddhhOutcome = ddhhModal.getByLabel("Outcome");
  await expect(ddhhOutcome.locator('option[value="Outcome 1 Won"]')).toHaveCount(1);
  await expect(ddhhOutcome.locator('option[value="Outcome 2 Won"]')).toHaveCount(1);
  await expect(ddhhOutcome.locator('option[value="Outcome 3 Won"]')).toHaveCount(1);
  await expect(ddhhOutcome.locator('option[value="Lay Won + Cashback"]')).toHaveCount(0);
});
