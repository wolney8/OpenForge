import { expect, test } from "@playwright/test";

test("Sportsbook row action buttons open modal workflows without opening the editor", async ({
  page,
}) => {
  await page.goto("/profiles/profile-demo-001/tracker/sportsbook-bets");
  await page.waitForLoadState("networkidle");

  const row = page.locator(".data-table tbody tr").first();
  await expect(row).toBeVisible();

  const actionButtons = row.locator(".table-action-button");
  await expect(actionButtons.first()).toBeVisible();

  await actionButtons.first().click();
  await expect(page.locator('.modal-panel[aria-label="Update sportsbook outcome"]')).toBeVisible();
  await expect(page.locator(".workflow-editor-panel")).toHaveCount(0);

  await page.getByRole("button", { name: "Close outcome modal" }).click();
  await expect(page.locator('.modal-panel[aria-label="Update sportsbook outcome"]')).toHaveCount(0);
});
