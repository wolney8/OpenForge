import { expect, test } from "@playwright/test";

const route = "/profiles/profile-demo-001/tracker/each-way-extra-places";

test.describe("Extra Place ledger parity", () => {
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
});
