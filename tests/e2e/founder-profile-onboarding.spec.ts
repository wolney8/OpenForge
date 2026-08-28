import { expect, test } from "@playwright/test";

const catalogue = {
  records: [
    {
      catalogue_id: "BOOKMAKER-DEMO-001",
      account_type: "Bookmaker",
      brand_name: "Bookmaker A",
      short_display_name: "Bookmaker A",
      operator_group: "Synthetic Group",
      platform: "Synthetic Platform",
      operating_channels: ["web"],
      foreground_colour: "#FFFFFF",
      background_colour: "#B71C1C",
      status: "Active",
    },
    {
      catalogue_id: "EXCHANGE-DEMO-001",
      account_type: "Exchange",
      brand_name: "Exchange A",
      short_display_name: "Exchange A",
      operator_group: "Synthetic Group",
      platform: "Synthetic Platform",
      operating_channels: ["web"],
      foreground_colour: "#FFFFFF",
      background_colour: "#1565C0",
      status: "Active",
    },
    {
      catalogue_id: "BANK-DEMO-001",
      account_type: "Bank",
      brand_name: "Bank A",
      short_display_name: "Bank A",
      operator_group: "Synthetic Group",
      platform: "Synthetic Platform",
      operating_channels: ["web", "mobile"],
      foreground_colour: "#FFFFFF",
      background_colour: "#455A64",
      status: "Active",
    },
  ],
};

const quickActions = [
  {
    preset_id: "COMBO-FOUNDER-DEMO-001",
    name: "Synthetic Sportsbook Action",
    quick_add: {
      enabled: true,
      display_label: "Synthetic Sportsbook Action",
      supported_ledgers: ["Sportsbook"],
      enforcement: "optional",
    },
  },
  {
    preset_id: "COMBO-FOUNDER-REQUIRED-001",
    name: "Required Cash Action",
    quick_add: {
      enabled: true,
      display_label: "Required Cash Action",
      supported_ledgers: ["Cash Adjustments"],
      enforcement: "required",
    },
  },
];

test("Profile onboarding uses catalogue authority and saves optional Quick Actions", async ({ page }) => {
  let submitted: Record<string, unknown> | undefined;
  await page.route("**/account-catalogue/source", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(catalogue) });
  });
  await page.route("**/fund-manager/common-bet-combos?active_only=true", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(quickActions) });
  });
  await page.route("**/profiles/onboarding", async (route) => {
    submitted = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        profile: { profile_id: "profile-demo-001" },
        onboarding: {},
        selected_account_count: 3,
        selected_quick_action_count: 1,
      }),
    });
  });

  await page.goto("/profiles/new");
  await expect(page.getByRole("heading", { name: "Create Profile" })).toBeVisible();
  await page.getByLabel("Display Name").fill("Synthetic Profile");
  await page.getByLabel("Profile Code").fill("profile-001");
  await expect(page.getByLabel("Profile Code")).toHaveValue("PROFILE-001");
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Enabled Modules" })).toBeVisible();
  await page.getByText("Casino Offers", { exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Profile Accounts" })).toBeVisible();
  for (const name of ["Bookmaker A", "Exchange A", "Bank A"]) {
    await page.getByLabel(`Use ${name}`).check();
  }
  await page.getByLabel("Bookmaker A opening balance").fill("25.00");
  await page.getByLabel("Exchange A opening balance").fill("50.00");
  await page.getByLabel("Bank A opening balance").fill("75.00");
  await page.getByLabel("Main Bank Account").selectOption("BANK-DEMO-001");
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Quick Actions" })).toBeVisible();
  await expect(page.getByText("Required Cash Action", { exact: true })).toBeVisible();
  await page.getByText("Synthetic Sportsbook Action", { exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Review Profile" })).toBeVisible();
  await expect(page.getByText("£ 150.00")).toBeVisible();
  await page.getByRole("button", { name: "Create Profile" }).click();
  await expect(page).toHaveURL(/\/profiles\/profile-demo-001\/tracker\/dashboard$/);

  expect(submitted).toBeDefined();
  expect(submitted?.enabled_modules).not.toContain("casino-offers");
  expect(submitted?.accounts).toHaveLength(3);
  expect(submitted?.main_bank_catalogue_id).toBe("BANK-DEMO-001");
  expect(submitted?.quick_actions).toEqual([
    {
      preset_id: "COMBO-FOUNDER-DEMO-001",
      ledger_type: "Sportsbook",
      favourite_order: 1,
    },
  ]);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});

test("Profile onboarding stages block forward navigation until required identity is valid", async ({ page }) => {
  await page.route("**/account-catalogue/source", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(catalogue) });
  });
  await page.route("**/fund-manager/common-bet-combos?active_only=true", async (route) => {
    await route.fulfill({ contentType: "application/json", body: "[]" });
  });
  await page.goto("/profiles/new");

  await page.getByRole("tab", { name: "Review" }).click();
  await expect(page.getByRole("tab", { name: "Profile" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("p.error-text[role='alert']")).toContainText("Enter a display name");
});
