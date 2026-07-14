import { expect, test } from "@playwright/test";

test("Free Bets calculator uses best-value wording and a single Calculated chip", async ({
  page,
  request,
}) => {
  const profileId = "profile-demo-001";
  const createResponse = await request.post(
    `http://127.0.0.1:8010/profiles/${profileId}/free-bets`,
    {
      data: {
        event_name: "Calculator parity event",
        offer_text: "Calculator parity offer",
        bookmaker: "Bookmaker A",
        offer_type: "Bet & Get",
        bet_type: "Single",
        offer_name: "Weekly Reload",
        fixture_type: "Football",
        status: "Placed",
        result: "Pending",
        retention_mode: "SNR",
        free_bet_value: "5",
        back_odds: "2.0",
        match_strategy: "Standard",
        lay_odds_1: "3.5",
        lay_actual: "1.43",
        lay_matched_stake_1: "1.43",
        lay_commission_1: "0",
        exchange_name: "Matchbook",
        expiry_datetime: "2026-07-25T12:00:00",
        date_settled: "2026-07-18T15:00:00",
        origin_qual_bet_id: "SB-CALC-PARITY",
        offer_group_id: "DEMO-CODE-001",
        user_notes: "",
        manual_override_value: "",
        manual_override_reason: "",
      },
    }
  );
  expect(createResponse.ok()).toBeTruthy();
  const createdRow = (await createResponse.json()) as { free_bet_id: string };

  try {
    await page.goto(`/profiles/${profileId}/tracker/free-bets`);
    await page.waitForLoadState("networkidle");

    const targetRow = page.locator(".data-table tbody tr", {
      hasText: "Calculator parity event",
    });
    await expect(targetRow).toBeVisible();
    await targetRow.click();

    const editor = page.locator(".workflow-editor-panel");
    await expect(editor).toBeVisible();

    const suggestedLayCard = editor
      .locator('.calculator-panel-card:has(.eyebrow:has-text("Suggested lay"))')
      .first();
    await expect(suggestedLayCard).toBeVisible();
    await expect(suggestedLayCard).toContainText("Best-value lay suggestion");
    const suggestionRows = suggestedLayCard.locator(".summary-list .lede");
    await expect(suggestionRows).toHaveCount(3);
    await expect(suggestionRows.nth(0)).toContainText("Standard");
    await expect(suggestionRows.nth(1)).toContainText("Underlay");
    await expect(suggestionRows.nth(2)).toContainText("Overlay");
    for (let index = 0; index < 3; index += 1) {
      const suggestionButton = suggestionRows.nth(index).getByRole("button");
      await expect(suggestionButton).toBeEnabled();
      await expect(suggestionButton).toHaveText(/^\d+\.\d{2}$/);
    }
    await expect(suggestedLayCard).toContainText("Calculated");

    const projectedPnlCard = editor
      .locator('.calculator-panel-card:has(.eyebrow:has-text("Projected PnL"))')
      .first();
    await expect(projectedPnlCard).toBeVisible();
    await expect(projectedPnlCard).not.toContainText("Calculated");

    const calculatedChips = editor.locator(".calculator-band-secondary .table-chip", {
      hasText: "Calculated",
    });
    await expect(calculatedChips).toHaveCount(1);
  } finally {
    await request.delete(
      `http://127.0.0.1:8010/profiles/${profileId}/free-bets/${createdRow.free_bet_id}`
    );
  }
});
