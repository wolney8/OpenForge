import { expect, test, type Page } from "@playwright/test";

const profile = {
  profile_id: "profile-demo-001",
  display_name: "Demo Profile",
  profile_code: "DEMO-001",
  status: "Active",
  tracking_start_date: "2026-01-01",
  management_fee_percent: "0.00",
  investment_fee_percent: "0.00",
  current_cash_snapshot: "0.00",
};

async function mockProfileDirectory(page: Page) {
  await page.route(/\/(?:api\/)?profiles\/?(?:\?.*)?$/, async (route) => {
    if (route.request().method() !== "GET" || route.request().resourceType() === "document") {
      return route.fallback();
    }
    await route.fulfill({ contentType: "application/json", status: 200, body: JSON.stringify([profile]) });
  });
  await page.route(/\/(?:api\/)?auth\/session\/?$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({
        authenticated: true,
        auth_provider: "google",
        email: "founder@example.invalid",
        linked_profile_ids: [profile.profile_id],
        name: "Synthetic Founder",
        role: "fund_manager",
      }),
    });
  });
  await page.route(/\/(?:api\/)?auth\/activity\/?$/, async (route) => {
    await route.fulfill({ status: 204 });
  });
  await page.route("**/api/profiles/profile-demo-001/**", async (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    const url = new URL(route.request().url());
    const body = url.pathname.endsWith("/tracker-settings")
      ? JSON.stringify({})
      : JSON.stringify([]);
    await route.fulfill({ contentType: "application/json", status: 200, body });
  });
}

test.describe("Profile lifecycle and shell routing", () => {
  test("exposes the existing Profile directory, onboarding, management, and archive lifecycle", async ({ page }) => {
    await mockProfileDirectory(page);
    await page.route("**/api/profiles/profile-demo-001", async (route) => {
      if (route.request().method() !== "PATCH") return route.fallback();
      expect(route.request().postDataJSON()).toEqual({ status: "Archived" });
      await route.fulfill({
        contentType: "application/json",
        status: 200,
        body: JSON.stringify({
          profile_id: "profile-demo-001",
          display_name: profile.display_name,
          profile_code: profile.profile_code,
          status: "Archived",
          tracking_start_date: "2026-01-01",
          management_fee_percent: "0.00",
          investment_fee_percent: "0.00",
          current_cash_snapshot: "0.00",
        }),
      });
    });

    await page.goto("/profiles");
    await expect(page.getByRole("heading", { name: "Profiles", exact: true }).first()).toBeVisible();
    await expect(page.locator('[data-pd-id="profiles.directory.panel"]')).toBeVisible();
    await expect(page.locator('[data-pd-id="profiles.add-profile"]')).toHaveAttribute("href", "/profiles/new");

    await Promise.all([
      page.waitForURL(/\/profiles\/new$/),
      page.locator('[data-pd-id="profiles.add-profile"]').click(),
    ]);
    await expect(page.locator('[data-pd-id="founder-onboarding.page"]')).toBeVisible();
    await expect(page.getByRole("heading", { name: "Create Profile", exact: true })).toBeVisible();
    await page.goto("/profiles");

    const row = page.locator('[data-pd-id="profiles.directory.row.profile-demo-001"]');
    await row.click();
    const drawer = page.getByRole("dialog", { name: /Profile details for/ });
    await expect(drawer).toBeVisible();
    await drawer.locator('[data-pd-id="profiles.drawer.archive"]').click();
    const confirmation = page.getByRole("alertdialog", { name: /Archive / });
    await expect(confirmation).toBeVisible();
    await confirmation.locator('[data-pd-id="profiles.archive.confirm"]').click();
    await expect(row.getByText("Archived", { exact: true })).toBeVisible();
  });

  test("uses a no-layout-shift shell progress line and canonical responsive analytics controls", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockProfileDirectory(page);
    await page.goto("/");
    const progress = page.locator('[data-pd-id="app-shell.loading-progress"]');
    await page.evaluate(() => window.dispatchEvent(new Event("plum-duff:shell-loading-start")));
    await expect(progress).toHaveClass(/is-active/);
    const geometry = await progress.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return { height: bounds.height, top: bounds.top, viewport: window.innerWidth };
    });
    expect(geometry.height).toBeLessThanOrEqual(4);
    expect(geometry.viewport).toBeGreaterThan(0);
    await page.evaluate(() => window.dispatchEvent(new Event("plum-duff:shell-loading-end")));
    await expect(progress).not.toHaveClass(/is-active/);

    const controls = page.locator(".fund-manager-control-bar.is-analytics");
    const profileScope = controls.locator(".fund-manager-control-slot-profile");
    const range = controls.locator(".fund-manager-control-slot-range");
    await expect(profileScope).toBeVisible();
    await expect(range).toBeVisible();
    const desktop = await Promise.all([profileScope, range].map((locator) => locator.evaluate((element) => element.getBoundingClientRect().width)));
    expect(desktop[0]).toBeGreaterThanOrEqual(288);
    expect(desktop[1]).toBeGreaterThanOrEqual(352);

    await page.setViewportSize({ width: 390, height: 780 });
    const narrow = await Promise.all([profileScope, range].map((locator) => locator.evaluate((element) => ({ left: element.getBoundingClientRect().left, width: element.getBoundingClientRect().width }))));
    expect(Math.abs(narrow[0].left - narrow[1].left)).toBeLessThanOrEqual(2);
    expect(Math.abs(narrow[0].width - narrow[1].width)).toBeLessThanOrEqual(2);
  });
});
