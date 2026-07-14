import { expect, test } from "@playwright/test";

test("Sportsbook editor Create Free Bet action reuses the bridge modal and defaults to settlement award timing", async ({
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
      event_name: "Editor Bridge Match",
      offer_text: "Editor bridge offer",
      bookmaker: "Bookmaker A",
      offer_type: "Bet & Get",
      bet_type: "Single",
      offer_name: "Editor Bridge Campaign",
      fixture_type: "Football",
      market: "Match Odds",
      status: "Placed",
      result: "Pending",
      back_stake: "10.00",
      back_odds: "2.20",
      match_strategy: "Standard",
      lay_odds_1: "2.30",
      lay_actual: "9.57",
      lay_matched_stake_1: "9.57",
      lay_commission_1: "",
      exchange_name: "Matchbook",
      date_settled: "2026-07-22T18:00",
      user_notes: "",
      manual_override_value: "",
      manual_override_reason: "",
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const createdRow = await createResponse.json();

  await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets`);
  await page.waitForLoadState("networkidle");

  const row = page.locator(".data-table tbody tr", { hasText: "Editor Bridge Match" }).first();
  await expect(row).toBeVisible();
  await row.click();

  const editor = page.locator(".workflow-editor-panel");
  await expect(editor).toContainText("Edit sportsbook row");

  await editor.getByRole("button", { name: "Create Free Bet" }).click();

  const modal = page.locator('.modal-panel[aria-label="Copy sportsbook row to free bets"]');
  await expect(modal).toBeVisible();
  await expect(modal.getByLabel("Free-bet award timing")).toHaveValue("settlement");

  await modal.getByRole("button", { name: "Create free bet" }).click();

  await expect(page).toHaveURL(new RegExp(`/profiles/${profileId}/tracker/sportsbook-bets$`));
  await expect(modal).toHaveCount(0);
  await expect(page.locator(".status-toast")).toContainText(createdRow.sportsbook_bet_id);

  const freeBetsResponse = await request.get(
    `http://127.0.0.1:8010/profiles/${profileId}/free-bets`
  );
  expect(freeBetsResponse.ok()).toBeTruthy();
  const freeBets = (await freeBetsResponse.json()) as Array<Record<string, string>>;
  const createdFreeBet = freeBets.find((row) => row.event_name === "Editor Bridge Match");
  expect(createdFreeBet?.status).toBe("Not Yet Awarded");

  const sourceRowResponse = await request.get(
    `http://127.0.0.1:8010/profiles/${profileId}/sportsbook-bets/${createdRow.sportsbook_bet_id}`
  );
  expect(sourceRowResponse.ok()).toBeTruthy();
  const updatedRow = await sourceRowResponse.json();
  expect(updatedRow.status).toBe("Placed");
});
