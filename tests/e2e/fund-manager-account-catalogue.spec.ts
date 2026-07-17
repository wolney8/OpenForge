import { expect, test } from "@playwright/test";

test("Fund Manager can inspect and prepare account catalogue changes", async ({ page }) => {
  await page.goto("/settings");

  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open Account Catalogue" }).click();

  const dialog = page.getByRole("dialog", { name: "Account Catalogue" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-pd-id="account-catalogue.table-scroll"]')).toBeVisible();

  const geometry = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      withinWidth: rect.left >= 0 && rect.right <= window.innerWidth,
      withinHeight: rect.top >= 0 && rect.bottom <= window.innerHeight,
      rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  });
  expect(geometry.withinWidth, JSON.stringify(geometry)).toBe(true);
  expect(geometry.withinHeight, JSON.stringify(geometry)).toBe(true);

  await dialog.getByLabel("Search Account Catalogue").fill("Smarkets");
  await expect(dialog.getByRole("cell", { name: "Smarkets", exact: true })).toBeVisible();

  await dialog.getByRole("button", { name: "Add Account" }).click();
  await expect(page.getByRole("dialog", { name: "Add Account" })).toBeVisible();
  await expect(page.getByLabel("Brand name")).toBeVisible();
  await expect(page.getByLabel("Operating countries")).toHaveValue("GB");
  await page.getByLabel("Brand name").fill("Demo Account");
  await page.getByLabel("Text colour hex").fill("#FFFFFF");
  await page.getByLabel("Background colour hex").fill("#000000");
  await page.getByLabel("Local logo filename").fill("demo-account.svg");
  await expect(page.getByLabel("Local logo filename")).toHaveValue("demo-account.svg");
  await expect(page.getByText("/account-logos/", { exact: true })).toBeVisible();
  await expect(page.getByText("Demo Account", { exact: true })).toHaveCSS("background-color", "rgb(0, 0, 0)");
  await page.getByRole("button", { name: "Back to Catalogue" }).click();
  await expect(page.getByRole("dialog", { name: "Account Catalogue" })).toBeVisible();

  await dialog.getByLabel("Search Account Catalogue").fill("Smarkets");
  await expect(dialog.locator('[data-pd-id="account-catalogue.brand-pill"]')).toContainText("Smarkets");
  await dialog.getByRole("button", { name: "Edit Smarkets" }).click();
  const editDialog = page.getByRole("dialog", { name: "Edit Account" });
  await expect(editDialog.getByRole("group", { name: "Brand colours" })).toBeVisible();
  await expect(editDialog.getByRole("button", { name: "Archive Account" })).toBeVisible();
  await expect(editDialog.getByRole("combobox", { name: "Status" })).toHaveCount(0);

  const canonicalDomain = editDialog.getByLabel("Canonical domain");
  const neighbouringField = editDialog.getByLabel("Source");
  await canonicalDomain.focus();
  const fieldSpacing = await Promise.all([
    canonicalDomain.boundingBox(),
    neighbouringField.boundingBox(),
  ]);
  expect(fieldSpacing[0]).not.toBeNull();
  expect(fieldSpacing[1]).not.toBeNull();
  expect(fieldSpacing[0]!.x + fieldSpacing[0]!.width + 5).toBeLessThan(fieldSpacing[1]!.x);

  await page.getByRole("button", { name: "Back to Catalogue" }).click();

  await page.getByRole("button", { name: "Close Account Catalogue" }).click();
  await expect(page.getByRole("button", { name: "Open Account Catalogue" })).toBeFocused();

  const hasPageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(hasPageOverflow).toBe(false);
});
