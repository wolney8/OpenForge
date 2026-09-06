import { expect, test } from "@playwright/test";

const forbiddenPublicTerms = /bookmaker|exchange|subscriber|fund manager|profile|ledger|allowlist|route guard|account balance/i;

test.describe("pre-auth privacy and session controls", () => {
  test("settles the authoritative session before mounting the protected shell", async ({ page }) => {
    let sessionRequests = 0;
    await page.route("**/api/auth/session", async (route) => {
      sessionRequests += 1;
      await new Promise((resolve) => setTimeout(resolve, 350));
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
    await page.route("**/api/profiles", (route) => route.fulfill({ json: [] }));
    await page.route("**/api/fund-manager/**", (route) => route.fulfill({ json: [] }));

    await page.goto("/profiles");
    await expect(page.locator('[data-pd-id="session.bootstrap"]')).toContainText("Checking session…");
    await expect(page.locator('[data-pd-id="app-shell.top-bar"]')).toHaveCount(0);
    await expect(page.locator('[data-pd-id="app-shell.top-bar"]')).toBeVisible();
    expect(sessionRequests).toBe(1);
  });

  test("redirects an expired authoritative session without exposing a usable shell", async ({ page }) => {
    await page.route("**/api/auth/session", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 150));
      await route.fulfill({ status: 401, json: { detail: "Session expired" } });
    });

    await page.goto("/profiles");
    await expect(page.locator('[data-pd-id="session.bootstrap"]')).toContainText("Checking session…");
    await expect(page.locator('[data-pd-id="app-shell.top-bar"]')).toHaveCount(0);
    await expect(page).toHaveURL(/\/login\?error=session_expired$/);
  });

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
    let autoLogoutEnabled = false;
    let timeoutMinutes = 30;
    let effectiveExpiresAt = Math.floor(Date.now() / 1000) + 3600;
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        json: {
          authenticated: true,
          email: "founder@example.invalid",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          name: "Demo Founder",
          role: "fund_manager",
          session_policy: {
            absolute_expires_at: Math.floor(Date.now() / 1000) + 3600,
            auto_logout_enabled: autoLogoutEnabled,
            effective_expires_at: effectiveExpiresAt,
            inactivity_expires_at: autoLogoutEnabled ? effectiveExpiresAt : null,
            last_activity_at: Math.floor(Date.now() / 1000),
            preference_configured: true,
            timeout_minutes: timeoutMinutes,
            valid_now: true,
          },
        },
        status: 200,
      });
    });
    await page.route("**/api/auth/security-preference", async (route) => {
      const payload = route.request().postDataJSON() as {
        auto_logout_enabled: boolean;
        timeout_minutes: number;
      };
      autoLogoutEnabled = payload.auto_logout_enabled;
      timeoutMinutes = payload.timeout_minutes;
      await route.fulfill({
        json: {
          ...payload,
          configured: true,
          updated_at: "2026-09-06T12:00:00Z",
        },
      });
    });
    await page.route("**/api/auth/activity", async (route) => {
      effectiveExpiresAt = Math.floor(Date.now() / 1000) + timeoutMinutes * 60;
      await route.fulfill({
        json: {
          session_policy: {
            absolute_expires_at: Math.floor(Date.now() / 1000) + 3600,
            auto_logout_enabled: autoLogoutEnabled,
            effective_expires_at: effectiveExpiresAt,
            inactivity_expires_at: effectiveExpiresAt,
            last_activity_at: Math.floor(Date.now() / 1000),
            preference_configured: true,
            timeout_minutes: timeoutMinutes,
            valid_now: true,
          },
        },
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

    effectiveExpiresAt = Math.floor(Date.now() / 1000) + 30;
    await page.evaluate(() => {
      window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
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
    effectiveExpiresAt = Math.floor(Date.now() / 1000) - 1;
    await page.evaluate(() => {
      window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
    });
    await expect(page).toHaveURL(/\/login\?error=session_expired$/, { timeout: 3_000 });
  });

  test("broadcasts logout to another authenticated tab", async ({ context }) => {
    let sessionValid = true;
    let sessionChecks = 0;
    await context.route("**/api/auth/session", async (route) => {
      sessionChecks += 1;
      if (!sessionValid) {
        await route.fulfill({ json: { authenticated: false }, status: 401 });
        return;
      }
      await route.fulfill({
        contentType: "application/json",
        json: {
          authenticated: true,
          email: "founder@example.invalid",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          name: "Demo Founder",
          role: "fund_manager",
          session_policy: {
            auto_logout_enabled: false,
            preference_configured: true,
            timeout_minutes: 30,
          },
        },
        status: 200,
      });
    });

    const firstTab = await context.newPage();
    const secondTab = await context.newPage();
    await Promise.all([firstTab.goto("/account"), secondTab.goto("/account")]);
    await expect(secondTab.locator('[data-pd-id="fund-manager-account.auto-logout"]')).toBeVisible();

    sessionValid = false;
    const checksBeforeEvent = sessionChecks;
    await firstTab.evaluate(() => {
      window.localStorage.removeItem("pd-session-logout");
      window.localStorage.setItem("pd-session-logout", `expired-${Date.now()}`);
    });
    await expect.poll(() => sessionChecks).toBeGreaterThan(checksBeforeEvent);
    await expect(secondTab.getByText("Your session ended. Sign in to continue.")).toBeVisible({
      timeout: 10_000,
    });
    expect(secondTab.url()).toMatch(/\/login\?error=session_expired$/);
  });

  test("ignores a stale logout event when the current session remains valid", async ({ context }) => {
    let sessionChecks = 0;
    await context.route("**/api/auth/session", async (route) => {
      sessionChecks += 1;
      await route.fulfill({
        json: {
          authenticated: true,
          email: "founder@example.invalid",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          name: "Demo Founder",
          role: "fund_manager",
          session_policy: {
            auto_logout_enabled: false,
            preference_configured: true,
            timeout_minutes: 30,
          },
        },
        status: 200,
      });
    });

    const firstTab = await context.newPage();
    const secondTab = await context.newPage();
    await Promise.all([firstTab.goto("/account"), secondTab.goto("/account")]);
    const checksBeforeEvent = sessionChecks;
    await firstTab.evaluate(() => {
      window.localStorage.removeItem("pd-session-logout");
      window.localStorage.setItem("pd-session-logout", `stale-${Date.now()}`);
    });
    await expect.poll(() => sessionChecks).toBeGreaterThan(checksBeforeEvent);
    await expect(secondTab).toHaveURL(/\/account$/);
    await expect(secondTab.getByRole("heading", { name: "My Account" })).toBeVisible();
  });

  test("ignores a stale protected-request 401 when the authoritative session is valid", async ({ page }) => {
    let sessionChecks = 0;
    await page.route("**/api/auth/session", async (route) => {
      sessionChecks += 1;
      await route.fulfill({
        json: {
          authenticated: true,
          email: "founder@example.invalid",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          name: "Demo Founder",
          role: "fund_manager",
          session_policy: {
            auto_logout_enabled: false,
            preference_configured: true,
            timeout_minutes: 30,
          },
        },
        status: 200,
      });
    });
    await page.route("**/api/profiles", (route) => route.fulfill({ json: [] }));
    await page.route(/\/search\?query=/, (route) =>
      route.fulfill({ json: { detail: "Stale request" }, status: 401 })
    );

    await page.goto("/profiles");
    const checksBeforeSearch = sessionChecks;
    await page.locator('[data-pd-id="global-search.input"]').fill("demo");
    await expect.poll(() => sessionChecks).toBeGreaterThan(checksBeforeSearch);
    await expect(page).toHaveURL(/\/profiles$/);
  });
});
