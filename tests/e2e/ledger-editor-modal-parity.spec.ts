import { expect, test } from "@playwright/test";

const scenarios = [
  {
    route: "/profiles/profile-demo-001/tracker/sportsbook-bets",
    dialogName: "Edit sportsbook row",
  },
  {
    route: "/profiles/profile-demo-001/tracker/free-bets",
    dialogName: "Edit free-bet row",
  },
  {
    route: "/profiles/profile-demo-001/tracker/casino-offers",
    dialogName: "Edit casino row",
  },
  {
    route: "/profiles/profile-demo-001/tracker/cash-adjustments",
    dialogName: "Edit cash adjustment",
  },
];

test.describe("Ledger editor modal parity", () => {
  for (const scenario of scenarios) {
    test(`${scenario.route} opens the editor in a dialog shell`, async ({ page }) => {
      await page.goto(scenario.route);
      await page.waitForLoadState("networkidle");

      const row = page.locator(".data-table tbody tr").first();
      await expect(row).toBeVisible();
      await row.click();

      const dialog = page.getByRole("dialog", { name: scenario.dialogName });
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveClass(/workflow-editor-panel/);
      await expect(dialog).toHaveClass(/workflow-editor-modal/);
    });
  }
});
