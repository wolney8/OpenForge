import { expect, test } from "@playwright/test";

test("Fund Manager can inspect and prepare account catalogue changes from the table view", async ({ page }) => {
  await page.goto("/settings#catalogue");

  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
  const catalogue = page.locator('[data-pd-id="account-catalogue.section"]');
  const summary = catalogue.getByLabel("Account Catalogue summary");
  await expect(summary.getByText("Bookmakers", { exact: true })).toBeVisible();
  await expect(summary.getByText("Exchanges", { exact: true })).toBeVisible();
  await expect(summary.getByText("Banks", { exact: true })).toBeVisible();
  await expect(summary.getByText("Active Providers", { exact: true })).toBeVisible();
  await expect(catalogue.locator('[data-pd-id="account-catalogue.table-scroll"]')).toBeVisible();
  await expect(catalogue.getByLabel("Account Catalogue top controls").getByText("Rows per page")).toBeVisible();
  await expect(catalogue.getByRole("link", { name: "Export", exact: true })).toBeVisible();
  await expect(catalogue.getByRole("button", { name: "Import", exact: true })).toBeVisible();
  await expect(catalogue.getByText("Check catalogue import validates", { exact: false })).toHaveCount(0);

  const controlGeometry = await catalogue.locator('[data-pd-id="account-catalogue.controls"]').evaluate((element) => {
    const filters = element.querySelector<HTMLElement>(".account-catalogue-filter-row");
    const actions = element.querySelector<HTMLElement>(".account-catalogue-action-row");
    if (!filters || !actions) return null;
    const filterRect = filters.getBoundingClientRect();
    const actionRect = actions.getBoundingClientRect();
    const actionControls = Array.from(actions.querySelectorAll<HTMLElement>("a, button"))
      .map((control) => control.getBoundingClientRect());
    return {
      actionsBelowFilters: actionRect.top >= filterRect.bottom,
      actionsShareRow: actionControls.every((rect) => Math.abs(rect.top - actionControls[0].top) < 2),
      rightAligned: Math.abs(actionRect.right - filterRect.right) < 2,
    };
  });
  expect(controlGeometry).not.toBeNull();
  expect(controlGeometry!.actionsBelowFilters, JSON.stringify(controlGeometry)).toBe(true);
  expect(controlGeometry!.actionsShareRow, JSON.stringify(controlGeometry)).toBe(true);
  expect(controlGeometry!.rightAligned, JSON.stringify(controlGeometry)).toBe(true);

  await catalogue.getByLabel("Search Account Catalogue").fill("Smarkets");
  await expect(catalogue.getByRole("cell", { name: "Smarkets", exact: true })).toBeVisible();

  const geometry = await catalogue.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      withinWidth: rect.left >= 0 && rect.right <= window.innerWidth,
      withinHeight: rect.top >= 0 && rect.bottom <= window.innerHeight,
      rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  });
  expect(geometry.withinWidth, JSON.stringify(geometry)).toBe(true);

  await catalogue.getByRole("button", { name: "Add Account" }).click();
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
  await expect(page.getByRole("dialog", { name: "Account Catalogue" })).toHaveCount(0);

  await expect(catalogue.locator('[data-pd-id="account-catalogue.brand-pill"]')).toContainText("Smarkets");
  await catalogue.getByRole("button", { name: "Edit Smarkets" }).click();
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

  const hasPageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(hasPageOverflow).toBe(false);
});
