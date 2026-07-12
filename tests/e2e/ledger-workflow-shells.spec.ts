import { expect, test } from "@playwright/test";

type LedgerScenario = {
  route: string;
  title: string;
  addButton: string;
  createLabel: string;
  editLabel: string;
};

const ledgerScenarios: LedgerScenario[] = [
  {
    route: "/profiles/profile-demo-001/tracker/free-bets",
    title: "Free Bets",
    addButton: "Add free-bet row",
    createLabel: "Create free-bet row",
    editLabel: "Edit free-bet row",
  },
  {
    route: "/profiles/profile-demo-001/tracker/casino-offers",
    title: "Casino Offers",
    addButton: "Add casino row",
    createLabel: "Create casino row",
    editLabel: "Edit casino row",
  },
  {
    route: "/profiles/profile-demo-001/tracker/cash-adjustments",
    title: "Cash Adjustments",
    addButton: "Add cash adjustment",
    createLabel: "Create cash adjustment",
    editLabel: "Edit cash adjustment",
  },
];

test.describe("Ledger workflow shells", () => {
  for (const scenario of ledgerScenarios) {
    test(`${scenario.title} keeps the table visible when creating a new row`, async ({ page }) => {
      await page.goto(scenario.route);
      await page.waitForLoadState("networkidle");

      await expect(page.getByRole("heading", { name: scenario.title })).toBeVisible();
      await expect(page.locator(".data-table")).toBeVisible();

      await page.getByRole("button", { name: scenario.addButton }).click();

      await expect(page.locator(".workflow-editor-panel")).toBeVisible();
      await expect(page.locator(".workflow-editor-panel")).toContainText(scenario.createLabel);
      await expect(page.locator(".data-table")).toBeVisible();
    });

    test(`${scenario.title} opens edit mode on single click and collapses on double click`, async ({
      page,
    }) => {
      await page.goto(scenario.route);
      await page.waitForLoadState("networkidle");

      const firstDataRow = page.locator(".data-table tbody tr").first();
      await expect(firstDataRow).toBeVisible();

      await firstDataRow.click();
      await expect(page.locator(".workflow-editor-panel")).toContainText(scenario.editLabel);
      await expect(page.locator(".data-table")).toBeVisible();

      await firstDataRow.dblclick();
      await expect(page.locator(".workflow-editor-panel")).toContainText(scenario.editLabel);
      await expect(page.locator(".data-table")).not.toBeVisible();
    });
  }
});
