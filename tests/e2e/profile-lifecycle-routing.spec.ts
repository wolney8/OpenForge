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
  await page.route("**/profiles/profile-demo-001/**", async (route) => {
    if (route.request().method() !== "GET" || route.request().resourceType() === "document") {
      return route.fallback();
    }
    const url = new URL(route.request().url());
    const body = url.pathname.endsWith("/tracker-summary-sources")
      ? JSON.stringify({
          accounts: [],
          sportsbook_bets: [],
          free_bets: [],
          casino_offers: [],
          cash_adjustments: [],
          each_way_extra_places: [],
          balance_snapshots: [],
          fee_periods: [],
          tracker_settings: {
            active_date_preset: "Week (Mon-Sun)",
            custom_start_date: "",
            custom_end_date: "",
            range_back_days: 0,
            range_forward_days: 0,
          },
        })
      : url.pathname.endsWith("/tracker-settings")
        ? JSON.stringify({})
        : JSON.stringify([]);
    await route.fulfill({ contentType: "application/json", status: 200, body });
  });
}

test.describe("Profile lifecycle and shell routing", () => {
  test("exposes the existing Profile directory, onboarding, management, and archive lifecycle", async ({ page }) => {
    await mockProfileDirectory(page);
    let currentStatus = profile.status;
    await page.route(/\/(?:api\/)?profiles\/profile-demo-001$/, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ contentType: "application/json", status: 200, body: JSON.stringify({ ...profile, status: currentStatus }) });
        return;
      }
      if (route.request().method() !== "PATCH") return route.fallback();
      const payload = route.request().postDataJSON() as { status: string };
      expect(["Active", "Archived"]).toContain(payload.status);
      currentStatus = payload.status;
      await route.fulfill({
        contentType: "application/json",
        status: 200,
        body: JSON.stringify({
          profile_id: "profile-demo-001",
          display_name: profile.display_name,
          profile_code: profile.profile_code,
          status: currentStatus,
          tracking_start_date: "2026-01-01",
          management_fee_percent: "0.00",
          investment_fee_percent: "0.00",
          current_cash_snapshot: "0.00",
        }),
      });
    });

    await page.goto("/profiles");
    await expect(page.getByRole("heading", { name: "Profiles", exact: true }).first()).toBeVisible();
    await expect(page.locator('[data-pd-id="profiles.directory.panel"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-pd-id="profiles.add-profile"]')).toHaveAttribute("href", "/profiles/new");

    const row = page.locator('[data-pd-id="profiles.directory.row.profile-demo-001"]');
    const manageAction = page.locator('[data-pd-id="profiles.profile-demo-001.actions.manage"]');
    await expect(manageAction).toBeVisible();
    await expect(manageAction).toHaveAccessibleName("Manage Demo Profile");
    await expect(manageAction).toHaveAttribute("href", "/profiles/profile-demo-001/manage");

    await row.click();
    const drawer = page.getByRole("dialog", { name: /Profile details for/ });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("button", { name: "Archive Profile" })).toHaveCount(0);
    await expect(drawer.locator('[data-pd-id="profiles.drawer.manage"]')).toHaveAttribute("href", "/profiles/profile-demo-001/manage");
    await drawer.getByRole("button", { name: "Close profile details" }).click();

    await manageAction.click();
    await expect(page).toHaveURL(/\/profiles\/profile-demo-001\/manage$/);
    await expect(page.locator('[data-pd-id="profile-management.page"]')).toBeVisible();
    await expect(page.getByRole("tab", { name: "Lifecycle" })).toBeVisible();
    await expect(page.getByRole("tabpanel", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("tabpanel", { name: "Lifecycle" })).toBeHidden();
    await expect(page.locator('[role="tabpanel"]:visible')).toHaveCount(1);
    await page.getByRole("tab", { name: "Financial / Fees" }).click();
    await expect(page).toHaveURL(/#financial$/);
    await expect(page.getByRole("tabpanel", { name: "Financial / Fees" })).toBeVisible();
    await expect(page.getByRole("tabpanel", { name: "Overview" })).toBeHidden();
    await page.reload();
    await expect(page.getByRole("tab", { name: "Financial / Fees" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel", { name: "Financial / Fees" })).toBeVisible();
    const actionGroup = page.locator('[data-pd-id="profile-management.financial.actions"]');
    const actionGeometry = await actionGroup.evaluate((element) => {
      const controls = Array.from(element.children).map((child) => child.getBoundingClientRect());
      return {
        display: getComputedStyle(element).display,
        gap: Number.parseFloat(getComputedStyle(element).columnGap),
        separated: controls.length === 2 && controls[1].left - controls[0].right >= 11,
      };
    });
    expect(actionGeometry.display).toBe("flex");
    expect(actionGeometry.gap).toBeGreaterThanOrEqual(12);
    expect(actionGeometry.separated).toBe(true);
    await page.getByRole("tab", { name: "Financial / Fees" }).press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Accounts" })).toBeFocused();
    await expect(page.getByRole("tab", { name: "Accounts" })).toHaveAttribute("aria-selected", "true");
    await page.getByRole("tab", { name: "Accounts" }).press("Home");
    await expect(page.getByRole("tab", { name: "Overview" })).toBeFocused();
    await expect(page.locator('[role="tabpanel"]:visible')).toHaveCount(1);
    const desktopGeometry = await page.locator('[data-pd-id="profile-management.page"]').evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(desktopGeometry.scrollWidth).toBeLessThanOrEqual(desktopGeometry.clientWidth + 1);
    await page.locator('[data-pd-id="app-shell.theme-toggle"]').click();
    await expect(page.locator('[data-pd-id="profile-management.page"]')).toBeVisible();
    await page.setViewportSize({ width: 390, height: 780 });
    const narrowGeometry = await page.locator('[data-pd-id="profile-management.page"]').evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(narrowGeometry.scrollWidth).toBeLessThanOrEqual(narrowGeometry.clientWidth + 1);
    await page.getByRole("tab", { name: "Financial / Fees" }).click();
    const narrowActions = await actionGroup.evaluate((element) => ({
      contained: element.scrollWidth <= element.clientWidth + 1,
      gap: Number.parseFloat(getComputedStyle(element).columnGap),
    }));
    expect(narrowActions.contained).toBe(true);
    expect(narrowActions.gap).toBeGreaterThanOrEqual(12);
    await page.getByRole("tab", { name: "Lifecycle" }).click();
    const archiveAction = page.locator('[data-pd-id="profile-management.archive"]');
    await expect(archiveAction).toBeVisible();
    await archiveAction.click();
    const confirmation = page.getByRole("dialog", { name: "Archive Profile?" });
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole("button", { name: "Archive Profile" }).click();
    await expect(page.getByText("Profile archived.")).toBeVisible();
    await expect(page.locator(".profile-management-header-actions .badge")).toHaveText("Archived");
    await expect(page.locator('[data-pd-id="profile-management.restore"]')).toBeVisible();
    await page.locator('[data-pd-id="profile-management.restore"]').click();
    await page.getByRole("dialog", { name: "Restore Profile?" }).getByRole("button", { name: "Restore Profile" }).click();
    await expect(page.locator(".profile-management-header-actions .badge")).toHaveText("Active");
  });

  test("keeps Dashboard analytics distinct from Profile management", async ({ page }) => {
    await mockProfileDirectory(page);

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("tab", { name: "Performance" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Founder Profile", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Complete Profile setup", { exact: true })).toHaveCount(0);

    await page.goto("/profiles");
    await expect(page.getByRole("heading", { name: "Profiles", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("region", { name: "Profile management" })).toBeVisible();
    await expect(page.locator("#analytics-panel-performance")).toHaveCount(0);
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

    await page.evaluate(() => window.dispatchEvent(new Event("plum-duff:route-transition-start")));
    await expect(page.locator('[data-pd-id="app-shell.route-transition-lock"]')).toBeVisible();
    await expect(page.locator(".main-shell")).toHaveAttribute("inert", "");
    await expect(page.locator(".main-shell")).toHaveAttribute("aria-busy", "true");
    await expect(progress).toHaveClass(/is-active/);
    await page.evaluate(() => window.dispatchEvent(new Event("plum-duff:route-transition-end")));
    await expect(page.locator('[data-pd-id="app-shell.route-transition-lock"]')).toHaveCount(0);
    await expect(page.locator(".main-shell")).not.toHaveAttribute("inert", "");

    await page.evaluate(() => {
      const link = document.createElement("a");
      link.href = "/reports";
      link.textContent = "Synthetic route";
      link.dataset.pdId = "test.route-transition-link";
      link.addEventListener("click", (event) => {
        event.preventDefault();
        const current = Number(document.body.dataset.routeTransitionClicks ?? "0");
        document.body.dataset.routeTransitionClicks = String(current + 1);
      });
      document.querySelector(".main-shell")?.append(link);
    });
    const routeLink = page.locator('[data-pd-id="test.route-transition-link"]');
    await routeLink.click();
    await routeLink.click({ force: true });
    await expect.poll(() => page.locator("body").getAttribute("data-route-transition-clicks")).toBe("1");
    await page.evaluate(() => window.dispatchEvent(new Event("plum-duff:route-transition-end")));

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
