import { expect, test } from "@playwright/test";

test.describe("CP-109 daily-use corrections", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/auth/session**", (route) => route.fulfill({
      json: {
        authenticated: true,
        email: "founder@example.invalid",
        expires_at: 2_100_000_000,
        linked_profile_ids: ["profile-demo-001"],
        name: "Synthetic Founder",
        role: "fund_manager",
      },
    }));
    await page.route("**/auth/activity**", (route) => route.fulfill({ status: 204 }));
    await page.route("**/auth/security-preference**", (route) => route.fulfill({ json: { configured: false } }));
  });

  test("Account toolbar, cards, save, audit, failure and dirty-close states remain contained", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/profiles/profile-demo-001/tracker/accounts");
    await expect(page.getByText("Loading Profile Accounts")).toBeHidden({ timeout: 60_000 });

    const toolbar = page.locator('[data-pd-id="accounts.table-toolbar"]');
    const table = page.locator('[data-pd-id="accounts.table-scroll"]');
    const cards = page.locator('[data-pd-id="accounts.card-list"]');
    for (const width of [1440, 900, 760, 430, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(toolbar).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      const box = await toolbar.boundingBox();
      expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width + 1);
      if (width <= 760) {
        await expect(table).toBeHidden();
        await expect(cards).toBeVisible();
        await expect(cards.locator(".account-responsive-card").first()).toContainText("Status");
        await expect(cards.locator(".account-responsive-card").first()).toContainText("Type");
        await expect(cards.locator(".account-responsive-card").first()).toContainText("Balance");
      } else {
        await expect(table).toBeVisible();
      }
    }

    await page.setViewportSize({ width: 1440, height: 1000 });
    const search = page.getByRole("searchbox", { name: "Search accounts" });
    await search.fill("Smarkets");
    const row = page.locator(".accounts-data-table tbody tr").filter({ hasText: "Smarkets" });
    await expect(row).toHaveCount(1);
    await expect(row.locator(".accounts-provider-cell .bookmaker-identity-badge")).toBeVisible();
    const providerGeometry = await row.locator(".accounts-provider-cell .bookmaker-identity-badge").evaluate((element) => ({
      badge: element.getBoundingClientRect().width,
      cell: element.closest("td")?.getBoundingClientRect().width ?? 0,
    }));
    expect(providerGeometry.badge).toBeLessThan(providerGeometry.cell);

    await row.getByRole("button", { name: /Edit Smarkets/ }).click();
    const editor = page.getByRole("dialog", { name: "Edit account" });
    const commission = editor.getByLabel("Base Exchange commission");
    await expect(commission).toBeVisible();

    await commission.fill("2");
    await editor.getByRole("button", { name: "Save", exact: true }).click();
    await expect(commission).toBeFocused();
    await expect(editor.getByText("Enter the Exchange commission as a decimal fraction from 0 to 1, or leave it blank when unknown.")).toBeVisible();

    await commission.fill("");
    await editor.getByRole("button", { name: "Save", exact: true }).click();
    await expect(editor).toBeHidden();
    await row.getByRole("button", { name: /Edit Smarkets/ }).click();
    await expect(commission).toHaveValue("");
    await commission.fill("0.00");
    await editor.getByRole("button", { name: "Save", exact: true }).click();
    await expect(editor).toBeHidden();
    await row.getByRole("button", { name: /Edit Smarkets/ }).click();
    await expect(commission).toHaveValue("0.00");

    await page.route("**/api/profiles/profile-demo-001/accounts/**", async (route) => {
      if (route.request().method() === "PUT") {
        await route.fulfill({ status: 503, json: { detail: "Synthetic Account write failure" } });
      } else {
        await route.continue();
      }
    });
    await commission.fill("0.03");
    await editor.getByRole("button", { name: "Save", exact: true }).click();
    await expect(editor.getByText("Synthetic Account write failure")).toBeVisible();
    await expect(commission).toHaveValue("0.03");
    await page.unroute("**/api/profiles/profile-demo-001/accounts/**");

    await editor.getByRole("button", { name: "Close account editor" }).click();
    const discard = page.getByRole("dialog", { name: "Discard changes?" });
    await expect(discard).toContainText("Your unsaved changes will be lost.");
    await discard.getByRole("button", { name: "Keep editing", exact: true }).click();
    await expect(editor).toBeVisible();
    await expect(commission).toHaveValue("0.03");
    await editor.getByRole("button", { name: "Close account editor" }).click();
    await discard.getByRole("button", { name: "Discard changes", exact: true }).click();
    await expect(editor).toBeHidden();

    await row.getByRole("button", { name: /Edit Smarkets/ }).click();
    await commission.fill("0.02");
    await editor.getByRole("button", { name: "Save", exact: true }).click();
    await expect(editor).toBeHidden();
    await row.getByRole("button", { name: /Edit Smarkets/ }).click();
    await expect(commission).toHaveValue("0.02");
    const history = editor.locator('[data-pd-id="accounts.editor.history"]');
    await history.locator("summary").click();
    await expect(history).toContainText("Base commission set to 2.00%.");
  });

  test("empty balance history collapses and Sportsbook Matching can be prepared before Event Name", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/profiles");
    const emptyHistory = page.locator('[data-pd-id="profiles.balance-history.empty"]');
    await expect(emptyHistory).toContainText("No balance snapshots yet");
    expect((await emptyHistory.boundingBox())?.height ?? 999).toBeLessThan(100);
    await expect(page.locator('[data-pd-id="profiles.balance-snapshots.period-range"]')).toHaveCount(0);

    const accountResponse = await page.request.post("/api/profiles/profile-demo-001/accounts", {
      data: {
        account: "Bet365",
        type: "Bookie",
        status: "Active",
        lifecycle_status: "Active",
        channel: "Online",
        access_channels: ["Online"],
        stake_access: "Normal",
        promo_access: "Full",
        restrictions: [],
        current_balance: "",
        pending_withdrawal_amount: "",
      },
    });
    expect([201, 409]).toContain(accountResponse.status());
    await page.goto("/profiles/profile-demo-001/tracker/sportsbook-bets");
    await expect(page.getByText("Loading sportsbook ledger")).toBeHidden({ timeout: 60_000 });
    await page.getByRole("button", { name: /Add sportsbook row/i }).click();
    const editor = page.getByRole("dialog", { name: /sportsbook row/i });
    await expect(editor.getByLabel("Event Name")).toHaveValue("");
    await editor.getByLabel("Bookmaker").selectOption({ index: 1 });
    await editor.getByLabel("Offer", { exact: true }).fill("Synthetic CP109 offer");
    await editor.getByLabel(/^Bet type \(bet shape/).selectOption({ index: 1 });
    await editor.getByLabel(/^Offer type \(promotion mechanism/).selectOption({ index: 1 });
    await editor.getByLabel(/^Fixture type/).selectOption({ index: 1 });
    await editor.getByRole("tab", { name: /Matching/ }).click();
    await expect(editor.locator('[data-pd-id="ledger-editor.panel.matching"]')).toBeVisible();
    await editor.getByLabel("Back stake").fill("10.00");
    await editor.getByLabel("Back odds").fill("2.10");
    await editor.getByLabel("Lay odds", { exact: true }).fill("2.20");
    const exchangeSelect = editor.getByRole("combobox").filter({
      has: page.locator("option", { hasText: "Select exchange" }),
    });
    await exchangeSelect.selectOption({ index: 1 });
    await editor.getByLabel("Planning exchange commission (%)").fill("2");
    await expect(editor.getByLabel("Back stake")).toBeEnabled();
    await expect(editor.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
    await editor.getByRole("button", { name: "Save", exact: true }).click();
    await expect(editor.getByRole("button", { name: /Next required.*Event Name/i })).toBeVisible();
  });
});
