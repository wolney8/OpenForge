import { expect, test, type Page } from "@playwright/test";

const apiBaseUrl = "http://127.0.0.1:8010";
const primaryProfileId = "profile-demo-001";
const secondaryProfileId = "profile-demo-002";

const summarySourcePaths = [
  "accounts",
  "sportsbook-bets",
  "free-bets",
  "casino-offers",
  "cash-adjustments",
  "balance-snapshots",
  "tracker-settings",
];

function waitForSummarySources(page: Page, profileId: string) {
  return Promise.all(
    summarySourcePaths.map((path) =>
      page.waitForResponse(
        (response) =>
          response.url() === `${apiBaseUrl}/profiles/${profileId}/${path}` && response.ok(),
        { timeout: 60_000 }
      )
    )
  );
}

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
  await expect(page.getByRole("heading", { name: "Bookmaker catalogue" })).toBeVisible();
  await expect(page.getByText("Exchanges", { exact: true })).toBeVisible();
  await expect(page.getByText("Sportsbook and free-bet offer names", { exact: true })).toBeVisible();
  await expect(page.getByText("Casino offer names", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Exchange commission settings")).toBeVisible();
  await expect(page.getByText(/Underlay .* Overlay/)).toBeVisible();
});

test("Dashboard and Reports expose distinct selected-range and formal-period views", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const dashboardSources = waitForSummarySources(page, primaryProfileId);
  await page.goto(`/profiles/${primaryProfileId}/tracker/dashboard`);
  await dashboardSources;
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(
    page.locator('[data-access-tier="internal_operational"]', {
      hasText: "Fund Manager only",
    })
  ).toBeVisible();
  await expect(page.getByText("Resolved range", { exact: true })).toBeVisible();
  await expect(page.getByText("Selected-range P&L", { exact: true }).first()).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText("Open current / settled final", { exact: true })).toBeVisible();
  await expect(page.getByText("Cash snapshot", { exact: true }).first()).toBeVisible();
  const ledgerAction = page.getByRole("link", { name: /^Open .+ in (Sportsbook|Free Bet|Casino)$/ }).first();
  await expect(ledgerAction).toHaveAttribute("href", /\/tracker\/(sportsbook-bets|free-bets|casino-offers)\?search=.+/);

  const reportSources = waitForSummarySources(page, primaryProfileId);
  await page.goto(`/profiles/${primaryProfileId}/tracker/reports`);
  await reportSources;
  await expect(page.getByRole("heading", { name: "Reports", exact: true })).toBeVisible();
  await expect(
    page.locator('[data-access-tier="internal_operational"]', {
      hasText: "Fund Manager only",
    })
  ).toBeVisible();
  await expect(page.getByText("Formal report periods", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Selected range vs formal reports", exact: true })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Weekly reports", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Monthly reports", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Yearly reports", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Balance snapshots", exact: true })).toBeVisible();
});
