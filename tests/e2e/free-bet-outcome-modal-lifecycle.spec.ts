import { expect, test } from "@playwright/test";

test("Free-bet outcome modal follows the same status and result lifecycle rules as the editor", async ({
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
      event_name: "Free Bet Outcome Lifecycle Match",
      offer_text: "Free bet lifecycle offer",
      bookmaker: "Bookmaker A",
      offer_type: "Bet & Get",
      bet_type: "Single",
      offer_name: "Free Bet Lifecycle Campaign",
      fixture_type: "Football",
      status: "Placed",
      result: "Pending",
      retention_mode: "SNR",
      free_bet_value: "5.00",
      back_odds: "4.00",
      match_strategy: "Standard",
      lay_odds_1: "4.20",
      lay_actual: "4.76",
      lay_matched_stake_1: "4.76",
      lay_commission_1: "",
      exchange_name: "Matchbook",
      expiry_datetime: "2026-07-25T18:00",
      date_settled: "2026-07-22T18:00",
      origin_qual_bet_id: "",
      offer_group_id: "",
      user_notes: "",
      manual_override_value: "",
      manual_override_reason: "",
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const createdRow = await createResponse.json();

  await page.goto(`/profiles/${profileId}/tracker/free-bets`);
  await page.waitForLoadState("networkidle");

  const row = page.locator(".data-table tbody tr", { hasText: "Free Bet Outcome Lifecycle Match" }).first();
  await row.locator(".table-action-button").nth(1).click();

  const modal = page.locator('.modal-panel[aria-label="Update free-bet outcome"]');
  await expect(modal).toBeVisible();

  const statusSelect = modal.locator('label.field-control:has(span:text-is("Status")) select');
  const outcomeSelect = modal.locator('label.field-control:has(span:text-is("Outcome")) select');

  await outcomeSelect.selectOption("Back Won");
  await expect(statusSelect).toHaveValue("Settled");

  await statusSelect.selectOption("Available");
  await expect(outcomeSelect).toHaveValue("Pending");

  await statusSelect.selectOption("Void");
  await expect(outcomeSelect).toHaveValue("Void");

  await modal.getByRole("button", { name: "Save" }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.locator(".workflow-editor-panel")).toHaveCount(0);
  await expect(row).toBeVisible();

  const savedRowResponse = await request.get(
    `http://127.0.0.1:8010/profiles/${profileId}/free-bets/${createdRow.free_bet_id}`
  );
  expect(savedRowResponse.ok()).toBeTruthy();
  const savedRow = await savedRowResponse.json();
  expect(savedRow.status).toBe("Void");
  expect(savedRow.result).toBe("Void");
});
