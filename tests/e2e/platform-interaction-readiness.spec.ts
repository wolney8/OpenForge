import { expect, test } from "@playwright/test";

const sportsbookRoute = "/profiles/profile-demo-001/tracker/sportsbook-bets";
const freeBetRoute = "/profiles/profile-demo-001/tracker/free-bets";

test("unchanged editor navigation is silent while a real edit is protected", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto(sportsbookRoute);
  const firstSportsbookRow = page.locator(".data-table tbody tr").first();
  await expect(firstSportsbookRow).toBeVisible();
  await firstSportsbookRow.click();
  await expect(page.getByRole("dialog", { name: "Edit sportsbook row" })).toBeVisible();

  let unchangedDialogCount = 0;
  const unchangedDialogHandler = async (dialog: import("@playwright/test").Dialog) => {
    unchangedDialogCount += 1;
    await dialog.dismiss();
  };
  page.on("dialog", unchangedDialogHandler);
  await page.locator(`a[href="${freeBetRoute}"]`).first().evaluate((link) => {
    (link as HTMLAnchorElement).click();
  });
  await expect(page).toHaveURL(new RegExp(`${freeBetRoute}$`));
  expect(unchangedDialogCount).toBe(0);
  page.off("dialog", unchangedDialogHandler);

  await page.goto(sportsbookRoute);
  await page.getByRole("button", { name: "Add sportsbook row" }).click();
  const createDialog = page.getByRole("dialog", { name: "Create sportsbook row" });
  await createDialog.getByLabel("Offer", { exact: true }).fill("Unsaved guard check");

  const guardDialog = page.waitForEvent("dialog");
  const guardedNavigation = page.locator(`a[href="${freeBetRoute}"]`).first().evaluate((link) => {
    (link as HTMLAnchorElement).click();
  });
  const dialog = await guardDialog;
  expect(dialog.message()).toContain("You have unsaved changes");
  await dialog.dismiss();
  await guardedNavigation;
  await expect(page).toHaveURL(new RegExp(`${sportsbookRoute}$`));
  await expect(createDialog).toBeVisible();
});

test("tracker controls expose visible focus and an operable theme toggle", async ({ page }) => {
  await page.goto(sportsbookRoute);

  const filterButton = page.getByRole("button", {
    name: "Open sportsbook filter and column controls",
  });
  await expect(filterButton).toBeVisible();
  await filterButton.focus();
  await expect(filterButton).toBeFocused();
  const focusStyle = await filterButton.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
    };
  });
  expect(
    focusStyle.outlineStyle !== "none" ||
      focusStyle.outlineWidth !== "0px" ||
      focusStyle.boxShadow !== "none"
  ).toBeTruthy();

  const themeToggle = page.getByRole("button", { name: /Switch to (light|dark) mode/ });
  const backLayToggle = page.getByRole("button", { name: "Choose back/lay colour theme" });
  await expect(themeToggle.locator(".theme-mode-icon-stage")).toBeVisible();
  await expect(backLayToggle.locator(".palette-icon")).toBeVisible();
  await expect(backLayToggle.locator("strong")).toHaveCount(0);
  const initialTheme = await page.locator("html").getAttribute("data-theme");
  await themeToggle.click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", initialTheme ?? "");
  await expect(page.getByRole("button", { name: /Switch to (light|dark) mode/ })).toBeVisible();
});
