import { expect, test } from "@playwright/test";

const route = "/profiles/profile-demo-001/tracker/each-way-extra-places";

test.describe("Extra Place ledger parity", () => {
  test("uses the range card, grouped headers, theme switch and filter-owned detail-column controls", async ({ page }) => {
    await page.goto(route);
    await expect(page.getByText("Loading Extra Place ledger")).toBeHidden({ timeout: 90_000 });

    const ledger = page.locator('[data-pd-id="extra-place.ledger"]');
    await expect(ledger.locator('[data-pd-id="tracker.range-card"]')).toBeVisible();
    await expect(ledger.locator("th.extra-place-column-back").first()).toContainText("Bookmaker");
    await expect(ledger.locator("th.extra-place-column-back").first()).toHaveCSS("color", "rgb(20, 37, 51)");
    await expect(ledger.locator("th", { hasText: "Place Odds" })).toBeVisible();
    await expect(ledger.locator("th.extra-place-column-win-lay").first()).toContainText("Win Lay Odds");
    await expect(ledger.locator("th.extra-place-column-place-lay").first()).toContainText("Place Lay Odds");

    await expect(ledger.getByRole("button", { name: "Use Extra Place colour theme" }).locator(".material-symbols-outlined")).toContainText("chess_knight");
    await ledger.getByRole("button", { name: "Use Back and Lay colour theme" }).click();
    await expect(ledger).toHaveClass(/extra-place-theme-back-lay/);

    await ledger.getByRole("button", { name: "Open Extra Place filters" }).click();
    const filterDialog = page.getByRole("dialog", { name: "Extra Place filter controls" });
    await filterDialog.getByRole("button", { name: "Hide Win Lay Odds" }).click();
    await filterDialog.getByRole("button", { name: "Done" }).click();
    await expect(ledger.locator("th", { hasText: "Date / time" })).toBeVisible();
    await expect(ledger.locator("th", { hasText: "Qual Loss" })).toBeVisible();
    await expect(ledger.locator("th", { hasText: "EP Profit" })).toBeVisible();
    await expect(ledger.locator("th", { hasText: "Win Lay Odds" })).toHaveCount(0);

    await expect(ledger.getByRole("button", { name: "Show detail columns" })).toHaveCount(0);
  });

  test("uses a viewport-owned editor with visible footer controls", async ({ page }) => {
    await page.goto(route);
    await expect(page.getByText("Loading Extra Place ledger")).toBeHidden({ timeout: 90_000 });

    await page.getByRole("button", { name: "Add Extra Place row" }).click();

    const dialog = page.getByRole("dialog", { name: "Create Extra Place row" });
    const footer = dialog.locator('[data-pd-id="extra-place.editor.actions"]');
    const backdrop = page.locator(".modal-backdrop-extra-place");
    await expect(dialog).toBeVisible();
    await expect(footer).toBeVisible();

    const [viewport, backdropBox, dialogBox, footerBox] = await Promise.all([
      page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight })),
      backdrop.boundingBox(),
      dialog.boundingBox(),
      footer.boundingBox(),
    ]);
    expect(backdropBox).not.toBeNull();
    expect(dialogBox).not.toBeNull();
    expect(footerBox).not.toBeNull();
    expect(Math.abs(backdropBox!.width - viewport.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(backdropBox!.height - viewport.height)).toBeLessThanOrEqual(2);
    expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(viewport.height + 1);
    expect(footerBox!.y + footerBox!.height).toBeLessThanOrEqual(dialogBox!.y + dialogBox!.height + 2);
    expect(dialogBox!.y + dialogBox!.height - (footerBox!.y + footerBox!.height)).toBeLessThanOrEqual(32);

    await dialog.locator(".workflow-editor-body").evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(footer).toBeVisible();
    await expect(footer.getByRole("button", { name: "Save" })).toBeVisible();
    await expect(footer.getByRole("button", { name: "Previous" })).toBeVisible();
    await expect(footer.getByRole("button", { name: "Next" })).toBeVisible();
  });

  test("opens Extra Place-specific filter controls", async ({ page }) => {
    await page.goto(route);
    await expect(page.getByText("Loading Extra Place ledger")).toBeHidden({ timeout: 90_000 });

    await page.getByRole("button", { name: "Open Extra Place filters" }).click();
    const dialog = page.getByRole("dialog", { name: "Extra Place filter controls" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Bet type", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Bookmaker", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Status", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Result", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Issue type", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Visible columns", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Hide Win Lay Odds" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Done" })).toBeVisible();
  });

  test("keeps the Extra Place theme readable in dark mode and makes the calculation mode state explicit", async ({ page }) => {
    await page.goto(route);
    await expect(page.getByText("Loading Extra Place ledger")).toBeHidden({ timeout: 90_000 });
    await page.evaluate(() => document.documentElement.dataset.theme = "dark");

    const themedHeader = page.locator("th.extra-place-column-back").first();
    const neutralHeader = page.locator("th", { hasText: "Date / time" }).first();
    await expect(themedHeader).toHaveCSS("background-color", "rgb(23, 69, 131)");
    await expect(themedHeader).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(page.locator("th.extra-place-column-win-lay").first()).toHaveCSS(
      "background-color",
      "rgb(124, 30, 47)",
    );
    await expect(page.locator("th.extra-place-column-place-lay").first()).toHaveCSS(
      "background-color",
      "rgb(123, 40, 30)",
    );
    await expect(neutralHeader).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(neutralHeader).toHaveCSS("background-color", "rgb(39, 51, 63)");

    await page.getByRole("button", { name: "Add Extra Place row" }).click();
    const dialog = page.getByRole("dialog", { name: "Create Extra Place row" });
    const extraPlace = dialog.getByRole("button", { name: "Extra Place", exact: true });
    const eachWay = dialog.getByRole("button", { name: "Each Way", exact: true });
    await expect(extraPlace).toHaveAttribute("aria-pressed", "true");
    await eachWay.click();
    await expect(eachWay).toHaveAttribute("aria-pressed", "true");
    await expect(extraPlace).toHaveAttribute("aria-pressed", "false");
    await expect
      .poll(() =>
        dialog.locator(".extra-place-bet-type-toggle").evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).borderTopLeftRadius),
        ),
      )
      .toBeGreaterThan(30);
    await expect(dialog.locator(".extra-place-term-input > span")).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(dialog.locator(".calculator-segment-back h3")).toHaveCSS("color", "rgb(248, 251, 255)");
  });

  test("keeps calculation and settlement choices in local Extra Place controls", async ({ page }) => {
    await page.goto(route);
    await expect(page.getByText("Loading Extra Place ledger")).toBeHidden({ timeout: 90_000 });
    await page.getByRole("button", { name: "Add Extra Place row" }).click();

    const dialog = page.getByRole("dialog", { name: "Create Extra Place row" });
    await expect(dialog.getByLabel("Each-way term denominator")).toHaveValue("5");
    await dialog.getByRole("button", { name: "1/4" }).click();
    await expect(dialog.getByLabel("Each-way term denominator")).toHaveValue("4");
    await expect(dialog.getByText("Total bookmaker stake:")).toBeVisible();
    const calculatePanel = dialog.locator('[data-pd-id="ledger-editor.panel.calculate"]');
    await expect(calculatePanel.getByText("Outcomes", { exact: true })).toBeVisible();
    await expect(calculatePanel.getByText("Qualifying Loss", { exact: false })).toBeVisible();

    await dialog.getByLabel("E/W Stake (each way)").fill("5");
    await dialog.getByLabel("Back Odds").fill("6");
    await dialog.getByLabel("Lay Odds").first().fill("2.3");
    await dialog.getByLabel("Lay Odds").nth(1).fill("4.5");
    await expect(calculatePanel.locator(".extra-place-matrix-value-negative").first()).toBeVisible();
    await expect(dialog.getByText(/^Rating \d+\.\d+%$/)).toBeVisible();
    await expect(dialog.getByText(/^Implied odds \d+\.\d+$/)).toBeVisible();
    await dialog.getByRole("tab", { name: /Placement/ }).click();
    await dialog.getByLabel("Runner / Horse").fill("Test Runner");
    await dialog.getByLabel("Race").fill("Test Race");
    await dialog.getByLabel("Date / Time").fill("2026-08-24T12:00");
    const placementPanel = dialog.locator('[data-pd-id="ledger-editor.panel.placement"]');
    await placementPanel.locator("select").first().selectOption("Betfred");
    const settlementPanel = dialog.locator('[data-pd-id="ledger-editor.panel.settlement"]');
    await expect(settlementPanel.locator(".extra-place-quick-choice-row")).toHaveCount(3);
    await expect(settlementPanel.getByText("Advanced", { exact: true })).toHaveCount(1);
    await expect(settlementPanel.locator(".tracker-nav.field-choice-pills")).toHaveCount(0);

    await dialog.getByRole("tab", { name: /Settlement/ }).click();
    const finishingPosition = dialog.getByLabel("Finishing Position");
    await dialog.getByRole("button", { name: "2nd", exact: true }).click();
    await expect(finishingPosition).toHaveValue("2nd");
    await expect(dialog.getByLabel("Status")).toHaveValue("Settled");
    await expect(dialog.getByLabel("Result")).toHaveValue("Standard Place");
    await expect(dialog.getByRole("button", { name: "2nd", exact: true })).toHaveAttribute("aria-pressed", "true");

    await finishingPosition.fill("3");
    await expect(finishingPosition).toHaveValue("3rd");
    await expect(dialog.getByRole("button", { name: "3rd", exact: true })).toHaveAttribute("aria-pressed", "true");
    await dialog.getByRole("button", { name: "Win", exact: true }).click();
    await expect(finishingPosition).toHaveValue("1st");
    await expect(dialog.getByRole("button", { name: "1st", exact: true })).toHaveAttribute("aria-pressed", "true");
  });

  test("keeps operational table controls available for Extra Place rows", async ({ page }) => {
    await page.goto(route);
    await expect(page.getByText("Loading Extra Place ledger")).toBeHidden({ timeout: 90_000 });
    const ledger = page.locator('[data-pd-id="extra-place.ledger"]');

    await expect(ledger.getByText("Qual Loss", { exact: true }).first()).toBeVisible();
    await expect(ledger.locator("th", { hasText: "Status" })).toBeVisible();
    await expect(ledger.locator('[data-pd-id="extra-place.table-scroll.scroll-right"]')).toBeAttached();
    await expect(ledger.locator(".table-column-resize-handle").first()).toBeVisible();

    await page.getByRole("button", { name: "Add Extra Place row" }).click();
    const dialog = page.getByRole("dialog", { name: "Create Extra Place row" });
    await dialog.getByLabel("E/W Stake (each way)").fill("5");
    await dialog.getByLabel("Back Odds").fill("6");
    await dialog.getByLabel("Lay Odds").first().fill("2.3");
    await dialog.getByLabel("Lay Odds").nth(1).fill("4.5");
    await dialog.getByRole("tab", { name: /Placement/ }).click();
    await dialog.getByLabel("Runner / Horse").fill("Action Menu Runner");
    await dialog.getByLabel("Race").fill("Action Menu Race");
    await dialog.getByLabel("Date / Time").fill("2026-08-24T12:00");
    await dialog.locator('[data-pd-id="ledger-editor.panel.placement"] select').first().selectOption("Betfred");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toBeHidden();

    const flag = ledger.getByRole("button", { name: /Update result for/ }).first();
    await flag.click();
    await expect(page.locator(".extra-place-result-menu")).toBeVisible();
  });

  test("uses the shared bookmaker badge and fully rounded neutral EP Profit treatment", async ({ page }) => {
    await page.goto(route);
    await expect(page.getByText("Loading Extra Place ledger")).toBeHidden({ timeout: 90_000 });
    const ledger = page.locator('[data-pd-id="extra-place.ledger"]');

    await page.getByRole("button", { name: "Add Extra Place row" }).click();
    const dialog = page.getByRole("dialog", { name: "Create Extra Place row" });
    await dialog.getByLabel("E/W Stake (each way)").fill("5");
    await dialog.getByLabel("Back Odds").fill("6");
    await dialog.getByLabel("Lay Odds").first().fill("2.3");
    await dialog.getByLabel("Lay Odds").nth(1).fill("4.5");
    await dialog.getByRole("tab", { name: /Placement/ }).click();
    await dialog.getByLabel("Runner / Horse").fill("Badge Runner");
    await dialog.getByLabel("Race").fill("Badge Race");
    await dialog.getByLabel("Date / Time").fill("2026-08-24T12:00");
    await dialog.locator('[data-pd-id="ledger-editor.panel.placement"] select').first().selectOption("Betfred");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toBeHidden();

    await expect(
      ledger.locator(".bookmaker-identity-badge", { hasText: "Betfred" }).first(),
    ).toBeVisible();
    await expect
      .poll(() =>
        ledger.locator(".extra-place-profit-value, .extra-place-profit-neutral").first().evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).borderTopLeftRadius),
        ),
      )
      .toBeGreaterThan(30);
  });
});
