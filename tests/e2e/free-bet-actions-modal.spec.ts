import { expect, test } from "@playwright/test";

test("Free-bet row action buttons open modal workflows without opening the editor", async ({
  page,
}) => {
  await page.goto("/profiles/profile-demo-001/tracker/free-bets");
  await page.waitForLoadState("networkidle");

  const row = page.locator(".data-table tbody tr").first();
  await expect(row).toBeVisible();

  const actionButtons = row.locator(".table-action-button");
  await expect(actionButtons.nth(1)).toBeVisible();

  await actionButtons.nth(1).click();
  await expect(page.locator('.modal-panel[aria-label="Update free-bet outcome"]')).toBeVisible();
  await expect(page.locator(".workflow-editor-panel")).toHaveCount(0);

  await page.getByRole("button", { name: "Close free-bet outcome modal" }).click();
  await expect(page.locator('.modal-panel[aria-label="Update free-bet outcome"]')).toHaveCount(0);
});
