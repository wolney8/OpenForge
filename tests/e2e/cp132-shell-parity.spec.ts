import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const authURL = process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/";
const evidence = "data/private/evidence/cp132/paired";

async function setTheme(page: Page, mode: "light" | "dark") {
  await page.evaluate((value) => {
    localStorage.setItem("openforge-theme", value);
  }, mode);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", mode);
  await page.evaluate(() => document.fonts.ready);
}

async function box(page: Page, selector: string) {
  return page.locator(selector).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
}

test.beforeEach(async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_classification).toBe("isolated");
  expect(health.database_identity).toBe("cp117-integration-synthetic");
  await page.goto(authURL);
  const session = await (await page.request.get("/api/auth/session")).json();
  expect(session.email).toBe("demo@example.invalid");
  await page.evaluate(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
});

for (const width of [1440, 1024, 800, 390] as const) {
  for (const mode of ["light", "dark"] as const) {
    test(`CP-132 matched shell and launcher ${width} ${mode}`, async ({ page }) => {
      await mkdir(evidence, { recursive: true });
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/design-lab");
      await expect(page.locator('[data-pd-id="lab.header-trigger.launcher"]')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await setTheme(page, mode);
      await page.locator('[data-pd-id="lab.header-trigger.launcher"]').click();
      const labMenu = page.locator('[data-pd-id="lab.launcher"]');
      await expect(labMenu.getByRole("heading", { name: "Apps and tools" })).toBeVisible();
      const labOverlay = await box(page, '[data-pd-id="lab.header-menu"]');
      const labRows = await labMenu.locator('button').first().evaluate((element) => element.getBoundingClientRect().height);
      await page.screenshot({ path: join(evidence, `lab-launcher-${width}-${mode}.png`), fullPage: true });
      await page.keyboard.press("Escape");
      await page.locator('[data-pd-id="lab.header-trigger.identity"]').click();
      await expect(page.getByRole("region", { name: "Account menu" })).toBeVisible();
      const labAccount = await box(page, 'section[aria-label="Account menu"]');
      await page.screenshot({ path: join(evidence, `lab-account-${width}-${mode}.png`), fullPage: true });
      await page.keyboard.press("Escape");
      if (width <= 900) await page.getByRole("button", { name: "Open navigation" }).click();
      await page.locator('[data-pd-id="lab.nav.tracker-expand"]').click();
      await page.getByRole("button", { name: "See More" }).click();
      await page.screenshot({ path: join(evidence, `lab-sidebar-${width}-${mode}.png`), fullPage: true });

      await page.goto("/");
      await expect(page.locator('[data-pd-id="ux-v2.launcher.trigger"]')).toBeVisible();
      await setTheme(page, mode);
      await page.locator('[data-pd-id="combined-reporting.loading"]').waitFor({ state: "hidden", timeout: 45_000 });
      await expect(page.locator('[data-pd-id="position.metrics"]')).not.toContainText(/Loading|Updating/);
      await expect(page.locator('[data-pd-id="notifications.trigger"]')).toHaveAttribute("aria-busy", "false");
      const realActions = ['[data-pd-id="notifications.trigger"]', '[data-pd-id="ux-v2.header.tasks"]', '[data-pd-id="ux-v2.header.help"]', '[data-pd-id="ux-v2.launcher.trigger"]', '[data-pd-id="fund-manager-identity.trigger"]'];
      for (const selector of realActions) {
        if (width <= 700 && selector.includes("help")) continue;
        const control = await box(page, selector);
        expect(control.width).toBeGreaterThanOrEqual(43);
        expect(control.width).toBeLessThanOrEqual(46);
        expect(control.height).toBeGreaterThanOrEqual(43);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.locator('[data-pd-id="ux-v2.launcher.trigger"]').click();
      const realMenu = page.locator('[data-pd-id="ux-v2.launcher.panel"]');
      await expect(realMenu.getByRole("heading", { name: "Apps and tools" })).toBeVisible();
      await expect(realMenu.getByRole("heading", { name: "Betting Tools" })).toBeVisible();
      await expect(realMenu.getByRole("heading", { name: "Administration" })).toBeVisible();
      await expect(realMenu.getByRole("link")).toHaveCount(6);
      const realOverlay = await box(page, '[aria-label="Application launcher"]');
      const realRows = await realMenu.locator('a').first().evaluate((element) => element.getBoundingClientRect().height);
      expect(Math.abs(realOverlay.width - labOverlay.width)).toBeLessThanOrEqual(2);
      expect(Math.abs(realRows - labRows)).toBeLessThanOrEqual(3);
      expect(realOverlay.x).toBeGreaterThanOrEqual(0);
      expect(realOverlay.x + realOverlay.width).toBeLessThanOrEqual(width + 1);
      await page.screenshot({ path: join(evidence, `v2-launcher-${width}-${mode}.png`), fullPage: true });
      await page.keyboard.press("Escape");
      await expect(page.locator('[data-pd-id="ux-v2.launcher.trigger"]')).toBeFocused();
      if (width <= 900) await page.getByRole("button", { name: "Open navigation" }).click();
      await expect(page.locator('[data-pd-id="ux-v2.nav.tracker-expand"]')).toHaveAttribute("aria-expanded", "true");
      const trackerChildren = page.locator('#ux-v2-tracker-destinations');
      await expect(trackerChildren).toBeVisible();
      expect(await trackerChildren.evaluate((element) => getComputedStyle(element).borderLeftWidth)).toBe("1px");
      const more = page.locator('[data-pd-id="ux-v2.nav.more"]');
      await expect(more.locator('.material-symbols-outlined').first()).toHaveText("expand_more");
      await more.click();
      await expect(more).toHaveAttribute("aria-expanded", "true");
      await expect(more.locator('.material-symbols-outlined').first()).toHaveText("expand_less");
      await page.screenshot({ path: join(evidence, `v2-sidebar-${width}-${mode}.png`), fullPage: true });
      if (width <= 900) await page.getByRole("button", { name: "Close navigation" }).click();
      await page.locator('[data-pd-id="fund-manager-identity.trigger"]').click();
      await expect(page.locator('[data-pd-id="fund-manager-identity.back-lay-colours"]')).toBeVisible();
      await expect(page.locator('[data-pd-id="fund-manager-identity.dark-mode"]')).toBeVisible();
      const realAccount = await box(page, '[data-pd-id="fund-manager-identity.menu"]');
      expect(Math.abs(realAccount.width - labAccount.width)).toBeLessThanOrEqual(2);
      expect(realAccount.x).toBeGreaterThanOrEqual(0);
      expect(realAccount.x + realAccount.width).toBeLessThanOrEqual(width + 1);
      await page.screenshot({ path: join(evidence, `v2-account-${width}-${mode}.png`), fullPage: true });
    });
  }
}

test("CP-132 real header controls retain commands and independent preferences", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.locator('[data-pd-id="notifications.trigger"]').click();
  await expect(page.locator('[data-pd-id="notifications.v2.dropdown"]')).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator('[data-pd-id="ux-v2.header.help"]').click();
  await expect(page.locator('[data-pd-id="ux-v2.header.help-panel"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="ux-v2.header.help-panel"] a')).toHaveCount(3);
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-pd-id="ux-v2.header.help"]')).toBeFocused();
  await page.locator('[data-pd-id="fund-manager-identity.trigger"]').click();
  await page.getByRole("radio", { name: /Betfair/ }).check();
  await expect(page.locator("html")).toHaveAttribute("data-backlay-theme", "betfair");
  const before = await page.locator("html").getAttribute("data-theme");
  await page.locator('[data-pd-id="fund-manager-identity.dark-mode"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", before === "dark" ? "light" : "dark");
  await expect(page.locator("html")).toHaveAttribute("data-backlay-theme", "betfair");
  await page.locator('[data-pd-id="fund-manager-identity.trigger"]').click();
  await page.locator('[data-pd-id="ux-v2.header.tasks"]').click();
  await expect(page).toHaveURL(/\/tasks$/);
  await page.locator('[data-pd-id="ux-v2.launcher.trigger"]').click();
  await page.locator('[data-pd-id="ux-v2.launcher.calculators"]').click();
  await expect(page).toHaveURL(/\/fund-manager\/calculators$/);
});
