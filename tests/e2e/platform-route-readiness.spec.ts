import { expect, test } from "@playwright/test";

const apiBaseUrl = "http://127.0.0.1:8010";
const primaryProfileId = "profile-demo-001";
const secondaryProfileId = "profile-demo-002";

test("Accounts remains profile-scoped and exposes no credential fields", async ({ page, request }) => {
  const primaryAccountsResponse = await request.get(
    `${apiBaseUrl}/profiles/${primaryProfileId}/accounts`
  );
  expect(primaryAccountsResponse.ok()).toBeTruthy();
  const primaryAccounts = (await primaryAccountsResponse.json()) as Array<{ account_id: string }>;
  expect(primaryAccounts.length).toBeGreaterThan(0);
  const primaryAccountId = primaryAccounts[0]!.account_id;

  await page.goto(`/profiles/${primaryProfileId}/tracker/accounts`);
  await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible();
  await page.getByPlaceholder("Search account rows").fill(primaryAccountId);
  await expect(page.getByRole("cell", { name: primaryAccountId })).toBeVisible();

  await page.goto(`/profiles/${secondaryProfileId}/tracker/accounts`);
  await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible();
  await page.getByPlaceholder("Search account rows").fill(primaryAccountId);
  await expect(page.getByText("No account rows match the current filter.")).toBeVisible();

  await page.getByRole("button", { name: "Add account row" }).click();
  const editor = page.locator(".workflow-editor-panel");
  await expect(editor).toBeVisible();
  await expect(editor.locator('input[type="password"]')).toHaveCount(0);
  await expect(editor).not.toContainText(/password|card number|bank login|mfa secret/i);
});

test("Settings exposes the workbook-owned profile authorities", async ({ page }) => {
  await page.goto(`/profiles/${primaryProfileId}/tracker/settings`);
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByLabel("Tracker date settings")).toBeVisible();
  await expect(page.getByText(/Underlay .* Overlay/)).toBeVisible();

  await page.getByRole("tab", { name: "Lists" }).click();
  await expect(page.getByText("Exchanges", { exact: true })).toBeVisible();
  await expect(page.getByText("Sportsbook and free-bet offer names", { exact: true })).toBeVisible();
  await expect(page.getByText("Casino offer names", { exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "Commission" }).click();
  await expect(page.getByLabel("Exchange commission settings")).toBeVisible();

  await page.getByRole("tab", { name: "Accounts" }).click();
  await expect(page.getByLabel("Account authority settings")).toBeVisible();
});

test("Dashboard and Reports expose distinct selected-range and formal-period views", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto(`/profiles/${primaryProfileId}/tracker/dashboard`);
  await expect(page.getByText("Loading tracker summaries")).toBeHidden({ timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(
    page.locator('[data-access-tier="internal_operational"]', {
      hasText: "Fund Manager only",
    })
  ).toBeVisible();
  const dashboardRangeCard = page.locator('[data-pd-id="tracker.range-card"]').first();
  const dashboardRangeSelect = page.locator('[data-pd-id="tracker.range-card.select"]').first();
  await expect(dashboardRangeCard).toBeVisible();
  await expect(dashboardRangeSelect).toBeVisible();
  await expect(dashboardRangeCard).toHaveAttribute("title", /Tracker range:/);
  await dashboardRangeSelect.selectOption("This Month");
  await expect(dashboardRangeCard).toHaveAttribute("title", /Tracker range: This Month/, {
    timeout: 30_000,
  });
  const visualSummary = page.locator('[data-pd-id="dashboard.portfolio-view"]');
  await expect(visualSummary).toBeVisible();
  await expect(page.getByRole("img", { name: /Selected range P&L trend/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Selected Range Performance" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Where The Range Value Sits" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Action Load" })).toBeVisible();
  await expect(page.locator('[data-pd-id="dashboard.target-progress"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="dashboard.bookmaker-breakdown"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="dashboard.bookmaker-breakdown"]')).toContainText("Range P&L");
  await expect(page.locator('[data-pd-id="dashboard.recent-activity"]')).toBeVisible();
  await expect(page.locator('[data-pd-id="dashboard.peer-comparison"]')).toContainText("Open current value");
  await expect(page.locator('[data-pd-id="dashboard.fund-manager-fees"]')).toContainText("Available to withdraw");
  const activeDashboardPeriod = page.getByRole("button", { name: "Dashboard range shortcut 1M" });
  await expect(activeDashboardPeriod).toBeVisible();
  const periodGeometry = await page.locator(".dashboard-period-control").evaluate((control) => {
    const activePill = control.querySelector(".dashboard-period-pill.is-active");
    if (!activePill) {
      throw new Error("Active dashboard period pill missing");
    }
    const controlBounds = control.getBoundingClientRect();
    const pillBounds = activePill.getBoundingClientRect();
    const computed = window.getComputedStyle(control);
    return {
      controlHeight: controlBounds.height,
      controlWidth: controlBounds.width,
      overflowY: computed.overflowY,
      pillCenterOffset: Math.abs(
        pillBounds.top + pillBounds.height / 2 - (controlBounds.top + controlBounds.height / 2)
      ),
      pillHeight: pillBounds.height,
      pillWidth: pillBounds.width,
    };
  });
  expect(periodGeometry.controlHeight).toBeLessThanOrEqual(50);
  expect(periodGeometry.controlWidth).toBeLessThanOrEqual(310);
  expect(periodGeometry.overflowY).toBe("hidden");
  expect(periodGeometry.pillCenterOffset).toBeLessThanOrEqual(2);
  expect(periodGeometry.pillHeight).toBeLessThan(periodGeometry.controlHeight);
  expect(periodGeometry.pillHeight).toBeLessThanOrEqual(44);
  expect(periodGeometry.pillWidth).toBeGreaterThan(periodGeometry.pillHeight);
  const hasNoPageHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
  );
  expect(hasNoPageHorizontalOverflow).toBeTruthy();
  const cardWidths = await page
    .locator('[data-pd-id="dashboard.target-progress"], [data-pd-id="dashboard.module-mix"], [data-pd-id="dashboard.action-load"]')
    .evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().width)));
  expect(Math.max(...cardWidths) - Math.min(...cardWidths)).toBeLessThanOrEqual(2);
  await expect(page.getByText("Open Current Value", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Current Account Cash", { exact: true }).first()).toBeVisible();

  await page.goto(`/profiles/${primaryProfileId}/tracker/reports`);
  await expect(page.getByText("Loading tracker summaries")).toBeHidden({ timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "Reports", exact: true })).toBeVisible();
  await expect(
    page.locator('[data-access-tier="internal_operational"]', {
      hasText: "Fund Manager only",
    })
  ).toBeVisible();
  await expect(page.getByText("Formal Report Periods", { exact: true })).toBeVisible({
    timeout: 60_000,
  });
  await expect(
    page.getByRole("heading", { name: "Selected range vs formal reports", exact: true })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Weekly reports", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Monthly reports", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Yearly reports", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Balance snapshots", exact: true })).toBeVisible();
});
