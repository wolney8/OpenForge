import { expect, test } from "@playwright/test";

const settingsPath = "/profiles/profile-demo-001/tracker/settings";

async function mockAuthenticatedSession(page: import("@playwright/test").Page) {
  await page.route("**/api/**", async (route) => {
    if (new URL(route.request().url()).pathname === "/api/auth/session") {
      await route.fulfill({
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
      return;
    }
    await route.fulfill({ contentType: "application/json", body: "[]" });
  });
}

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

test("Fund Manager can load read-only import recovery diagnostics", async ({ page }) => {
  let diagnosticRequests = 0;
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
    if (pathname.endsWith("/workbook-imports/recovery-diagnostics")) {
      diagnosticRequests += 1;
      return route.fulfill({ json: {
        profile_id: "profile-demo-001", profile_display_name: "Synthetic Profile",
        import_run_id: "profile-import-diagnostics", execution_id: "execution-diagnostics",
        import_status: "POST_IMPORT_RECONCILIATION_FAILED", reconciliation_status: "FAILED",
        checkpoint_id: "checkpoint-diagnostics", checkpoint_status: "AVAILABLE",
        checkpoint_checksum: "a".repeat(64), recorded_post_import_checksum: "b".repeat(64),
        current_profile_checksum: "b".repeat(64), current_matches_post_import_checksum: true,
        manual_post_import_mutation_detected: false, rollback_available: true,
        active_write_audit_row_count: 747, execution_running: false, import_started_at: "",
        import_completed_at: "2026-09-03T12:00:00+00:00", import_rolled_back_at: "",
        rollback_conclusion: "ROLLBACK SAFE",
        rollback_reason: "The current Profile checksum matches the recorded post-import checksum.",
      } });
    }
    return route.fulfill({ json: [] });
  });

  await page.goto(`${settingsPath}#import-export`);
  const diagnostics = page.locator('[data-pd-id="profile-import.recovery-diagnostics"]');
  await expect(diagnostics.getByRole("heading", { name: "Recovery diagnostics" })).toBeVisible();
  await diagnostics.getByRole("button", { name: "Load import recovery diagnostics" }).click();
  await expect(diagnostics.getByText("ROLLBACK SAFE")).toBeVisible();
  await expect(diagnostics).toContainText("profile-import-diagnostics");
  await expect(diagnostics).toContainText("747");
  for (const theme of ["light", "dark"]) {
    await page.locator("html").evaluate((element, value) => element.setAttribute("data-theme", value), theme);
    await expect(diagnostics.getByText("ROLLBACK SAFE")).toHaveCSS("background-color", /rgb/);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const diagnosticsGeometry = await diagnostics.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(diagnosticsGeometry.scrollWidth).toBeLessThanOrEqual(diagnosticsGeometry.clientWidth);
  expect(diagnosticRequests).toBe(1);
});

test("workbook history reconstructs an approved import action after reload", async ({ page }) => {
  await mockAuthenticatedSession(page);
  const run = {
    import_run_id: "profile-import-ready",
    source_filename: "synthetic-approved.xlsx",
    workbook_checksum: "a".repeat(64),
    effective_at: "2026-09-03T10:13:00+01:00",
    mapping_version: "founder-snapshot-v5",
    status: "READY_APPROVED",
    raw_workbook_retained: false,
    approved_at: "2026-09-03T12:00:00+00:00",
    completed_at: "",
    checkpoint_id: "",
    rollback_status: "",
    rolled_back_at: "",
    row_counts: { sportsbook: 1 },
    updated_at: "2026-09-03T12:00:00+00:00",
  };
  await page.route("**/profiles/profile-demo-001/workbook-imports", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify([run]) });
  });

  await page.goto(`${settingsPath}#import-export`);
  const importAction = page.getByRole("link", { name: "Import to Profile" });
  await expect(importAction).toHaveAttribute(
    "href",
    "/profiles/profile-demo-001/imports/profile-import-ready/review",
  );

  await page.reload();
  await expect(page.getByRole("link", { name: "Import to Profile" })).toBeVisible();
});

test("delete review reports deletion errors and succeeds without workbook analysis", async ({ page }) => {
  await mockAuthenticatedSession(page);
  const run = {
    import_run_id: "profile-import-delete",
    source_filename: "synthetic-abandoned.xlsx",
    workbook_checksum: "b".repeat(64),
    effective_at: "2026-09-03T10:13:00+01:00",
    mapping_version: "founder-snapshot-v5",
    status: "READY_APPROVED",
    raw_workbook_retained: false,
    approved_at: "2026-09-03T12:00:00+00:00",
    completed_at: "",
    checkpoint_id: "",
    rollback_status: "",
    rolled_back_at: "",
    row_counts: { sportsbook: 1 },
    updated_at: "2026-09-03T12:00:00+00:00",
  };
  let deleted = false;
  let deleteAttempts = 0;
  await page.route("**/profiles/profile-demo-001/workbook-imports**", async (route) => {
    const request = route.request();
    if (request.method() === "DELETE") {
      deleteAttempts += 1;
      if (deleteAttempts === 1) {
        await route.fulfill({ status: 500, body: "failed" });
        return;
      }
      deleted = true;
      await route.fulfill({ status: 204 });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(deleted ? [] : [run]),
    });
  });

  await page.goto(`${settingsPath}#import-export`);
  await page.getByRole("button", { name: "Delete review synthetic-abandoned.xlsx" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete workbook review?" });
  await dialog.getByRole("button", { name: "Delete review" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Unable to delete the workbook review.");
  await expect(dialog).not.toContainText("Unable to analyse the workbook");
  await expect(dialog.getByRole("button", { name: "Delete review" })).toBeEnabled();

  await dialog.getByRole("button", { name: "Delete review" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("No workbook awaiting review")).toBeVisible();
  await expect(page.locator(".status-toast")).toContainText("Workbook review deleted");
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
