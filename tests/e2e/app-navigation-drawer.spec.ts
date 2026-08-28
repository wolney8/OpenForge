import { expect, test } from "@playwright/test";

const drawerName = "Plum Duff navigation";

test.describe("Global application navigation drawer", () => {
  test("contains navigation, traps focus, and restores the trigger on dismissal", async ({ page }) => {
    await page.setViewportSize({ width: 1180, height: 820 });
    await page.goto("/profiles");

    const trigger = page.locator('[data-pd-id="app-navigation.trigger"]');
    const drawer = page.getByRole("dialog", { name: drawerName });
    const backdrop = page.locator('[data-pd-id="app-navigation.backdrop"]');
    const closeButton = page.locator('[data-pd-id="app-navigation.close"]');

    await trigger.click();
    await expect(drawer).toBeVisible();
    await expect(closeButton).toBeFocused();
    await expect(page.locator('[data-pd-id="app-navigation.profiles"]')).toHaveAttribute(
      "aria-current",
      "page"
    );
    await expect(page.locator('[data-pd-id="app-navigation.home"]')).toContainText("Home");
    await expect(page.locator('[data-pd-id^="app-navigation.profile."]')).toHaveCount(0);
    await expect(page.locator('[data-pd-id="app-navigation.account-catalogue"]')).toBeVisible();
    await expect(page.locator('[data-pd-id="app-navigation.notifications"]')).toBeVisible();
    await expect(page.locator('[data-pd-id="app-navigation.reports"]')).toBeVisible();

    const openState = await page.evaluate(() => ({
      appFrameInert: document.querySelector(".app-frame")?.hasAttribute("inert"),
      bodyOverflow: document.body.style.overflow,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(openState.appFrameInert).toBe(true);
    expect(openState.bodyOverflow).toBe("hidden");
    expect(openState.scrollWidth).toBeLessThanOrEqual(openState.clientWidth + 1);

    await expect(page.locator('[data-pd-id="app-navigation.registration-requests"]')).toContainText(
      "Registration Requests"
    );
    await expect(page.locator('[data-pd-id="app-navigation.logout"]')).toContainText("Logout");
    await page.locator('[data-pd-id="app-navigation.logout"]').focus();
    await page.keyboard.press("Tab");
    await expect(closeButton).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");

    await trigger.click();
    await backdrop.click({ position: { x: 1000, y: 400 } });
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("preserves profile context and fits mobile, theme, and reduced-motion states", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 720 });
    await page.goto("/profiles/profile-demo-001/tracker/sportsbook-bets");

    const trigger = page.locator('[data-pd-id="app-navigation.trigger"]');
    const drawer = page.getByRole("dialog", { name: drawerName });

    await trigger.click();
    await expect(drawer).toBeVisible();
    await expect(page.locator('[data-pd-id="app-navigation.tracker"]')).toHaveCount(0);
    await expect(page.locator('[data-pd-id="app-navigation.profile-context"]')).toBeVisible();

    const firstGeometry = await drawer.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        bottom: bounds.bottom,
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
        transitionDuration: style.transitionDuration,
      };
    });
    expect(firstGeometry.left).toBeGreaterThanOrEqual(0);
    expect(firstGeometry.top).toBeGreaterThanOrEqual(0);
    expect(firstGeometry.right).toBeLessThanOrEqual(390);
    expect(firstGeometry.bottom).toBeLessThanOrEqual(720);
    expect(firstGeometry.transitionDuration).toBe("0s");

    await page.locator('[data-pd-id="app-navigation.close"]').click();
    await page.locator('[data-pd-id="app-shell.theme-toggle"]').click();
    await trigger.click();
    const secondBackground = await drawer.evaluate(
      (element) => getComputedStyle(element).backgroundColor
    );
    expect(secondBackground).not.toBe(firstGeometry.background);

    await page.locator('[data-pd-id="app-navigation.settings"]').click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(drawer).toBeHidden();
  });

  test("reports a failed logout instead of claiming the session ended", async ({ page }) => {
    await page.route("**/api/auth/logout", async (route) => {
      await route.fulfill({ status: 503, body: "Unavailable" });
    });
    await page.goto("/profiles");
    await page.locator('[data-pd-id="app-navigation.trigger"]').click();
    await page.locator('[data-pd-id="app-navigation.logout"]').click();

    await expect(page.locator(".app-navigation-drawer .error-text")).toHaveText(
      "Could not sign out. Please try again."
    );
    await expect(page).toHaveURL(/\/profiles$/);
    await expect(page.locator('[data-pd-id="app-navigation.logout"]')).toBeEnabled();
  });
});
