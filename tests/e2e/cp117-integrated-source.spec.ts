import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test.use({ video: "on", trace: "retain-on-failure", screenshot: "only-on-failure" });

test("flagged Today opens a real isolated source through the existing API", async ({ page }, info) => {
  const tokenPath = process.env.OPENFORGE_CP117_ISOLATED_SESSION_FILE;
  test.skip(!tokenPath, "Requires the disposable CP-117 authenticated API fixture");
  const baseURL = String(info.project.use.baseURL);
  await page.context().addCookies([{ name: "pd_session", value: readFileSync(tokenPath!, "utf8").trim(), url: baseURL }]);
  const health = await (await page.request.get(`${process.env.OPENFORGE_E2E_API_BASE_URL}/healthz`)).json();
  expect(health.runtime_role).toBe("test");
  expect(health.database_identity).toBe("notification-acceptance");
  const recordPath = "/api/profiles/profile-notification-acceptance/sportsbook-bets/sportsbook-notification-acceptance";
  const before = await (await page.request.get(recordPath)).json();
  const nextEventName = before.event_name === "Synthetic reviewed event A" ? "Synthetic reviewed event B" : "Synthetic reviewed event A";

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/tasks");
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: /Upcoming/ }).click();
  const row = page.locator('[data-pd-id^="tasks.v2.row."]').filter({ hasText: "Partial lay recheck" });
  await expect(row).toBeVisible();
  await row.click();
  const detail = page.locator('[data-pd-id="tasks.v2.inspector"]');
  await expect(detail).toContainText("Synthetic Notification Profile");
  await page.screenshot({ path: info.outputPath("today-real-api-source.png") });
  await detail.getByRole("link", { name: "Open Source" }).click();
  await expect(page).toHaveURL(/sportsbook-bets/);
  const editor = page.getByRole("dialog", { name: "Edit sportsbook row", exact: true });
  await expect(editor).toBeVisible();
  await expect(editor.getByRole("textbox", { name: "Event name" })).toHaveValue(before.event_name);
  await editor.getByRole("textbox", { name: "Event name" }).fill(nextEventName);
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editor).toHaveCount(0);
  const record = await (await page.request.get(recordPath)).json();
  expect(record.event_name).toBe(nextEventName);
});
