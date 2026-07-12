import { expect, test } from "@playwright/test";

test("Tracker settings bonus retention stays in workbook percent terms and feeds sportsbook refund defaults", async ({
  page,
  request,
}) => {
  const profileId = "profile-demo-001";
  const settingsResponse = await request.get(
    `http://127.0.0.1:8010/profiles/${profileId}/tracker-settings`
  );
  expect(settingsResponse.ok()).toBeTruthy();
  const settings = (await settingsResponse.json()) as Record<string, unknown>;

  const saveResponse = await request.put(
    `http://127.0.0.1:8010/profiles/${profileId}/tracker-settings`,
    {
      data: {
        active_date_preset: settings.active_date_preset,
        custom_start_date: settings.custom_start_date,
        custom_end_date: settings.custom_end_date,
        range_back_days: settings.range_back_days,
        range_forward_days: settings.range_forward_days,
        mug_bet_frequency_days: settings.mug_bet_frequency_days,
        free_bet_expiry_alert_window_days: settings.free_bet_expiry_alert_window_days,
        use_global_date_range_toggle: settings.use_global_date_range_toggle,
        this_month_mode: settings.this_month_mode,
        default_free_bet_underlay_factor: settings.default_free_bet_underlay_factor,
        default_free_bet_overlay_factor: settings.default_free_bet_overlay_factor,
        default_bonus_retention_percent: "72",
      },
    }
  );
  expect(saveResponse.ok()).toBeTruthy();

  await page.goto(`/profiles/${profileId}/tracker/settings`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByLabel("Default bonus retention percent")).toHaveValue("72");
  await expect(page.getByText("Bonus retention 72%")).toBeVisible();

  await page.goto(`/profiles/${profileId}/tracker/sportsbook-bets`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Add sportsbook row" }).click();
  await page.getByLabel("Offer type (promotion mechanism)").selectOption("Refund");
  await expect(page.getByLabel("Bonus retention %")).toHaveValue("72");
});
