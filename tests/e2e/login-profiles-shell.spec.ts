import { expect, test } from "@playwright/test";

test.describe("Login to profiles shell", () => {
  test("moves from login to profiles to the selected profile tracker", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
    const googleLink = page.getByRole("link", { name: "Sign in with Google" });
    await googleLink.focus();
    await expect(googleLink).toBeFocused();
    await expect(googleLink.locator(".google-brand-icon")).toBeVisible();
    await expect(page.locator('[data-pd-id="auth.registration"]')).toBeVisible();
    await expect(page.locator('[data-pd-id="app-navigation.trigger"]')).toHaveCount(0);
    await expect(page.locator('[data-pd-id="global-search.input"]')).toHaveCount(0);
    await expect(page.locator('[data-pd-id="notifications.trigger"]')).toHaveCount(0);
    await expect(page.locator('[data-pd-id="app-shell.theme-toggle"]')).toBeVisible();

    await page.locator('[data-pd-id="auth.registration"]').click();
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole("heading", { name: "Registration" })).toBeVisible();
    await expect(page.getByText("Subscriber registration is not available yet.")).toBeVisible();
    await page.locator('[data-pd-id="auth.registration.back"]').click();

    // Local Playwright keeps authentication disabled; hosted environments exercise OAuth.
    await page.goto("/profiles");

    await expect(page).toHaveURL(/\/profiles$/);
    await expect(page.getByRole("heading", { name: "Fund Manager Dashboard" })).toBeVisible();
    await expect(page.getByText("Profiles are isolated tracker containers.")).toHaveCount(0);

    const profileId = "profile-demo-001";
    await page.goto(`/profiles/${profileId}/tracker/dashboard`);

    await expect(page).toHaveURL(new RegExp(`/profiles/${profileId}/tracker/dashboard$`));

    await page.locator('[data-pd-id="profile-command.trigger"]').click();
    await expect(page.locator(`[data-pd-id="profile-command.profile.${profileId}"]`)).toHaveAttribute(
      "aria-current",
      "page"
    );

    const otherProfileButton = page
      .locator('[data-pd-id^="profile-command.profile."]:not([aria-current="page"])')
      .first();
    if ((await otherProfileButton.count()) > 0) {
      const beforeSelectionUrl = page.url();
      await otherProfileButton.click();
      await expect(page).toHaveURL(beforeSelectionUrl);
      await page.locator('[data-pd-id="profile-command.route.dashboard"]').click();
      await expect(page).toHaveURL(
        new RegExp(`/profiles/(?!${profileId})[^/]+/tracker/dashboard$`)
      );
    }
  });
});
