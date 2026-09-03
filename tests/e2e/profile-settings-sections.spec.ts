import { expect, test } from "@playwright/test";

const settingsPath = "/profiles/profile-demo-001/tracker/settings";

test("profile settings use keyboard-accessible section tabs and retain deep links", async ({ page }) => {
  await page.route("**/profiles/profile-demo-001/workbook-imports", async (route) => {
    await route.fulfill({ contentType: "application/json", body: "[]" });
  });
  const duplicateKeyErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("same key")) {
      duplicateKeyErrors.push(message.text());
    }
  });
  await page.goto(settingsPath);

  const tabs = page.getByRole("tablist", { name: "Profile settings sections" });
  const general = tabs.getByRole("tab", { name: "General" });
  const defaults = tabs.getByRole("tab", { name: "Defaults" });
  const preferences = tabs.getByRole("tab", { name: "Preferences" });
  const importExport = tabs.getByRole("tab", { name: "Import/Export" });

  await expect(general).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: /Settings for .* Profile/ })).toBeVisible();
  await expect(page.getByRole("tabpanel", { name: "General" })).toBeVisible();
  await expect(page.getByRole("tabpanel", { name: "Defaults" })).toBeHidden();
  await expect(page.getByRole("tabpanel", { name: "Import/Export" })).toBeHidden();
  await expect(page.getByLabel("Profile general settings").getByLabel("Full Name")).toBeDisabled();

  await general.focus();
  await page.keyboard.press("ArrowRight");
  await expect(defaults).toBeFocused();
  await expect(defaults).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(`${settingsPath}#defaults`);
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
  await expect(page.getByRole("tabpanel", { name: "Defaults" }).getByRole("heading", { name: "Profile commission defaults" })).toBeVisible();

  await page.keyboard.press("ArrowRight");
  await expect(preferences).toBeFocused();
  await expect(page).toHaveURL(`${settingsPath}#preferences`);
  await expect(page.getByRole("tabpanel", { name: "Preferences" })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(importExport).toBeFocused();
  await expect(importExport).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(`${settingsPath}#import-export`);
  await expect(page.getByRole("tabpanel", { name: "Import/Export" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Import/Export" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Workbook dry run" })).toBeVisible();
  await expect(page.getByLabel("Choose Profile workbook")).toBeVisible();
  await expect(page.getByText("No workbook awaiting review")).toBeVisible();

  await page.keyboard.press("End");
  const subscriber = tabs.getByRole("tab", { name: "Subscriber" });
  await expect(subscriber).toBeFocused();
  await expect(tabs.getByRole("tab", { name: "Account Access" })).toHaveCount(0);
  await expect(page).toHaveURL(`${settingsPath}#subscriber`);
  await expect(page.getByRole("tabpanel", { name: "Subscriber" })).toBeVisible();

  await page.reload();
  await expect(subscriber).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel", { name: "Subscriber" })).toBeVisible();
  expect(duplicateKeyErrors).toEqual([]);
});

test("Fund Manager Profile Settings links to the authoritative management page", async ({ page }) => {
  await page.route("**/api/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/auth/session") {
      return route.fulfill({
        json: {
          authenticated: true,
          email: "founder@example.invalid",
          expires_at: 2_100_000_000,
          linked_profile_ids: ["profile-demo-001"],
          name: "Synthetic Founder",
          role: "fund_manager",
          session_policy: {
            auto_logout_enabled: false,
            preference_configured: true,
            timeout_minutes: 30,
          },
        },
      });
    }
    if (pathname === "/api/profiles/profile-demo-001") {
      return route.fulfill({ json: { display_name: "Synthetic Profile" } });
    }
    return route.fulfill({ json: [] });
  });

  await page.goto(settingsPath);

  await expect(page.getByRole("link", { name: "Manage Profile" })).toHaveAttribute(
    "href",
    "/profiles/profile-demo-001/manage"
  );
});

test("profile settings tabs remain in normal document flow", async ({ page }) => {
  await page.goto(settingsPath);
  const tabs = page.getByRole("tablist", { name: "Profile settings sections" });
  await expect(tabs).toBeVisible();
  const before = await tabs.boundingBox();
  const position = await tabs.evaluate((element) => getComputedStyle(element).position);
  expect(position).toBe("static");
  await page.evaluate(() => window.scrollTo({ top: 700, behavior: "instant" }));
  const after = await tabs.boundingBox();
  if (!before || !after) throw new Error("Expected settings tab geometry");
  expect(after.y).toBeLessThan(before.y - 500);
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

test("Profile Settings removes duplicate account management and redirects its legacy hash", async ({ page }) => {
  await page.goto(settingsPath);
  const tabs = page.getByRole("tablist", { name: "Profile settings sections" });
  await expect(tabs.getByRole("tab", { name: "Accounts" })).toHaveCount(0);

  await page.goto(`${settingsPath}#accounts`);
  await expect(page).toHaveURL("/profiles/profile-demo-001/tracker/accounts");
  await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible();
});
