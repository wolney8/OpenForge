import { expect, test } from "@playwright/test";

test("Sportsbook placement actions progress a draft row into back-placed and lay execution states", async ({
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

  const createResponse = await request.post(`http://127.0.0.1:8010/profiles/${profileId}/sportsbook-bets`, {
    data: {
      event_name: "Placement Action Match",
      offer_text: "Placement action test",
      bookmaker: "Bookmaker A",
      offer_type: "Bet & Get",
      bet_type: "Single",
      offer_name: "Placement Action",
      fixture_type: "Football",
      market: "Match Odds",
      status: "Prospecting",
      result: "Pending",
      back_stake: "10.00",
      back_odds: "2.10",
      match_strategy: "Standard",
      lay_odds_1: "2.20",
      lay_actual: "",
      lay_matched_stake_1: "",
      lay_commission_1: "",
      exchange_name: "Matchbook",
      date_settled: "2026-07-20T18:00",
      user_notes: "",
      manual_override_value: "",
      manual_override_reason: "",
    },
  });
  expect(createResponse.ok()).toBeTruthy();

  await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets`);
  await page.waitForLoadState("networkidle");

  const row = page.locator(".data-table tbody tr", { hasText: "Placement Action Match" }).first();
  await expect(row).toBeVisible();
  await row.click();

  const editor = page.locator(".workflow-editor-panel");
  await expect(editor).toBeVisible();

  await editor.getByRole("button", { name: "Back Bet Placed" }).click();
  await expect(editor.locator(".stat-card").first()).toContainText("Status: Placed");

  await editor.getByRole("button", { name: "Lay Fully Placed" }).click();
  const partialLayPanel = editor.locator('[aria-label="Partial lay legs"]');
  await expect(partialLayPanel).toBeVisible();
  await expect(partialLayPanel).toContainText("1 legs");
  await expect(partialLayPanel.getByLabel(/Final leg 1|Partial leg 1/)).toBeVisible();
});
