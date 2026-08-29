import { expect, test } from "@playwright/test";

const session = {
  authenticated: true,
  email: "founder@example.invalid",
  expires_at: 2_100_000_000,
  name: "Demo Founder",
  role: "fund_manager",
};

test.describe("Fund Manager identity shell", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({ contentType: "application/json", json: session, status: 200 });
    });
    await page.route("**/api/auth/activity", async (route) => {
      await route.fulfill({ status: 204 });
    });
  });

  test("shows the authenticated role and opens account details", async ({ page }) => {
    await page.goto("/profiles");
    const trigger = page.locator('[data-pd-id="fund-manager-identity.trigger"]');
    await expect(trigger).toBeVisible();
    await expect(trigger).toContainText("Fund Manager");
    await trigger.click();
    await expect(page.locator('[data-pd-id="fund-manager-identity.menu"]')).toContainText(
      "Demo Founder"
    );
    await expect(page.locator('[data-pd-id="fund-manager-identity.menu"]')).toContainText(
      "founder@example.invalid"
    );
    await page.locator('[data-pd-id="fund-manager-identity.account"]').click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.locator('[data-pd-id="fund-manager-account.identity"]')).toContainText(
      "Google OAuth"
    );
  });

  test("keeps logout available from the identity menu", async ({ page }) => {
    await page.route("**/api/auth/logout", async (route) => {
      await route.fulfill({ status: 204 });
    });
    await page.goto("/profiles");
    await page.locator('[data-pd-id="fund-manager-identity.trigger"]').click();
    await page.locator('[data-pd-id="fund-manager-identity.logout"]').click();
    await expect(page).toHaveURL(/\/login\?signed_out=1$/);
  });
});
