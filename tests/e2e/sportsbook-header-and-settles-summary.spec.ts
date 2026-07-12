import { expect, test } from "@playwright/test";

test("Sportsbook editor shows offer-based header title and settles status countdown", async ({ page }) => {
  await page.goto("/profiles/profile-demo-001/tracker/sportsbook-bets");
  await page.waitForLoadState("networkidle");

  await page.locator(".data-table tbody tr").first().click();

  const headerTitle = page.locator(".workflow-editor-panel .workflow-header-title").first();
  await expect(headerTitle).toBeVisible();

  const headerText = (await headerTitle.textContent())?.trim() ?? "";
  expect(headerText.length).toBeGreaterThan(0);
  expect(headerText.startsWith("SB-")).toBeFalsy();

  const settlesCard = page
    .locator('.workflow-editor-panel .stat-card:has(.eyebrow:has-text("Settles"))')
    .first();
  await expect(settlesCard).toBeVisible();

  const settlesSubtitle = settlesCard.locator("span").last();
  await expect(settlesSubtitle).toContainText("•");
  await expect(settlesSubtitle).toContainText(/in |ago|less than 1 hour/i);
});
