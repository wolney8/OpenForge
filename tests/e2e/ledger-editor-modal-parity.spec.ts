import { expect, test } from "@playwright/test";

const scenarios = [
  {
    route: "/profiles/profile-demo-001/tracker/sportsbook-bets",
    dialogName: "Create sportsbook row",
    pdPrefix: "sportsbook",
    openByAdd: true,
  },
  {
    route: "/profiles/profile-demo-001/tracker/free-bets",
    dialogName: "Create free-bet row",
    pdPrefix: "free-bets",
    openByAdd: true,
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
  const observedDialogWidths: number[] = [];

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
      observedDialogWidths.push(Math.round(dialogBounds!.width));
      const headerBounds = await header.boundingBox();
      const footerBounds = await footer.boundingBox();
      expect(headerBounds).not.toBeNull();
      expect(footerBounds).not.toBeNull();
      const dialogLeft = dialogBounds!.x;
      const dialogRight = dialogBounds!.x + dialogBounds!.width;
      const dialogBottom = dialogBounds!.y + dialogBounds!.height;
      const headerRight = headerBounds!.x + headerBounds!.width;
      const footerRight = footerBounds!.x + footerBounds!.width;
      const footerBottom = footerBounds!.y + footerBounds!.height;
      const stickyEdgeTolerance = 4;
      expect(Math.abs(headerBounds!.x - dialogLeft)).toBeLessThan(stickyEdgeTolerance);
      expect(Math.abs(headerRight - dialogRight)).toBeLessThan(stickyEdgeTolerance);
      expect(Math.abs(footerBounds!.x - dialogLeft)).toBeLessThan(stickyEdgeTolerance);
      expect(Math.abs(footerRight - dialogRight)).toBeLessThan(stickyEdgeTolerance);
      expect(footerBottom).toBeLessThanOrEqual(dialogBottom + stickyEdgeTolerance);
      expect(dialogBottom - footerBottom).toBeLessThanOrEqual(32);
      await expect(footer.locator(".workflow-editor-footer-primary")).toBeVisible();

      const topClose = dialog.locator("button.workflow-editor-cancel-button").first();
      await expect(topClose).toBeVisible();
      const topCloseBounds = await topClose.boundingBox();
      expect(topCloseBounds).not.toBeNull();
      expect(topCloseBounds!.width).toBeGreaterThanOrEqual(36);
      expect(topCloseBounds!.height).toBeGreaterThanOrEqual(36);
      expect(Math.abs(topCloseBounds!.width - topCloseBounds!.height)).toBeLessThanOrEqual(3);
      await expect(topClose.locator(".material-symbols-outlined")).toContainText("close");

      const footerPrimaryButtons = footer.locator(".workflow-editor-footer-primary button:visible");
      const footerButtonCount = await footerPrimaryButtons.count();
      expect(footerButtonCount).toBeGreaterThanOrEqual(2);
      const firstFooterButtonBounds = await footerPrimaryButtons.nth(0).boundingBox();
      expect(firstFooterButtonBounds).not.toBeNull();
      const firstFooterButtonCenterY = firstFooterButtonBounds!.y + firstFooterButtonBounds!.height / 2;
      await expect
        .poll(async () => {
          const currentFooterBounds = await footer.boundingBox();
          const currentFirstButtonBounds = await footerPrimaryButtons.nth(0).boundingBox();
          if (!currentFooterBounds || !currentFirstButtonBounds) {
            return Number.POSITIVE_INFINITY;
          }
          const currentFooterBottom = currentFooterBounds.y + currentFooterBounds.height;
          const footerTopGap = currentFirstButtonBounds.y - currentFooterBounds.y;
          const footerBottomGap =
            currentFooterBottom - (currentFirstButtonBounds.y + currentFirstButtonBounds.height);
          return Math.abs(footerTopGap - footerBottomGap);
        })
        .toBeLessThanOrEqual(6);
      for (let buttonIndex = 1; buttonIndex < footerButtonCount; buttonIndex += 1) {
        const buttonBounds = await footerPrimaryButtons.nth(buttonIndex).boundingBox();
        expect(buttonBounds).not.toBeNull();
        expect(buttonBounds!.height).toBeGreaterThanOrEqual(44);
        const buttonCenterY = buttonBounds!.y + buttonBounds!.height / 2;
        expect(Math.abs(buttonCenterY - firstFooterButtonCenterY)).toBeLessThanOrEqual(2);
      }

      {
        const tabRail = dialog.locator('[data-pd-id="ledger-editor.tabs"]');
        await expect(tabRail).toBeVisible();
        await expect(dialog.locator(`[data-pd-id="${scenario.pdPrefix}.editor.tab-actions"]`)).toBeVisible();
        await expect(dialog.locator(`[data-pd-id="${scenario.pdPrefix}.editor.footer-tab-actions"]`)).toBeVisible();
        const initialTabId = scenario.pdPrefix === "cash-adjustments" ? "details" : "setup";
        await expect(dialog.locator(`[data-pd-id="ledger-editor.panel.${initialTabId}"]`)).toBeVisible();

        if (scenario.pdPrefix === "sportsbook" || scenario.pdPrefix === "free-bets") {
          await expect(dialog.locator('[data-pd-id="ledger-editor.tab.setup"]')).toContainText("Bet Setup");
          await expect(dialog.locator('[data-pd-id="ledger-editor.tab.matching"]')).toContainText("Matching");
          await expect(dialog.locator('[data-pd-id="ledger-editor.tab.settlement"]')).toContainText("Settlement");
        }

        if (scenario.pdPrefix === "free-bets") {
          await expect(dialog.locator('[data-pd-id^="ledger-editor.tab."]')).toHaveCount(3);
          await expect(dialog.locator(".field-choice-pills").filter({ hasText: "Football" })).toBeVisible();
          await expect(dialog.locator(".field-choice-pills").filter({ hasText: "Horse Racing" })).toBeVisible();
        }

        if (scenario.pdPrefix === "sportsbook") {
          await expect(dialog.locator(".workflow-editor-body")).toBeVisible();
          const guide = dialog.locator('[data-pd-id="sportsbook.guided-entry"]');
          await expect(guide).toBeVisible();
          await expect(guide).toContainText("Next required");
          await expect(guide.locator(`#${scenario.pdPrefix}-guided-entry-message`)).not.toHaveText("");
          await guide.getByRole("button", { name: /Add The Offer Name As Shown|Choose The Bookmaker|Choose The Bet Type|Choose The Offer Type|Choose The Fixture Type|Enter The Event Name/i }).click();
          await expect(dialog.locator('[data-pd-id="ledger-editor.panel.setup"]')).toBeVisible();
        }

        if (scenario.pdPrefix === "cash-adjustments") {
          await expect(dialog.locator('[data-pd-id="cash-adjustments.editor.compact-summary"]')).toBeVisible();
          await expect(dialog.locator('[aria-label="Cash-adjustment summary"]')).toHaveCount(0);
          const guide = dialog.locator('[data-pd-id="cash-adjustments.guided-entry"]');
          await expect(guide).toBeVisible();
          await expect(guide).toContainText("Next required");
          await expect(guide).toContainText("Set The Adjustment Date");
          const dateField = dialog.locator('[data-guided-field="adjustment_date"]').first();
          await expect(dateField).toHaveClass(/is-guided-next/);

          await guide.getByRole("button", { name: /Set The Adjustment Date/i }).click();
          await expect(dialog.locator('[data-pd-id="ledger-editor.panel.details"]')).toBeVisible();
          await expect(dateField.locator("input")).toBeFocused();
          await expect(dateField.locator("input")).toHaveAttribute(
            "aria-describedby",
            "cash-adjustment-guided-entry-message"
          );

          await guide.getByRole("button", { name: /Dismiss cash-adjustment guided entry/i }).click();
          await expect(guide).toBeHidden();
          await dialog.locator('[data-pd-id="cash-adjustments.guided-entry.restore"]').click();
          await expect(guide).toBeVisible();

          const now = new Date();
          const dateValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T12:00`;
          await dateField.locator("input").fill(dateValue);
          await dialog.locator('[data-guided-field="amount"] input').fill("10");
          await expect(guide).toContainText("Go to");
          await expect(guide).toContainText("Scope");
          await expect(guide).toContainText("Choose The Linked Account");
          await guide.getByRole("button", { name: /Choose The Linked Account/i }).click();
          await expect(dialog.locator('[data-pd-id="ledger-editor.panel.scope"]')).toBeVisible();
          await expect(dialog.locator('[data-guided-field="linked_account"] select')).toBeFocused();
          await expect(dialog.locator('[data-guided-field="linked_account"] select')).toHaveAttribute(
            "aria-describedby",
            "cash-adjustment-guided-entry-message"
          );
        }

        if (scenario.pdPrefix === "casino-offers") {
          await expect(dialog.getByRole("button", { name: "Close casino editor" })).toBeVisible();
          await expect(dialog.locator('[data-pd-id="casino-offers.guided-entry"]')).toBeVisible();
          const guidedEntryRadius = await dialog
            .locator('[data-pd-id="casino-offers.guided-entry"]')
            .evaluate((element) => Number.parseFloat(getComputedStyle(element).borderTopLeftRadius));
          expect(guidedEntryRadius).toBeGreaterThanOrEqual(20);
          await expect(dialog.getByRole("button", { name: "Save" })).toBeDisabled();
        }

        const targetTabId =
          scenario.pdPrefix === "sportsbook" || scenario.pdPrefix === "free-bets"
            ? "matching"
            : scenario.pdPrefix === "cash-adjustments"
              ? "scope"
              : "settlement";
        const targetTab = dialog.locator(`[data-pd-id="ledger-editor.tab.${targetTabId}"]`);
        if ((await targetTab.getAttribute("aria-disabled")) === "true") {
          await expect(targetTab).toBeDisabled();
          await expect(dialog.locator(`[data-pd-id="ledger-editor.panel.${initialTabId}"]`)).toBeVisible();
        } else {
          await targetTab.click();
          await expect(dialog.locator(`[data-pd-id="ledger-editor.panel.${targetTabId}"]`)).toBeVisible();
          await expect(dialog.locator(`[data-pd-id="ledger-editor.panel.${initialTabId}"]`)).toBeHidden();
        }
      }

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

  test.afterAll(() => {
    expect(new Set(observedDialogWidths).size).toBe(1);
  });

  test("guided entry can be disabled per profile across ledger editors", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "plum-duff:profile-demo-001:guided-access-mode",
        JSON.stringify("off")
      );
    });

    for (const scenario of scenarios) {
      await page.goto(scenario.route);
      await page.getByRole("button", { name: /Add .*row|Add cash adjustment/i }).click();

      const dialog = page.getByRole("dialog", { name: scenario.dialogName });
      await expect(dialog).toBeVisible();
      await expect(dialog.locator(`[data-pd-id="${scenario.pdPrefix}.guided-entry"]`)).toHaveCount(0);
      await expect(dialog.locator(`[data-pd-id="${scenario.pdPrefix}.guided-entry.restore"]`)).toHaveCount(0);
    }
  });

  test("editor scroll lock is released after closing each ledger modal", async ({ page }) => {
    for (const scenario of scenarios) {
      await page.goto(scenario.route);
      await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");

      await page.getByRole("button", { name: /Add .*row|Add cash adjustment/i }).click();

      const dialog = page.getByRole("dialog", { name: scenario.dialogName });
      await expect(dialog).toBeVisible();
      await expect(page.locator("body")).toHaveCSS("overflow", "hidden");

      await dialog.locator("button.workflow-editor-cancel-button").first().click();
      await expect(dialog).toBeHidden();
      await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
    }
  });

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

  test("Casino settled row unlocks from section Edit without closing the editor", async ({
    page,
    request,
  }) => {
    const profileId = "profile-demo-001";
    const offerName = `Casino settled edit parity ${Date.now()}`;
    const createResponse = await request.post(
      `http://127.0.0.1:8010/profiles/${profileId}/casino-offers`,
      {
        data: {
          offer_group_id: "",
          date_started: "2026-07-20T18:00:00",
          date_settling: "2026-07-20T18:00:00",
          expiry_datetime: "2026-07-25T18:00:00",
          bookmaker: "Bookmaker A",
          offer_type: "Free Spins",
          offer_name: offerName,
          game: "Settled Edit Slots",
          cash_stake: "",
          credit_amount: "",
          bonus_amount: "",
          wager_multiplier: "",
          wager_target: "",
          required_spins: "",
          spin_stake: "0.10",
          free_spins_awarded: "10",
          free_spins_value: "2.40",
          own_cash_committed: "0.00",
          cash_returned: "2.40",
          settlement_other_costs: "0.00",
          status: "Settled",
          result: "Win",
          calc_net_pnl: "",
          final_net_pnl: "2.40",
          user_notes: "",
        },
      }
    );
    expect(createResponse.ok()).toBeTruthy();
    const createdRow = await createResponse.json();

    try {
      await page.goto(
        `/profiles/${profileId}/tracker/casino-offers?record=${createdRow.casino_offer_id}`
      );

      const dialog = page.getByRole("dialog", { name: "Edit casino row" });
      await expect(dialog).toBeVisible();
      await dialog.getByRole("tab", { name: /Settlement/ }).click();

      const footerPrimaryActions = dialog.locator(".workflow-editor-footer-primary");
      const resultSelect = dialog.locator('label.field-control:has(span:text-is("Result")) select');
      const sectionEdit = dialog.locator('[data-pd-id="casino-offers.editor.settlement.edit-settled-row"]');
      await expect(sectionEdit).toBeVisible();
      await expect(footerPrimaryActions.getByRole("button", { exact: true, name: "Edit" })).toHaveCount(0);
      await expect(footerPrimaryActions.getByRole("button", { name: "Close casino editor" })).toBeVisible();
      await expect(resultSelect).toBeDisabled();

      await sectionEdit.click();
      await expect(dialog).toBeVisible();
      await expect(resultSelect).toBeEnabled();
      await expect(footerPrimaryActions.getByRole("button", { exact: true, name: "Save Edits" })).toBeDisabled();
      await expect(footerPrimaryActions.getByRole("button", { exact: true, name: "Cancel" })).toBeVisible();
      await footerPrimaryActions.getByRole("button", { exact: true, name: "Cancel" }).click();
      await expect(sectionEdit).toBeVisible();
      await expect(resultSelect).toBeDisabled();
    } finally {
      await request.delete(
        `http://127.0.0.1:8010/profiles/${profileId}/casino-offers/${createdRow.casino_offer_id}`
      );
    }
  });
});
