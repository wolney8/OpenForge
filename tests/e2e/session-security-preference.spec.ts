import { expect, test } from "@playwright/test";

test("Auto Logout changes only after the server persists the preference", async ({ page }) => {
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        authenticated: true,
        email: "founder@example.invalid",
        expires_at: 2_000_000_000,
        name: "Founder",
        role: "fund_manager",
        session_policy: {
          auto_logout_enabled: false,
          preference_configured: true,
          timeout_minutes: 30,
        },
      }),
    });
  });
  await page.route("**/api/auth/activity", async (route) => {
    await route.fulfill({ status: 204, body: "" });
  });
  let shouldFail = true;
  await page.route("**/api/auth/security-preference", async (route) => {
    if (route.request().method() !== "PUT") {
      await route.continue();
      return;
    }
    if (shouldFail) {
      await route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        auto_logout_enabled: true,
        configured: true,
        timeout_minutes: 30,
      }),
    });
  });

  await page.goto("/account");
  const toggle = page.locator('[data-pd-id="fund-manager-account.auto-logout"]');
  await expect(toggle).toHaveAttribute("aria-pressed", "false");

  await toggle.click();
  await expect(page.getByText("Security preference was not saved. Try again.")).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");

  shouldFail = false;
  await toggle.click();
  await expect(page.getByText("Security preference saved.")).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
});
