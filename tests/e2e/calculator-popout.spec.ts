import { expect, test } from "@playwright/test";

const validSession = {
  authenticated: true,
  email: "calculator-popout@example.invalid",
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  linked_profile_ids: [],
  name: "Synthetic Fund Manager",
  role: "fund_manager",
  session_policy: { auto_logout_enabled: false, effective_expires_at: Math.floor(Date.now() / 1000) + 3600, preference_configured: true, timeout_minutes: 15 },
};

test("renders preserved calculator state in the authenticated lean shell", async ({ page }) => {
  await page.context().route("**/auth/session*", (route) => route.fulfill({ json: validSession }));
  await page.context().route("**/fund-manager/calculators/odds-probability/preview", (route) => route.fulfill({ json: {
    american_odds: "-166.67", decimal_odds: "1.60", fractional_odds: "3/5", implied_probability: "62.50",
  } }));
  await page.goto("/calculator?family=odds-converter&oddsSource=probability&oddsValue=62.5");

  await expect(page.locator('[data-pd-id="calculator-popout.shell"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Odds / Probability" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Probability (%)", exact: true })).toHaveValue("62.5");
  await expect(page.locator('[data-pd-id="calculators.odds-probability.results"]')).toContainText("3/5");
  await expect(page.locator('[data-pd-id="app-shell.top-bar"]')).toHaveCount(0);
  await expect(page.locator('[data-pd-id="app-navigation.trigger"]')).toHaveCount(0);
  await expect(page.locator('[data-pd-id="calculators.family-selector"]')).toHaveCount(0);
  await expect(page.getByText("Profiles", { exact: true })).toHaveCount(0);
  await expect(page.locator('[data-pd-id="app-shell.theme-toggle"]')).toBeVisible();
  const theme = await page.locator("html").getAttribute("data-theme");
  await page.locator('[data-pd-id="app-shell.theme-toggle"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme === "dark" ? "light" : "dark");
});

test("denies an unauthenticated calculator popout through the existing session guard", async ({ page }) => {
  await page.context().route("**/auth/session*", (route) => route.fulfill({ status: 401, json: { detail: "expired" } }));
  await page.goto("/calculator?family=blackjack");
  await expect(page).toHaveURL(/\/login\?error=session_expired/);
});
