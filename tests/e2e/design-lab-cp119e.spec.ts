import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async route => {
    if (route.request().url().endsWith("/api/auth/session")) return route.fulfill({ json: { authenticated: true, email: "demo@example.invalid", expires_at: 4102444800, role: "fund_manager", session_policy: { absolute_expires_at: 4102444800, auto_logout_enabled: false, effective_expires_at: 4102444800, inactivity_expires_at: null, last_activity_at: 1, preference_configured: true, timeout_minutes: 30, valid_now: true } } });
    if (route.request().url().endsWith("/api/auth/activity")) return route.fulfill({ json: { ok: true } });
    throw new Error(`Unexpected lab API request: ${route.request().url()}`);
  });
  await page.goto("/design-lab");
  await expect(page.locator('[data-pd-id="design-lab-connected.root"]')).toBeVisible();
});

test("cell selection transfers and clears outside; editor keeps invalid draft and commits valid outside", async ({ page }) => {
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  const row = page.locator('tr[data-lab-row-id="LAB-SB-001"]');
  const eventCell = row.locator('td[data-lab-column="2"]');
  const campaignCell = row.locator('td[data-lab-column="3"]');
  await eventCell.click();
  await expect(eventCell).toHaveClass(/gridSelectedCell/);
  await campaignCell.click();
  await expect(eventCell).not.toHaveClass(/gridSelectedCell/);
  await expect(campaignCell).toHaveClass(/gridSelectedCell/);
  await page.getByRole("button", { name: /Sort Event/ }).click();
  await expect(campaignCell).not.toHaveClass(/gridSelectedCell/);
  await eventCell.click();
  await page.locator('[data-pd-id="lab.main"] h1').click();
  await expect(eventCell).not.toHaveClass(/gridSelectedCell/);
  await eventCell.dblclick();
  const editor = page.locator('[data-pd-id="lab.floating-cell-editor"]');
  await editor.getByRole("textbox").fill("Outside committed event");
  await page.locator('[data-pd-id="lab.main"] h1').click();
  await expect(row).toContainText("Outside committed event");
  await expect(eventCell).not.toHaveClass(/gridSelectedCell/);
  await page.locator('[data-pd-id="lab.profile"]').click();
  await page.getByRole("option", { name: "Profile B" }).click();
  const planning = page.locator('tr[data-lab-row-id="LAB-SB-PROSPECT-B"]');
  await planning.locator('td[data-lab-column="0"]').dblclick();
  await expect(editor.locator('input[type="date"]')).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator('[data-pd-id="lab.nav.extraPlace"]').click();
  await page.locator('tr[data-lab-row-id="LAB-EP-002"] td[data-lab-column="4"]').dblclick();
  await editor.getByRole("textbox").fill("8,5");
  await page.locator('[data-pd-id="lab.main"] h1').click();
  await expect(editor).toBeVisible();
  await expect(editor).toContainText(/valid|decimal|number/i);
});

test("priority bell excludes ordinary work but All Notifications retains approved source events", async ({ page }) => {
  await page.locator('[data-pd-id="lab.nav.tasks"]').click();
  await page.locator('[data-pd-id="lab.today.recurring-free-spins"]').click();
  await expect(page.locator('[data-pd-id="lab.task.casino-daily-a"]')).toBeVisible();
  await page.locator('[data-pd-id="lab.header-trigger.notifications"]').click();
  const bell = page.locator('[data-pd-id="lab.notifications"]');
  await expect(bell.getByRole("region", { name: "Action Required" })).toContainText("Review Expiring Free Bet");
  await expect(bell).toContainText("Review Partial Lay");
  await expect(bell.locator('[data-pd-id="lab.notification.task:LAB-SB-OVERDUE"]')).toHaveCount(0);
  await expect(bell).not.toContainText("Check Daily Free Spins");
  await expect(bell).not.toContainText("Check Historical Reload Pattern");
  await expect(bell).toContainText("No recorded system events");
  await bell.getByRole("button", { name: "View All Notifications" }).click();
  const ordinary = bell.locator('[data-pd-id="lab.notification.task:LAB-SB-OVERDUE"]');
  await expect(ordinary).toBeVisible();
  await expect(bell.locator('[data-pd-id="lab.notification.task:LAB-ACCOUNT-C"]')).toBeVisible();
  await ordinary.getByRole("button", { name: "Mark Read" }).click();
  await expect(ordinary).toContainText("Read");
  await ordinary.getByRole("button", { name: "Clear", exact: true }).click();
  await ordinary.getByRole("button", { name: "Clear Notification" }).click();
  await expect(ordinary).toHaveCount(0);
  await bell.getByRole("tab", { name: "History" }).click();
  await expect(ordinary).toBeVisible();
  await bell.getByRole("button", { name: "View Today" }).click();
  await expect(page.locator('[data-pd-id="lab.task.task:LAB-SB-OVERDUE"]')).toBeVisible();
});

test("resolved Account source leaves the current notification view and remains in history", async ({ page }) => {
  await page.locator('[data-pd-id="lab.header-trigger.notifications"]').click();
  const bell = page.locator('[data-pd-id="lab.notifications"]');
  await bell.getByRole("button", { name: "View All Notifications" }).click();
  const account = bell.locator('[data-pd-id="lab.notification.task:LAB-ACCOUNT-C"]');
  await account.getByRole("button", { name: "Open Source" }).click();
  await page.locator('[data-pd-id="lab.record-detail"]').getByRole("button", { name: "Review balance" }).click();
  await page.getByLabel("Observed Current Balance").fill("0.00");
  await page.getByRole("button", { name: /Confirm balance observation/ }).click();
  await page.locator('[data-pd-id="lab.header-trigger.notifications"]').click();
  await bell.getByRole("button", { name: "View All Notifications" }).click();
  await expect(account).toHaveCount(0);
  await bell.getByRole("tab", { name: "History" }).click();
  await expect(account).toContainText("Source Resolved");
});

test("priority bell and full inbox stay contained on a narrow screen in both themes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 820 });
  await page.locator('[data-pd-id="lab.header-trigger.notifications"]').click();
  await expect(page.locator('[data-pd-id="lab.notifications"]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-pd-id="lab.notifications"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.locator('[data-pd-id="lab.identity.dark-mode"]').click();
  await page.keyboard.press("Escape");
  await page.locator('[data-pd-id="lab.header-trigger.notifications"]').click();
  await page.locator('[data-pd-id="lab.notifications"]').getByRole("button", { name: "View All Notifications" }).click();
  await expect(page.locator('[data-pd-id="lab.breadcrumb"]')).toContainText("Notifications");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
