import { expect, test } from "@playwright/test";

const settingsPath = "/profiles/profile-demo-001/tracker/settings";

test("profile settings use keyboard-accessible section tabs and retain deep links", async ({ page }) => {
  const duplicateKeyErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("same key")) {
      duplicateKeyErrors.push(message.text());
    }
  });
  await page.goto(settingsPath);

  const tabs = page.getByRole("tablist", { name: "Profile settings sections" });
  const defaults = tabs.getByRole("tab", { name: "Defaults" });
  const importExport = tabs.getByRole("tab", { name: "Import/Export" });

  await expect(defaults).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: /Settings for .* Profile/ })).toBeVisible();
  await expect(page.getByRole("tabpanel", { name: "Defaults" })).toBeVisible();
  await expect(page.getByRole("tabpanel", { name: "Import/Export" })).toBeHidden();
  await expect(
    page.getByLabel("Tracker date settings").getByRole("button", { name: "Save" })
  ).toBeDisabled();
  const guidedEntry = page.locator('[data-pd-id="profile-settings.defaults.guided-entry-mode"]');
  await expect(guidedEntry).toBeVisible();
  await expect
    .poll(async () =>
      guidedEntry.locator("option").evaluateAll((options) =>
        options.map((option) => (option as HTMLOptionElement).value)
      )
    )
    .toEqual(["on", "off"]);

  await defaults.focus();
  await page.keyboard.press("ArrowRight");
  await expect(importExport).toBeFocused();
  await expect(importExport).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(`${settingsPath}#import-export`);
  await expect(page.getByRole("tabpanel", { name: "Import/Export" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Import/Export" })).toBeVisible();

  await page.keyboard.press("End");
  const quickActions = tabs.getByRole("tab", { name: "Quick Actions" });
  await expect(quickActions).toBeFocused();
  await expect(tabs.getByRole("tab", { name: "Account Access" })).toHaveCount(0);
  await expect(page).toHaveURL(`${settingsPath}#quick-actions`);
  await expect(page.getByRole("tabpanel", { name: "Quick Actions" })).toBeVisible();

  await page.reload();
  await expect(quickActions).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel", { name: "Quick Actions" })).toBeVisible();
  expect(duplicateKeyErrors).toEqual([]);
});

test("offer-name managers portal above settings and persist an added value", async ({ page }) => {
  const uniqueValue = `Playwright offer ${Date.now()}`;
  await page.goto(`${settingsPath}#offer-lists`);
  const manageButton = page.getByRole("button", { name: "Manage" }).first();
  await expect(manageButton).toHaveClass(/modal-primary-button/);
  await manageButton.click();

  const dialog = page.getByRole("dialog", { name: "Manage Sportsbook And Free Bet Offer Names" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("xpath=.." )).toHaveAttribute("data-pd-id", "profile-settings.offer-names.backdrop");
  expect(await dialog.evaluate((element) => element.parentElement?.parentElement === document.body)).toBe(true);

  await dialog.getByLabel("Add offer name").fill(uniqueValue);
  const addValueButton = dialog.getByRole("button", { name: "Add Value" });
  await expect(addValueButton).toHaveClass(/modal-primary-button/);
  await addValueButton.click();
  await expect(dialog.getByText(uniqueValue, { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: `Delete ${uniqueValue}` }).click();
  await expect(dialog.getByText(uniqueValue, { exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("casino offer names support add, edit, and delete in an adaptive dialog", async ({ page }) => {
  const uniqueValue = `Casino Playwright ${Date.now()}`;
  const editedValue = `${uniqueValue} edited`;
  await page.goto(`${settingsPath}#offer-lists`);
  await page.getByRole("button", { name: "Manage" }).nth(1).click();

  const dialog = page.getByRole("dialog", { name: "Manage Casino Offer Names" });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => element.parentElement?.parentElement === document.body)).toBe(true);

  const geometry = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const input = element.querySelector("input");
    return {
      insideViewport: rect.top >= 0 && rect.left >= 0 && rect.bottom <= innerHeight && rect.right <= innerWidth,
      contentSized: rect.height <= Math.min(680, innerHeight - 48),
      inputRadius: input ? Number.parseFloat(getComputedStyle(input).borderRadius) : 0,
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(geometry.insideViewport, JSON.stringify(geometry)).toBe(true);
  expect(geometry.contentSized, JSON.stringify(geometry)).toBe(true);
  expect(geometry.inputRadius).toBeGreaterThan(12);
  expect(geometry.pageOverflow).toBe(false);

  await dialog.getByLabel("Add casino offer name").fill(uniqueValue);
  await dialog.getByRole("button", { name: "Add Value" }).click();
  await expect(dialog.getByText(uniqueValue, { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: `Edit ${uniqueValue}` }).click();
  await dialog.getByLabel(`Edit ${uniqueValue}`).fill(editedValue);
  await dialog.getByRole("button", { name: `Save ${uniqueValue}` }).click();
  await expect(dialog.getByText(editedValue, { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: `Delete ${editedValue}` }).click();
  await expect(dialog.getByText(editedValue, { exact: true })).toHaveCount(0);
});

test("empty offer-name lists remain compact and keep canonical rounded inputs", async ({ page }) => {
  await page.route("**/profiles/profile-demo-001/lookup-values", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ contentType: "application/json", body: "[]" });
      return;
    }
    await route.continue();
  });
  await page.goto(`${settingsPath}#offer-lists`);
  await page.getByRole("button", { name: "Manage" }).nth(1).click();

  const dialog = page.getByRole("dialog", { name: "Manage Casino Offer Names" });
  await expect(dialog.getByText("No casino offer name values yet.")).toBeVisible();
  const geometry = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const input = element.querySelector<HTMLInputElement>(".settings-dialog-field input");
    const inputStyle = input ? getComputedStyle(input) : null;
    return {
      height: rect.height,
      centred: Math.abs((rect.top + rect.bottom) / 2 - innerHeight / 2) < 8,
      radius: Number.parseFloat(inputStyle?.borderRadius ?? "0"),
      insideViewport: rect.top >= 24 && rect.bottom <= innerHeight - 24,
    };
  });
  expect(geometry.height, JSON.stringify(geometry)).toBeLessThan(420);
  expect(geometry.centred, JSON.stringify(geometry)).toBe(true);
  expect(geometry.radius, JSON.stringify(geometry)).toBeGreaterThan(16);
  expect(geometry.insideViewport, JSON.stringify(geometry)).toBe(true);
});

test("profile Quick Action editor is body-portalled and content-sized", async ({ page }) => {
  await page.goto(`${settingsPath}#quick-actions`);
  const addActionButton = page.getByRole("button", { name: "Add Action" }).first();
  await expect(addActionButton).toHaveClass(/modal-primary-button/);
  await addActionButton.click();

  const dialog = page.getByRole("dialog", { name: "Add Profile Quick Action" });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => element.parentElement?.parentElement === document.body)).toBe(true);
  await expect(dialog.getByLabel("Ledger")).toBeVisible();
  await expect(dialog.getByLabel("Action Label")).toBeVisible();

  const geometry = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      insideViewport: rect.top >= 0 && rect.left >= 0 && rect.bottom <= innerHeight && rect.right <= innerWidth,
      contentSized: rect.height < 520,
      centred: Math.abs((rect.top + rect.bottom) / 2 - innerHeight / 2) < 8,
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(geometry.insideViewport, JSON.stringify(geometry)).toBe(true);
  expect(geometry.contentSized, JSON.stringify(geometry)).toBe(true);
  expect(geometry.centred, JSON.stringify(geometry)).toBe(true);
  expect(geometry.pageOverflow).toBe(false);
});

test("Profile Accounts reuses the global catalogue and protects the last Exchange", async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 900 });
  const catalogue = {
    schema_version: "1.0",
    catalogue_name: "Synthetic Settings Catalogue",
    updated_at: "2026-08-28",
    default_operating_context: { jurisdiction: "GB", subdivision: "", channels: ["web"] },
    records: [
      {
        catalogue_id: "BOOKMAKER-A",
        account_type: "Bookmaker",
        operating_jurisdictions: ["GB"],
        operating_subdivisions: [],
        operating_channels: ["web"],
        brand_name: "Bookmaker A",
        short_display_name: "Bookmaker A",
        operator_group: "Synthetic Group",
        platform: "Synthetic Platform",
        status: "Active",
        foreground_colour: "#FFFFFF",
        background_colour: "#C62828",
      },
      {
        catalogue_id: "EXCHANGE-A",
        account_type: "Exchange",
        operating_jurisdictions: ["GB"],
        operating_subdivisions: [],
        operating_channels: ["web"],
        brand_name: "Exchange A",
        short_display_name: "Exchange A",
        operator_group: "Synthetic Group",
        platform: "Synthetic Platform",
        status: "Active",
        foreground_colour: "#FFFFFF",
        background_colour: "#00695C",
      },
    ],
  };
  let accounts = [
    {
      account_id: "AC-EXCHANGE-A",
      catalogue_id: "EXCHANGE-A",
      account: "Exchange A",
      type: "Exchange",
      status: "Active",
      lifecycle_status: "Active",
      current_balance: "20.00",
      counts_in_cash_total: true,
    },
  ];
  let submittedBody: Record<string, unknown> | null = null;

  await page.route("**/account-catalogue/source", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(catalogue) });
  });
  await page.route("**/profiles/profile-demo-001/accounts", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(accounts) });
  });
  await page.route("**/profiles/profile-demo-001/exchange-commissions", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([
        { profile_id: "profile-demo-001", exchange_name: "Exchange A", commission_rate: "0.02" },
      ]),
    });
  });
  await page.route(
    "**/profiles/profile-demo-001/accounts/catalogue-selection/BOOKMAKER-A",
    async (route) => {
      submittedBody = route.request().postDataJSON() as Record<string, unknown>;
      const created = {
        account_id: "AC-BOOKMAKER-A",
        catalogue_id: "BOOKMAKER-A",
        account: "Bookmaker A",
        type: "Bookie",
        status: submittedBody.status,
        lifecycle_status: "Active",
        current_balance: submittedBody.current_balance,
        counts_in_cash_total: true,
      };
      accounts = [...accounts, created];
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(created) });
    },
  );

  await page.goto(`${settingsPath}#accounts`);
  const panel = page.getByRole("tabpanel", { name: "Accounts" });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("heading", { name: "Choose Accounts" })).toBeVisible();
  await expect(panel.getByLabel("Profile Account Catalogue rows per page").first()).toHaveValue("8");
  const exchangeArchive = panel.getByRole("button", { name: "Archive Exchange A" });
  await expect(exchangeArchive).toBeDisabled();
  await expect(exchangeArchive).toHaveAttribute("title", /retain at least one Exchange/);

  await panel.getByLabel("Search Profile Account Catalogue").fill("Bookmaker A");
  const brand = panel.locator(".account-brand-pill", { hasText: "Bookmaker A" });
  await expect(brand).toHaveCSS("background-color", "rgb(198, 40, 40)");
  await panel.getByLabel("Bookmaker A Profile status").selectOption("Active");
  await panel.getByRole("button", { name: "Add" }).click();
  await expect.poll(() => submittedBody).not.toBeNull();
  expect(submittedBody).toMatchObject({ selected: true, status: "Active" });

  const geometry = await panel.evaluate((element) => ({
    pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    localOverflow: Boolean(
      element.querySelector<HTMLElement>(".table-scroll")?.scrollWidth &&
      element.querySelector<HTMLElement>(".table-scroll")!.scrollWidth >
        element.querySelector<HTMLElement>(".table-scroll")!.clientWidth
    ),
  }));
  expect(geometry.pageOverflow, JSON.stringify(geometry)).toBe(false);
  expect(geometry.localOverflow, JSON.stringify(geometry)).toBe(true);
});
