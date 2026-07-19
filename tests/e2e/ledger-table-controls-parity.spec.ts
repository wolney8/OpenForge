import { expect, test } from "@playwright/test";

test("Free Bets mirrors sportsbook-style table controls", async ({ page }) => {
  await page.goto("/profiles/profile-demo-001/tracker/free-bets");
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("columnheader", { name: "Expiry" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Lay Bet" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Back Bet" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Actions" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Delete free-bet row / }).first()).toBeVisible();

  await page.getByRole("button", { name: "Open free-bet filter and column controls" }).click();
  const dialog = page.getByRole("dialog", { name: "Free-bet filter controls" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Bookmaker", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Offer type (promotion mechanism)", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Issue type", { exact: true })).toBeVisible();
  await expect(dialog.locator('option[value="expiry-watch"]')).toHaveCount(1);
});

test("Casino Offers exposes consistent filter controls and actions column", async ({ page }) => {
  await page.goto("/profiles/profile-demo-001/tracker/casino-offers");
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("columnheader", { name: "Actions" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Delete casino-offer row / }).first()).toBeVisible();

  await page.getByRole("button", { name: "Open casino-offer filter and column controls" }).click();
  const dialog = page.getByRole("dialog", { name: "Casino-offer filter controls" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Bookmaker", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Offer type", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Result", { exact: true }).first()).toBeVisible();
  await expect(dialog.getByText("Issue type", { exact: true })).toBeVisible();
});

test("Cash Adjustments exposes consistent filter controls and actions column", async ({ page }) => {
  await page.goto("/profiles/profile-demo-001/tracker/cash-adjustments");
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("columnheader", { name: "Actions" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Delete cash-adjustment row / }).first()).toBeVisible();

  await page.getByRole("button", { name: "Open cash-adjustment filter and column controls" }).click();
  const dialog = page.getByRole("dialog", { name: "Cash-adjustment filter controls" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Direction", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Type", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Calc state", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Issue type", { exact: true })).toBeVisible();
});
