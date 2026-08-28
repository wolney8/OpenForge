import { expect, test } from "@playwright/test";

test.describe("Login to profiles shell", () => {
  test("moves from login to profiles to the selected profile tracker", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Sign In" })).toHaveCount(0);
    const googleLink = page.getByRole("link", { name: "Sign in with Google" });
    await googleLink.focus();
    await expect(googleLink).toBeFocused();
    await expect(googleLink.locator(".google-brand-icon")).toBeVisible();
    await expect(page.locator('[data-pd-id="auth.registration"]')).toBeVisible();
    await expect(page.locator('[data-pd-id="app-navigation.trigger"]')).toHaveCount(0);
    await expect(page.locator('[data-pd-id="global-search.input"]')).toHaveCount(0);
    await expect(page.locator('[data-pd-id="notifications.trigger"]')).toHaveCount(0);
    await expect(page.locator('[data-pd-id="app-shell.top-bar"]')).toHaveCount(0);
    await expect(page.locator('[data-pd-id="app-shell.theme-toggle"]')).toHaveCount(0);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    const cookieNotice = page.locator('[data-pd-id="cookie-notice"]');
    if (await cookieNotice.isVisible()) {
      await cookieNotice.getByRole("button", { name: "Understood" }).click();
    }

    const panelBox = await page.locator('[data-pd-id="auth.login.panel"]').boundingBox();
    const logoBox = await page.locator(".brand-logo-login").boundingBox();
    const googleBox = await googleLink.boundingBox();
    if (!panelBox || !logoBox || !googleBox) throw new Error("Expected login geometry");
    expect(Math.abs(logoBox.x + logoBox.width / 2 - (panelBox.x + panelBox.width / 2))).toBeLessThan(2);
    expect(googleBox.y - (logoBox.y + logoBox.height)).toBeGreaterThanOrEqual(16);

    await page.locator('[data-pd-id="auth.registration"]').click();
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole("heading", { name: "Registration" })).toBeVisible();
    await expect(page.getByText("Registration is not available yet.")).toBeVisible();
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
