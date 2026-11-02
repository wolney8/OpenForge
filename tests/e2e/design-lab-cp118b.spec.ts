import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const evidence = process.env.OPENFORGE_DESIGN_LAB_EVIDENCE_DIR;
async function capture(page: Page, name: string) {
  if (!evidence) return;
  await mkdir(evidence, { recursive: true });
  await page.screenshot({ path: join(evidence, name), fullPage: true, style: "nextjs-portal { display: none !important; }" });
}
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async route => {
    if (route.request().url().endsWith("/api/auth/session")) {
      await route.fulfill({ json: { authenticated: true, email: "demo@example.invalid", role: "fund_manager", expires_at: 4102444800, session_policy: { absolute_expires_at: 4102444800, auto_logout_enabled: false, effective_expires_at: 4102444800, inactivity_expires_at: null, last_activity_at: 1, preference_configured: true, timeout_minutes: 30, valid_now: true } } });
      return;
    }
    if (route.request().url().endsWith("/api/auth/activity")) { await route.fulfill({ json: { ok: true } }); return; }
    throw new Error(`Unexpected Design Lab API call: ${route.request().url()}`);
  });
  await page.goto("/design-lab");
  await page.locator('[data-pd-id="lab.nav.tasks"]').click();
  await expect(page.locator('[data-pd-id="lab.today"]')).toBeVisible();
});

test("priority list leads with passed event and hides details until requested", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const today = page.locator('[data-pd-id="lab.today"]');
  await expect(today.getByRole("region", { name: "Needs Action" })).toBeVisible();
  const rows = today.locator('[aria-label="Needs Action"] [data-pd-id^="lab.task."]');
  await expect(rows.first()).toHaveAttribute("data-pd-id", "lab.task.task:LAB-SB-OVERDUE");
  await expect(rows.first()).toContainText("Event passed 30 Oct");
  await expect(today.locator('[data-pd-id="lab.today.detail"]')).toHaveCount(0);
  await expect(today.getByRole("button", { name: /Opportunities \/ Suggestions/ })).toHaveAttribute("aria-expanded", "false");
  const height = await rows.first().evaluate(node => node.getBoundingClientRect().height);
  expect(height).toBeGreaterThanOrEqual(56);
  expect(height).toBeLessThanOrEqual(72);
  await capture(page, "today-list-1440-dark.png");
});

test("detail pane keeps queue visible, work annotation does not settle, and source return preserves filter", async ({ page }) => {
  const today = page.locator('[data-pd-id="lab.today"]');
  await today.locator('[data-pd-id="lab.task.task:LAB-SB-OVERDUE"]').click();
  const detail = today.locator('[data-pd-id="lab.today.detail"]');
  await expect(detail).toContainText("Recorded event date; no settlement deadline is inferred.");
  await expect(today.getByRole("region", { name: "Needs Action" })).toBeVisible();
  await detail.getByRole("combobox", { name: /Work State/i }).click();
  await page.getByRole("option", { name: "In Progress" }).click();
  await expect(detail).toContainText("Recorded event date");
  await today.getByRole("button", { name: "Filters" }).click();
  await today.locator('[data-pd-id="lab.today.filter.type"]').click();
  await page.getByRole("option", { name: "Sportsbook" }).click();
  await today.locator('[data-pd-id="lab.task.task:LAB-SB-OVERDUE"]').click();
  await capture(page, "today-detail-1440-dark.png");
  await detail.getByRole("button", { name: "Open Bet" }).click();
  await expect(page.locator('[data-pd-id="lab.record-detail"]')).toContainText("LAB-SB-OVERDUE");
  await page.getByRole("button", { name: "Back to Today" }).click();
  await expect(today.locator('[data-pd-id="lab.today.filter.type"]')).toContainText("Sportsbook");
  await expect(today.locator('[data-pd-id="lab.task.task:LAB-SB-OVERDUE"]')).toBeVisible();
  await today.locator('[data-pd-id="lab.task.task:LAB-SB-OVERDUE"]').click();
  await expect(today.locator('[data-pd-id="lab.today.detail"] [data-pd-id="lab.task-state.task:LAB-SB-OVERDUE"]')).toContainText("In Progress");
});

test("recurring parent retains separate Profile completion", async ({ page }) => {
  const today = page.locator('[data-pd-id="lab.today"]');
  const parent = today.locator('[data-pd-id="lab.today.recurring-free-spins"]');
  await expect(parent).toHaveAttribute("aria-expanded", "false");
  await parent.click();
  await expect(parent).toHaveAttribute("aria-expanded", "true");
  await today.locator('[data-pd-id="lab.task.casino-daily-a"]').click();
  await today.locator('[data-pd-id="lab.today.detail"]').getByRole("button", { name: "Mark Check Done" }).click();
  await expect(today.locator('[data-pd-id="lab.task.casino-daily-a"]')).toContainText("Done");
  await expect(today.locator('[data-pd-id="lab.task.casino-daily-b"]')).toContainText("To Do");
  await capture(page, "today-recurring-expanded-1440.png");
});

test("Board and List share annotations; Do Later does not clear a source notification", async ({ page }) => {
  const today = page.locator('[data-pd-id="lab.today"]');
  await today.locator('[data-pd-id="lab.task.task:LAB-SB-OVERDUE"]').click();
  const detail = today.locator('[data-pd-id="lab.today.detail"]');
  await detail.getByRole("combobox", { name: /Work State/i }).click();
  await page.getByRole("option", { name: "Do Later" }).click();
  await detail.getByLabel(/resume date/i).fill("2026-11-04");
  await expect(detail).toContainText("source alert and recorded date remain active");
  await detail.getByRole("button", { name: "Close Task Details" }).click();
  await today.getByRole("button", { name: "Board" }).click();
  await expect(today.locator('[data-pd-id="lab.today.board"]')).toContainText("Review Overdue Unsettled Bet");
  await capture(page, "today-board-1440-dark.png");
  await today.getByRole("button", { name: "List" }).click();
  await expect(today.locator('[data-pd-id="lab.task.task:LAB-SB-OVERDUE"]')).toContainText("Do Later");
  await page.locator('[data-pd-id="lab.header-trigger.notifications"]').click();
  await page.getByRole("button", { name: "View All Notifications" }).click();
  const notification = page.locator('[data-pd-id="lab.notification.task:LAB-SB-OVERDUE"]');
  await expect(notification).toBeVisible();
  await notification.getByRole("button", { name: "Mark Read" }).click();
  await expect(notification).toContainText("Read");
  await page.getByRole("button", { name: "View Today" }).click();
  await expect(today.locator('[data-pd-id="lab.task.task:LAB-SB-OVERDUE"]')).toBeVisible();
});

test("task filters and urgency sort operate over one collection", async ({ page }) => {
  const today = page.locator('[data-pd-id="lab.today"]');
  await today.getByRole("button", { name: "Filters" }).click();
  await today.locator('[data-pd-id="lab.today.filter.profile"]').click();
  await page.getByRole("option", { name: "Profile B" }).click();
  await expect(today.locator('[data-pd-id="lab.task.task:LAB-SB-OVERDUE"]')).toHaveCount(0);
  await expect(today.locator('[data-pd-id="lab.task.task:LAB-SB-PARTIAL"]')).toBeVisible();
  await today.locator('[data-pd-id="lab.today.filter.period"]').click();
  await page.getByRole("option", { name: "Next 7 Days" }).click();
  await expect(today.locator('[data-pd-id="lab.task.task:LAB-SB-PARTIAL"]')).toBeVisible();
  await today.locator('[data-pd-id="lab.today.sort"]').click();
  await page.getByRole("option", { name: "Title" }).click();
  await expect(today.locator('[data-pd-id="lab.today.sort"]')).toContainText("Title");
  await expect(today.locator('[aria-label="Needs Action"] [data-pd-id^="lab.task."]').first()).toContainText("Review Expiring Free Bet");
  await today.getByRole("button", { name: "Clear Filters" }).click();
  await expect(today.locator('[data-pd-id="lab.task.task:LAB-SB-OVERDUE"]')).toBeVisible();
});

test("narrow task details are contained and close to the opener", async ({ page }) => {
  const today = page.locator('[data-pd-id="lab.today"]');
  for (const width of [900, 768, 430, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    if (width <= 430) {
      await today.locator('[data-pd-id="lab.task.task:LAB-SB-OVERDUE"]').click();
      await expect(page.getByRole("dialog", { name: "Task Details" })).toBeVisible();
      await capture(page, `today-detail-${width}-dark.png`);
      await page.getByRole("dialog", { name: "Task Details" }).getByRole("button", { name: "Close Task Details" }).click();
      await expect(today.locator('[data-pd-id="lab.task.task:LAB-SB-OVERDUE"]')).toBeFocused();
    }
    await capture(page, `today-list-${width}-dark.png`);
  }
});
