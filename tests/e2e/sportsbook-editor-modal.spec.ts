import { expect, test } from "@playwright/test";

test("Sportsbook row click opens the editor as a modal dialog", async ({ page }) => {
  await page.goto("/profiles/profile-demo-001/tracker/sportsbook-bets");
  await page.waitForLoadState("networkidle");

  const row = page.locator(".data-table tbody tr").first();
  await expect(row).toBeVisible();

  await row.click();

  const editorDialog = page.getByRole("dialog", { name: "Edit sportsbook row" });
  await expect(editorDialog).toBeVisible();
  await expect(editorDialog).toHaveClass(/workflow-editor-panel/);
});
