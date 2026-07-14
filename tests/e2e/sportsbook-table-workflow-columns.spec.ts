import { expect, test } from "@playwright/test";

test("Sportsbook table uses workflow-first columns and action buttons", async ({ page }) => {
  await page.goto("/profiles/profile-demo-001/tracker/sportsbook-bets");
  await page.waitForLoadState("networkidle");

  const headers = page.locator(".data-table thead th");
  await expect(headers).toContainText([
    "Settles",
    "Bookmaker",
    "Event",
    "Campaign Tag",
    "Offer Details",
    "Strategy",
    "Lay Bet",
    "Back Bet",
    "Value",
    "Status",
    "Actions",
  ]);

  const firstRow = page.locator(".data-table tbody tr").first();
  await expect(firstRow.getByRole("button").first()).toBeVisible();

  const settlesValues = await page
    .locator(".data-table tbody tr td:first-child")
    .allTextContents();
  expect(settlesValues.some((value) => /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/.test(value.trim()))).toBeTruthy();
  expect(settlesValues.every((value) => !/^\d{4}-\d{2}-\d{2}/.test(value.trim()))).toBeTruthy();

  await page.getByRole("button", { name: "Open sportsbook filter and column controls" }).click();
  await expect(page.getByRole("dialog", { name: "Sportsbook filter controls" })).toBeVisible();
});
