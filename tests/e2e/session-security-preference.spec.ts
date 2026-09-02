import { expect, test } from "@playwright/test";

test("Auto Logout moves optimistically, blocks duplicates, and reverts on failure", async ({ page }) => {
  await page.route("**/api/profiles", (route) => route.fulfill({ json: [] }));
  await page.route("**/fund-manager/import-executions", (route) =>
    route.fulfill({ body: "[]", contentType: "application/json", status: 200 })
  );
  await page.route("**/fund-manager/notifications**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const body = pathname.endsWith("/state")
      ? { dismissed_ids: [], read_keys: [] }
      : pathname.endsWith("/preferences")
        ? { preferences: {} }
        : [];
    return route.fulfill({ body: JSON.stringify(body), contentType: "application/json", status: 200 });
  });
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
  let releaseFirstSave: (() => void) | undefined;
  const firstSaveGate = new Promise<void>((resolve) => { releaseFirstSave = resolve; });
  await page.route("**/api/auth/security-preference", async (route) => {
    if (route.request().method() !== "PUT") {
      await route.continue();
      return;
    }
    if (shouldFail) {
      await firstSaveGate;
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
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(toggle).toHaveAttribute("aria-busy", "true");
  await expect(toggle).toBeDisabled();
  await expect(toggle.locator(".button-spinner")).toBeVisible();
  releaseFirstSave?.();
  await expect(page.getByText("Security preference was not saved. Try again.")).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(toggle).toBeEnabled();

  shouldFail = false;
  await toggle.click();
  await expect(page.getByText("Auto Logout is on after 30 minutes of inactivity.")).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
});

test("focus validates the session without recording meaningful activity", async ({ page }) => {
  await page.route("**/api/profiles", (route) => route.fulfill({ json: [] }));
  let sessionChecks = 0;
  let activityTouches = 0;
  await page.route("**/fund-manager/import-executions", (route) =>
    route.fulfill({ body: "[]", contentType: "application/json", status: 200 })
  );
  await page.route("**/fund-manager/notifications**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const body = pathname.endsWith("/state")
      ? { dismissed_ids: [], read_keys: [] }
      : pathname.endsWith("/preferences")
        ? { preferences: {} }
        : [];
    return route.fulfill({ json: body });
  });
  await page.route("**/api/auth/session", (route) => {
    sessionChecks += 1;
    const now = Math.floor(Date.now() / 1000);
    return route.fulfill({
      json: {
        authenticated: true,
        email: "founder@example.invalid",
        expires_at: now + 43_200,
        name: "Founder",
        role: "fund_manager",
        session_policy: {
          absolute_expires_at: now + 43_200,
          auto_logout_enabled: true,
          effective_expires_at: now + 1_800,
          inactivity_expires_at: now + 1_800,
          last_activity_at: now,
          preference_configured: true,
          timeout_minutes: 30,
          valid_now: true,
        },
      },
    });
  });
  await page.route("**/api/auth/activity", (route) => {
    activityTouches += 1;
    return route.fulfill({ json: {} });
  });

  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "My Account" })).toBeVisible();
  const checksBeforeFocus = sessionChecks;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect.poll(() => sessionChecks).toBeGreaterThan(checksBeforeFocus);
  expect(activityTouches).toBe(0);

  await page.keyboard.press("Tab");
  await expect.poll(() => activityTouches).toBe(1);
});
