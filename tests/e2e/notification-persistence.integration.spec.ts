import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const profileId = "profile-notification-acceptance";
const recordId = "sportsbook-notification-acceptance";
const apiBaseURL = "http://127.0.0.1:8120";

test("clear remains durable through regeneration, reload, and a fresh browser session", async ({
  browser,
  context,
  page,
}) => {
  const runtimeRoot = process.env.NOTIFICATION_ACCEPTANCE_RUNTIME_DIR;
  expect(runtimeRoot).toBeTruthy();
  const runtimeDirectory = join(runtimeRoot!, "api");
  const token = readFileSync(join(runtimeDirectory, "session-token"), "utf8").trim();
  const sourceBefore = JSON.parse(
    readFileSync(join(runtimeDirectory, "source-state.json"), "utf8"),
  ) as Record<string, string>;
  const cookie = {
    name: "pd_session",
    value: token,
    domain: "127.0.0.1",
    path: "/",
    httpOnly: true,
    sameSite: "Lax" as const,
    secure: false,
  };
  await context.addCookies([cookie]);
  let stateMutationCount = 0;
  page.on("request", (request) => {
    if (
      request.method() === "PUT" &&
      request.url().endsWith("/fund-manager/notifications/state")
    ) {
      stateMutationCount += 1;
    }
  });

  await page.goto("/profiles");
  await page.locator('[data-pd-id="notifications.trigger"]').click();
  const card = page.locator(`[data-pd-id="notifications.item.${recordId}"]`);
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Clear notification for Synthetic Notification Profile" }).click();
  const persisted = page.waitForResponse(
    (response) =>
      response.request().method() === "PUT" &&
      response.url().endsWith("/fund-manager/notifications/state"),
  );
  await card.getByRole("button", { name: "Clear", exact: true }).click();
  expect((await persisted).status()).toBe(200);
  await expect(card).toHaveCount(0);

  await page.evaluate(() => {
    window.dispatchEvent(new Event("plum-duff:fund-manager-notifications-refresh"));
  });
  await page.reload();
  await page.locator('[data-pd-id="notifications.trigger"]').click();
  await expect(card).toHaveCount(0);
  expect(stateMutationCount).toBe(1);

  const feedResponse = await context.request.get(
    `${apiBaseURL}/fund-manager/notifications`,
  );
  expect(feedResponse.ok()).toBe(true);
  const sourceNotification = (
    (await feedResponse.json()) as Array<Record<string, string>>
  ).find((notification) => notification.record_id === recordId);
  expect(sourceNotification).toBeTruthy();
  const stateResponse = await context.request.get(
    `${apiBaseURL}/fund-manager/notifications/state`,
  );
  expect(stateResponse.ok()).toBe(true);
  expect((await stateResponse.json()).dismissed_ids).toContain(
    sourceNotification!.notification_id,
  );

  const sourceAfterResponse = await context.request.get(
    `${apiBaseURL}/profiles/${profileId}/sportsbook-bets/${recordId}`,
  );
  expect(sourceAfterResponse.ok()).toBe(true);
  const sourceAfter = (await sourceAfterResponse.json()) as Record<string, string>;
  expect(sourceAfter.partial_lay_reminder_state).toBe(sourceBefore.reminder_state);
  expect(sourceAfter.partial_lay_reminder_due_at).toBe(sourceBefore.reminder_due_at);
  expect(sourceAfter.updated_at).toBe(sourceBefore.updated_at);

  const freshContext = await browser.newContext();
  try {
    await freshContext.addCookies([cookie]);
    const freshPage = await freshContext.newPage();
    await freshPage.goto("http://127.0.0.1:3120/profiles");
    await freshPage.locator('[data-pd-id="notifications.trigger"]').click();
    await expect(
      freshPage.locator(`[data-pd-id="notifications.item.${recordId}"]`),
    ).toHaveCount(0);
  } finally {
    await freshContext.close();
  }
});
