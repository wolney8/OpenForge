import { expect, test } from "@playwright/test";

type EditorScenario = {
  route: string;
  title: string;
};

const scenarios: EditorScenario[] = [
  {
    route: "/profiles/profile-demo-001/tracker/sportsbook-bets",
    title: "Sportsbook Bets",
  },
  {
    route: "/profiles/profile-demo-001/tracker/free-bets",
    title: "Free Bets",
  },
  {
    route: "/profiles/profile-demo-001/tracker/casino-offers",
    title: "Casino Offers",
  },
  {
    route: "/profiles/profile-demo-001/tracker/cash-adjustments",
    title: "Cash Adjustments",
  },
];

test.describe("Editor close-action parity", () => {
  for (const scenario of scenarios) {
    test(`${scenario.title} shows close controls at top and bottom while editing`, async ({ page }) => {
      await page.goto(scenario.route);
      await page.waitForLoadState("networkidle");

      await expect(page.getByRole("heading", { name: scenario.title })).toBeVisible();
      await page.locator(".data-table tbody tr").first().click();

      const topClose = page.locator(".workflow-editor-panel .workflow-panel-header .button-link", {
        hasText: "Close",
      });
      await expect(topClose).toBeVisible();

      const bottomClose = page.locator(
        ".workflow-editor-panel .tracker-nav .button-link.tracker-nav-right-action",
        { hasText: "Close" }
      );
      await expect(bottomClose).toBeVisible();
    });
  }
});
