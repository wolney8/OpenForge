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
});
