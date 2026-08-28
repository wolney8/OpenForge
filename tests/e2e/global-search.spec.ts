import { expect, test } from "@playwright/test";

test.describe("Founder global search", () => {
  test("supports grouped keyboard navigation without exposing an unbounded index", async ({ page }) => {
    await page.setViewportSize({ width: 1180, height: 820 });
    await page.goto("/profiles/profile-demo-001/tracker/dashboard");

    const search = page.locator('[data-pd-id="global-search.input"]');
    await expect(search).toBeVisible();
    await search.fill("Account Catalogue");
    const results = page.locator('[data-pd-id="global-search.results"]');
    await expect(results).toBeVisible();
    await expect(results.getByText("Navigation", { exact: true })).toBeVisible();
    await expect(results.getByText("Account Catalogue", { exact: true })).toBeVisible();

    await search.press("ArrowDown");
    await search.press("Enter");
    await expect(page).toHaveURL(/\/settings.*#catalogue$/);

    await page.locator('[data-pd-id="global-search.input"]').fill("no-synthetic-match-999");
    await expect(page.getByText("No matching profiles, providers or pages.")).toBeVisible();
    await page.locator('[data-pd-id="global-search.input"]').press("Escape");
    await expect(page.locator('[data-pd-id="global-search.results"]')).toHaveCount(0);
  });

  test("fits the canonical shell in mobile and dark mode", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 720 });
    await page.goto("/profiles");
    await page.locator('[data-pd-id="app-shell.theme-toggle"]').click();

    const search = page.locator('[data-pd-id="global-search.input"]');
    await expect(search).toBeVisible();
    const geometry = await search.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        left: bounds.left,
        right: bounds.right,
        width: bounds.width,
        viewportWidth: document.documentElement.clientWidth,
      };
    });
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.width).toBeGreaterThanOrEqual(220);
  });
});
