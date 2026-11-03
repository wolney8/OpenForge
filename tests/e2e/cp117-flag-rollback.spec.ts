import { expect, test } from "@playwright/test";

test.use({ video: "on", trace: "retain-on-failure" });

test("flag off retains the existing Daily Tasks table and shell", async ({ page }, info) => {
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
