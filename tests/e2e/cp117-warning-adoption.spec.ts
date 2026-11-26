import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const modules = ["accounts", "sportsbook-bets", "free-bets", "casino-offers", "each-way-extra-places", "cash-adjustments"] as const;
const ownedId: Record<typeof modules[number], string> = {
  accounts: "accounts", "sportsbook-bets": "sportsbook", "free-bets": "free-bets",
  "casino-offers": "casino-offers", "each-way-extra-places": "extra-place", "cash-adjustments": "cash-adjustments",
};

test.beforeEach(async ({ page }) => {
  const health = await (await page.request.get("/api/healthz")).json();
  expect(health.database_identity).toBe("cp117-integration-synthetic");
  await page.addInitScript(() => localStorage.setItem("pd-required-storage-notice", "acknowledged"));
  await page.goto(process.env.OPENFORGE_CP117_AUTH_URL ?? "http://127.0.0.1:9127/");
  expect((await page.request.put("/api/fund-manager/preferences/selected-range", { data: {
    selected_range_preset: "All Dates", selected_range_custom_start: null, selected_range_custom_end: null,
  } })).status()).toBe(200);
});

test("all twelve ledger contexts render source-derived row warnings without entering spreadsheet navigation", async ({ page }) => {
  test.setTimeout(240_000);
  for (const module of modules) for (const scope of ["owned", "combined"] as const) {
    const path = scope === "owned" ? `/profiles/profile-demo-001/tracker/${module}` : `/tracker/${module}?profile=profile-demo-001`;
    await page.goto(path);
    const grid = page.locator(`[data-pd-id="${scope === "owned" ? ownedId[module] : `combined.${module}`}.table-scroll"]`);
    await expect(grid).toBeVisible({ timeout: 45_000 });
    await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
    const triggers = grid.locator('button[aria-controls^="ledger-warnings-"]');
    const count = await triggers.count();
    console.log(`${module} ${scope}: ${count} warning rows`);
    if (["sportsbook-bets", "free-bets", "casino-offers"].includes(module)) expect(count).toBeGreaterThan(0);
    if (!count) continue;
    const trigger = triggers.first();
    const expanded = await trigger.getAttribute("aria-expanded");
    expect(expanded).toBe("false");
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    const panel = grid.locator('[data-ledger-warning-detail][aria-hidden="false"]');
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("heading", { name: /items? need(s)? review/ })).toBeVisible();
    await expect(panel.getByRole("button", { name: /^Review / }).first()).toBeVisible();
    await panel.getByRole("button", { name: "Close" }).click();
    await expect(trigger).toBeFocused();
    await trigger.press("Enter");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await trigger.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toBeFocused();
  }
});

test("corrective actions target the owning editor and return to the expanded combined row", async ({ page }) => {
  test.setTimeout(180_000);
  for (const module of ["sportsbook-bets", "free-bets", "casino-offers"] as const) {
    await page.goto(`/tracker/${module}`);
    const grid = page.locator(`[data-pd-id="combined.${module}.table-scroll"]`);
    await expect(grid).toBeVisible({ timeout: 45_000 });
    const trigger = grid.locator('button[aria-controls^="ledger-warnings-"]').first();
    await expect(trigger).toBeVisible();
    const recordIdentity = await trigger.locator("xpath=ancestor::tr[1]/td[1]").getAttribute("data-ledger-row");
    expect(recordIdentity).toBeTruthy();
    await trigger.click();
    const detail = grid.locator('[data-ledger-warning-detail][aria-hidden="false"]');
    const warning = detail.getByRole("button", { name: /^Review / }).first();
    const warningLabel = (await detail.locator("strong").first().textContent())!;
    await warning.click();
    await expect(page).toHaveURL(new RegExp(`/profiles/[^/]+/tracker/${module}\\?record=`));
    await expect(page.locator("[data-ledger-warning-context]")).toContainText(warningLabel, { timeout: 45_000 });
    if (module === "sportsbook-bets") await expect(page.locator(`[data-pd-id="${ownedId[module]}.table-scroll"]`)).toBeHidden();
    else {
      await page.keyboard.press("Escape");
      await expect(page.locator('[data-pd-id$=".editor.dialog"]')).toHaveCount(0);
    }
    const returnLink = module === "sportsbook-bets"
      ? page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Sportsbook Bets" })
      : page.getByRole("link", { name: /Back to combined/i }).first();
    await returnLink.click();
    await expect.poll(() => new URL(page.url()).pathname).toBe(`/tracker/${module}`);
    await expect(grid.locator('[data-ledger-warning-detail][aria-hidden="false"]')).toBeVisible();
    expect(await grid.locator('[data-ledger-warning-detail][aria-hidden="false"]').count()).toBe(1);
  }
});

test("filtered return explains when the corrected row has left the visible results", async ({ page }) => {
  await page.goto("/tracker/sportsbook-bets?profile=profile-demo-001&warning=profile-demo-001%3A%3ARECORD-NOT-VISIBLE");
  const notice = page.locator('[data-pd-id="combined.sportsbook-bets.warning-return-missing"]');
  await expect(notice).toBeVisible({ timeout: 45_000 });
  await expect(notice).toContainText("scope and filters are preserved");
  await expect(notice).toBeFocused();
});

test("V2 ledgers discard a stale collapsed-editor state on fresh route entry", async ({ page }) => {
  for (const module of ["sportsbook-bets", "free-bets", "casino-offers", "cash-adjustments"] as const) {
    await page.evaluate((key) => localStorage.setItem(key, "true"), `openforge-ledger-collapsed:profile-demo-001:${module}`);
    await page.goto(`/profiles/profile-demo-001/tracker/${module}`);
    await expect(page.locator(`[data-pd-id="${ownedId[module]}.table-scroll"]`)).toBeVisible({ timeout: 45_000 });
    expect(await page.evaluate((key) => localStorage.getItem(key), `openforge-ledger-collapsed:profile-demo-001:${module}`)).toBe("false");
  }
});

test("persisted Account, Cash and Extra Place warnings retain exact Profile and record targets", async ({ page }) => {
  test.setTimeout(360_000);
  const stamp = Date.now();
  const created = await page.request.post("/api/profiles/onboarding", { data: {
    accounts: [], display_name: `Synthetic Warning Review ${stamp}`, profile_code: `WARN-${stamp}`,
    profile_relationship: "Personal", management_fee_percent: "0", investment_fee_percent: "0",
    enabled_modules: modules.filter(module => module !== "accounts"), quick_actions: [], setup_path: "import", tracking_start_date: "2026-09-01",
  } });
  expect(created.status(), await created.text()).toBe(201);
  const profileId = (await created.json()).profile.profile_id as string;
  const account = await page.request.post(`/api/profiles/${profileId}/accounts`, { data: {
    account: "Bookmaker A", type: "Bookie", status: "Active", lifecycle_status: "Active",
    channel: "Online", stake_access: "Normal", promo_access: "Full", restrictions: [],
    current_balance: "", pending_withdrawal_amount: "0.00",
  } });
  expect(account.status(), await account.text()).toBe(201);
  const cash = await page.request.post(`/api/profiles/${profileId}/cash-adjustments`, { data: {
    adjustment_date: "2026-11-20T18:54", direction: "In", amount: "10.00", adjustment_type: "TopUp",
    affects_investment: false, affects_cash_snapshot: false, linked_account: "",
    description: "Synthetic unscoped adjustment",
  } });
  expect(cash.status(), await cash.text()).toBe(201);
  const secondCash = await page.request.post(`/api/profiles/${profileId}/cash-adjustments`, { data: {
    adjustment_date: "2026-11-21T18:54", direction: "In", amount: "5.00", adjustment_type: "TopUp",
    affects_investment: false, affects_cash_snapshot: false, linked_account: "Bookmaker A",
    description: "Synthetic scoped account adjustment",
  } });
  expect(secondCash.status(), await secondCash.text()).toBe(201);
  const extra = await page.request.post(`/api/profiles/${profileId}/each-way-extra-places`, { data: {
    runner: "Synthetic runner", race: "Synthetic race", calculation_provenance: "imported_historical",
    imported_historical_pnl: "", status: "Settled", result: "Pending",
  } });
  expect(extra.status(), await extra.text()).toBe(201);
  for (const [module, labels] of [
    ["accounts", ["Current Balance needs review"]],
    ["cash-adjustments", ["No Account", "No Scope"]],
    ["each-way-extra-places", ["Historical P&L needed"]],
  ] as const) for (const scope of ["owned", "combined"] as const) {
    await page.goto(scope === "owned" ? `/profiles/${profileId}/tracker/${module}` : `/tracker/${module}?profile=${profileId}`);
    const grid = page.locator(`[data-pd-id="${scope === "owned" ? ownedId[module] : `combined.${module}`}.table-scroll"]`);
    await expect(grid).toBeVisible({ timeout: 45_000 });
    const scopedRows = scope === "combined"
      ? grid.locator('tbody tr:not([data-ledger-warning-detail])').filter({ hasText: `Synthetic Warning Review ${stamp}` })
      : grid.locator('tbody tr:not([data-ledger-warning-detail])');
    const trigger = scopedRows.locator('button[aria-controls^="ledger-warnings-"]').filter({ hasText: String(labels.length) }).first();
    await expect(trigger).toBeVisible({ timeout: 45_000 });
    await trigger.click();
    const detail = grid.locator('[data-ledger-warning-detail][aria-hidden="false"]');
    await expect(detail).toContainText(labels[0]);
    await expect(detail).toContainText(`Synthetic Warning Review ${stamp}`);
    if (module === "cash-adjustments") await expect(detail).toContainText(labels[1]);
    if (module === "cash-adjustments" && scope === "owned") {
      const other = grid.locator('button[aria-controls^="ledger-warnings-"]').filter({ hasText: "1" }).first();
      await expect(other).toBeVisible();
      await other.click();
      await expect(detail).toHaveCount(1);
      await expect(detail).toContainText("No Scope");
      await expect(detail).not.toContainText("No Account");
      await trigger.click();
      await expect(detail).toContainText("No Account");
      for (const [width, theme] of [[2048, "dark"], [1440, "light"], [390, "dark"]] as const) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(selectedTheme => { document.documentElement.dataset.theme = selectedTheme; }, theme);
        await trigger.scrollIntoViewIfNeeded();
        const geometry = await page.evaluate(() => {
          const panel = document.querySelector<HTMLElement>('[data-ledger-warning-detail][aria-hidden="false"] .ledger-row-warnings-module__panel');
          const active = document.querySelector<HTMLElement>('[data-ledger-warning-detail][aria-hidden="false"] section');
          const rect = (panel ?? active)?.getBoundingClientRect();
          return { left: rect?.left ?? -1, right: rect?.right ?? -1, width: innerWidth,
            documentWidth: document.documentElement.scrollWidth,
            grid: document.querySelector('[data-pd-id="cash-adjustments.table-scroll"]')?.getBoundingClientRect().toJSON() };
        });
        expect(geometry.left).toBeGreaterThanOrEqual(0);
        expect(geometry.right).toBeLessThanOrEqual(width + 2);
        expect(geometry.documentWidth).toBeLessThanOrEqual(width + 2);
        const evidenceDir = join(process.cwd(), "data/private/evidence/cp117-warning-adoption");
        mkdirSync(evidenceDir, { recursive: true });
        await page.screenshot({ path: join(evidenceDir, `cash-warning-${width}-${theme}.png`), fullPage: true });
      }
      await page.emulateMedia({ reducedMotion: "reduce" });
      const transition = await grid.locator('[data-ledger-warning-detail][aria-hidden="false"] > td > div').evaluate(node => getComputedStyle(node).transitionDuration);
      expect(transition).toBe("0s");
      await page.emulateMedia({ reducedMotion: "no-preference" });
    }
    const action = module === "accounts" ? "Review Current balance"
      : module === "cash-adjustments" ? "Review Account" : "Review Historical P&L";
    await detail.getByRole("button", { name: action }).click();
    if (scope === "combined") await expect(page).toHaveURL(new RegExp(`/profiles/${profileId}/tracker/${module}\\?record=`));
    await expect(page.locator("[data-ledger-warning-context]")).toBeVisible({ timeout: 45_000 });
    if (module === "accounts") await expect(page.getByRole("textbox", { name: "Current balance" })).toBeFocused();
    if (module === "cash-adjustments") {
      const linked = page.getByLabel("Linked account");
      if (await linked.isDisabled()) {
        const edit = page.getByRole("button", { name: "Edit cash-adjustment row" });
        await expect(edit).toBeFocused();
        await edit.click();
      }
      await expect(linked).toBeFocused();
    }
    if (module === "each-way-extra-places") await expect(page.getByLabel("Imported realised P&L")).toBeFocused();
  }
  await page.goto(`/profiles/${profileId}/tracker/cash-adjustments`);
  const cashGrid = page.locator('[data-pd-id="cash-adjustments.table-scroll"]');
  await expect(cashGrid).toBeVisible({ timeout: 45_000 });
  await expect(page.locator(".ledger-loading-overlay")).toHaveCount(0, { timeout: 45_000 });
  await cashGrid.locator('button[aria-controls^="ledger-warnings-"]').filter({ hasText: "1" }).first().click();
  await cashGrid.getByRole("button", { name: "Review Scope" }).click();
  await expect(page.locator("[data-ledger-warning-context]")).toContainText("No Scope");
  const editScope = page.getByRole("button", { name: "Edit cash-adjustment row" });
  await expect(editScope).toBeFocused();
  await editScope.click();
  await expect(page.getByLabel("Affects investment")).toBeFocused();
  await page.goto(`/profiles/${profileId}/tracker/accounts`);
  const accountGrid = page.locator('[data-pd-id="accounts.table-scroll"]');
  await accountGrid.locator('button[aria-controls^="ledger-warnings-"]').first().click();
  await accountGrid.getByRole("button", { name: "Review Current balance" }).click();
  const balance = page.getByRole("textbox", { name: "Current balance" });
  await expect(balance).toBeVisible();
  await balance.fill("25.00");
  let rejectedOnce = false;
  await page.route(`**/profiles/${profileId}/accounts/*`, async route => {
    if (route.request().method() === "PUT" && !rejectedOnce) {
      rejectedOnce = true;
      await route.fulfill({ status: 503, json: { detail: "Synthetic save rejection" } });
    } else await route.continue();
  });
  await page.locator('[data-pd-id="accounts.editor.footer"]').getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Synthetic save rejection").first()).toBeVisible();
  await expect(balance).toHaveValue("25.00");
  await page.unroute(`**/profiles/${profileId}/accounts/*`);
  await page.locator('[data-pd-id="accounts.editor.footer"]').getByRole("button", { name: "Save" }).click();
  await expect(balance).toHaveCount(0);
  await page.reload();
  await expect(accountGrid.locator('button[aria-controls^="ledger-warnings-"]')).toHaveCount(0);
  const savedAccounts = await (await page.request.get(`/api/profiles/${profileId}/accounts`)).json() as Array<{ current_balance: string }>;
  expect(savedAccounts[0].current_balance).toBe("25.00");
});
