import { expect, test } from "@playwright/test";

const scenarios = [
  {
    route: "/profiles/profile-demo-001/tracker/sportsbook-bets",
    dialogName: "Edit sportsbook row",
    pdPrefix: "sportsbook",
  },
  {
    route: "/profiles/profile-demo-001/tracker/free-bets",
    dialogName: "Edit free-bet row",
    pdPrefix: "free-bets",
  },
  {
    route: "/profiles/profile-demo-001/tracker/casino-offers",
    dialogName: "Edit casino row",
    pdPrefix: "casino-offers",
  },
  {
    route: "/profiles/profile-demo-001/tracker/cash-adjustments",
    dialogName: "Edit cash adjustment",
    pdPrefix: "cash-adjustments",
  },
];

test.describe("Ledger editor modal parity", () => {
  for (const scenario of scenarios) {
    test(`${scenario.route} opens the editor in a dialog shell`, async ({ page }) => {
      await page.goto(scenario.route);

      const row = page.locator(".data-table tbody tr").first();
      await expect(row).toBeVisible();
      await row.click();

      const dialog = page.getByRole("dialog", { name: scenario.dialogName });
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveClass(/workflow-editor-panel/);
      await expect(dialog).toHaveClass(/workflow-editor-modal/);
      await expect(dialog).toHaveAttribute("data-pd-id", `${scenario.pdPrefix}.editor.dialog`);
      await expect(dialog).toHaveCSS("resize", "horizontal");

      const header = dialog.locator(`[data-pd-id="${scenario.pdPrefix}.editor.header"]`);
      const footer = dialog.locator(`[data-pd-id="${scenario.pdPrefix}.editor.actions"]`);
      await expect(header).toHaveCSS("position", "sticky");
      await expect(footer).toHaveCSS("position", "sticky");
      await expect(footer).toBeVisible();

      await dialog.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      await expect(header).toBeVisible();
      await expect(footer).toBeVisible();

      const dialogBounds = await dialog.boundingBox();
      expect(dialogBounds).not.toBeNull();
      expect(dialogBounds!.width).toBeGreaterThan(1200);

      const firstSection = dialog.locator("section.editor-section").first();
      await expect(firstSection).toHaveCSS("border-top-color", "rgba(0, 0, 0, 0)");
      await expect(firstSection).toHaveCSS("box-shadow", "none");

      const openSectionStyles = await dialog
        .locator("section.editor-section.is-open .editor-section-content-inner")
        .evaluateAll((elements) =>
          elements.map((element) => {
            const style = getComputedStyle(element);
            return { overflowX: style.overflowX, overflowY: style.overflowY };
          })
        );
      expect(openSectionStyles.length).toBeGreaterThan(0);
      expect(
        openSectionStyles.every(
          ({ overflowX, overflowY }) => overflowX === "visible" && overflowY === "visible"
        )
      ).toBe(true);

      const fieldSizing = await dialog.locator(".field-control").evaluateAll((elements) =>
        elements.map((element) => {
          const style = getComputedStyle(element);
          return { minWidth: style.minWidth, maxWidth: style.maxWidth };
        })
      );
      expect(fieldSizing.length).toBeGreaterThan(0);
      expect(
        fieldSizing.every(
          ({ minWidth, maxWidth }) => minWidth === "0px" && maxWidth === "100%"
        )
      ).toBe(true);
    });
  }

  test("record query opens the exact casino row for action", async ({ page, request }) => {
    const response = await request.get(
      "http://127.0.0.1:8010/profiles/profile-demo-001/casino-offers"
    );
    expect(response.ok()).toBe(true);
    const rows = (await response.json()) as { casino_offer_id: string }[];
    expect(rows.length).toBeGreaterThan(0);
    const recordId = rows[0].casino_offer_id;

    await page.goto(
      `/profiles/profile-demo-001/tracker/casino-offers?search=${encodeURIComponent(recordId)}&record=${encodeURIComponent(recordId)}&source=fee-review`
    );

    await expect(page.getByRole("dialog", { name: "Edit casino row" })).toBeVisible();
    await expect(page.getByPlaceholder("Search casino-offer rows")).toHaveValue(recordId);
  });
});
