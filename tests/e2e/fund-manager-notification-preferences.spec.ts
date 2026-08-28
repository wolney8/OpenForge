import { expect, test } from "@playwright/test";

const preferencesKey = "plum-duff:fund-manager-notification-preferences:v1";

test("Fund Manager can persist notification source preferences", async ({ page }) => {
  await page.addInitScript((key) => {
    window.localStorage.removeItem(key);
  }, preferencesKey);

  await page.goto("/settings");
  await page.getByRole("tab", { name: "Notifications" }).click();

  const settings = page.locator('[data-pd-id="fund-manager-notifications.settings"]');
  const partialLayPreference = page.locator(
    '[data-pd-id="fund-manager-notifications.preference.partial_lay_reminder"] input'
  );
  const save = page.locator('[data-pd-id="fund-manager-notifications.save"]');

  await expect(settings).toBeVisible();
  await expect(partialLayPreference).toBeChecked();
  await expect(save).toBeDisabled();

  await page
    .locator('[data-pd-id="fund-manager-notifications.preference.partial_lay_reminder"]')
    .click();
  await expect(partialLayPreference).not.toBeChecked();
  await expect(save).toBeEnabled();
  await expect(settings.getByRole("status").first()).toHaveText("Unsaved Changes");

  await save.click();
  await expect(save).toBeDisabled();
  await expect(settings.getByRole("status").first()).toHaveText("Saved");

  await expect
    .poll(() =>
      page.evaluate((key) => window.localStorage.getItem(key), preferencesKey)
    )
    .toContain('"partial_lay_reminder":false');
});
