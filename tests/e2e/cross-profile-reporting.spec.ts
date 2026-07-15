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

  const analytics = page.getByRole("region", { name: "Combined profile analytics" });
  await expect(analytics).toBeVisible();
  await expect(
    analytics.locator('[data-access-tier="internal_operational"]', {
      hasText: "Fund Manager only",
    })
  ).toBeVisible();
  await expect(analytics.getByText("Earnings are pre-fee.")).toBeVisible();
  const totals = analytics.getByLabel("Combined selected-range totals");
  await expect(totals.getByText("Gross P&L", { exact: true })).toBeVisible();
  const profileComparison = analytics.getByRole("heading", { name: "Profile comparison" }).locator("..");
  await expect(profileComparison).toBeVisible();
  await expect(profileComparison.getByText("Subscriber Alpha", { exact: true })).toBeVisible();
  await expect(profileComparison.getByText("Subscriber Bravo", { exact: true })).toBeVisible();

  const overviewTab = analytics.getByRole("tab", { name: "Overview" });
  await overviewTab.focus();
  await overviewTab.press("ArrowRight");
  await expect(analytics.getByRole("tab", { name: "Performance" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await overviewTab.click();

  await analytics.getByRole("tab", { name: "Performance" }).click();
  await expect(analytics.getByRole("heading", { name: "Category P&L" })).toBeVisible();
  await expect(analytics.getByRole("heading", { name: "Bookmaker P&L" })).toBeVisible();

  await analytics.getByRole("tab", { name: "Exposure" }).click();
  await expect(totals.getByText("Current liability", { exact: true })).toBeVisible();
  await expect(analytics.getByRole("heading", { name: "Profile exposure" })).toBeVisible();

  await analytics.getByRole("tab", { name: "Formal Reports" }).click();
  await expect(analytics.getByRole("heading", { name: "Combined weekly reports" })).toBeVisible();
  await expect(analytics.getByRole("heading", { name: "Combined monthly reports" })).toBeVisible();
  await expect(analytics.getByRole("heading", { name: "Combined balance snapshot history" })).toBeVisible();

  await analytics.getByRole("tab", { name: "Overview" }).click();

  await analytics.locator("details.profile-report-picker > summary").click();
  await analytics.getByRole("checkbox", { name: /Subscriber Bravo/ }).uncheck();
  await expect(profileComparison.getByText("Subscriber Bravo", { exact: true })).toHaveCount(0);
  await expect(profileComparison.getByRole("link", { name: "Open" })).toHaveCount(1);
  await analytics.getByRole("button", { name: "Select all" }).click();
  await expect(profileComparison.getByText("Subscriber Bravo", { exact: true })).toBeVisible();

  await analytics.getByLabel("Search directory").fill("Bravo");
  const directory = analytics.getByRole("region", { name: "Profiles" });
  await expect(directory.getByText("Subscriber Bravo", { exact: true })).toBeVisible();
  await expect(directory.getByText("Subscriber Alpha", { exact: true })).toHaveCount(0);
  await analytics.getByLabel("Search directory").fill("");
  await analytics.getByLabel("Directory status").selectOption("Paused");
  await expect(directory.getByText("Subscriber Bravo", { exact: true })).toBeVisible();
  await expect(directory.getByText("Subscriber Alpha", { exact: true })).toHaveCount(0);
  await expect(profileComparison.getByText("Subscriber Alpha", { exact: true })).toBeVisible();
  await analytics.getByLabel("Directory status").selectOption("all");
  await analytics.getByRole("button", { name: "Pin Subscriber Bravo" }).click();
  await expect(analytics.getByRole("button", { name: "Unpin Subscriber Bravo" })).toHaveAttribute("aria-pressed", "true");
  await directory.getByRole("button", { name: "Details" }).first().click();
  const drawer = page.getByRole("dialog", { name: /Subscriber/ });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("link", { name: "Open tracker" })).toBeVisible();
  const drawerActionHeight = await drawer.getByRole("link", { name: "Open tracker" }).evaluate(
    (element) => element.getBoundingClientRect().height
  );
  expect(drawerActionHeight).toBeLessThan(50);
  await page.route(`${apiBaseUrl}/profiles/profile-demo-002`, async (route) => {
    if (route.request().method() !== "PATCH") return route.continue();
    await route.fulfill({
      contentType: "application/json",
      json: {
        profile_id: "profile-demo-002",
        display_name: "Subscriber Bravo",
        profile_code: "BRAVO-002",
        status: "Pending",
        tracking_start_date: "2026-05-15",
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
  await drawer.getByRole("button", { name: "Close profile details" }).click();

  await analytics.getByLabel("Date range").selectOption("Last Week");
  await expect(analytics.getByText(/Shared range:/)).toBeVisible();

  await expect(analytics.getByRole("button", { name: /add|edit|delete|settle/i })).toHaveCount(0);
  await expect(profileComparison.getByRole("link", { name: "Open" })).toHaveCount(2);

  await analytics.getByRole("tab", { name: "Exposure" }).click();
  await analytics.getByRole("link", { name: "Review Subscriber Alpha expiring free bets" }).click();
  await expect(page).toHaveURL(/\/profiles\/profile-demo-001\/tracker\/free-bets\?view=expiring-soon/);
  await page.getByRole("button", { name: "Open free-bet filter and column controls" }).click();
  await expect(page.getByLabel("Free-bet review mode")).toHaveValue("expiring-soon");
});
