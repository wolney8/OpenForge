import { expect, test } from "@playwright/test";

test("Saving a new free-bet row returns the user to the ledger table", async ({ page }) => {
  await page.goto("/profiles/profile-demo-001/tracker/free-bets");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Add free-bet row" }).click();

  const editor = page.locator(".workflow-editor-panel");
  await expect(editor).toContainText("Create free-bet row");

  await editor.getByLabel("Bookmaker").selectOption("Bookmaker A");
  await editor.getByLabel("Offer type").selectOption("Bet & Get");
  await editor.getByLabel("Event name").fill("Free Bet Save Return Match");
  await editor.getByLabel("Status").selectOption("Available");

  await editor.getByRole("button", { name: "Save" }).click();

  await expect(page.locator(".workflow-editor-panel")).toHaveCount(0);
  await expect(page.locator(".data-table")).toBeVisible();
  await expect(page.locator(".status-toast")).toContainText("Created");
  await expect(page.locator(".data-table tbody tr", { hasText: "Free Bet Save Return Match" }).first()).toBeVisible();
});
