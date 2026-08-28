import { expect, test } from "@playwright/test";

const forbiddenPublicTerms = /bookmaker|exchange|subscriber|fund manager|profile|ledger|allowlist|route guard|account balance/i;

test.describe("pre-auth privacy and session controls", () => {
  test("uses neutral public error and not-found states", async ({ page }) => {
    await page.goto("/login?error=not_authorized");
    await expect(page.getByText("Access unavailable. Contact the administrator.")).toBeVisible();
    expect(await page.locator("body").innerText()).not.toMatch(forbiddenPublicTerms);

    await page.goto("/login?error=invalid_oauth_state");
    await expect(page.getByText("Unable to continue. Please try again.")).toBeVisible();
    expect(await page.locator("body").innerText()).not.toMatch(forbiddenPublicTerms);

    await page.goto("/route-that-does-not-exist");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await expect(page.locator('[data-pd-id="app-shell.top-bar"]')).toHaveCount(0);
    expect(await page.locator("body").innerText()).not.toMatch(forbiddenPublicTerms);
  });

  test("shows only the required-storage notice and an accurate policy", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => window.localStorage.removeItem("pd-required-storage-notice"));
    await page.goto("/login");
    const notice = page.locator('[data-pd-id="cookie-notice"]');
    await expect(notice).toBeVisible();
    const noticeBox = await notice.boundingBox();
    expect(noticeBox).not.toBeNull();
    expect(Math.abs((noticeBox?.x ?? 0) + (noticeBox?.width ?? 0) / 2 - 195)).toBeLessThanOrEqual(2);
    expect(Math.abs((noticeBox?.y ?? 0) + (noticeBox?.height ?? 0) - 832)).toBeLessThanOrEqual(2);
    await expect(notice).toHaveCSS("text-align", "center");
    await expect(notice.getByRole("button", { name: "Accept All" })).toHaveCount(0);
    await expect(notice.getByRole("button", { name: "Reject Optional" })).toHaveCount(0);
    await notice.getByRole("link", { name: "Cookie Policy" }).click();
    await expect(page.getByRole("heading", { name: "Cookie Policy" })).toBeVisible();
    await expect(page.locator('[data-pd-id="legal.cookies"] img')).toHaveCount(0);
    await expect(page.getByText("No analytics, advertising or marketing cookies are loaded.")).toBeVisible();
    await expect(page.locator('[data-pd-id="app-shell.top-bar"]')).toHaveCount(0);
    await expect.poll(() => page.locator(".legal-storage-table").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await page.evaluate(() => window.localStorage.setItem("openforge-theme", "light"));
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("stores the optional inactivity preference and warns before logout", async ({ page }) => {
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        json: {
          authenticated: true,
          email: "founder@example.invalid",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          name: "Demo Founder",
          role: "fund_manager",
        },
        status: 200,
      });
    });
    await page.goto("/account");
    const initialNotice = page.locator('[data-pd-id="cookie-notice"]');
    if (await initialNotice.isVisible()) {
      await initialNotice.getByRole("button", { name: "Understood" }).click();
    }
    const autoLogout = page.locator('[data-pd-id="fund-manager-account.auto-logout"]');
    await expect(autoLogout).toHaveAttribute("aria-pressed", "false");
    await autoLogout.click();
    await page.locator('[data-pd-id="fund-manager-account.auto-logout-timeout"]').selectOption("15");
    await expect.poll(() => page.evaluate(() => window.localStorage.getItem("pd-session-security:founder@example.invalid"))).toContain('"timeoutMinutes":15');

    await page.evaluate(() => {
      window.localStorage.setItem("pd-session-activity", String(Date.now() - 14.5 * 60_000));
    });
    await expect(page.getByRole("dialog", { name: "Your session is about to expire" })).toBeVisible({ timeout: 3_000 });
    await page.getByRole("button", { name: "Stay signed in" }).click();
    await expect(page.getByRole("dialog", { name: "Your session is about to expire" })).toHaveCount(0);

    await page.locator('[data-pd-id="fund-manager-account.cookie-information"]').click();
    await expect(page.locator('[data-pd-id="cookie-notice"]')).toBeVisible();
    await page.locator('[data-pd-id="cookie-notice"]')
      .getByRole("button", { name: "Understood" })
      .click();

    await page.route("**/api/auth/logout", async (route) => route.fulfill({ status: 204 }));
    await page.evaluate(() => {
      window.localStorage.setItem("pd-session-activity", String(Date.now() - 16 * 60_000));
    });
    await expect(page).toHaveURL(/\/login\?error=session_expired$/, { timeout: 3_000 });
  });

  test("broadcasts logout to another authenticated tab", async ({ context }) => {
    await context.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        json: {
          authenticated: true,
          email: "founder@example.invalid",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          name: "Demo Founder",
          role: "fund_manager",
        },
        status: 200,
      });
    });

    const firstTab = await context.newPage();
    const secondTab = await context.newPage();
    await Promise.all([firstTab.goto("/account"), secondTab.goto("/account")]);
    await expect(secondTab.locator('[data-pd-id="fund-manager-account.auto-logout"]')).toBeVisible();

    await firstTab.evaluate(() => {
      window.localStorage.setItem("pd-session-logout", String(Date.now()));
    });
    await expect(secondTab).toHaveURL(/\/login\?error=session_expired$/, { timeout: 3_000 });
  });
});
