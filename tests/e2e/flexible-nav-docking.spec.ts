import { expect, test } from "@playwright/test";

type NavSnapshot = {
  topBarBottom: number;
  placeholderTop: number;
  placeholderWidth: number;
  overlayTop: number;
  overlayWidth: number;
};

async function readNavSnapshot(page: Parameters<typeof test>[0]["page"]): Promise<NavSnapshot> {
  return page.evaluate(() => {
    const topBar = document.querySelector<HTMLElement>('[data-pd-id="app-shell.top-bar"]');
    const placeholder = document.querySelector<HTMLElement>(
      '[data-pd-id="tracker-nav.docked-placeholder"]'
    );
    const overlay = document.querySelector<HTMLElement>('[data-pd-id="tracker-nav.floating-overlay"]');

    if (!topBar || !placeholder || !overlay) {
      throw new Error("Expected top bar, placeholder nav, and overlay nav to exist");
    }

    const topBarRect = topBar.getBoundingClientRect();
    const placeholderRect = placeholder.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();

    return {
      topBarBottom: topBarRect.bottom,
      placeholderTop: placeholderRect.top,
      placeholderWidth: placeholderRect.width,
      overlayTop: overlayRect.top,
      overlayWidth: overlayRect.width,
    };
  });
}

test.describe("Flexible nav docking", () => {
  test("undocks under the fixed top bar and redocks on scroll up", async ({ page }) => {
    await page.goto("/profiles/profile-demo-001/tracker/settings");

    const overlay = page.locator('[data-pd-id="tracker-nav.floating-overlay"]');
    await expect(overlay).toBeVisible();

    const initial = await readNavSnapshot(page);
    expect(Math.abs(initial.overlayTop - initial.placeholderTop)).toBeLessThan(4);
    expect(Math.abs(initial.overlayWidth - initial.placeholderWidth)).toBeLessThan(4);

    await page.evaluate(() => window.scrollTo({ top: 480, behavior: "instant" }));
    await page.waitForTimeout(200);

    const floated = await readNavSnapshot(page);
    expect(Math.abs(floated.overlayTop - (floated.topBarBottom + 16))).toBeLessThan(8);
    expect(floated.placeholderTop).toBeLessThan(floated.topBarBottom);
    expect(floated.overlayTop).toBeGreaterThan(floated.placeholderTop);
    expect(floated.overlayWidth).toBeLessThan(floated.placeholderWidth);

    await page.evaluate(() => window.scrollTo({ top: 1200, behavior: "instant" }));
    await page.waitForTimeout(200);

    const stillFloated = await readNavSnapshot(page);
    expect(Math.abs(stillFloated.overlayTop - (stillFloated.topBarBottom + 16))).toBeLessThan(8);

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(200);

    const redocked = await readNavSnapshot(page);
    expect(Math.abs(redocked.overlayTop - redocked.placeholderTop)).toBeLessThan(4);
    expect(Math.abs(redocked.overlayWidth - redocked.placeholderWidth)).toBeLessThan(4);
  });
});
