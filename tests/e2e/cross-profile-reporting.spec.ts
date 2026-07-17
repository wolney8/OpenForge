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
];

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

  await analytics.getByRole("tab", { name: "Formal Reports" }).click();
  await expect(analytics.getByRole("heading", { name: "Combined Weekly Reports" })).toBeVisible();
  await expect(analytics.getByRole("heading", { name: "Combined Monthly Reports" })).toBeVisible();
  await expect(analytics.getByRole("heading", { name: "Combined Yearly Reports" })).toBeVisible();
  await expect(analytics.getByRole("heading", { name: "Combined balance snapshot history" })).toBeVisible();

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
  await bravoDirectoryRow.getByRole("button", { name: /^Pin / }).click();
  await expect(bravoDirectoryRow.getByRole("button", { name: /^Unpin / })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("dialog", { name: /Profile details/ })).toHaveCount(0);
  await bravoDirectoryRow.getByText("BRAVO-002", { exact: true }).click();
  const drawer = page.getByRole("dialog", { name: /Profile details/ });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("heading", { name: "Selected-Range Performance" })).toBeVisible();
  await expect(drawer.getByRole("heading", { name: "Fee Position" })).toBeVisible();
  await expect(drawer.getByText("Cash Adjustments", { exact: true })).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Edit profile code" })).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Edit tracking start" })).toBeVisible();
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

  await expect(analytics.getByRole("button", { name: /add|edit|delete|settle/i })).toHaveCount(0);
  await expect(directory.getByRole("link", { name: /Open .* dashboard/ })).toHaveCount(2);
  await expect(directory.getByRole("link", { name: /Open .* reports/ })).toHaveCount(2);
  await page.setViewportSize({ width: 900, height: 900 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  ).toBe(true);
});

test("profile action links open the relevant ledger with all-issues filtering", async ({ page }) => {
  test.setTimeout(120_000);
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
    /\/profiles\/profile-demo-001\/tracker\/sportsbook-bets\?view=issues&issue=all-issues&source=profiles/
  );
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
