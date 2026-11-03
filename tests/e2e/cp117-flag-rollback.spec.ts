import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test.use({ video: "on", trace: "retain-on-failure" });

test("flag off retains the existing Daily Tasks table and shell", async ({ page }, info) => {
  const tokenPath = process.env.OPENFORGE_CP117_ISOLATED_SESSION_FILE;
  if (tokenPath) {
    await page.context().addCookies([{ name: "pd_session", value: readFileSync(tokenPath, "utf8").trim(), url: String(info.project.use.baseURL) }]);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route("**/api/auth/session", (route) => route.fulfill({ json: { authenticated: true, role: "fund_manager", email: "owner@example.invalid", name: "Synthetic Owner", linked_profile_ids: ["PROFILE-A"] } }));
  await page.route("**/fund-manager/notifications/state", (route) => route.fulfill({ json: { read_keys: [], dismissed_ids: [] } }));
  await page.route("**/fund-manager/notifications/preferences", (route) => route.fulfill({ json: { preferences: { settlement_review: true } } }));
  await page.route("**/fund-manager/notifications", (route) => route.fulfill({ json: [] }));
  await page.goto("/tasks");
  await expect(page.getByRole("heading", { name: "Daily Tasks", exact: true })).toBeVisible();
  await expect(page.locator('[data-pd-id="tasks.table-scroll"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="tasks.v2.layout"]')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("today-legacy-desktop.png") });
});

test("flag off retains the original real Sportsbook table presentation", async ({ page }, info) => {
  const tokenPath = process.env.OPENFORGE_CP117_ISOLATED_SESSION_FILE;
  test.skip(!tokenPath, "Requires the disposable CP-117 authenticated API fixture");
  await page.context().addCookies([{ name: "pd_session", value: readFileSync(tokenPath!, "utf8").trim(), url: String(info.project.use.baseURL) }]);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/profiles/profile-notification-acceptance/tracker/sportsbook-bets");
  await expect(page.getByRole("heading", { name: "Sportsbook Bets" })).toBeVisible();
  await expect(page.locator('[data-pd-id="ux-v2.sidebar"]')).toHaveCount(0);
  await expect(page.locator('[data-pd-id="sportsbook.view-context"]')).toBeHidden();
  await page.getByRole("combobox", { name: "Change tracker date range" }).selectOption({ label: "All Dates" });
  const scroll = page.locator('[data-pd-id="sportsbook.table-scroll"]');
  await expect(scroll.locator("tbody tr td:last-child:not([colspan])").first()).toBeVisible();
  await scroll.scrollIntoViewIfNeeded();
  await scroll.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
  await page.screenshot({ path: info.outputPath("sportsbook-legacy-scrolled.png") });
});
