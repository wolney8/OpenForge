import { expect, test } from "@playwright/test";

test("Free Bets calculator uses best-value wording and a single Calculated chip", async ({ page }) => {
  await page.goto("/profiles/profile-demo-001/tracker/free-bets");
  await page.waitForLoadState("networkidle");

  const firstRow = page.locator(".data-table tbody tr").first();
  await expect(firstRow).toBeVisible();
  await firstRow.click();

  const editor = page.locator(".workflow-editor-panel");
  await expect(editor).toBeVisible();

  const suggestedLayCard = editor
    .locator('.calculator-panel-card:has(.eyebrow:has-text("Suggested lay"))')
    .first();
  await expect(suggestedLayCard).toBeVisible();
  await expect(suggestedLayCard).toContainText("Best-value lay suggestion");
  await expect(suggestedLayCard.getByRole("button", { name: "1.43" })).toBeVisible();
  await expect(suggestedLayCard.getByRole("button", { name: "1.33" })).toBeVisible();
  await expect(suggestedLayCard.getByRole("button", { name: "1.86" })).toBeVisible();
  await expect(suggestedLayCard).toContainText("Calculated");

  const projectedPnlCard = editor
    .locator('.calculator-panel-card:has(.eyebrow:has-text("Projected PnL"))')
    .first();
  await expect(projectedPnlCard).toBeVisible();
  await expect(projectedPnlCard).not.toContainText("Calculated");

  const calculatedChips = editor.locator(".calculator-band-secondary .table-chip", {
    hasText: "Calculated",
  });
  await expect(calculatedChips).toHaveCount(1);
});
