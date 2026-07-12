import { expect, test } from "@playwright/test";

test("Sportsbook table separates lay status, back status, and raw status while issue rows use gradient state styling", async ({
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

  const rows = [
    {
      event_name: "Lifecycle Draft Match",
      offer_text: "Draft lifecycle test",
      bookmaker: "Bookmaker A",
      offer_type: "Bet & Get",
      bet_type: "Single",
      offer_name: "Lifecycle Draft",
      fixture_type: "Football",
      market: "Match Odds",
      status: "Prospecting",
      result: "Pending",
      back_stake: "",
      back_odds: "",
      match_strategy: "Standard",
      lay_odds_1: "",
      lay_actual: "",
      lay_matched_stake_1: "",
      lay_commission_1: "",
      exchange_name: "",
      date_settled: "",
      user_notes: "",
      manual_override_value: "",
      manual_override_reason: "",
    },
    {
      event_name: "Lifecycle Back Only Match",
      offer_text: "Back only lifecycle test",
      bookmaker: "Bookmaker A",
      offer_type: "Bet & Get",
      bet_type: "Single",
      offer_name: "Lifecycle Back Only",
      fixture_type: "Football",
      market: "Match Odds",
      status: "Placed",
      result: "Pending",
      back_stake: "10.00",
      back_odds: "2.10",
      match_strategy: "Standard",
      lay_odds_1: "",
      lay_actual: "",
      lay_matched_stake_1: "",
      lay_commission_1: "",
      exchange_name: "",
      date_settled: "2026-07-20T18:00",
      user_notes: "",
      manual_override_value: "",
      manual_override_reason: "",
    },
    {
      event_name: "Lifecycle Partial Match",
      offer_text: "Partial lifecycle test",
      bookmaker: "Bookmaker A",
      offer_type: "Bet & Get",
      bet_type: "Single",
      offer_name: "Lifecycle Partial",
      fixture_type: "Football",
      market: "Match Odds",
      status: "Placed",
      result: "Pending",
      back_stake: "10.00",
      back_odds: "2.10",
      match_strategy: "Partial Lay",
      lay_odds_1: "2.20",
      lay_actual: "9.55",
      lay_matched_stake_1: "4.78",
      lay_commission_1: "",
      exchange_name: "Matchbook",
      date_settled: "2026-07-20T18:00",
      user_notes: "",
      manual_override_value: "",
      manual_override_reason: "",
    },
  ];

  for (const row of rows) {
    const response = await request.post(`http://127.0.0.1:8010/profiles/${profileId}/sportsbook-bets`, {
      data: row,
    });
    expect(response.ok()).toBeTruthy();
  }

  await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets`);
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Open sportsbook filter and column controls" }).click();
  await page.getByRole("dialog", { name: "Sportsbook filter controls" }).getByLabel("Sportsbook review mode").selectOption("recent");
  await page.getByRole("button", { name: "Done" }).click();

  const table = page.locator(".data-table");
  await expect(table).toBeVisible();

  const draftRow = table.locator("tbody tr", { hasText: "Lifecycle Draft Match" }).first();
  await expect(draftRow).toContainText("Not Placed");
  await expect(draftRow).toHaveClass(/row-state-issue-warning/);
  await draftRow.hover();
  await expect(draftRow.locator(".row-issue-overlay")).toContainText("Back Unplaced");
  await expect(draftRow.locator(".row-issue-overlay")).toContainText("No Settle Date");

  const backOnlyRow = table.locator("tbody tr", { hasText: "Lifecycle Back Only Match" }).first();
  await expect(backOnlyRow).toContainText("Not Laid");
  await expect(backOnlyRow).toContainText("Back Placed");
  await expect(backOnlyRow).toContainText("Placed");

  const partialRow = table.locator("tbody tr", { hasText: "Lifecycle Partial Match" }).first();
  await expect(partialRow).toContainText("Part Laid");
  await expect(partialRow).toContainText("Back Placed");
  await expect(partialRow).toContainText("Placed");
});
