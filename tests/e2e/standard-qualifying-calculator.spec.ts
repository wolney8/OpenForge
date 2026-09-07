import { expect, test } from "@playwright/test";

const apiBaseUrl = process.env.CALCULATOR_E2E_API_BASE_URL ?? "http://127.0.0.1:8010";
const webBaseUrl = process.env.OPENFORGE_E2E_BASE_URL ?? "http://127.0.0.1:3010";
const profileId = "profile-demo-001";

test("calculates and copies a standard qualifying reference without creating a ledger row", async ({ page, request }) => {
  await page.route("**/auth/session", (route) =>
    route.fulfill({
      json: {
        authenticated: true,
        email: "calculator-test@example.invalid",
        name: "Synthetic Fund Manager",
        role: "fund_manager",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        linked_profile_ids: [profileId],
        session_policy: {
          auto_logout_enabled: false,
          timeout_minutes: 15,
          preference_configured: true,
          effective_expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
    })
  );
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: webBaseUrl,
  });
  const beforeResponse = await request.get(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`);
  expect(beforeResponse.ok()).toBeTruthy();
  const beforeCount = (await beforeResponse.json()).length;

  await page.goto(`/profiles/${profileId}/tracker/calculators`);
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
  await expect(page.getByRole("heading", { name: "Standard Qualifying" })).toBeVisible();
  const segments = page.locator(".calculator-segment");
  for (let index = 0; index < (await segments.count()); index += 1) {
    const segment = segments.nth(index);
    const segmentBox = await segment.boundingBox();
    expect(segmentBox).not.toBeNull();
    for (const input of await segment.locator("input").all()) {
      const inputBox = await input.boundingBox();
      expect(inputBox).not.toBeNull();
      expect(inputBox!.x).toBeGreaterThanOrEqual(segmentBox!.x);
      expect(inputBox!.x + inputBox!.width).toBeLessThanOrEqual(
        segmentBox!.x + segmentBox!.width + 1,
      );
    }
  }
  const calculate = page.getByRole("button", { name: "Calculate" });
  await expect(calculate).toBeDisabled();

  await page.getByLabel("Back stake").fill("10.00");
  await page.getByLabel("Back odds").fill("2.00");
  await page.getByLabel("Lay odds").fill("8,5");
  await expect(page.getByText("Enter decimal odds using a full stop, for example 8.5.")).toBeVisible();
  await expect(calculate).toBeDisabled();
  await expect(page.locator('[data-pd-id="calculators.standard-qualifying.results"]')).toHaveCount(0);

  await page.getByLabel("Lay odds").fill("2.10");
  await page.getByLabel("Exchange commission").fill("0.02");
  await expect(calculate).toBeEnabled();
  await calculate.click();

  const results = page.locator('[data-pd-id="calculators.standard-qualifying.results"]');
  await expect(results).toBeVisible();
  await expect(results).toContainText("£ (0.58)");
  await expect(results).toContainText("£ 9.62");
  await page.getByRole("button", { name: "Copy Lay Stake" }).click();
  await expect(page.getByRole("status")).toHaveText("Copied 9.62");
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe("9.62");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(results.locator(".financial-value").first()).toHaveAttribute(
    "data-money-motion",
    "none",
  );

  if (process.env.CALCULATOR_E2E_SCREENSHOT_PATH) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(2_500);
    await page.screenshot({ path: process.env.CALCULATOR_E2E_SCREENSHOT_PATH, fullPage: true });
  }

  await page.getByLabel("Lay odds").fill("NaN");
  await expect(results).toHaveCount(0);
  await expect(calculate).toBeDisabled();
  await page.getByLabel("Lay odds").fill("2.10");
  await calculate.click();
  await expect(results).toBeVisible();

  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('[data-pd-id="calculators.workspace"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await page.getByLabel("Back stake").focus();
  await expect(page.getByLabel("Back stake")).toBeFocused();
  if (process.env.CALCULATOR_E2E_SCREENSHOT_PATH) {
    await page.waitForTimeout(2_500);
    await page.screenshot({
      path: process.env.CALCULATOR_E2E_SCREENSHOT_PATH.replace(/\.png$/, "-dark-narrow.png"),
      fullPage: true,
    });
  }

  const afterResponse = await request.get(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`);
  expect(afterResponse.ok()).toBeTruthy();
  expect((await afterResponse.json()).length).toBe(beforeCount);
});
