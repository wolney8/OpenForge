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
      operating_jurisdictions: ["GB"],
      operating_channels: ["web"],
      foreground_colour: "#FFFFFF",
      background_colour: "#B71C1C",
      status: "Active",
      introduced_at: "2026-08-27T12:00:00Z",
    },
    {
      catalogue_id: "EXCHANGE-DEMO-001",
      account_type: "Exchange",
      brand_name: "Exchange A",
      short_display_name: "Exchange A",
      operator_group: "Synthetic Group",
      platform: "Synthetic Platform",
      operating_jurisdictions: ["GB"],
      operating_channels: ["web"],
      foreground_colour: "#FFFFFF",
      background_colour: "#1565C0",
      status: "Active",
      introduced_at: "",
    },
    {
      catalogue_id: "BANK-DEMO-001",
      account_type: "Bank",
      brand_name: "Bank A",
      short_display_name: "Bank A",
      operator_group: "Synthetic Group",
      platform: "Synthetic Platform",
      operating_jurisdictions: ["GB"],
      operating_channels: ["web", "mobile"],
      foreground_colour: "#FFFFFF",
      background_colour: "#455A64",
      status: "Active",
      introduced_at: "",
    },
    {
      catalogue_id: "BOOKMAKER-US-DEMO-001",
      account_type: "Bookmaker",
      brand_name: "US Bookmaker",
      short_display_name: "US Bookmaker",
      operator_group: "Synthetic Group",
      platform: "Synthetic Platform",
      operating_jurisdictions: ["US"],
      operating_channels: ["web"],
      foreground_colour: "#FFFFFF",
      background_colour: "#263238",
      status: "Active",
      introduced_at: "2026-08-27T12:00:00Z",
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

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/session", (route) => route.fulfill({
    json: {
      authenticated: true,
      email: "founder@example.invalid",
      expires_at: 2_100_000_000,
      name: "Demo Founder",
      role: "fund_manager",
    },
  }));
  await page.route("**/api/auth/activity", (route) => route.fulfill({ status: 204 }));
  await page.route("**/api/fund-manager/import-executions", (route) =>
    route.fulfill({ json: [] })
  );
  await page.route("**/api/fund-manager/notifications**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    return route.fulfill({
      json: pathname.endsWith("/state")
        ? { dismissed_ids: [], read_keys: [] }
        : pathname.endsWith("/preferences") ? { preferences: {} } : [],
    });
  });
});

test("Profile onboarding distinguishes a pending catalogue from an empty catalogue", async ({ page }) => {
  let releaseCatalogue: (() => void) | undefined;
  const catalogueGate = new Promise<void>((resolve) => {
    releaseCatalogue = resolve;
  });
  await page.route("**/account-catalogue/source", async (route) => {
    await catalogueGate;
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(catalogue) });
  });
  await page.route("**/fund-manager/common-bet-combos?active_only=true", async (route) => {
    await route.fulfill({ contentType: "application/json", body: "[]" });
  });

  await page.goto("/profiles/new");
  await page.getByLabel("Display Name").fill("Loading State Profile");
  await page.getByLabel("Profile Code").fill("loading-001");
  await page.locator("footer").getByRole("button", { name: "Next", exact: true }).click();
  await page.locator("footer").getByRole("button", { name: "Next", exact: true }).click();

  const loadingState = page
    .getByRole("status")
    .filter({ hasText: "Loading Account Catalogue" });
  await expect(loadingState).toBeVisible();
  await expect(page.getByText("No GB providers match the current filters.")).toHaveCount(0);
  releaseCatalogue?.();
  await expect(loadingState).toBeHidden();
  await expect(page.getByText("Bookmaker A", { exact: true })).toBeVisible();
});

test("Profile onboarding reuses canonical input geometry in both themes", async ({ page }) => {
  await page.route("**/account-catalogue/source", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(catalogue) });
  });
  await page.route("**/fund-manager/common-bet-combos?active_only=true", async (route) => {
    await route.fulfill({ contentType: "application/json", body: "[]" });
  });

  await page.goto("/profiles/new");
  const profileCode = page.getByLabel("Profile Code");
  const bankrollSurface = page.getByLabel("Starting Bankroll").locator("..");

  for (const theme of ["light", "dark"] as const) {
    await page.evaluate((nextTheme) => {
      document.documentElement.dataset.theme = nextTheme;
    }, theme);
    const geometry = await page.evaluate(() => {
      const textInput = document.querySelector<HTMLInputElement>("label[data-guided-field='profile-code'] input");
      const moneyInput = document.querySelector<HTMLElement>("[data-pd-id='profile-onboarding.starting-bankroll']")?.parentElement;
      const percentageInput = document.querySelector<HTMLElement>("[data-pd-id='profile-onboarding.management-fee']")?.parentElement;
      if (!textInput || !moneyInput || !percentageInput) throw new Error("Expected onboarding controls were not rendered");
      const textStyles = getComputedStyle(textInput);
      const moneyStyles = getComputedStyle(moneyInput);
      const percentageStyles = getComputedStyle(percentageInput);
      return {
        moneyHeight: moneyInput.getBoundingClientRect().height,
        moneyRadius: moneyStyles.borderRadius,
        percentageHeight: percentageInput.getBoundingClientRect().height,
        percentageRadius: percentageStyles.borderRadius,
        textHeight: textInput.getBoundingClientRect().height,
        textRadius: textStyles.borderRadius,
      };
    });
    expect(Math.abs(geometry.moneyHeight - geometry.textHeight)).toBeLessThanOrEqual(1);
    expect(geometry.moneyRadius).toBe(geometry.textRadius);
    expect(Math.abs(geometry.percentageHeight - geometry.textHeight)).toBeLessThanOrEqual(1);
    expect(geometry.percentageRadius).toBe(geometry.textRadius);
  }

  await expect(profileCode).toBeVisible();
  await expect(bankrollSurface).toHaveClass(/financial-text-input/);
});

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
  const startingBankroll = page.getByLabel("Starting Bankroll");
  await startingBankroll.click();
  await expect(startingBankroll).toHaveValue("");
  await page.keyboard.type("25.5");
  const managementFee = page.getByLabel("Management Fee");
  const investmentFee = page.getByLabel("Investment Fee");
  await expect(managementFee).toHaveValue("25.00");
  await expect(investmentFee).toHaveValue("25.00");
  await managementFee.click();
  await expect(managementFee).toHaveValue("");
  await managementFee.fill("30");
  await investmentFee.click();
  await expect(managementFee).toHaveValue("30.00");
  await expect(investmentFee).toHaveValue("");
  await investmentFee.fill("20");
  await page.getByLabel("Display Name").click();
  await expect(investmentFee).toHaveValue("20.00");
  await expect(startingBankroll).toHaveValue("25.50");
  await page.getByLabel("Display Name").fill("Synthetic Profile");
  await page.getByLabel("Profile Code").fill("profile-001");
  await expect(page.getByLabel("Profile Code")).toHaveValue("PROFILE-001");
  await page.locator("footer").getByRole("button", { name: "Next", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Enabled Modules" })).toBeVisible();
  await page.getByText("Casino Offers", { exact: true }).click();
  await page.locator("footer").getByRole("button", { name: "Next", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Profile Accounts" })).toBeVisible();
  await expect(page.getByLabel("Profile onboarding accounts top controls").getByText("Rows per page")).toBeVisible();
  await expect(page.getByText("New", { exact: true })).toBeVisible();
  await expect(page.getByText("US Bookmaker", { exact: true })).toHaveCount(0);
  for (const name of ["Bookmaker A", "Exchange A", "Bank A"]) {
    await page.getByLabel(`Use ${name}`).check();
  }
  const bookmakerBalance = page.getByLabel("Bookmaker A opening balance");
  await bookmakerBalance.click();
  await expect.poll(() => bookmakerBalance.evaluate((input: HTMLInputElement) => ({
    end: input.selectionEnd,
    start: input.selectionStart,
  }))).toEqual({ end: 4, start: 0 });
  await page.keyboard.type("25");
  await page.getByLabel("Exchange A opening balance").click();
  await expect(bookmakerBalance).toHaveValue("25.00");
  await page.getByLabel("Exchange A opening balance").fill("50.00");
  await page.getByLabel("Exchange A commission (%)").fill("0");
  await page.getByLabel("Bank A opening balance").click();
  await expect(page.getByLabel("Exchange A commission (%)")).toHaveValue("0.00");
  await page.getByLabel("Bank A opening balance").fill("75.00");
  await page.getByLabel("Main Bank Account").selectOption("BANK-DEMO-001");
  await page.locator("footer").getByRole("button", { name: "Next", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Quick Actions" })).toBeVisible();
  await expect(page.getByText("Required Cash Action", { exact: true })).toBeVisible();
  await page.getByText("Synthetic Sportsbook Action", { exact: true }).click();
  await page.locator("footer").getByRole("button", { name: "Next", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Review Profile" })).toBeVisible();
  await expect(page.getByText("£ 150.00")).toBeVisible();
  await page.getByRole("button", { name: "Create Profile" }).click();
  await expect(page).toHaveURL(/\/profiles\/profile-demo-001\/tracker\/dashboard$/);

  expect(submitted).toBeDefined();
  expect(submitted?.enabled_modules).not.toContain("casino-offers");
  expect(submitted?.accounts).toHaveLength(3);
  expect(submitted?.accounts).toContainEqual(expect.objectContaining({
    catalogue_id: "EXCHANGE-DEMO-001",
    commission_rate: "0.00",
  }));
  const submittedAccounts = submitted?.accounts as Array<Record<string, unknown>>;
  expect(submittedAccounts.find((account) => account.catalogue_id === "BOOKMAKER-DEMO-001"))
    .not.toHaveProperty("commission_rate");
  expect(submittedAccounts.find((account) => account.catalogue_id === "BANK-DEMO-001"))
    .not.toHaveProperty("commission_rate");
  expect(submitted?.main_bank_catalogue_id).toBe("BANK-DEMO-001");
  expect(submitted?.management_fee_percent).toBe("30.00");
  expect(submitted?.investment_fee_percent).toBe("20.00");
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

  await expect(page.getByRole("tab", { name: "Review" })).toHaveAttribute("aria-disabled", "true");
  await page.locator("footer").getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Profile" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("p.error-text[role='alert']")).toContainText("Complete the Profile identity");
});

test("Profile onboarding requires an Exchange and its commission before continuing", async ({ page }) => {
  await page.route("**/account-catalogue/source", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(catalogue) });
  });
  await page.route("**/fund-manager/common-bet-combos?active_only=true", async (route) => {
    await route.fulfill({ contentType: "application/json", body: "[]" });
  });
  await page.goto("/profiles/new");
  await page.getByLabel("Display Name").fill("Synthetic Profile");
  await page.getByLabel("Profile Code").fill("PROFILE-EXCHANGE");
  await page.locator("footer").getByRole("button", { name: "Next", exact: true }).click();
  await page.locator("footer").getByRole("button", { name: "Next", exact: true }).click();

  await expect(page.getByText("Select At Least One Exchange.")).toBeVisible();
  await page.getByLabel("Use Bookmaker A").check();
  await page.locator("footer").getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator("p.error-text[role='alert']")).toContainText("Select at least one Exchange");

  await page.getByLabel("Use Exchange A").check();
  await expect(page.getByText("Enter The Exchange Commission.")).toBeVisible();
  await page.getByLabel("Exchange A commission (%)").fill("2");
  await page.getByLabel("Exchange A opening balance").click();
  await expect(page.getByLabel("Exchange A commission (%)")).toHaveValue("2.00");
  await page.locator("footer").getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Quick Actions" })).toBeVisible();
  await expect(page.getByText("No optional Quick Actions are configured for the enabled ledgers.")).toBeVisible();
  await expect(page.getByText("Quick Actions could not be loaded.")).toHaveCount(0);
});

test("Profile onboarding hands an import setup to the existing Profile workflow", async ({ page }) => {
  let submitted: Record<string, unknown> | undefined;
  await page.route("**/account-catalogue/source", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(catalogue) });
  });
  await page.route("**/fund-manager/common-bet-combos?active_only=true", async (route) => {
    await route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
  });
  await page.route("**/profiles/onboarding", async (route) => {
    submitted = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        profile: { profile_id: "profile-import-001" },
        onboarding: {},
        selected_account_count: 0,
        selected_quick_action_count: 0,
      }),
    });
  });

  await page.goto("/profiles/new");
  await page.getByLabel("Profile setup path").getByText("Import existing workbook/data").click();
  await page.getByLabel("Display Name").fill("Import Target");
  await page.getByLabel("Profile Code").fill("IMPORT-001");
  await expect(page.getByLabel("Starting Bankroll")).toHaveCount(0);
  await page.locator("footer").getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Review Profile" })).toBeVisible();
  await expect(page.getByText("The workbook dry run can populate tracking settings")).toBeVisible();
  await page.getByRole("button", { name: "Create and import" }).click();

  await expect(page).toHaveURL(/\/profiles\/profile-import-001\/tracker\/settings\?setup=import#import-export$/);
  expect(submitted).toMatchObject({
    setup_path: "import",
    display_name: "Import Target",
    accounts: [],
    quick_actions: [],
    main_bank_catalogue_id: "",
  });
});

test("Profile onboarding Cancel uses the shared unsaved-change guard", async ({ page }) => {
  await page.route("**/account-catalogue/source", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(catalogue) });
  });
  await page.route("**/fund-manager/common-bet-combos?active_only=true", async (route) => {
    await route.fulfill({ contentType: "application/json", body: "[]" });
  });
  await page.goto("/profiles/new");

  await page.getByLabel("Display Name").fill("Unsaved Profile");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  const guard = page.getByRole("dialog", { name: "Unsaved tracker changes" });
  await expect(guard).toBeVisible();
  await guard.getByRole("button", { name: "Keep Editing", exact: true }).click();
  await expect(page).toHaveURL(/\/profiles\/new$/);

  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("dialog", { name: "Unsaved tracker changes" }).getByRole("button", { name: "Discard Changes" }).click();
  await expect(page).toHaveURL(/\/profiles$/);
});

test("Profile onboarding drawer navigation uses one platform guard and closes the drawer", async ({ page }) => {
  await page.route("**/account-catalogue/source", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(catalogue) });
  });
  await page.route("**/fund-manager/common-bet-combos?active_only=true", async (route) => {
    await route.fulfill({ contentType: "application/json", body: "[]" });
  });
  const nativeDialogs: string[] = [];
  page.on("dialog", async (dialog) => {
    nativeDialogs.push(dialog.type());
    await dialog.dismiss();
  });
  await page.goto("/profiles/new");

  await page.getByLabel("Display Name").fill("Unsaved Profile");
  await page.locator('[data-pd-id="app-navigation.trigger"]').click();
  await page.locator('[data-pd-id="app-navigation.dashboard"]').click();

  const guard = page.getByRole("dialog", { name: "Unsaved tracker changes" });
  await expect(guard).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Plum Duff navigation" })).toBeHidden();
  await guard.getByRole("button", { name: "Discard Changes" }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(nativeDialogs).toEqual([]);
});
