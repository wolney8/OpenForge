import { expect, test } from "@playwright/test";

const profileId = "profile-demo-001";

const scenarios = [
  { apiPath: "free-bets", label: "Loading free-bet ledger", route: "free-bets" },
  { apiPath: "casino-offers", label: "Loading casino-offer ledger", route: "casino-offers" },
  {
    apiPath: "cash-adjustments",
    label: "Loading cash-adjustment ledger",
    route: "cash-adjustments",
  },
];

test.describe("Cross-ledger loading parity", () => {
  test("Fund Manager Dashboard distinguishes loading from its empty Profile state", async ({ page }) => {
    await page.route("**/api/profiles**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 900));
      await route.fulfill({ body: "[]", contentType: "application/json", status: 200 });
    });
    await page.route("**/api/auth/session**", async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          authenticated: true,
          auth_provider: "google",
          email: "founder@example.invalid",
          linked_profile_ids: [],
          name: "Synthetic Founder",
          role: "fund_manager",
        }),
        contentType: "application/json",
        status: 200,
      });
    });
    await page.route("**/api/auth/activity", async (route) => {
      await route.fulfill({ status: 204 });
    });

    await page.goto("/profiles?view=performance");

    const loadingState = page
      .getByRole("status")
      .filter({ hasText: "Loading Fund Manager Dashboard" });
    await expect(page.getByRole("main")).toHaveAttribute("aria-busy", "true");
    await expect(loadingState).toBeVisible();
    await expect(page.getByRole("heading", { name: "Create the first Profile" })).toHaveCount(0);
    await expect(loadingState).toBeHidden();
    await expect(page.getByRole("heading", { name: "Create the first Profile" })).toBeVisible();
  });

  test("Profile Accounts keeps its data shell busy until all initial sources resolve", async ({ page }) => {
    await page.route(
      `**/profiles/${profileId}/accounts`,
      async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 900));
        await route.fulfill({ body: "[]", contentType: "application/json", status: 200 });
      }
    );

    await page.goto(`/profiles/${profileId}/tracker/accounts`);

    const contentPanel = page.locator(".sportsbook-page-shell").first();
    const loadingState = page
      .getByRole("status")
      .filter({ hasText: "Loading Profile Accounts" });
    await expect(contentPanel).toHaveAttribute("aria-busy", "true");
    await expect(loadingState).toBeVisible();
    await expect(loadingState).toBeHidden();
    await expect(contentPanel).toHaveAttribute("aria-busy", "false");
  });

  test("Profile Settings keeps its existing shell stable while Profile identity resolves", async ({ page }) => {
    await page.route(
      `**/api/profiles/${profileId}`,
      async (route) => {
        const response = await route.fetch();
        await new Promise((resolve) => setTimeout(resolve, 900));
        await route.fulfill({ response });
      }
    );

    await page.goto(`/profiles/${profileId}/tracker/settings`);

    const contentPanel = page.locator(".profile-settings-shell .sportsbook-page-shell");
    const loadingState = page
      .getByRole("status")
      .filter({ hasText: "Loading Profile Settings" });
    await expect(contentPanel).toHaveAttribute("aria-busy", "true");
    await expect(loadingState).toBeVisible();
    await expect(loadingState).toBeHidden();
    await expect(contentPanel).toHaveAttribute("aria-busy", "false");
    await expect(page.getByRole("heading", { name: /^Settings for .+ Profile$/ })).toBeVisible();
  });

  for (const scenario of scenarios) {
    test(`${scenario.route} keeps a loading state visible until rows resolve`, async ({ page }) => {
      await page.route(
        `http://127.0.0.1:8010/profiles/${profileId}/${scenario.apiPath}`,
        async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 900));
          await route.fulfill({
            body: "[]",
            contentType: "application/json",
            status: 200,
          });
        }
      );

      await page.goto(`/profiles/${profileId}/tracker/${scenario.route}`);

      const contentPanel = page.locator(".sportsbook-page-shell");
      const loadingState = page.getByRole("status").filter({ hasText: scenario.label });
      await expect(contentPanel).toHaveAttribute("aria-busy", "true");
      await expect(loadingState).toBeVisible();
      await expect(loadingState).toBeHidden();
      await expect(contentPanel).toHaveAttribute("aria-busy", "false");
    });
  }

  test("reports use the shared loading indicator until summary sources resolve", async ({ page }) => {
    await page.route(
      `http://127.0.0.1:8010/profiles/${profileId}/sportsbook-bets`,
      async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 900));
        await route.fulfill({
          body: "[]",
          contentType: "application/json",
          status: 200,
        });
      }
    );

    await page.goto(`/profiles/${profileId}/tracker/reports`);

    const summaryShell = page.locator(".tracker-summary-shell");
    const loadingState = page
      .getByRole("status")
      .filter({ hasText: "Loading tracker summaries" });
    await expect(summaryShell).toHaveAttribute("aria-busy", "true");
    await expect(loadingState).toBeVisible();
    await expect(loadingState.locator(".material-linear-progress")).toBeVisible();
    await expect(loadingState).toBeHidden({ timeout: 10_000 });
    await expect(summaryShell).toHaveAttribute("aria-busy", "false");
  });
});
