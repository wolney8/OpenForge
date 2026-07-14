import { expect, test } from "@playwright/test";

test("sportsbook calculator exposes a live, interpreted match rating only with sufficient inputs", async ({
  page,
  request,
}) => {
  const profileId = "profile-demo-001";
  const eventName = `Match Rating ${Date.now()}`;

  const commissionResponse = await request.put(
    `http://127.0.0.1:8010/profiles/${profileId}/exchange-commissions`,
    { data: { exchange_name: "Matchbook", commission_rate: "0.02" } }
  );
  expect(commissionResponse.ok()).toBeTruthy();

  const createResponse = await request.post(
    `http://127.0.0.1:8010/profiles/${profileId}/sportsbook-bets`,
    {
      data: {
        event_name: eventName,
        offer_text: "Match rating contract proof",
        bookmaker: "Bookmaker A",
        offer_type: "Bet & Get",
        bet_type: "Single",
        offer_name: "Weekly Reload",
        fixture_type: "Football",
        market: "Match Odds",
        status: "Prospecting",
        result: "Pending",
        back_stake: "10.00",
        back_odds: "2.10",
        match_strategy: "Standard",
        lay_odds_1: "2.20",
        lay_actual: "9.55",
        lay_matched_stake_1: "",
        lay_commission_1: "",
        exchange_name: "Matchbook",
        date_settled: "2026-07-20T18:00",
        user_notes: "",
        manual_override_value: "",
        manual_override_reason: "",
      },
    }
  );
  expect(createResponse.ok()).toBeTruthy();

  await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets`);
  await page.waitForLoadState("networkidle");
  await page.locator(".data-table tbody tr", { hasText: eventName }).first().click();

  const editor = page.getByRole("dialog", { name: "Edit sportsbook row" });
  const rating = editor.locator(".calculator-match-rating-pill");
  await expect(rating).toHaveText("Match Rating 95.45% · Good");
  await expect(rating).toHaveAttribute(
    "aria-label",
    "Match rating 95.45 percent. Good."
  );

  await editor.getByLabel("Lay odds 1").fill("2.40");
  await expect(rating).toHaveText("Match Rating 87.50% · Good");

  await editor.getByLabel("Lay odds 1").fill("");
  await expect(rating).toHaveCount(0);
  await expect(editor).toContainText("Enter the first lay odds");
});
