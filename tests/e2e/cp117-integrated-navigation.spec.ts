import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test.use({ video: "on", trace: "retain-on-failure", screenshot: "only-on-failure" });

test("real V2 shell connects Profile ledgers, Reports, Today and tools", async ({ page }, info) => {
  const tokenPath = process.env.OPENFORGE_CP117_ISOLATED_SESSION_FILE;
  test.skip(!tokenPath, "Requires the disposable CP-117 authenticated API fixture");
  await page.context().addCookies([{ name: "pd_session", value: readFileSync(tokenPath!, "utf8").trim(), url: String(info.project.use.baseURL) }]);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/fund-manager/preferences/oddsmatcher", (route) => route.fulfill({ json: { version: 1, data_source: "replay", saved_snapshot_id: "", default_back_stake: "10.00", exchange_commission_overrides: {}, excluded_bookmaker_identities: [], excluded_exchange_identities: [], show_arbs_default: true, default_advanced: false, saved_filters: [] } }));
  await page.route("**/api/oddsmatcher/snapshots", (route) => route.fulfill({ json: [] }));
  const providerCalls: string[] = [];
  await page.route("**/api/oddsmatcher/refresh**", (route) => { providerCalls.push(route.request().url()); return route.abort(); });

  await page.goto("/profiles/profile-notification-acceptance/tracker/dashboard");
  await expect(page.locator('[data-pd-id="ux-v2.sidebar"]')).toBeVisible();
  await page.locator('[data-pd-id="ux-v2.nav.sportsbook"]').click();
  await expect(page).toHaveURL(/\/tracker\/sportsbook-bets$/);
  await expect(page.locator('[data-pd-id="ux-v2.nav.position"]')).toBeVisible();
  await page.locator('[data-pd-id="ux-v2.nav.reports"]').click();
  await expect(page).toHaveURL(/\/reports$/);
  await page.locator('[data-pd-id="ux-v2.launcher.trigger"]').click();
  await page.locator('[data-pd-id="ux-v2.launcher.calculators"]').click();
  await expect(page).toHaveURL(/\/fund-manager\/calculators$/);
  await expect(page.locator('[data-pd-id="ux-v2.sidebar"]')).toBeVisible();
  await page.locator('[data-pd-id="ux-v2.launcher.trigger"]').click();
  await page.locator('[data-pd-id="ux-v2.launcher.oddsmatcher"]').click();
  await expect(page).toHaveURL(/\/oddsmatcher$/);
  await expect(page.locator('[data-pd-id="ux-v2.sidebar"]')).toBeVisible();
  expect(providerCalls).toEqual([]);
  await page.locator('[data-pd-id="ux-v2.nav.position"]').click();
  await expect(page).toHaveURL("/");
  await page.locator('[data-pd-id="ux-v2.nav.today"]').click();
  await expect(page).toHaveURL(/\/tasks$/);
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("real-v2-connected-navigation.png") });
});
