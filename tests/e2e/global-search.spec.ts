import { expect, test } from "@playwright/test";

test.describe("Founder global search", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/auth/session", (route) => route.fulfill({
      json: { authenticated: true, email: "owner@example.invalid", linked_profile_ids: ["profile-demo-001"], name: "Owner", role: "fund_manager" },
    }));
    await page.route("**/api/auth/activity", (route) => route.fulfill({ status: 204 }));
    await page.route("**/api/auth/security-preference", (route) => route.fulfill({ json: { configured: false } }));
    await page.route("**/api/fund-manager/notifications**", (route) => route.fulfill({ json: [] }));
    await page.route("**/api/fund-manager/import-executions**", (route) => route.fulfill({ json: [] }));
  });
  test("keeps the newest result when an older search response completes later", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.route("**/search?query=*", async (route) => {
      const query = new URL(route.request().url()).searchParams.get("query");
      if (query === "older query") {
        await new Promise((resolve) => setTimeout(resolve, 700));
        await route.fulfill({
          json: [{ result_id: "profile-old", group: "Profiles", title: "Older result", subtitle: "OLD · Active", href: "/profiles/profile-old/tracker/dashboard", icon: "person" }],
        }).catch(() => undefined);
        return;
      }
      await route.fulfill({
        json: [{ result_id: "profile-new", group: "Profiles", title: "Newest result", subtitle: "NEW · Active", href: "/profiles/profile-new/tracker/dashboard", icon: "person" }],
      });
    });
    await page.goto("/profiles");
    const search = page.locator('[data-pd-id="global-search.input"]');
    await search.fill("older query");
    await page.waitForTimeout(250);
    await search.fill("newer query");
    await expect(page.getByText("Newest result", { exact: true })).toBeVisible();
    await page.waitForTimeout(800);
    await expect(page.getByText("Newest result", { exact: true })).toBeVisible();
    await expect(page.getByText("Older result", { exact: true })).toHaveCount(0);
  });

  test("supports grouped keyboard navigation without exposing an unbounded index", async ({ page }) => {
    await page.setViewportSize({ width: 1180, height: 820 });
    await page.goto("/profiles/profile-demo-001/tracker/dashboard");

    await page.getByRole("button", { name: "Open Plum Duff search" }).click();
    const search = page.locator('[data-pd-id="global-search.input"]');
    await expect(search).toBeVisible();
    await search.fill("Account Catalogue");
    const results = page.locator('[data-pd-id="global-search.results"]');
    await expect(results).toBeVisible();
    await expect(results.getByText("Navigation", { exact: true })).toBeVisible();
    await expect(results.getByText("Account Catalogue", { exact: true })).toBeVisible();

    await search.press("ArrowDown");
    await search.press("Enter");
    await expect(page).toHaveURL(/\/settings.*#catalogue$/);

    await page.getByRole("button", { name: "Open Plum Duff search" }).click();
    await page.locator('[data-pd-id="global-search.input"]').fill("no-synthetic-match-999");
    await expect(page.getByText("No matching profiles, providers or pages.")).toBeVisible();
    await page.locator('[data-pd-id="global-search.input"]').press("Escape");
    await expect(page.locator('[data-pd-id="global-search.results"]')).toHaveCount(0);
  });

  test("fits the canonical shell in mobile and dark mode", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 720 });
    await page.goto("/profiles");
    await page.locator('[data-pd-id="app-shell.theme-toggle"]').click();

    await page.getByRole("button", { name: "Open Plum Duff search" }).click();
    const search = page.locator('[data-pd-id="global-search.input"]');
    await expect(search).toBeVisible();
    const geometry = await search.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        left: bounds.left,
        right: bounds.right,
        width: bounds.width,
        viewportWidth: document.documentElement.clientWidth,
      };
    });
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.width).toBeGreaterThanOrEqual(220);
    await search.press("Escape");
    await expect(page.getByRole("button", { name: "Open Plum Duff search" })).toBeFocused();
  });

  test("uses intentional shell compositions without overlap or horizontal overflow", async ({ page }) => {
    await page.goto("/profiles/profile-demo-001/tracker/dashboard");
    for (const width of [1440, 1200, 1100, 1000, 900, 760, 600, 430]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(200);
      const header = page.locator('[data-pd-id="app-shell.top-bar"]');
      await expect(header).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      const profile = page.locator('[data-pd-id="profile-command.trigger"]');
      const actions = page.locator(".top-bar-actions");
      const [profileBox, actionBox] = await Promise.all([profile.boundingBox(), actions.boundingBox()]);
      if (profileBox && actionBox) {
        const overlaps = !(
          profileBox.y + profileBox.height <= actionBox.y ||
          profileBox.y >= actionBox.y + actionBox.height ||
          profileBox.x + profileBox.width <= actionBox.x ||
          profileBox.x >= actionBox.x + actionBox.width
        );
        expect(overlaps, `Profile selector overlaps top-bar actions at ${width}px: profile=${JSON.stringify(profileBox)} actions=${JSON.stringify(actionBox)}`).toBe(false);
      }
      if (width > 1280) {
        await expect(page.locator('[data-pd-id="global-search.input"]')).toBeVisible();
        await expect(page.getByRole("button", { name: "Open Plum Duff search" })).toBeHidden();
      } else {
        await expect(page.getByRole("button", { name: "Open Plum Duff search" })).toBeVisible();
      }
    }
  });
});
