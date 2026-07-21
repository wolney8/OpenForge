import { expect, test } from "@playwright/test";

const apiBaseUrl = "http://127.0.0.1:8010";

test("Free Bet follow-up stays inline and completes through Fund Manager notifications", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);
  const profileId = "profile-demo-002";
  const eventName = "Synthetic Free-Bet Reminder Match";
  let freeBetId = "";

  await page.addInitScript(() => {
    window.localStorage.removeItem("plum-duff:fund-manager-notifications:v1");
  });

  try {
    const commissionResponse = await request.put(
      `${apiBaseUrl}/profiles/${profileId}/exchange-commissions`,
      { data: { exchange_name: "Smarkets", commission_rate: "0.02" } }
    );
    expect(commissionResponse.ok()).toBeTruthy();

    const createResponse = await request.post(
      `${apiBaseUrl}/profiles/${profileId}/free-bets`,
      {
        data: {
          event_name: eventName,
          offer_text: "Synthetic reminder offer",
          bookmaker: "Bookmaker A",
          offer_type: "Bet & Get",
          bet_type: "Single",
          offer_name: "Synthetic free-bet reminder",
          fixture_type: "Football",
          status: "Available",
          result: "Pending",
          retention_mode: "SNR",
          free_bet_value: "10.00",
          back_odds: "5.00",
          match_strategy: "Standard",
          lay_odds_1: "5.20",
          lay_actual: "7.72",
          lay_matched_stake_1: "7.72",
          lay_commission_1: "",
          exchange_name: "Smarkets",
          expiry_datetime: "2099-07-24T20:00:00",
          date_settled: "",
          origin_qual_bet_id: "",
          offer_group_id: "",
          user_notes: "",
          manual_override_value: "",
          manual_override_reason: "",
        },
      }
    );
    expect(createResponse.ok()).toBeTruthy();
    freeBetId = ((await createResponse.json()) as { free_bet_id: string }).free_bet_id;

    await page.goto(
      `/profiles/${profileId}/tracker/free-bets?record=${freeBetId}&source=notifications`
    );
    const editor = page.locator('[data-pd-id="free-bets.editor.dialog"]');
    await expect(editor).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("dialog")).toHaveCount(1);

    await editor.getByRole("button", { name: "Follow-up" }).click();
    await editor
      .getByRole("button", { name: "Set free-bet follow-up reminder" })
      .click();
    const reminderControls = editor.locator(
      '[data-pd-id="free-bets.follow-up-reminder.inline-editor"]'
    );
    await expect(reminderControls).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await expect(
      reminderControls.locator('[data-pd-id="free-bets.follow-up-reminder.due"]')
    ).not.toHaveValue("");
    await reminderControls.getByRole("button", { name: "Save Reminder" }).click();
    await expect(reminderControls).toHaveCount(0);
    const savedRowResponse = await request.get(
      `${apiBaseUrl}/profiles/${profileId}/free-bets/${freeBetId}`
    );
    expect(savedRowResponse.ok()).toBeTruthy();
    expect((await savedRowResponse.json()).follow_up_reminder_state).toBe("Active");
    await editor.getByRole("button", { name: "Close free-bet editor" }).first().click();
    await expect(editor).toHaveCount(0);

    const notificationTrigger = page.locator('[data-pd-id="notifications.trigger"]');
    await expect(notificationTrigger.locator(".notification-count-badge")).toBeVisible();
    await notificationTrigger.click();
    const notificationCard = page.locator(
      `[data-pd-id="notifications.item.${freeBetId}"]`
    );
    await expect(notificationCard).toBeVisible();
    await expect(
      notificationCard.locator(`[data-pd-id="notifications.item.${freeBetId}.context"]`)
    ).toHaveText(`Free Bets · Bookmaker A · ${eventName}`);

    await notificationCard
      .getByRole("button", { name: /Mark task done/ })
      .click();
    await expect(page.locator('[data-pd-id="notifications.view.new"]')).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await expect(notificationCard).toHaveCount(0);
    await page.locator('[data-pd-id="notifications.view.done"]').click();
    await expect(notificationCard).toBeVisible();
    await expect(notificationCard).toContainText("Free-bet follow-up completed");
  } finally {
    if (freeBetId) {
      await request.delete(`${apiBaseUrl}/profiles/${profileId}/free-bets/${freeBetId}`);
    }
  }
});
