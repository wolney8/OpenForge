import { expect, test } from "@playwright/test";

const routes = [
  "/login",
  "/profiles",
  "/profiles/profile-demo-001",
  "/profiles/profile-demo-001/tracker/dashboard",
  "/profiles/profile-demo-001/tracker/accounts",
  "/profiles/profile-demo-001/tracker/sportsbook-bets",
  "/profiles/profile-demo-001/tracker/free-bets",
  "/profiles/profile-demo-001/tracker/casino-offers",
  "/profiles/profile-demo-001/tracker/cash-adjustments",
  "/profiles/profile-demo-001/tracker/reports",
  "/profiles/profile-demo-001/tracker/settings",
];

test("primary routes contain horizontal overflow at a narrow viewport", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of routes) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.locator("body").waitFor();

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(
      dimensions.scrollWidth,
      `${route} must not create page-level horizontal scrolling`
    ).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  }
});

test("ledger editor remains within the mobile viewport with reachable actions", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/profiles/profile-demo-001/tracker/sportsbook-bets");
  await page.waitForLoadState("networkidle");
  await page.locator(".data-table tbody tr").first().click();

  const dialog = page.getByRole("dialog", { name: "Edit sportsbook row" });
  const dialogBounds = await dialog.boundingBox();
  expect(dialogBounds).not.toBeNull();
  expect(dialogBounds!.x).toBeGreaterThanOrEqual(0);
  expect(dialogBounds!.x + dialogBounds!.width).toBeLessThanOrEqual(390);

  await dialog.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(dialog.locator('[data-pd-id="sportsbook.editor.actions"]')).toBeVisible();

  const pageDimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(pageDimensions.scrollWidth).toBeLessThanOrEqual(pageDimensions.clientWidth + 1);
});
