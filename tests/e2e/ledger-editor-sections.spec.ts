import { expect, test } from "@playwright/test";

const scenarios = [
  {
    route: "/profiles/profile-demo-001/tracker/sportsbook-bets",
    addButton: "Add sportsbook row",
    dialogName: "Create sportsbook row",
    invalidSection: "Bet setup",
    minimumSections: 4,
  },
  {
    route: "/profiles/profile-demo-001/tracker/free-bets",
    addButton: "Add free-bet row",
    dialogName: "Create free-bet row",
    invalidSection: "Offer setup",
    minimumSections: 5,
  },
  {
    route: "/profiles/profile-demo-001/tracker/casino-offers",
    addButton: "Add casino row",
    dialogName: "Create casino row",
    invalidSection: "Offer setup",
    minimumSections: 4,
  },
  {
    route: "/profiles/profile-demo-001/tracker/cash-adjustments",
    addButton: "Add cash adjustment",
    dialogName: "Create cash adjustment",
    invalidSection: "Adjustment setup",
    minimumSections: 4,
  },
];

test.describe("Ledger editor sections", () => {
  for (const scenario of scenarios) {
    test(`${scenario.dialogName} uses collapsible sections and marks invalid required sections`, async ({
      page,
    }) => {
      await page.goto(scenario.route);
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: scenario.addButton }).click();

      const dialog = page.getByRole("dialog", { name: scenario.dialogName });
      const sections = dialog.locator("form > section.editor-section");
      await expect(sections).toHaveCount(scenario.minimumSections);

      const targetSection = sections.filter({ hasText: scenario.invalidSection }).first();
      const summary = targetSection.getByRole("button", { name: new RegExp(scenario.invalidSection) });
      const toggleIcon = summary.locator(".editor-section-toggle-icon");
      const titleBounds = await summary.locator(".eyebrow").boundingBox();
      const iconBounds = await toggleIcon.boundingBox();
      expect(titleBounds).not.toBeNull();
      expect(iconBounds).not.toBeNull();
      expect(iconBounds!.x).toBeGreaterThan(titleBounds!.x + titleBounds!.width);
      await expect(summary).toHaveAttribute("aria-expanded", "true");
      await expect(toggleIcon).toHaveText("collapse_content");
      await expect(toggleIcon).toHaveCSS("font-family", /Material Symbols Outlined/);
      if (scenario.dialogName === "Create sportsbook row") {
        const symbolFontLoaded = await page.evaluate(async () => {
          const loadedFonts = await document.fonts.load('24px "Material Symbols Outlined"');
          return loadedFonts.length > 0;
        });
        expect(symbolFontLoaded).toBe(true);
      }
      await expect(targetSection.locator(".editor-section-content")).toHaveCSS(
        "transition-property",
        /grid-template-rows/
      );
      await summary.click();
      await expect(summary).toHaveAttribute("aria-expanded", "false");
      await expect(toggleIcon).toHaveText("expand_content");
      await summary.click();
      await expect(summary).toHaveAttribute("aria-expanded", "true");

      const expandedContent = targetSection.locator(".editor-section-content-inner");
      await expect(expandedContent).toHaveCSS("overflow-x", "visible");
      await expect(expandedContent).toHaveCSS("overflow-y", "visible");
      const firstEnabledField = expandedContent
        .locator("input:not(:disabled), select:not(:disabled), textarea:not(:disabled)")
        .first();
      await firstEnabledField.focus();
      await expect(firstEnabledField).toHaveCSS("outline-style", "solid");
      await expect(firstEnabledField).toHaveCSS("outline-width", "3px");

      await dialog.locator("form").evaluate((form) => {
        (form as HTMLFormElement).noValidate = true;
      });
      await dialog.getByRole("button", { name: "Save", exact: true }).click();

      await expect(targetSection).toHaveAttribute("data-invalid", "true");
      await expect(targetSection).toHaveClass(/is-invalid-section/);
    });
  }

  test("sportsbook Odds and matching remains visibly invalid while collapsed", async ({ page }) => {
    await page.goto("/profiles/profile-demo-001/tracker/sportsbook-bets");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Add sportsbook row" }).click();

    // The draft autosave can change the accessible name from Create to Edit mid-entry.
    const dialog = page.locator(".workflow-editor-modal");
    await page.getByLabel("Offer", { exact: true }).fill("Synthetic calculator check");
    await page.locator('select:has(option[value="Bookmaker A"])').selectOption("Bookmaker A");
    await page.locator('select:has(option[value="Single"])').selectOption("Single");
    await page.locator('select:has(option[value="Bet & Get"])').selectOption("Bet & Get");
    await page.locator('select:has(option[value="Football"])').selectOption("Football");
    await page.getByLabel("Event name", { exact: true }).fill("Synthetic Event");

    const oddsSection = dialog.locator("section.editor-section", { hasText: "Odds and matching" });
    const oddsToggle = oddsSection.getByRole("button", { name: /Odds and matching/ });
    await expect(oddsSection).toHaveAttribute("data-invalid", "true");
    await oddsToggle.click();
    await expect(oddsToggle).toHaveAttribute("aria-expanded", "false");
    await expect(oddsSection).toHaveAttribute("data-invalid", "true");
    await expect(oddsSection).toHaveClass(/is-invalid-section/);
  });
});
