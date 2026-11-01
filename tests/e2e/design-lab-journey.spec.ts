import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    if (route.request().url().endsWith("/api/auth/session")) {
      await route.fulfill({ json: {
        authenticated: true,
        email: "demo@example.invalid",
        expires_at: 4102444800,
        name: "Synthetic Fund Manager",
        role: "fund_manager",
        session_policy: { absolute_expires_at: 4102444800, auto_logout_enabled: false, effective_expires_at: 4102444800, inactivity_expires_at: null, last_activity_at: 1, preference_configured: true, timeout_minutes: 30, valid_now: true },
      } });
      return;
    }
    if (route.request().url().endsWith("/api/auth/activity")) {
      await route.fulfill({ json: { ok: true } });
      return;
    }
    throw new Error(`Design Lab made an unexpected API request: ${route.request().url()}`);
  });
  await page.goto("/design-lab");
  await expect(page.locator('[data-pd-id="design-lab.root"]')).toBeVisible();
  const cookieNotice = page.getByRole("button", { name: "Understood" });
  if (await cookieNotice.isVisible()) await cookieNotice.click();
});

test("position to Account review and return preserves context and financial meaning", async ({ page }) => {
  await expect(page.getByText("£ 185.00")).toBeVisible();
  await expect(page.getByText("Incomplete · 1 Account balance missing")).toBeVisible();
  await expect(page.getByText("£ 25.00")).toBeVisible();
  await page.locator('[data-pd-id="design-lab.profile"]').selectOption("LAB-PROFILE-A");
  await page.locator('[data-pd-id="design-lab.range"]').selectOption("This Year");
  await page.locator('[data-pd-id="design-lab.review-account"]').click();
  await expect(page.getByText("LAB-ACCOUNT-C")).toBeVisible();
  const balance = page.locator('[data-pd-id="design-lab.balance"]');
  await balance.fill("invalid");
  await page.locator('[data-pd-id="design-lab.save"]').click();
  await expect(page.getByText(/Enter finite money/)).toBeVisible();
  await balance.fill("0.00");
  await page.locator('[data-pd-id="design-lab.close"]').click();
  await expect(page.getByRole("heading", { name: "Unsaved balance review" })).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(balance).toHaveValue("0.00");
  await page.locator('[data-pd-id="design-lab.close"]').click();
  await page.getByRole("button", { name: "Save and return" }).click();
  await expect(page.getByRole("heading", { name: "Your position" })).toBeVisible();
  await expect(page.locator('[data-pd-id="design-lab.profile"]')).toHaveValue("LAB-PROFILE-A");
  await expect(page.locator('[data-pd-id="design-lab.range"]')).toHaveValue("This Year");
  await expect(page.getByText("£ 125.00")).toBeVisible();
  await expect(page.getByText("All included balances known")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Incomplete · 1 Account balance missing")).toBeVisible();
});

test("failed save retains input and empty, loading and failure scenarios are distinct", async ({ page }) => {
  await page.locator('[data-pd-id="design-lab.review-account"]').click();
  await page.getByText("Lab scenarios and comparison").click();
  await page.getByLabel("Fail the next simulated save").check();
  await page.locator('[data-pd-id="design-lab.balance"]').fill("12.00");
  await page.locator('[data-pd-id="design-lab.save"]').click();
  await expect(page.getByText(/Simulated save failed/)).toBeVisible();
  await expect(page.locator('[data-pd-id="design-lab.balance"]')).toHaveValue("12.00");
  await page.locator('[data-pd-id="design-lab.save"]').click();
  await expect(page.getByText(/Simulation saved in this page/)).toBeVisible();
  await page.locator('[data-pd-id="design-lab.return"]').click();
  await page.locator('[data-pd-id="design-lab.profile"]').selectOption("LAB-PROFILE-B");
  await expect(page.getByText("No Account balance review needed")).toBeVisible();
  if (!await page.getByLabel("Position read state").isVisible()) await page.getByText("Lab scenarios and comparison").click();
  await page.getByLabel("Position read state").selectOption("loading");
  await expect(page.locator('[data-pd-id="design-lab.loading"]')).toBeVisible();
  await page.getByLabel("Position read state").selectOption("failure");
  await expect(page.getByRole("heading", { name: "Position unavailable" })).toBeVisible();
  await page.getByRole("button", { name: "Retry simulation" }).click();
  await expect(page.getByText("No Account balance review needed")).toBeVisible();
});

test("dirty dialog Escape restores focus and 200% zoom keeps the journey contained", async ({ page }) => {
  await page.setViewportSize({ width: 780, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => { document.documentElement.style.zoom = "200%"; });
  await page.locator('[data-pd-id="design-lab.review-account"]').click();
  const balance = page.locator('[data-pd-id="design-lab.balance"]');
  await balance.fill("25.00");
  const close = page.locator('[data-pd-id="design-lab.close"]');
  await close.click();
  await expect(page.getByRole("heading", { name: "Unsaved balance review" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Unsaved balance review" })).toHaveCount(0);
  await expect(close).toBeFocused();
  await expect(balance).toHaveValue("25.00");
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.evaluate(() => document.body.scrollWidth - document.body.clientWidth)).toBeLessThanOrEqual(1);
});

for (const width of [1440, 900, 768, 430, 390]) {
  test(`contained journey at ${width}px in light and dark`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    for (const theme of ["light", "dark"] as const) {
      const currentTheme = await page.evaluate(() => document.documentElement.dataset.theme);
      if (currentTheme !== theme) await page.getByRole("button", { name: `Switch to ${theme} mode` }).click();
      await expect(page.locator('[data-pd-id="design-lab.topbar"]')).toBeVisible();
      if (width <= 900) {
        await page.getByRole("button", { name: "Open navigation" }).click();
        await expect(page.getByRole("navigation", { name: "Global destinations" })).toBeVisible();
        await page.getByRole("button", { name: "Close navigation" }).click();
      }
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      const evidenceDir = process.env.OPENFORGE_DESIGN_LAB_EVIDENCE_DIR;
      if (evidenceDir) {
        await mkdir(evidenceDir, { recursive: true });
        await page.screenshot({ path: `${evidenceDir}/home-${width}-${theme}.png`, fullPage: true });
      }
      await page.locator('[data-pd-id="design-lab.review-account"]').click();
      await expect(page.locator('[data-pd-id="design-lab.balance"]')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      if (evidenceDir && (width === 1440 || width === 390)) await page.screenshot({ path: `${evidenceDir}/account-${width}-${theme}.png`, fullPage: true });
      await page.locator('[data-pd-id="design-lab.return"]').click();
    }
    expect(pageErrors).toEqual([]);
  });
}
