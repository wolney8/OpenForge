import { expect, test } from "@playwright/test";

const sportsbookRoute = "/profiles/profile-demo-001/tracker/sportsbook-bets";
const freeBetRoute = "/profiles/profile-demo-001/tracker/free-bets";

function colourChannels(value: string) {
  const rgbMatch = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return {
      b: Number(rgbMatch[3]),
      g: Number(rgbMatch[2]),
      r: Number(rgbMatch[1]),
    };
  }

  const srgbMatch = value.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (srgbMatch) {
    return {
      b: Number(srgbMatch[3]) * 255,
      g: Number(srgbMatch[2]) * 255,
      r: Number(srgbMatch[1]) * 255,
    };
  }

  throw new Error(`Unsupported colour format: ${value}`);
}

function expectRedDominant(value: string) {
  const channels = colourChannels(value);
  expect(channels.r).toBeGreaterThan(channels.g);
  expect(channels.r).toBeGreaterThan(channels.b);
}

test("unchanged editor navigation is silent while a real edit is protected", async ({ page }) => {
  test.setTimeout(120_000);
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
  await expect(page.getByText("Loading sportsbook ledger")).toBeHidden({ timeout: 90_000 });
  await page.getByRole("button", { name: "Add sportsbook row" }).click();
  const createDialog = page.getByRole("dialog", { name: "Create sportsbook row" });
  await createDialog.getByLabel("Offer", { exact: true }).fill("Unsaved guard check");

  await page.locator(`a[href="${freeBetRoute}"]`).first().evaluate((link) => {
    (link as HTMLAnchorElement).click();
  });
  const guardDialog = page.getByRole("dialog", { name: "Unsaved tracker changes" });
  await expect(guardDialog).toBeVisible();
  await expect(guardDialog).toContainText("You have unsaved changes");
  await expect(guardDialog).toHaveAttribute("aria-modal", "true");
  await expect(guardDialog.getByRole("button", { name: "Keep Editing", exact: true })).toBeFocused();

  const bounds = await guardDialog.boundingBox();
  const viewport = page.viewportSize();
  expect(bounds).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport!.width);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport!.height);

  await page.keyboard.press("Escape");
  await expect(guardDialog).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`${sportsbookRoute}$`));
  await expect(createDialog).toBeVisible();

  await page.locator(`a[href="${freeBetRoute}"]`).first().evaluate((link) => {
    (link as HTMLAnchorElement).click();
  });
  const secondGuardDialog = page.getByRole("dialog", { name: "Unsaved tracker changes" });
  await expect(secondGuardDialog).toBeVisible();
  await secondGuardDialog.getByRole("button", { name: "Discard Changes" }).click();
  await expect(page).toHaveURL(new RegExp(`${freeBetRoute}$`));
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

test("top bar profile summary exposes accounting-formatted coloured P&L", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(sportsbookRoute);
  await expect(page.getByText("Loading sportsbook ledger")).toBeHidden({ timeout: 90_000 });

  const summaryButton = page.locator("button.summary-menu-button");
  await expect(summaryButton).toBeVisible();
  const summaryValue = summaryButton.locator(".summary-menu-financial-value");
  await expect(summaryValue).toBeVisible();
  await expect(summaryValue).toHaveAttribute("data-money-tone", /^(positive|negative|neutral)$/);
  await expect(summaryValue).toContainText(/^£ ((\([0-9,]+\.[0-9]{2}\))|([0-9,]+\.[0-9]{2})|-)$/);
});

test("ledger row delete uses the in-app destructive confirmation", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(sportsbookRoute);
  await expect(page.getByText("Loading sportsbook ledger")).toBeHidden({ timeout: 90_000 });

  let browserDialogCount = 0;
  page.on("dialog", async (dialog) => {
    browserDialogCount += 1;
    await dialog.dismiss();
  });

  await page.getByRole("button", { name: /^Delete sportsbook row / }).first().click();

  const confirmation = page.getByRole("dialog", { name: "Delete sportsbook row?" });
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toHaveAttribute("aria-modal", "true");
  await expect(confirmation).toContainText("This will remove it from this profile tracker.");
  await expect(browserDialogCount).toBe(0);

  const deleteButton = confirmation.getByRole("button", { name: "Delete Row" });
  await expect(deleteButton).toBeVisible();
  const deleteIcon = deleteButton.locator(".material-symbols-outlined");
  await expect(deleteIcon).toHaveText("delete");
  const deleteColour = await deleteIcon.evaluate((element) => getComputedStyle(element).color);
  const borderColour = await deleteButton.evaluate((element) => getComputedStyle(element).borderColor);
  expectRedDominant(deleteColour);
  expectRedDominant(borderColour);

  await confirmation.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(confirmation).toHaveCount(0);
});
