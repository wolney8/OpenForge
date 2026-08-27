import { expect, test } from "@playwright/test";

const settingsPath = "/profiles/profile-demo-001/tracker/settings";

test("profile settings use keyboard-accessible section tabs and retain deep links", async ({ page }) => {
  const duplicateKeyErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("same key")) {
      duplicateKeyErrors.push(message.text());
    }
  });
  await page.goto(settingsPath);

  const tabs = page.getByRole("tablist", { name: "Profile settings sections" });
  const defaults = tabs.getByRole("tab", { name: "Defaults" });
  const importExport = tabs.getByRole("tab", { name: "Import/Export" });

  await expect(defaults).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: /Settings for .* Profile/ })).toBeVisible();
  await expect(page.getByRole("tabpanel", { name: "Defaults" })).toBeVisible();
  await expect(page.getByRole("tabpanel", { name: "Import/Export" })).toBeHidden();
  await expect(
    page.getByLabel("Tracker date settings").getByRole("button", { name: "Save" })
  ).toBeDisabled();
  const guidedEntry = page.locator('[data-pd-id="profile-settings.defaults.guided-entry-mode"]');
  await expect(guidedEntry).toBeVisible();
  await expect
    .poll(async () =>
      guidedEntry.locator("option").evaluateAll((options) =>
        options.map((option) => (option as HTMLOptionElement).value)
      )
    )
    .toEqual(["on", "off"]);

  await defaults.focus();
  await page.keyboard.press("ArrowRight");
  await expect(importExport).toBeFocused();
  await expect(importExport).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(`${settingsPath}#import-export`);
  await expect(page.getByRole("tabpanel", { name: "Import/Export" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Import/Export" })).toBeVisible();

  await page.keyboard.press("End");
  const quickActions = tabs.getByRole("tab", { name: "Quick Actions" });
  await expect(quickActions).toBeFocused();
  await expect(tabs.getByRole("tab", { name: "Account Access" })).toHaveCount(0);
  await expect(page).toHaveURL(`${settingsPath}#quick-actions`);
  await expect(page.getByRole("tabpanel", { name: "Quick Actions" })).toBeVisible();

  await page.reload();
  await expect(quickActions).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel", { name: "Quick Actions" })).toBeVisible();
  expect(duplicateKeyErrors).toEqual([]);
});
