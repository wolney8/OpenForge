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

test("offer-name managers portal above settings and persist an added value", async ({ page }) => {
  const uniqueValue = `Playwright offer ${Date.now()}`;
  await page.goto(`${settingsPath}#offer-lists`);
  await page.getByRole("button", { name: "Manage" }).first().click();

  const dialog = page.getByRole("dialog", { name: "Manage Sportsbook And Free Bet Offer Names" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("xpath=.." )).toHaveAttribute("data-pd-id", "profile-settings.offer-names.backdrop");
  expect(await dialog.evaluate((element) => element.parentElement?.parentElement === document.body)).toBe(true);

  await dialog.getByLabel("Add offer name").fill(uniqueValue);
  await dialog.getByRole("button", { name: "Add Value" }).click();
  await expect(dialog.getByText(uniqueValue, { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: `Delete ${uniqueValue}` }).click();
  await expect(dialog.getByText(uniqueValue, { exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("casino offer names support add, edit, and delete in an adaptive dialog", async ({ page }) => {
  const uniqueValue = `Casino Playwright ${Date.now()}`;
  const editedValue = `${uniqueValue} edited`;
  await page.goto(`${settingsPath}#offer-lists`);
  await page.getByRole("button", { name: "Manage" }).nth(1).click();

  const dialog = page.getByRole("dialog", { name: "Manage Casino Offer Names" });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => element.parentElement?.parentElement === document.body)).toBe(true);

  const geometry = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const input = element.querySelector("input");
    return {
      insideViewport: rect.top >= 0 && rect.left >= 0 && rect.bottom <= innerHeight && rect.right <= innerWidth,
      contentSized: rect.height < innerHeight - 24,
      inputRadius: input ? Number.parseFloat(getComputedStyle(input).borderRadius) : 0,
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(geometry.insideViewport, JSON.stringify(geometry)).toBe(true);
  expect(geometry.contentSized, JSON.stringify(geometry)).toBe(true);
  expect(geometry.inputRadius).toBeGreaterThan(12);
  expect(geometry.pageOverflow).toBe(false);

  await dialog.getByLabel("Add casino offer name").fill(uniqueValue);
  await dialog.getByRole("button", { name: "Add Value" }).click();
  await expect(dialog.getByText(uniqueValue, { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: `Edit ${uniqueValue}` }).click();
  await dialog.getByLabel(`Edit ${uniqueValue}`).fill(editedValue);
  await dialog.getByRole("button", { name: `Save ${uniqueValue}` }).click();
  await expect(dialog.getByText(editedValue, { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: `Delete ${editedValue}` }).click();
  await expect(dialog.getByText(editedValue, { exact: true })).toHaveCount(0);
});

test("profile Quick Action editor is body-portalled and content-sized", async ({ page }) => {
  await page.goto(`${settingsPath}#quick-actions`);
  await page.getByRole("button", { name: "Add Action" }).first().click();

  const dialog = page.getByRole("dialog", { name: "Add Profile Quick Action" });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => element.parentElement?.parentElement === document.body)).toBe(true);
  await expect(dialog.getByLabel("Ledger")).toBeVisible();
  await expect(dialog.getByLabel("Action Label")).toBeVisible();

  const geometry = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      insideViewport: rect.top >= 0 && rect.left >= 0 && rect.bottom <= innerHeight && rect.right <= innerWidth,
      contentSized: rect.height < innerHeight - 24,
      centred: Math.abs((rect.top + rect.bottom) / 2 - innerHeight / 2) < 8,
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(geometry.insideViewport, JSON.stringify(geometry)).toBe(true);
  expect(geometry.contentSized, JSON.stringify(geometry)).toBe(true);
  expect(geometry.centred, JSON.stringify(geometry)).toBe(true);
  expect(geometry.pageOverflow).toBe(false);
});
