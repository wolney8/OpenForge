import { expect, test } from "@playwright/test";

const freeBetRoute = "/profiles/profile-demo-001/tracker/free-bets";
const casinoRoute = "/profiles/profile-demo-001/tracker/casino-offers";

test("Free Bets editor summary cards use the consolidated parity slice", async ({ page }) => {
  await page.goto(freeBetRoute);
  await page.waitForLoadState("networkidle");

  await page.locator(".data-table tbody tr").first().click();

  const editor = page.locator(".workflow-editor-panel");
  await expect(editor).toBeVisible();

  const headerTitle = editor.locator(".workflow-header-title").first();
  await expect(headerTitle).toBeVisible();
  await expect(headerTitle).not.toHaveText(/^FB-/);

  const summary = editor.locator('.stat-strip[aria-label="Free-bet editor overview"]').first();
  await expect(summary).toBeVisible();

  const valueCard = summary.locator(".stat-card").first();
  await expect(valueCard).toContainText(/Current value|Final value/i);
  await expect(valueCard).toContainText("Status:");

  const expiryCard = summary.locator(".stat-card", {
    has: page.locator(".eyebrow", { hasText: "Expiry" }),
  });
  await expect(expiryCard).toContainText(/Await award|prospecting|matching plan|—/i);

  const matchingCard = summary.locator(".stat-card", {
    has: page.locator(".eyebrow", { hasText: "Lay and matching" }),
  });
  await expect(matchingCard).toContainText("Lay status:");

  const offerPathCard = summary.locator(".stat-card", {
    has: page.locator(".eyebrow", { hasText: "Offer path" }),
  });
  await expect(offerPathCard).toContainText(/•|Bookmaker and mode pending/);
});

test("Casino Offers editor summary cards use the consolidated parity slice", async ({ page }) => {
  await page.goto(casinoRoute);
  await page.waitForLoadState("networkidle");

  await page.locator(".data-table tbody tr").first().click();

  const editor = page.locator(".workflow-editor-panel");
  await expect(editor).toBeVisible();

  const headerTitle = editor.locator(".workflow-header-title").first();
  await expect(headerTitle).toBeVisible();
  await expect(headerTitle).not.toHaveText(/^CO-/);

  const summary = editor.locator('.stat-strip[aria-label="Casino-offer summary"]').first();
  await expect(summary).toBeVisible();

  const valueCard = summary.locator(".stat-card").first();
  await expect(valueCard).toContainText(/Current value|Final value|Resolved value|Value/i);
  await expect(valueCard).toContainText("Status:");

  const settlesCard = summary.locator(".stat-card", {
    has: page.locator(".eyebrow", { hasText: "Settles" }),
  });
  await expect(settlesCard).toContainText("Open:");

  const expiryCard = summary.locator(".stat-card", {
    has: page.locator(".eyebrow", { hasText: "Expiry" }),
  });
  await expect(expiryCard).toContainText(/Fill offer setup first|Pending|Win|Lose|Void|Mixed/i);

  const offerPathCard = summary.locator(".stat-card", {
    has: page.locator(".eyebrow", { hasText: "Offer path" }),
  });
  const offerPathSubtitle = offerPathCard.locator("span").last();
  await expect(offerPathSubtitle).not.toHaveText("");
});
