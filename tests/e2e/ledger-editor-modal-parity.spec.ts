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
    dialogName: "Create casino row",
    pdPrefix: "casino-offers",
    openByAdd: true,
  },
  {
    route: "/profiles/profile-demo-001/tracker/cash-adjustments",
    dialogName: "Create cash adjustment",
    pdPrefix: "cash-adjustments",
    openByAdd: true,
  },
];

test.describe("Ledger editor modal parity", () => {
  for (const scenario of scenarios) {
    test(`${scenario.route} opens the editor in a dialog shell`, async ({ page }) => {
      await page.goto(scenario.route);

      const rangeSelect = page.getByLabel("Change tracker date range");
      if (!scenario.openByAdd && (await rangeSelect.isVisible())) {
        await rangeSelect.selectOption({ label: "All Dates" });
      }

      if (scenario.openByAdd) {
        await page.getByRole("button", { name: /Add .*row|Add cash adjustment/i }).click();
      } else {
        const row = page.locator(".data-table tbody tr").first();
        await expect(row).toBeVisible();
        await row.click();
      }

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

      await dialog.evaluate((element) => {
        const banner = document.createElement("div");
        banner.className = "editor-validation-banner editor-validation-banner-danger";
        banner.setAttribute("data-pd-id", "test.editor-validation-banner");
        banner.innerHTML = `
          <span aria-hidden="true" class="material-symbols-outlined">error</span>
          <div>
            <strong>Validation required</strong>
            <span>Complete the required fields before saving.</span>
          </div>
          <button
            aria-label="Hide validation required"
            class="icon-button icon-button-destructive editor-validation-banner-dismiss"
            type="button"
          >
            <span aria-hidden="true" class="material-symbols-outlined">close</span>
          </button>
        `;
        element.prepend(banner);
      });

      const banner = dialog.locator('[data-pd-id="test.editor-validation-banner"]');
      const dismiss = banner.getByRole("button", { name: "Hide validation required" });
      await expect(banner).toBeVisible();
      await expect(banner).toHaveCSS("overflow", "visible");
      await expect(dismiss).toHaveCSS("border-radius", "999px");

      const bannerGeometry = await banner.evaluate((element) => {
        const bannerStyle = getComputedStyle(element);
        const dismissButton = element.querySelector("button");
        const dismissIcon = dismissButton?.querySelector(".material-symbols-outlined");
        if (!dismissButton || !dismissIcon) {
          throw new Error("Validation dismiss control missing");
        }
        const buttonStyle = getComputedStyle(dismissButton);
        const iconStyle = getComputedStyle(dismissIcon);
        const buttonBounds = dismissButton.getBoundingClientRect();
        const iconBounds = dismissIcon.getBoundingClientRect();
        return {
          bannerRadius: Number.parseFloat(bannerStyle.borderTopLeftRadius),
          buttonHeight: buttonBounds.height,
          buttonWidth: buttonBounds.width,
          iconCenterX: iconBounds.left + iconBounds.width / 2,
          iconCenterY: iconBounds.top + iconBounds.height / 2,
          buttonCenterX: buttonBounds.left + buttonBounds.width / 2,
          buttonCenterY: buttonBounds.top + buttonBounds.height / 2,
          paddingLeft: buttonStyle.paddingLeft,
          paddingRight: buttonStyle.paddingRight,
          display: buttonStyle.display,
          alignItems: buttonStyle.alignItems,
          justifyItems: buttonStyle.justifyItems,
        };
      });
      expect(bannerGeometry.bannerRadius).toBeGreaterThanOrEqual(20);
      expect(Math.abs(bannerGeometry.buttonWidth - bannerGeometry.buttonHeight)).toBeLessThan(1);
      expect(Math.abs(bannerGeometry.iconCenterX - bannerGeometry.buttonCenterX)).toBeLessThan(1);
      expect(Math.abs(bannerGeometry.iconCenterY - bannerGeometry.buttonCenterY)).toBeLessThan(1);
      expect(bannerGeometry.paddingLeft).toBe("0px");
      expect(bannerGeometry.paddingRight).toBe("0px");
      expect(bannerGeometry.display).toBe("grid");
      expect(bannerGeometry.alignItems).toBe("center");
      expect(bannerGeometry.justifyItems).toBe("center");
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
