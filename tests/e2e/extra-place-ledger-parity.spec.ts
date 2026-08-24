import { expect, test } from "@playwright/test";

const route = "/profiles/profile-demo-001/tracker/each-way-extra-places";

test.describe("Extra Place ledger parity", () => {
  test("uses the range card, grouped headers, and filter-owned detail-column controls", async ({ page }) => {
    await page.goto(route);
    await expect(page.getByText("Loading Extra Place ledger")).toBeHidden({ timeout: 90_000 });

    const ledger = page.locator('[data-pd-id="extra-place.ledger"]');
    await expect(ledger.locator('[data-pd-id="tracker.range-card"]')).toBeVisible();
    await expect(ledger.locator("th.extra-place-column-back").first()).toContainText("Bookmaker");
    await expect(ledger.locator("th.extra-place-column-back").first()).toHaveCSS("color", "rgb(20, 37, 51)");
    await expect(ledger.locator("th", { hasText: "Place Odds" })).toBeVisible();
    await expect(ledger.locator("th.extra-place-column-win-lay").first()).toContainText("Win Lay Odds");
    await expect(ledger.locator("th.extra-place-column-place-lay").first()).toContainText("Place Lay Odds");

    await ledger.getByRole("button", { name: "Use Back and Lay colour theme" }).click();
    await expect(ledger).toHaveClass(/extra-place-theme-back-lay/);

    await ledger.getByRole("button", { name: "Open Extra Place filters" }).click();
    const filterDialog = page.getByRole("dialog", { name: "Extra Place filter controls" });
    await filterDialog.getByRole("button", { name: "Hide detail columns" }).click();
    await filterDialog.getByRole("button", { name: "Apply filters" }).click();
    await expect(ledger.locator("th", { hasText: "Date / time" })).toBeVisible();
    await expect(ledger.locator("th", { hasText: "Qual Loss" })).toBeVisible();
    await expect(ledger.locator("th", { hasText: "Extra Place Profit" })).toBeVisible();
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
    await expect(dialog.getByRole("button", { name: "Apply filters" })).toBeVisible();
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
  });
});
