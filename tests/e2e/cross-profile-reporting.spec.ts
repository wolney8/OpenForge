import { expect, test, type Page } from "@playwright/test";

const apiBaseUrl = "http://127.0.0.1:8010";
const profileIds = ["profile-demo-001", "profile-demo-002"];
const sourcePaths = [
  "accounts",
  "sportsbook-bets",
  "free-bets",
  "casino-offers",
  "cash-adjustments",
  "balance-snapshots",
  "fee-periods",
];

function mockFeePeriod(profileId: string) {
  const crystallised = profileId === "profile-demo-001";
  return [
    {
      fee_period_id: `fee-period-${profileId}-2026-07`,
      profile_id: profileId,
      period_start: "2026-07-01",
      period_end: "2026-07-31",
      state: crystallised ? "crystallised" : "ready_to_crystallise",
      current_revision: {
        total_fee_due: crystallised ? "50.00" : "15.00",
        management_fee_amount: crystallised ? "10.00" : "3.00",
        investment_fee_amount: crystallised ? "40.00" : "12.00",
      },
      fee_withdrawn_amount: crystallised ? "10.00" : "0.00",
      fee_outstanding_amount: crystallised ? "40.00" : "15.00",
    },
  ];
}

function waitForCombinedSources(page: Page) {
  return Promise.all(
    profileIds.flatMap((profileId) =>
      sourcePaths.map((path) =>
        page.waitForResponse(
          (response) =>
            response.url() === `${apiBaseUrl}/profiles/${profileId}/${path}` && response.ok(),
          { timeout: 60_000 }
        )
      )
    )
  );
}

test("profiles exposes aggregate-only cross-profile reporting", async ({ page }) => {
  test.setTimeout(120_000);
  await page.route(`${apiBaseUrl}/profiles/*/fee-periods/preview`, async (route) => {
    const profileId = new URL(route.request().url()).pathname.split("/")[2] ?? "";
    await route.fulfill({
      contentType: "application/json",
      json: {
        profile_id: profileId,
        period_start: "2026-06-01",
        period_end: "2026-06-30",
        reporting_basis: "settled_final",
        calculation_state: "resolved",
        sportsbook_total: "20.00",
        sportsbook_count: 2,
        free_bet_total: "15.00",
        free_bet_count: 1,
        casino_total: "5.00",
        casino_count: 1,
        eligible_period_profit: "40.00",
        opening_loss_carryforward: "0.00",
        closing_loss_carryforward: "0.00",
        fee_base: "40.00",
        management_fee_percent: "35.00",
        investment_fee_percent: "5.00",
        management_fee_amount: "14.00",
        investment_fee_amount: "2.00",
        total_fee_due: "16.00",
        included_record_ids: ["SB-DEMO-001", "FB-DEMO-001", "CAS-DEMO-001"],
        blockers: [],
      },
    });
  });
  await page.route(`${apiBaseUrl}/profiles/*/fee-periods`, async (route) => {
    const profileId = new URL(route.request().url()).pathname.split("/")[2] ?? "";
    await route.fulfill({ contentType: "application/json", json: mockFeePeriod(profileId) });
  });
  const sourceResponses = waitForCombinedSources(page);
  await page.goto("/profiles");
  await sourceResponses;

  const analytics = page.getByRole("region", { name: "Profiles and combined analytics" });
  await expect(analytics).toBeVisible();
  await expect(
    analytics.locator('[data-access-tier="internal_operational"]', {
      hasText: "Fund Manager only",
    })
  ).toBeVisible();
  await expect(analytics.getByText("Displayed earnings are pre-fee.")).toBeVisible();
  const profilesTab = analytics.getByRole("tab", { name: "Profiles" });
  await expect(profilesTab).toHaveAttribute("aria-selected", "true");
  const directory = analytics.getByRole("tabpanel", { name: "Profiles" });
  await expect(directory).toBeVisible();
  await expect(directory.getByText("ALPHA-001", { exact: true })).toBeVisible();
  await expect(directory.getByText("BRAVO-002", { exact: true })).toBeVisible();
  await expect(analytics.getByRole("heading", { name: "Profile comparison" })).toHaveCount(0);
  const totals = directory.getByLabel("All-profile headline totals");
  await expect(totals.getByText("Gross P&L", { exact: true })).toBeVisible();
  await expect(totals.getByText("Available to Withdraw", { exact: true })).toBeVisible();
  await expect(totals.getByText("£40.00", { exact: true })).toBeVisible();
  await expect(directory.getByRole("columnheader", { name: "Available to Withdraw" })).toBeVisible();
  await expect(directory.getByRole("columnheader", { name: "Cash snapshot" })).toHaveCount(0);
  await expect(directory.getByRole("columnheader", { name: "Open Positions" })).toBeVisible();
  const tenurePill = directory.locator(".profile-tenure-pill").first();
  await tenurePill.focus();
  await expect(directory.getByRole("tooltip").first()).toContainText("Tracking started");

  await profilesTab.focus();
  await profilesTab.press("ArrowRight");
  await expect(analytics.getByRole("tab", { name: "Performance" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await expect(analytics.getByLabel("Search directory")).toHaveCount(0);
  await expect(analytics.locator("details.profile-report-picker > summary")).toBeVisible();

  await expect(analytics.getByRole("heading", { name: "Category P&L" })).toBeVisible();
  await expect(analytics.getByRole("heading", { name: "Bookmaker P&L" })).toBeVisible();
  await expect(directory).toBeHidden();

  await analytics.getByRole("tab", { name: "Exposure" }).click();
  const exposurePanel = analytics.getByRole("tabpanel", { name: "Exposure" });
  await expect(
    exposurePanel.getByLabel("Combined exposure totals").getByText("Current liability", { exact: true })
  ).toBeVisible();
  await expect(exposurePanel.getByRole("heading", { name: "Profile exposure" })).toBeVisible();
  await expect(exposurePanel.getByRole("columnheader", { name: "Action required" })).toHaveCount(0);
  await expect(exposurePanel.getByRole("link")).toHaveCount(0);

  await analytics.getByRole("tab", { name: "Fees" }).click();
  const feesPanel = analytics.getByRole("tabpanel", { name: "Fees" });
  await expect(feesPanel).toBeVisible();
  await expect(analytics.getByLabel("Fee centre closed month")).toHaveValue("2026-06");
  await expect(feesPanel.getByLabel("Fund Manager fee position")).toContainText(
    "Available to Withdraw"
  );
  await expect(feesPanel.getByText("£40.00", { exact: true })).toBeVisible();
  await expect(feesPanel.getByRole("columnheader", { name: "Status" })).toBeVisible();
  await expect(feesPanel.locator("tbody").getByText("Review Required", { exact: true })).toHaveCount(2);
  await expect(feesPanel.getByRole("button", { name: /^Review Fees for / })).toHaveCount(2);
  await expect(analytics.getByLabel("Date range")).toHaveCount(0);
  await feesPanel.locator('[data-pd-id="fees.profile-demo-001.row"]').click();
  const feeBreakdownDrawer = page.getByRole("dialog", { name: "John McJohnson" });
  await expect(feeBreakdownDrawer).toBeVisible();
  await expect(feeBreakdownDrawer.getByRole("heading", { name: "Monthly Performance" })).toBeVisible();
  await expect(feeBreakdownDrawer.getByRole("heading", { name: "Fee Calculation" })).toBeVisible();
  await expect(feeBreakdownDrawer.getByText("Sportsbook / Qualifying Bets", { exact: true })).toBeVisible();
  await expect(feeBreakdownDrawer.locator("dt", { hasText: "Cash Adjustments" })).toBeVisible();
  await expect(feeBreakdownDrawer.getByText(/June 2026/)).toBeVisible();
  await feeBreakdownDrawer.getByRole("button", { name: "Close", exact: true }).click();
  await expect(feeBreakdownDrawer).toBeHidden();
  await feesPanel.locator('[data-pd-id="fees.profile-demo-001.action"]').click();
  const feesTabReviewDialog = page.getByRole("dialog", { name: "Review Monthly Fees" });
  await expect(feesTabReviewDialog).toBeVisible();
  await expect(feesTabReviewDialog.locator('[data-pd-id="fee-period-review.month"]')).toHaveValue("2026-06");
  await feesTabReviewDialog.getByRole("button", { name: /Close monthly fee review/ }).click();
  await expect(feesTabReviewDialog).toBeHidden();

  await analytics.getByRole("tab", { name: "Formal Reports" }).click();
  await expect(analytics.getByLabel("Date range")).toHaveCount(0);
  await expect(analytics.getByRole("heading", { name: "Combined Weekly Reports" })).toBeVisible();
  await expect(analytics.getByRole("heading", { name: "Combined Monthly Reports" })).toBeVisible();
  await expect(analytics.getByRole("heading", { name: "Combined Yearly Reports" })).toBeVisible();
  await expect(analytics.getByRole("heading", { name: "Combined balance snapshot history" })).toBeVisible();
  await expect(analytics.getByLabel("Combined Weekly Reports period range")).toBeVisible();
  await expect(analytics.getByLabel("Combined Weekly Reports specific period")).toBeVisible();
  await expect(analytics.getByLabel("Combined Weekly Reports financial result")).toBeVisible();
  await expect(analytics.getByLabel("Combined Monthly Reports period range")).toBeVisible();
  await expect(analytics.getByLabel("Combined Monthly Reports specific period")).toBeVisible();
  await expect(analytics.getByLabel("Combined Monthly Reports financial result")).toBeVisible();
  await expect(analytics.getByLabel("Combined Yearly Reports period range")).toBeVisible();
  await expect(analytics.getByLabel("Balance snapshot period range")).toBeVisible();
  await expect(analytics.getByLabel("Balance snapshot type")).toBeVisible();
  for (const granularity of ["week", "month", "year"]) {
    const specificPeriodIcon = analytics
      .locator(`[data-pd-id="formal-reports.${granularity}.specific-period"]`)
      .locator("..")
      .locator(".material-symbols-outlined");
    await expect(specificPeriodIcon).toHaveText("event");
    expect((await specificPeriodIcon.boundingBox())!.width).toBeLessThan(40);
  }
  const monthlySection = analytics.locator("section.content-subpanel").filter({
    has: analytics.getByRole("heading", { name: "Combined Monthly Reports" }),
  });
  const monthlySpecificPeriod = monthlySection.getByLabel("Combined Monthly Reports specific period");
  const monthlyPeriodOptions = await monthlySpecificPeriod.locator("option").all();
  if (monthlyPeriodOptions.length > 1) {
    const selectedMonth = await monthlyPeriodOptions[1].getAttribute("value");
    await monthlySpecificPeriod.selectOption(selectedMonth ?? "");
    await expect(monthlySection.locator("tbody tr")).toHaveCount(1);
  }
  await expect(analytics.getByRole("columnheader", { name: "Indicative Fee Impact" })).toBeVisible();
  await expect(analytics.getByText("Not Yet Calculated", { exact: true })).toHaveCount(0);
  const monthlyFeeAction = analytics.locator('[data-pd-id^="formal-reports.month."][data-pd-id$=".fees"]').first();
  await expect(monthlyFeeAction).toBeVisible();
  await monthlyFeeAction.click();
  const feeQueueDialog = page.getByRole("dialog", { name: "Fee Review Queue" });
  await expect(feeQueueDialog).toBeVisible();
  await expect(feeQueueDialog.getByRole("columnheader", { name: "Profile" })).toBeVisible();
  await expect(feeQueueDialog.locator("tbody tr")).toHaveCount(2);
  await expect(feeQueueDialog.getByText("Open Month", { exact: true })).toHaveCount(2);
  for (const icon of await feeQueueDialog.locator(".report-action-link .material-symbols-outlined").all()) {
    expect((await icon.boundingBox())!.width).toBeLessThan(40);
  }
  await feeQueueDialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(feeQueueDialog).toBeHidden();

  await analytics.getByRole("tab", { name: "Performance" }).click();
  await analytics.locator("details.profile-report-picker > summary").click();
  await analytics.getByRole("checkbox", { name: /BRAVO-002/ }).uncheck();
  await expect(analytics.locator("details.profile-report-picker > summary")).toContainText("1 of 2");
  await analytics.getByRole("button", { name: "Select all" }).click();
  await expect(analytics.locator("details.profile-report-picker > summary")).toContainText("2 of 2");
  await analytics.locator("details.profile-report-picker > summary").click();

  await profilesTab.click();
  await analytics.getByLabel("Search directory").fill("Bravo");
  await expect(directory.getByText("BRAVO-002", { exact: true })).toBeVisible();
  await expect(directory.getByText("ALPHA-001", { exact: true })).toHaveCount(0);
  await analytics.getByLabel("Search directory").fill("");
  await analytics.getByLabel("Directory status").selectOption("Active");
  await expect(directory.getByText("BRAVO-002", { exact: true })).toBeVisible();
  await expect(directory.getByText("ALPHA-001", { exact: true })).toBeVisible();
  await analytics.getByLabel("Directory status").selectOption("all");
  const bravoDirectoryRow = directory.getByRole("row").filter({ hasText: "BRAVO-002" });
  await expect(bravoDirectoryRow.getByText("£0.00", { exact: true }).first()).toBeVisible();
  await bravoDirectoryRow.getByRole("button", { name: /^Pin / }).click();
  await expect(bravoDirectoryRow.getByRole("button", { name: /^Unpin / })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("dialog", { name: /Profile details/ })).toHaveCount(0);
  await bravoDirectoryRow.getByText("BRAVO-002", { exact: true }).click();
  const drawer = page.getByRole("dialog", { name: /Profile details/ });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("heading", { name: "Selected-Range Performance" })).toBeVisible();
  await expect(drawer.getByRole("heading", { name: "Fee Position" })).toBeVisible();
  await expect(drawer.getByText("£15.00", { exact: true })).toBeVisible();
  await expect(drawer.getByText("Cash Adjustments", { exact: true })).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Edit profile code" })).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Edit tracking start" })).toBeVisible();
  await drawer.getByRole("button", { name: "Review Monthly Fees" }).click();
  const feeDialog = page.getByRole("dialog", { name: "Review Monthly Fees" });
  await expect(feeDialog).toBeVisible();
  const closedMonthPicker = feeDialog.locator('[data-pd-id="fee-period-review.month"]');
  await expect(closedMonthPicker).toHaveValue("2026-06");
  await expect(closedMonthPicker.getByRole("option", { name: "June 2026" })).toHaveCount(1);
  const calendarIcon = feeDialog.locator(".fee-period-month-field .material-symbols-outlined");
  await expect(calendarIcon).toHaveText("calendar_month");
  expect((await calendarIcon.boundingBox())!.width).toBeLessThan(40);
  const feeActionRegion = feeDialog.getByRole("region", { name: "All tracker actions" });
  await expect(feeActionRegion).toBeVisible();
  expect(await feeActionRegion.locator(".profile-action-count").allTextContents()).toEqual(
    await bravoDirectoryRow.locator(".profile-action-count").allTextContents()
  );
  const settledProfitCard = feeDialog.locator(".stat-card").filter({ hasText: "Settled Profit" });
  await expect(settledProfitCard.getByText("£40.00", { exact: true })).toBeVisible();
  await expect(feeDialog.getByRole("button", { name: "Prepare Fee Review" })).toBeEnabled();
  const feeDialogBox = await feeDialog.boundingBox();
  expect(feeDialogBox).not.toBeNull();
  expect(feeDialogBox!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(feeDialogBox!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await feeDialog.getByRole("button", { name: /Close monthly fee review/ }).click();
  await expect(feeDialog).toBeHidden();
  const drawerDashboardLink = drawer.getByRole("link", { name: /Open .* dashboard/ });
  await expect(drawerDashboardLink).toBeVisible();
  await expect(drawer.getByRole("link", { name: /Open .* Sportsbook/ })).toBeVisible();
  await expect(drawer.getByRole("link", { name: /Open .* Free Bets/ })).toBeVisible();
  await expect(drawer.getByRole("link", { name: /Open .* Casino/ })).toBeVisible();
  const drawerActionHeight = await drawerDashboardLink.evaluate(
    (element) => element.getBoundingClientRect().height
  );
  expect(drawerActionHeight).toBeLessThan(50);
  await page.route(`${apiBaseUrl}/profiles/profile-demo-002`, async (route) => {
    if (route.request().method() !== "PATCH") return route.continue();
    const payload = route.request().postDataJSON() as Record<string, string>;
    await route.fulfill({
      contentType: "application/json",
      json: {
        profile_id: "profile-demo-002",
        display_name: "Subscriber Bravo",
        profile_code: "BRAVO-002",
        status: payload.status ?? "Pending",
        tracking_start_date: payload.tracking_start_date ?? "2026-05-15",
        management_fee_percent: "35.00",
        investment_fee_percent: "5.00",
        current_cash_snapshot: "Synthetic",
      },
    });
  });
  const editStatusButton = drawer.getByRole("button", { name: "Edit status" });
  await expect(editStatusButton).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await editStatusButton.click();
  await drawer.getByLabel("Edit status").selectOption("Pending");
  await drawer.getByLabel("Edit status").press("Enter");
  await expect(drawer.getByRole("button", { name: "Edit status" }).locator("..")).toContainText("Pending");
  await drawer.getByRole("button", { name: "Edit tracking start" }).click();
  await drawer.getByLabel("Edit tracking start").fill("2026-04-01");
  await drawer.getByLabel("Edit tracking start").press("Enter");
  await expect(drawer.getByRole("button", { name: "Edit tracking start" }).locator("..")).toContainText(
    "Wednesday 1st April 2026"
  );
  await drawer.getByRole("button", { name: "Close profile details" }).click();
  await bravoDirectoryRow.focus();
  await bravoDirectoryRow.press("Enter");
  await expect(drawer).toBeVisible();
  await drawer.getByRole("button", { name: "Close profile details" }).click();

  await analytics.getByLabel("Date range").selectOption("Last Week");
  await expect(analytics.getByText(/Shared range:/)).toBeVisible();

  await expect(analytics.getByRole("button", { name: /edit|delete|settle/i })).toHaveCount(0);
  await expect(directory.getByRole("link", { name: /Open .* dashboard/ })).toHaveCount(2);
  await expect(directory.getByRole("link", { name: /Open .* reports/ })).toHaveCount(2);
  await page.setViewportSize({ width: 900, height: 900 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  ).toBe(true);
});

test("crystallised monthly fees can be partially marked as withdrawn", async ({ page }) => {
  test.setTimeout(120_000);
  let withdrawalRecorded = false;
  let correctionRecorded = false;
  let feePeriodState = "crystallised";
  let currentRevisionNumber = 1;
  let submittedPayload: Record<string, string> | null = null;
  let correctionPayload: Record<string, string | boolean> | null = null;
  const period = () => ({
    fee_period_id: "fee-period-profile-demo-002-2026-06",
    profile_id: "profile-demo-002",
    period_start: "2026-06-01",
    period_end: "2026-06-30",
    state: feePeriodState,
    current_revision_number: currentRevisionNumber,
    current_revision: {
      total_fee_due: "10.73",
      management_fee_amount: "9.39",
      investment_fee_amount: "1.34",
    },
    withdrawal_links: withdrawalRecorded
      ? [
          {
            cash_adjustment_id: "cash-adjustment-fee-management-demo",
            component: "management",
            amount: "5.00",
          },
        ]
      : [],
    fee_withdrawn_amount: withdrawalRecorded ? "5.00" : "0.00",
    fee_outstanding_amount: withdrawalRecorded ? "5.73" : "10.73",
    corrections: correctionRecorded
      ? [
          {
            fee_correction_id: "fee-correction-demo-001",
            adjustment_type: "fee_credit",
            amount: "2.73",
            reason: "Synthetic corrected fee total",
            state: "pending",
          },
        ]
      : [],
  });

  await page.route(`${apiBaseUrl}/profiles/profile-demo-002/fee-periods`, async (route) => {
    await route.fulfill({ contentType: "application/json", json: [period()] });
  });
  await page.route(
    `${apiBaseUrl}/profiles/profile-demo-002/fee-periods/fee-period-profile-demo-002-2026-06/revisions`,
    async (route) => {
      const revisions = [
        {
          fee_revision_id: "fee-revision-demo-001",
          profile_id: "profile-demo-002",
          fee_period_id: "fee-period-profile-demo-002-2026-06",
          revision_number: 1,
          reporting_basis: "settled_final",
          fee_base_source_version: "monthly-settled-final-v1",
          eligible_period_profit: "26.83",
          opening_loss_carryforward: "0.00",
          closing_loss_carryforward: "0.00",
          fee_base: "26.83",
          management_fee_percent: "35.00",
          investment_fee_percent: "5.00",
          management_fee_amount: "9.39",
          investment_fee_amount: "1.34",
          total_fee_due: "10.73",
          change_reason: "",
          created_by: "fund-manager-local",
          created_at: "2026-07-01T09:00:00Z",
        },
      ];
      if (currentRevisionNumber === 2) {
        revisions.push({
          ...revisions[0],
          fee_revision_id: "fee-revision-demo-002",
          revision_number: 2,
          change_reason: "Synthetic late settlement correction",
          created_at: "2026-07-02T10:00:00Z",
        });
      }
      await route.fulfill({ contentType: "application/json", json: revisions });
    }
  );
  await page.route(`${apiBaseUrl}/profiles/profile-demo-002/fee-periods/preview`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        profile_id: "profile-demo-002",
        period_start: "2026-06-01",
        period_end: "2026-06-30",
        calculation_state: "resolved",
        sportsbook_total: "-17.52",
        sportsbook_count: 7,
        free_bet_total: "41.05",
        free_bet_count: 5,
        casino_total: "3.30",
        casino_count: 3,
        eligible_period_profit: "26.83",
        opening_loss_carryforward: "0.00",
        fee_base: "26.83",
        management_fee_percent: "35.00",
        investment_fee_percent: "5.00",
        management_fee_amount: "9.39",
        investment_fee_amount: "1.34",
        total_fee_due: "10.73",
        blockers: [],
      },
    });
  });
  await page.route(
    `${apiBaseUrl}/profiles/profile-demo-002/fee-periods/fee-period-profile-demo-002-2026-06/reopen`,
    async (route) => {
      feePeriodState = "ready_to_crystallise";
      currentRevisionNumber = 2;
      await route.fulfill({ contentType: "application/json", json: period() });
    }
  );
  await page.route(
    `${apiBaseUrl}/profiles/profile-demo-002/fee-periods/fee-period-profile-demo-002-2026-06/crystallise`,
    async (route) => {
      feePeriodState = "crystallised";
      await route.fulfill({ contentType: "application/json", json: period() });
    }
  );
  await page.route(
    `${apiBaseUrl}/profiles/profile-demo-002/fee-periods/fee-period-profile-demo-002-2026-06/mark-withdrawn`,
    async (route) => {
      submittedPayload = route.request().postDataJSON() as Record<string, string>;
      withdrawalRecorded = true;
      await route.fulfill({ contentType: "application/json", json: period() });
    }
  );
  await page.route(
    `${apiBaseUrl}/profiles/profile-demo-002/fee-periods/fee-period-profile-demo-002-2026-06/corrections`,
    async (route) => {
      correctionPayload = route.request().postDataJSON() as Record<string, string | boolean>;
      correctionRecorded = true;
      await route.fulfill({
        contentType: "application/json",
        json: {
          fee_correction_id: "fee-correction-demo-001",
          adjustment_type: "fee_credit",
          amount: "2.73",
          reason: "Synthetic corrected fee total",
          state: "pending",
        },
      });
    }
  );

  const sourceResponses = waitForCombinedSources(page);
  await page.goto("/profiles");
  await sourceResponses;
  const directory = page.getByRole("tabpanel", { name: "Profiles" });
  await directory.getByText("BRAVO-002", { exact: true }).click();
  const drawer = page.getByRole("dialog", { name: /Profile details/ });
  await drawer.getByRole("button", { name: "Review Monthly Fees" }).click();
  const feeDialog = page.getByRole("dialog", { name: "Review Monthly Fees" });
  await expect(feeDialog.locator('[data-pd-id="fee-period-review.month"]')).toHaveValue("2026-06");
  await feeDialog.getByText("Correction Controls", { exact: true }).click();
  await feeDialog.locator('[data-pd-id="fee-period-review.reopen.reason"]').fill(
    "Synthetic late settlement correction"
  );
  await feeDialog.getByRole("button", { name: "Reopen and Recalculate" }).click();
  await expect(feeDialog.locator('[data-pd-id="fee-period-review.reopened-state"]')).toContainText(
    "Reopened Review Awaiting Confirmation"
  );
  await expect(feeDialog.getByLabel("Fee review revision history")).toContainText(
    "Synthetic late settlement correction"
  );
  await feeDialog.getByRole("button", { name: "Confirm Fees Earned" }).click();
  await expect(feeDialog.getByRole("status")).toContainText("fees are confirmed as earned");
  const action = feeDialog.getByRole("button", { name: "Mark as Withdrawn" });
  await expect(action).toBeDisabled();
  await expect(feeDialog.getByText("£9.39 outstanding", { exact: true })).toBeVisible();
  await feeDialog.locator('[data-pd-id="fee-period-review.withdrawal.management"]').fill("5.00");
  await feeDialog.locator('[data-pd-id="fee-period-review.withdrawal.investment"]').fill("0.00");
  await feeDialog.locator('[data-pd-id="fee-period-review.withdrawal.account"]').fill("Demo Bank");
  await expect(action).toBeEnabled();
  await action.click();

  await expect(feeDialog.getByRole("status")).toContainText(
    "fee withdrawal was recorded in Cash Adjustments"
  );
  await expect(feeDialog.getByText("£4.39 outstanding", { exact: true })).toBeVisible();
  expect(submittedPayload).toMatchObject({
    actor_id: "fund-manager-local",
    linked_account: "Demo Bank",
    management_amount: "5.00",
    investment_amount: "0.00",
  });

  await feeDialog.getByText("Correction Controls", { exact: true }).click();
  await feeDialog.locator('[data-pd-id="fee-period-review.correction.corrected-fee"]').fill("8.00");
  await feeDialog.locator('[data-pd-id="fee-period-review.correction.reason"]').fill(
    "Synthetic corrected fee total"
  );
  const correctionAction = feeDialog.getByRole("button", { name: "Record Fee Correction" });
  await expect(correctionAction).toBeEnabled();
  await correctionAction.click();
  await expect(feeDialog.getByRole("status")).toContainText("Fee credit of £2.73 was recorded");
  await expect(feeDialog.getByLabel("Recorded fee corrections")).toContainText("Fee Credit");
  expect(correctionPayload).toMatchObject({
    actor_id: "fund-manager-local",
    corrected_fee_due: "8.00",
    profile_closing: false,
    reason: "Synthetic corrected fee total",
  });
});

test("profile action links open the relevant ledger with all-issues filtering", async ({ page }) => {
  test.setTimeout(240_000);
  const sourceResponses = waitForCombinedSources(page);
  await page.goto("/profiles");
  await sourceResponses;

  const analytics = page.getByRole("region", { name: "Profiles and combined analytics" });
  const actionLink = analytics.locator(
    'a[href="/profiles/profile-demo-001/tracker/sportsbook-bets?view=issues&issue=all-issues&source=profiles"]'
  ).first();
  await expect(actionLink).toBeVisible();
  await expect(actionLink.locator(".material-symbols-outlined")).toHaveText("sports");
  await expect(actionLink.locator(".profile-action-count")).toHaveText(/^(?:[1-9]|9\+)$/);
  await expect(actionLink.locator(".profile-action-count")).toHaveCSS("color", /rgb/);
  await expect(actionLink.locator(".profile-action-icon")).toHaveCSS("font-size", "27.2px");
  await actionLink.click();

  await expect(page).toHaveURL(
    /\/profiles\/profile-demo-001\/tracker\/sportsbook-bets\?view=issues&issue=all-issues&source=profiles/,
    { timeout: 30_000 }
  );
  await expect(page.getByText("Loading sportsbook ledger")).toBeHidden({ timeout: 90_000 });
  const sportsbookFilterButton = page.getByRole("button", { name: "Open sportsbook filter and column controls" });
  const filterBadge = sportsbookFilterButton.locator(".table-filter-badge");
  const clearButton = page.getByRole("button", { name: "Clear active sportsbook filters and hidden-column states" });
  const [filterButtonBox, filterBadgeBox, clearButtonBox] = await Promise.all([
    sportsbookFilterButton.boundingBox(),
    filterBadge.boundingBox(),
    clearButton.boundingBox(),
  ]);
  expect(filterButtonBox).not.toBeNull();
  expect(filterBadgeBox).not.toBeNull();
  expect(clearButtonBox).not.toBeNull();
  expect(filterBadgeBox!.y).toBeLessThan(filterButtonBox!.y + filterButtonBox!.height / 2);
  expect(clearButtonBox!.y).toBeGreaterThan(filterButtonBox!.y + filterButtonBox!.height / 2);
  await sportsbookFilterButton.click();
  const sportsbookIssueFilter = page.getByLabel("Issue type");
  await expect(sportsbookIssueFilter).toHaveValue("all-issues");
  await expect(sportsbookIssueFilter.locator("..")).toHaveClass(/is-active-filter/);
  await expect(page.getByRole("button", { name: /^Delete sportsbook row / }).first()).toBeVisible();

  await page.goto(
    "/profiles/profile-demo-001/tracker/free-bets?view=issues&issue=all-issues&source=profiles"
  );
  await page.getByRole("button", { name: "Open free-bet filter and column controls" }).click();
  const freeBetIssueFilter = page.getByLabel("Issue type");
  await expect(freeBetIssueFilter).toHaveValue("all-issues");
  await expect(freeBetIssueFilter.locator("..")).toHaveClass(/is-active-filter/);

  await page.goto(
    "/profiles/profile-demo-001/tracker/casino-offers?view=issues&issue=all-issues&source=profiles"
  );
  await page.getByRole("button", { name: "Open casino-offer filter and column controls" }).click();
  const casinoIssueFilter = page.getByLabel("Issue type");
  await expect(casinoIssueFilter).toHaveValue("all-issues");
  await expect(casinoIssueFilter.locator("..")).toHaveClass(/is-active-filter/);
});

test("fee review resolution session filters blockers and returns to the same month", async ({ page }) => {
  test.setTimeout(240_000);
  const sportsbookResponse = await page.request.get(
    `${apiBaseUrl}/profiles/profile-demo-001/sportsbook-bets`
  );
  expect(sportsbookResponse.ok()).toBe(true);
  const sportsbookRows = (await sportsbookResponse.json()) as { sportsbook_bet_id: string }[];
  expect(sportsbookRows.length).toBeGreaterThan(0);
  const blockerId = sportsbookRows[0].sportsbook_bet_id;
  const returnHref = "/profiles?profile=profile-demo-001&feeReview=2026-06";
  const params = new URLSearchParams({
    view: "fee-review",
    records: blockerId,
    feeMonth: "2026-06",
    feeProfileName: "Subscriber Alpha",
    return: returnHref,
  });

  await page.goto(
    `/profiles/profile-demo-001/tracker/sportsbook-bets?${params.toString()}`
  );
  const banner = page.getByRole("complementary", {
    name: "Monthly fee review resolution session",
  });
  await expect(banner).toBeVisible();
  await expect(banner).toContainText("Resolving June 2026 Fee Review");
  await expect(banner).toContainText("1 blocking row");
  await expect(page.getByText("Loading sportsbook ledger")).toBeHidden({ timeout: 90_000 });
  await expect(page.getByRole("button", { name: `Delete sportsbook row ${blockerId}` })).toBeVisible({ timeout: 90_000 });

  await page.getByRole("link", { name: "Free Bets" }).first().click();
  const guard = page.getByRole("dialog", { name: "Leave Fee Review?" });
  await expect(guard).toBeVisible();
  await guard.getByRole("button", { name: "Stay and Finish" }).click();
  await expect(guard).toBeHidden();

  await banner.getByRole("link", { name: "Return to Monthly Fee Review" }).click();
  await expect(page).toHaveURL(/\/profiles\?profile=profile-demo-001&feeReview=2026-06/);
  const feeDialog = page.getByRole("dialog", { name: "Review Monthly Fees" });
  await expect(feeDialog).toBeVisible();
  await expect(feeDialog.locator('[data-pd-id="fee-period-review.month"]')).toHaveValue("2026-06");
});
