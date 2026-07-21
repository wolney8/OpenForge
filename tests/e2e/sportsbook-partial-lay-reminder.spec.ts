import { expect, test } from "@playwright/test";

test("part-laid rows persist, filter, and explicitly resolve follow-up reminders", async ({
  page,
  request,
}) => {
  test.setTimeout(180_000);
  const profileId = "profile-demo-001";
  const eventName = "Synthetic Partial Lay Reminder E2E";
  const settingsUrl = `http://127.0.0.1:8010/profiles/${profileId}/tracker-settings`;

  const settingsResponse = await request.get(settingsUrl);
  expect(settingsResponse.ok()).toBeTruthy();
  const originalSettings = (await settingsResponse.json()) as Record<string, unknown>;
  const settingsPayload = {
    active_date_preset: "Custom",
    custom_start_date: "2026-07-21",
    custom_end_date: "2026-07-23",
    range_back_days: originalSettings.range_back_days,
    range_forward_days: originalSettings.range_forward_days,
    mug_bet_frequency_days: originalSettings.mug_bet_frequency_days,
    free_bet_expiry_alert_window_days:
      originalSettings.free_bet_expiry_alert_window_days,
    use_global_date_range_toggle: originalSettings.use_global_date_range_toggle,
    this_month_mode: originalSettings.this_month_mode,
    default_free_bet_underlay_factor: originalSettings.default_free_bet_underlay_factor,
    default_free_bet_overlay_factor: originalSettings.default_free_bet_overlay_factor,
    default_bonus_retention_percent: originalSettings.default_bonus_retention_percent,
    default_exchange_name: originalSettings.default_exchange_name,
  };
  const rangeResponse = await request.put(settingsUrl, { data: settingsPayload });
  expect(rangeResponse.ok()).toBeTruthy();

  const existingRowsResponse = await request.get(
    `http://127.0.0.1:8010/profiles/${profileId}/sportsbook-bets`
  );
  expect(existingRowsResponse.ok()).toBeTruthy();
  const existingRows = (await existingRowsResponse.json()) as Array<{
    sportsbook_bet_id: string;
    event_name: string;
  }>;
  for (const existingRow of existingRows.filter((row) => row.event_name === eventName)) {
    await request.delete(
      `http://127.0.0.1:8010/profiles/${profileId}/sportsbook-bets/${existingRow.sportsbook_bet_id}`
    );
  }

  let sportsbookBetId = "";

  try {

  await page.setViewportSize({ width: 1180, height: 820 });
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
        offer_text: "Synthetic partial-lay reminder",
        bookmaker: "Bookmaker A",
        offer_type: "Bet & Get",
        bet_type: "Single",
        offer_name: "Synthetic reminder fixture",
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
        exchange_name: "Matchbook",
        date_settled: "2026-07-22T20:00:00Z",
        user_notes: "",
        manual_override_value: "",
        manual_override_reason: "",
      },
    }
  );
  expect(createResponse.ok()).toBeTruthy();
  const createdRow = (await createResponse.json()) as { sportsbook_bet_id: string };
  sportsbookBetId = createdRow.sportsbook_bet_id;
  let rowSaveRequestCount = 0;
  page.on("request", (requestEvent) => {
    const pathname = new URL(requestEvent.url()).pathname;
    if (
      requestEvent.method() === "PUT" &&
      pathname.endsWith(`/sportsbook-bets/${sportsbookBetId}`)
    ) {
      rowSaveRequestCount += 1;
    }
  });

  await page.goto(
    `/profiles/${profileId}/tracker/sportsbook-bets?record=${sportsbookBetId}`
  );
  await expect(page.getByText("Loading sportsbook ledger")).toBeHidden({ timeout: 30_000 });

  const editor = page.locator(".workflow-editor-modal");
  await expect(editor).toBeVisible();
  const partialLayPanel = editor.getByLabel("Partial lay legs");
  await expect(partialLayPanel).toContainText("4.78");
  const partialExchange = partialLayPanel.getByLabel("Partial leg 1");
  const partialLayOdds = partialLayPanel.getByLabel("Lay odds");
  const removePartialLeg = partialLayPanel.getByRole("button", { name: "Remove lay leg" });
  const partialLegGeometry = await Promise.all([
    partialExchange.boundingBox(),
    partialLayOdds.boundingBox(),
    removePartialLeg.boundingBox(),
  ]);
  expect(partialLegGeometry[0]).not.toBeNull();
  expect(partialLegGeometry[1]).not.toBeNull();
  expect(partialLegGeometry[2]).not.toBeNull();
  expect(partialLegGeometry[0]!.x + partialLegGeometry[0]!.width).toBeLessThanOrEqual(
    partialLegGeometry[1]!.x
  );
  expect(partialLegGeometry[2]!.width).toBeCloseTo(37.6, 0);
  expect(partialLegGeometry[2]!.height).toBeCloseTo(37.6, 0);
  await expect(removePartialLeg.locator(".material-symbols-outlined")).toHaveText("delete");
  await expect(
    editor.getByRole("button", { name: "Lay Placed but Partially Matched" })
  ).toBeDisabled();
  await expect(editor.getByRole("button", { name: "Lay Fully Placed" })).toBeEnabled();
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editor).toBeHidden();
  expect(rowSaveRequestCount).toBe(1);
  await page.getByRole("searchbox", { name: "Search sportsbook rows" }).fill(eventName);
  const row = page.locator(".data-table tbody tr", { hasText: eventName }).first();
  await expect(row).toContainText("Part Laid", { timeout: 15_000 });
  await row.click();
  await expect(editor).toBeVisible();
  await editor.getByLabel("Event name").fill(`${eventName} updated`);
  await editor.getByRole("button", { name: "Set partial-lay reminder" }).click();

  const reminderControls = editor.getByLabel("Partial-lay reminder controls");
  await expect(reminderControls).toBeVisible();
  await expect(reminderControls.getByLabel("Recheck due")).toHaveValue(
    "2026-07-22T18:00"
  );
  await expect(page.locator('[role="dialog"]:visible')).toHaveCount(1);
  await reminderControls.getByRole("button", { name: "Save Reminder" }).click();
  await expect(reminderControls).toBeHidden();
  await expect(editor).toBeVisible();
  await expect.poll(() => rowSaveRequestCount).toBe(2);

  const autosavedRowResponse = await request.get(
    `http://127.0.0.1:8010/profiles/${profileId}/sportsbook-bets/${sportsbookBetId}`
  );
  expect(autosavedRowResponse.ok()).toBeTruthy();
  expect((await autosavedRowResponse.json()).event_name).toBe(`${eventName} updated`);

  const reviewReminderButton = editor.getByRole("button", {
    name: "Review partial-lay reminder",
  });
  await expect(reviewReminderButton).toBeVisible({ timeout: 10_000 });
  await reviewReminderButton.click({ timeout: 10_000 });
  await expect(reminderControls).toBeVisible({ timeout: 10_000 });
  await reminderControls
    .getByLabel("Resolution or dismissal note")
    .fill("Remaining exposure reviewed and accepted.");
  await reminderControls.scrollIntoViewIfNeeded();

  const geometry = await reminderControls.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
      pageScrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(1180);
  expect(geometry.bottom).toBeLessThanOrEqual(820);
  expect(geometry.pageScrollWidth).toBeLessThanOrEqual(geometry.viewportWidth);

  await reminderControls.getByRole("button", { name: "Resolve" }).click();
  await expect(reminderControls).toBeHidden();
  const setNewReminder = editor.getByRole("button", {
    name: "Set new partial-lay reminder",
  });
  await expect(setNewReminder).toBeVisible();
  await setNewReminder.click();
  await expect(reminderControls.getByLabel("Reason (optional)")).toHaveValue("");
  await reminderControls.getByRole("button", { name: "Save New Reminder" }).click();
  await expect(reminderControls).toBeHidden();
  const reopenedReminderResponse = await request.get(
    `http://127.0.0.1:8010/profiles/${profileId}/sportsbook-bets/${sportsbookBetId}`
  );
  expect(reopenedReminderResponse.ok()).toBeTruthy();
  expect((await reopenedReminderResponse.json()).partial_lay_reminder_state).toBe("Active");
  await editor.getByRole("button", { name: "Close sportsbook editor" }).first().click();
  await row.hover();
  await expect(row.locator(".row-issue-overlay")).toContainText("Lay Recheck");

  await page
    .getByRole("button", { name: "Open sportsbook filter and column controls" })
    .click();
  const filterDialog = page.getByRole("dialog", { name: "Sportsbook filter controls" });
  await filterDialog.getByLabel("Issue type").selectOption("lay-recheck");
  await filterDialog.getByRole("button", { name: "Done" }).click();
  await expect(row).toBeVisible();
  } finally {
    if (sportsbookBetId) {
      await request.delete(
        `http://127.0.0.1:8010/profiles/${profileId}/sportsbook-bets/${sportsbookBetId}`
      );
    }
    const restorePayload = {
      active_date_preset: originalSettings.active_date_preset,
      custom_start_date: originalSettings.custom_start_date,
      custom_end_date: originalSettings.custom_end_date,
      range_back_days: originalSettings.range_back_days,
      range_forward_days: originalSettings.range_forward_days,
      mug_bet_frequency_days: originalSettings.mug_bet_frequency_days,
      free_bet_expiry_alert_window_days:
        originalSettings.free_bet_expiry_alert_window_days,
      use_global_date_range_toggle: originalSettings.use_global_date_range_toggle,
      this_month_mode: originalSettings.this_month_mode,
      default_free_bet_underlay_factor: originalSettings.default_free_bet_underlay_factor,
      default_free_bet_overlay_factor: originalSettings.default_free_bet_overlay_factor,
      default_bonus_retention_percent: originalSettings.default_bonus_retention_percent,
      default_exchange_name: originalSettings.default_exchange_name,
    };
    await request.put(settingsUrl, { data: restorePayload });
  }
});
