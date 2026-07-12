import { expect, test } from "@playwright/test";

test("Settled free-bet rows stay locked until explicit edit is enabled", async ({
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
      event_name: "Settled Free Bet Lock Match",
      offer_text: "Settled free bet lock offer",
      bookmaker: "Bookmaker A",
      offer_type: "Bet & Get",
      bet_type: "Single",
      offer_name: "Settled Lock Campaign",
      fixture_type: "Football",
      status: "Settled",
      result: "Back Won",
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

  await page.goto(`/profiles/${profileId}/tracker/free-bets`);
  await page.waitForLoadState("networkidle");

  const row = page.locator(".data-table tbody tr", { hasText: "Settled Free Bet Lock Match" }).first();
  await expect(row).toBeVisible();
  await row.click();

  const editor = page.locator(".workflow-editor-panel");
  await expect(editor).toContainText("Edit free-bet row");
  await expect(editor.getByText("Settled row locked").first()).toBeVisible();

  await expect(editor.getByRole("textbox", { name: "Offer", exact: true })).toBeDisabled();
  await expect(editor.getByRole("combobox", { name: "Status", exact: true })).toBeDisabled();
  await expect(editor.getByRole("textbox", { name: "Back odds", exact: true })).toBeDisabled();

  await editor.getByRole("button", { name: "Edit settled row" }).click();

  await expect(editor.getByRole("textbox", { name: "Offer", exact: true })).toBeEnabled();
  await expect(editor.getByRole("combobox", { name: "Status", exact: true })).toBeEnabled();
  await expect(editor.getByRole("textbox", { name: "Back odds", exact: true })).toBeEnabled();
});
