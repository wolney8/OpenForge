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
  const spreadsheet = tabs.getByRole("tab", { name: "Spreadsheet" });

  await expect(defaults).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: /Settings for .* Profile/ })).toBeVisible();
  await expect(page.getByRole("tabpanel", { name: "Defaults" })).toBeVisible();
  await expect(page.getByRole("tabpanel", { name: "Spreadsheet" })).toBeHidden();
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
  await expect(spreadsheet).toBeFocused();
  await expect(spreadsheet).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(`${settingsPath}#spreadsheet-transfer`);
  await expect(page.getByRole("tabpanel", { name: "Spreadsheet" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Spreadsheet transfer" })).toBeVisible();

  await page.keyboard.press("End");
  const quickAdd = tabs.getByRole("tab", { name: "Quick Add" });
  await expect(quickAdd).toBeFocused();
  await expect(tabs.getByRole("tab", { name: "Account Access" })).toHaveCount(0);
  await expect(page).toHaveURL(`${settingsPath}#quick-add`);
  await expect(page.getByRole("tabpanel", { name: "Quick Add" })).toBeVisible();

  await page.reload();
  await expect(quickAdd).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel", { name: "Quick Add" })).toBeVisible();
  expect(duplicateKeyErrors).toEqual([]);
});
