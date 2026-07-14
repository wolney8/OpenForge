import { expect, test } from "@playwright/test";

test("ledger toast remains readable above the editor modal and exposes useful states", async ({
  page,
}) => {
  await page.goto("/profiles/profile-demo-001/tracker/sportsbook-bets");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Add sportsbook row" }).click();

  const toast = page.locator(".status-toast");
  const backdrop = page.locator(".modal-backdrop").first();
  await expect(toast).toContainText(
    "New sportsbook bet ready. Complete the required fields, then save."
  );
  await expect(toast).toHaveClass(/status-toast-info/);
  await expect(toast.getByRole("button", { name: "Dismiss notification" })).toBeVisible();

  const toastLayer = Number(await toast.evaluate((element) => getComputedStyle(element).zIndex));
  const backdropLayer = Number(
    await backdrop.evaluate((element) => getComputedStyle(element).zIndex)
  );
  expect(toastLayer).toBeGreaterThan(backdropLayer);
  await expect(toast).toHaveCSS("filter", "none");

  await toast.getByRole("button", { name: "Dismiss notification" }).click();
  await expect(toast).toHaveCount(0);

  const dialog = page.locator(".workflow-editor-modal");
  await dialog.locator("form").evaluate((form) => {
    (form as HTMLFormElement).noValidate = true;
  });
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(toast).toHaveClass(/status-toast-error/);
  await expect(toast).toContainText("Complete required sportsbook fields before saving:");
});
