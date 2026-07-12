import { expect, test } from "@playwright/test";

test("Sportsbook outcome modal follows the same status and result lifecycle rules as the editor", async ({
  page,
  request,
}) => {
  const profileId = "profile-demo-001";

  const createResponse = await request.post(`http://127.0.0.1:8010/profiles/${profileId}/sportsbook-bets`, {
    data: {
      event_name: "Outcome Lifecycle Match",
      offer_text: "Outcome lifecycle offer",
      bookmaker: "Bookmaker A",
      offer_type: "Bet & Get",
      bet_type: "Single",
      offer_name: "Outcome Lifecycle Campaign",
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
      lay_commission_1: "",
      exchange_name: "Matchbook",
      date_settled: "2026-07-24T18:00",
      user_notes: "",
      manual_override_value: "",
      manual_override_reason: "",
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const createdRow = await createResponse.json();

  await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets`);
  await page.waitForLoadState("networkidle");

  const row = page.locator(".data-table tbody tr", { hasText: "Outcome Lifecycle Match" }).first();
  await row.locator(".table-action-button").first().click();

  const modal = page.locator('.modal-panel[aria-label="Update sportsbook outcome"]');
  await expect(modal).toBeVisible();

  const statusSelect = modal.locator('label.field-control:has(span:text-is("Status")) select');
  const outcomeSelect = modal.locator('label.field-control:has(span:text-is("Outcome")) select');

  await outcomeSelect.selectOption("Back Won");
  await expect(statusSelect).toHaveValue("Settled");

  await statusSelect.selectOption("Placed");
  await expect(outcomeSelect).toHaveValue("Pending");

  await statusSelect.selectOption("Cancelled");
  await expect(outcomeSelect).toHaveValue("Void");

  await modal.getByRole("button", { name: "Save" }).click();
  await expect(modal).toHaveCount(0);

  const savedRowResponse = await request.get(
    `http://127.0.0.1:8010/profiles/${profileId}/sportsbook-bets/${createdRow.sportsbook_bet_id}`
  );
  expect(savedRowResponse.ok()).toBeTruthy();
  const savedRow = await savedRowResponse.json();
  expect(savedRow.status).toBe("Cancelled");
  expect(savedRow.result).toBe("Void");
});
