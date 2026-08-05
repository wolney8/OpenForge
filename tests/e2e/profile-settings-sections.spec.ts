import { expect, test } from "@playwright/test";

const settingsPath = "/profiles/profile-demo-001/tracker/settings";

test("profile settings use keyboard-accessible section tabs and retain deep links", async ({ page }) => {
  await page.goto(settingsPath);

  const tabs = page.getByRole("tablist", { name: "Profile settings sections" });
  const defaults = tabs.getByRole("tab", { name: "Defaults" });
  const spreadsheet = tabs.getByRole("tab", { name: "Spreadsheet" });
  const accounts = tabs.getByRole("tab", { name: "Accounts" });

  await expect(defaults).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: /Settings for .* Profile/ })).toBeVisible();
  await expect(page.getByRole("tabpanel", { name: "Defaults" })).toBeVisible();
  await expect(page.getByRole("tabpanel", { name: "Spreadsheet" })).toBeHidden();
  await expect(
    page.getByLabel("Tracker date settings").getByRole("button", { name: "Save" })
  ).toBeDisabled();

  await defaults.focus();
  await page.keyboard.press("ArrowRight");
  await expect(spreadsheet).toBeFocused();
  await expect(spreadsheet).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(`${settingsPath}#spreadsheet-transfer`);
  await expect(page.getByRole("tabpanel", { name: "Spreadsheet" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Spreadsheet transfer" })).toBeVisible();

  await page.keyboard.press("End");
  await expect(accounts).toBeFocused();
  await expect(page).toHaveURL(`${settingsPath}#account-authorities`);
  await expect(page.getByRole("tabpanel", { name: "Accounts" })).toBeVisible();

  await page.reload();
  await expect(accounts).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel", { name: "Accounts" })).toBeVisible();
});
