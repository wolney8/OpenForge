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
      await expect(topClose).toBeFocused();

      const bottomClose = page.locator(
        ".workflow-editor-panel .tracker-nav .button-link.tracker-nav-right-action",
        { hasText: "Close" }
      );
      await expect(bottomClose).toBeVisible();
    });
  }

  test("closing a newly opened sportsbook editor restores focus to its trigger", async ({ page }) => {
    await page.goto("/profiles/profile-demo-001/tracker/sportsbook-bets");
    const addButton = page.getByRole("button", { name: "Add sportsbook row" });
    await addButton.click();

    const closeButton = page.getByRole("button", { name: "Close sportsbook editor" }).first();
    await expect(closeButton).toBeFocused();
    await closeButton.click();
    await expect(addButton).toBeFocused();
  });
});
