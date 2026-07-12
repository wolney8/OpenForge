import { expect, test } from "@playwright/test";

test("Free-bet outcome modal shows no-lay outcome wording without lay-win language", async ({
  page,
  request,
}) => {
  const profileId = "profile-demo-001";

  const commissionResponse = await request.put(
    `http://127.0.0.1:8010/profiles/${profileId}/exchange-commissions`,
    {
      data: {
        exchange_name: "Matchbook",
        commission_rate: "0.02",
      },
    }
  );
  expect(commissionResponse.ok()).toBeTruthy();

  const createResponse = await request.post(`http://127.0.0.1:8010/profiles/${profileId}/free-bets`, {
    data: {
      event_name: "Free Bet No Lay Outcome Branch",
      offer_text: "Free bet no lay branch",
      bookmaker: "Bookmaker A",
      offer_type: "Bet & Get",
      bet_type: "Single",
      offer_name: "Free Bet No Lay Campaign",
      fixture_type: "Football",
      status: "Placed",
      result: "Pending",
      retention_mode: "SNR",
      free_bet_value: "5.00",
      back_odds: "4.00",
      match_strategy: "No Lay",
      lay_odds_1: "",
      lay_actual: "",
      lay_matched_stake_1: "",
      lay_commission_1: "",
      exchange_name: "Matchbook",
      expiry_datetime: "2026-07-25T18:00:00",
      date_settled: "2026-07-22T18:00:00",
      origin_qual_bet_id: "",
      offer_group_id: "",
      user_notes: "",
      manual_override_value: "",
      manual_override_reason: "",
    },
  });
  expect(createResponse.ok()).toBeTruthy();

  await page.goto(`/profiles/${profileId}/tracker/free-bets`);
  await page.waitForLoadState("networkidle");

  const row = page.locator(".data-table tbody tr", { hasText: "Free Bet No Lay Outcome Branch" }).first();
  await row.locator(".table-action-button").nth(1).click();

  const modal = page.locator('.modal-panel[aria-label="Update free-bet outcome"]');
  await expect(modal).toBeVisible();

  const outcomeSelect = modal.locator('label.field-control:has(span:text-is("Outcome")) select');
  await expect(outcomeSelect.locator('option[value="Lay Won"]')).toHaveCount(0);
  await expect(outcomeSelect.locator('option[value="Lose"]')).toHaveCount(1);
  await expect(outcomeSelect.locator('option', { hasText: "Back lost" })).toHaveCount(1);
  await expect(outcomeSelect.locator('option', { hasText: "Lay won" })).toHaveCount(0);
});
