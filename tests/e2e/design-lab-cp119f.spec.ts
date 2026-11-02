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

test("review cells retain geometry, open a populated matching review, and create one Today task", async ({ page }) => {
  await page.locator('[data-pd-id="lab.profile"]').click();
  await page.getByRole("option", { name: "Profile B" }).click();
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  const row = page.locator('tr[data-lab-row-id="LAB-SB-PROSPECT-B"]');
  const strategy = row.locator('td[data-lab-column="5"]');
  const value = row.locator('td[data-lab-column="8"]');
  const before = await row.boundingBox();
  await strategy.dblclick();
  await page.locator('[data-pd-id="lab.floating-cell-editor"]').getByRole("option", { name: "Underlay", exact: true }).click();
  await expect(value).toHaveClass(/gridNeedsReview/);
  await expect(value).toContainText("Unavailable");
  await expect(value).not.toContainText("Needs Review");
  await expect(value.getByRole("button", { name: /Review Value dependencies/ })).toBeVisible();
  const after = await row.boundingBox();
  expect(Math.abs((after?.height ?? 0) - (before?.height ?? 0))).toBeLessThanOrEqual(1);
  await value.click();
  await expect(page.locator('[data-pd-id="lab.review.target"]')).toContainText("LAB-SB-PROSPECT-B");
  await expect(page.locator('[data-pd-id="lab.review.target"]')).toContainText("Strategy");
  await expect(page.getByRole("button", { name: /Matching/ }).first()).toHaveAttribute("aria-current", "step");
  await page.getByRole("button", { name: "Cancel" }).last().click();
  await page.locator('[data-pd-id="lab.nav.tasks"]').click();
  await expect(page.locator('[data-pd-id="lab.task.review:LAB-SB-PROSPECT-B:dependencies"]')).toHaveCount(1);
  await expect(page.locator('[data-pd-id="lab.task.review:LAB-SB-PROSPECT-B:dependencies"]')).toContainText("Review Sportsbook Calculation");
  await page.locator('[data-pd-id="lab.header-trigger.notifications"]').click();
  await expect(page.locator('[data-pd-id="lab.notifications"]')).not.toContainText("Review Sportsbook Calculation");
  await page.keyboard.press("Escape");
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  await strategy.dblclick();
  await page.locator('[data-pd-id="lab.floating-cell-editor"]').getByRole("option", { name: "Standard", exact: true }).click();
  await expect(value).not.toHaveClass(/gridNeedsReview/);
  await page.locator('[data-pd-id="lab.nav.tasks"]').click();
  await expect(page.locator('[data-pd-id="lab.task.review:LAB-SB-PROSPECT-B:dependencies"]')).toHaveCount(0);
});

test("Placed and Settled use distinct approved status treatments", async ({ page }) => {
  await page.locator('[data-pd-id="lab.nav.sportsbook"]').click();
  const placed = page.locator('tr[data-lab-row-id="LAB-SB-002"] td[data-lab-column="9"] span[data-cell-value="Placed"]');
  const settled = page.locator('tr[data-lab-row-id="LAB-SB-001"] td[data-lab-column="9"] span[data-cell-value="Settled"]');
  await expect(placed).toHaveClass(/table-chip-status-placed/);
  await expect(settled).toHaveClass(/table-chip-status-settled/);
  const colors = await Promise.all([placed,settled].map(locator => locator.evaluate(node => ({background:getComputedStyle(node).backgroundColor,color:getComputedStyle(node).color}))));
  expect(colors[0]).not.toEqual(colors[1]);
});

test("bell heading opens full tabs; one event collection retains read and clear state", async ({ page }) => {
  await page.locator('[data-pd-id="lab.header-trigger.notifications"]').click();
  await page.getByRole("button", { name: "Open Full Notifications" }).click();
  await expect(page.locator('[data-pd-id="lab.notifications.tab.all"]')).toHaveAttribute("aria-selected", "true");
  const expired = page.locator('[data-pd-id="lab.notification.task:LAB-FB-EXPIRING"]');
  await expect(expired).toBeVisible();
  await page.locator('[data-pd-id="lab.notifications.type-filter"]').selectOption("free_bet_expiry");
  await expect(expired).toBeVisible();
  await expect(page.locator('[data-pd-id="lab.notification.task:LAB-SB-PARTIAL"]')).toHaveCount(0);
  await expired.getByRole("button", { name: "Mark Read" }).click();
  await expect(expired).toContainText("Read");
  await page.locator('[data-pd-id="lab.notifications.tab.system"]').click();
  await expect(page.locator('[data-pd-id="lab.notifications"]')).toContainText("No recorded system events");
  await page.locator('[data-pd-id="lab.notifications.tab.all"]').click();
  await page.locator('[data-pd-id="lab.header-trigger.notifications"]').click();
  await expect(page.getByLabel("Notifications", { exact: true }).locator('[data-pd-id="lab.notification.task:LAB-FB-EXPIRING"]')).toContainText("Read");
});
