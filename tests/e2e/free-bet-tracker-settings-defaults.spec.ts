import { expect, test } from "@playwright/test";

test("Free Bets calculator uses profile tracker underlay and overlay defaults", async ({
  page,
  request,
}) => {
  const profileId = "profile-demo-001";

  const commissionResponse = await request.put(
    `http://127.0.0.1:8010/profiles/${profileId}/exchange-commissions`,
    {
      data: { exchange_name: "Smarkets", commission_rate: "0.02" },
    }
  );
  expect(commissionResponse.ok()).toBeTruthy();

  const settingsResponse = await request.put(
    `http://127.0.0.1:8010/profiles/${profileId}/tracker-settings`,
    {
      data: {
        active_date_preset: "Week (Mon-Sun)",
        custom_start_date: "",
        custom_end_date: "",
        range_back_days: 0,
        range_forward_days: 0,
        mug_bet_frequency_days: 14,
        free_bet_expiry_alert_window_days: 3,
        use_global_date_range_toggle: true,
        this_month_mode: "Calendar",
        default_free_bet_underlay_factor: "0.900",
        default_free_bet_overlay_factor: "1.400",
        default_bonus_retention_percent: "70",
      },
    }
  );
  expect(settingsResponse.ok()).toBeTruthy();

  await page.goto(`/profiles/${profileId}/tracker/free-bets`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Add free-bet row" }).click();

  const editor = page.locator(".workflow-editor-panel");
  await expect(editor).toBeVisible();

  await editor
    .locator('.content-subpanel:has(.eyebrow:text-is("Offer setup")) input')
    .first()
    .fill("Tracker settings factor test");
  await page.getByLabel("Bookmaker").selectOption({ index: 1 });
  await page.getByLabel("Offer type").selectOption("Bet & Get");
  await page.getByLabel("Event name").fill("Factor test event");
  await page.getByLabel("Status").selectOption("Placed");
  await page.getByLabel("Free-bet value").fill("10");
  await page.getByLabel("Back odds").fill("5");
  await page.getByLabel("Exchange").selectOption("Smarkets");
  await page.getByLabel("Lay odds 1").fill("5.2");

  const calculatorSection = editor.locator(
    '.content-subpanel:has(.eyebrow:text-is("Calculator panel"))'
  );
  await expect(calculatorSection).toContainText("Profile defaults: underlay 0.900 • overlay 1.400.");

  const suggestedLayCard = editor
    .locator('.calculator-panel-card:has(.eyebrow:has-text("Suggested lay"))')
    .first();
  await expect(suggestedLayCard.getByRole("button", { name: "7.72" })).toBeVisible();
  await expect(suggestedLayCard.getByRole("button", { name: "6.95" })).toBeVisible();
  await expect(suggestedLayCard.getByRole("button", { name: "10.81" })).toBeVisible();
});
