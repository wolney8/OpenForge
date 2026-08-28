import { expect, test } from "@playwright/test";

test.setTimeout(90_000);

function rgbChannels(value: string) {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) throw new Error(`Could not parse rgb colour: ${value}`);
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
  };
}

async function expectLedgerToolbarAfterStats(
  page: import("@playwright/test").Page,
  statLabel: string,
  toolbarLabel: string,
  addAction: string
) {
  const stats = page.getByRole("region", { name: statLabel });
  const toolbar = page.getByRole("toolbar", { name: toolbarLabel });
  const [statsBox, toolbarBox] = await Promise.all([stats.boundingBox(), toolbar.boundingBox()]);
  expect(statsBox).not.toBeNull();
  expect(toolbarBox).not.toBeNull();
  expect(toolbarBox!.y).toBeGreaterThan(statsBox!.y + statsBox!.height - 1);
  const addButton = toolbar.getByRole("button", { name: addAction });
  const filterButton = toolbar.getByRole("button", { name: /filter and column controls/i });
  const filterIcon = filterButton.locator(".table-filter-icon");
  await expect(addButton).toBeVisible();
  await expect(addButton.locator(".material-symbols-outlined")).toHaveText("add");
  await expect(addButton).toContainText("Add Row");
  const [addBox, filterBox, filterIconBox] = await Promise.all([
    addButton.boundingBox(),
    filterButton.boundingBox(),
    filterIcon.boundingBox(),
  ]);
  expect(addBox).not.toBeNull();
  expect(filterBox).not.toBeNull();
  expect(filterIconBox).not.toBeNull();
  expect(addBox!.x + addBox!.width).toBeLessThanOrEqual(filterBox!.x + 1);
  expect(addBox!.width).toBeGreaterThan(filterBox!.width * 2);
  expect(Math.abs(addBox!.height - filterBox!.height)).toBeLessThanOrEqual(3);
  const filterCentreX = filterBox!.x + filterBox!.width / 2;
  const filterCentreY = filterBox!.y + filterBox!.height / 2;
  const iconCentreX = filterIconBox!.x + filterIconBox!.width / 2;
  const iconCentreY = filterIconBox!.y + filterIconBox!.height / 2;
  expect(Math.abs(iconCentreX - filterCentreX)).toBeLessThanOrEqual(2);
  expect(Math.abs(iconCentreY - filterCentreY)).toBeLessThanOrEqual(2);
  const addBackground = rgbChannels(
    await addButton.evaluate((element) => getComputedStyle(element).backgroundColor)
  );
  expect(addBackground.g).toBeGreaterThan(addBackground.r);
  expect(addBackground.g).toBeGreaterThan(addBackground.b);
  await expect(page.getByRole("button", { name: /Collapse ledger|Expand ledger/ })).toHaveCount(0);
}

async function waitForLedgerReady(page: import("@playwright/test").Page, loadingText: string) {
  await expect(page.getByText(loadingText)).toBeHidden({ timeout: 90_000 });
}

test("Sportsbook places its shared controls after the stat cards", async ({ page }) => {
  await page.goto("/profiles/profile-demo-001/tracker/sportsbook-bets");
  await waitForLedgerReady(page, "Loading sportsbook ledger");
  await expectLedgerToolbarAfterStats(
    page,
    "Sportsbook quick view",
    "Sportsbook ledger controls",
    "Add sportsbook row"
  );
});

test("Free Bets mirrors sportsbook-style table controls", async ({ page }) => {
  await page.goto("/profiles/profile-demo-001/tracker/free-bets");
  await waitForLedgerReady(page, "Loading free-bet ledger");

  await expect(page.getByRole("columnheader", { name: "Expiry" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Lay Bet" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Back Bet" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Actions" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Delete free-bet row / }).first()).toBeVisible();
  await expectLedgerToolbarAfterStats(page, "Free-bet quick view", "Free-bet ledger controls", "Add free-bet row");

  await page.getByRole("button", { name: "Open free-bet filter and column controls" }).click();
  const dialog = page.getByRole("dialog", { name: "Free-bet filter controls" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Bookmaker", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Offer type (promotion mechanism)", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Issue type", { exact: true })).toBeVisible();
  await expect(dialog.locator('option[value="expiry-watch"]')).toHaveCount(1);
});

test("Casino Offers exposes consistent filter controls and actions column", async ({ page }) => {
  await page.goto("/profiles/profile-demo-001/tracker/casino-offers");
  await waitForLedgerReady(page, "Loading casino-offer ledger");

  await expect(page.getByRole("columnheader", { name: "Actions" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Delete casino-offer row / }).first()).toBeVisible();
  await expectLedgerToolbarAfterStats(page, "Casino quick view", "Casino-offer ledger controls", "Add casino row");

  await page.getByRole("button", { name: "Open casino-offer filter and column controls" }).click();
  const dialog = page.getByRole("dialog", { name: "Casino-offer filter controls" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Bookmaker", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Offer type", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Result", { exact: true }).first()).toBeVisible();
  await expect(dialog.getByText("Issue type", { exact: true })).toBeVisible();
});

test("Cash Adjustments exposes consistent filter controls and actions column", async ({ page }) => {
  await page.goto("/profiles/profile-demo-001/tracker/cash-adjustments");
  await waitForLedgerReady(page, "Loading cash-adjustment ledger");

  await expect(page.getByRole("columnheader", { name: "Actions" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Delete cash-adjustment row / }).first()).toBeVisible();
  await expectLedgerToolbarAfterStats(page, "Cash-adjustment quick view", "Cash-adjustment ledger controls", "Add cash adjustment");

  await page.getByRole("button", { name: "Open cash-adjustment filter and column controls" }).click();
  const dialog = page.getByRole("dialog", { name: "Cash-adjustment filter controls" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Direction", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Type", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Calc state", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Issue type", { exact: true })).toBeVisible();
});

test("Accounts uses canonical table controls, sorting, resizing, and neutral cash chips", async ({ page }) => {
  await page.setViewportSize({ width: 2048, height: 900 });
  await page.goto("/profiles/profile-demo-001/tracker/accounts");

  const quickView = page.getByRole("region", { name: "Account quick view" });
  await expect(quickView).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Account" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Filter accounts" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /^Type/i })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /Status/i })).toBeVisible();
  await expect(page.locator(".accounts-financial-chip").first()).toBeVisible();

  const toolbar = page.locator('[data-pd-id="accounts.table-toolbar"]');
  const loadouts = page.getByRole("group", { name: "Accounts review modes" });
  const actions = toolbar.locator(".extra-place-toolbar-actions");
  const pagination = page.getByLabel("Accounts top controls");
  const search = toolbar.getByRole("searchbox");
  const [toolbarBox, searchBox, actionsBox, loadoutBox, paginationBox] = await Promise.all([
    toolbar.boundingBox(),
    search.boundingBox(),
    actions.boundingBox(),
    loadouts.boundingBox(),
    pagination.boundingBox(),
  ]);
  expect(toolbarBox).not.toBeNull();
  expect(searchBox).not.toBeNull();
  expect(actionsBox).not.toBeNull();
  expect(loadoutBox).not.toBeNull();
  expect(paginationBox).not.toBeNull();
  expect(searchBox!.width).toBeLessThanOrEqual(480);
  expect(actionsBox!.x).toBeGreaterThan(toolbarBox!.x + toolbarBox!.width / 2);
  expect(Math.abs(actionsBox!.y + actionsBox!.height - (searchBox!.y + searchBox!.height))).toBeLessThanOrEqual(6);
  expect(loadoutBox!.y).toBeGreaterThan(toolbarBox!.y + toolbarBox!.height - 1);
  expect(paginationBox!.y).toBeGreaterThan(loadoutBox!.y + loadoutBox!.height - 1);

  const accountHeader = page.getByRole("columnheader", { name: /Account/i }).first();
  await accountHeader.getByRole("button").click();
  await expect(accountHeader).toHaveAttribute("aria-sort", "ascending");
  const resizeHandle = accountHeader.locator(".table-column-resize-handle");
  await expect(resizeHandle).toBeVisible();
  const beforeResize = await accountHeader.boundingBox();
  await resizeHandle.hover();
  await page.mouse.down();
  await page.mouse.move((beforeResize?.x ?? 0) + (beforeResize?.width ?? 0) + 80, 0, { steps: 4 });
  await page.mouse.up();
  const afterResize = await accountHeader.boundingBox();
  expect(afterResize?.width ?? 0).toBeGreaterThan((beforeResize?.width ?? 0) + 32);
  await expect(page.getByLabel("Accounts top controls").getByLabel("Accounts rows per page")).toHaveValue("8");

  await page.getByRole("button", { name: "Filter accounts" }).click();
  const dialog = page.getByRole("dialog", { name: "Filter accounts" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("View", { exact: true })).toBeVisible();
  await expect(dialog.locator('option[value="Recent"]')).toHaveCount(1);
  await expect(dialog.getByText("Issues", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("region", { name: "Visible account columns" })).toBeVisible();
  await dialog.getByRole("button", { name: "Close account filters" }).click();

  await page.locator(".accounts-data-table tbody tr").first().click();
  const editor = page.getByRole("dialog", { name: "Edit account" });
  await expect(editor).toBeVisible();
  await expect(editor.getByText("Channel", { exact: true })).toHaveCount(0);
  await expect(editor.locator("fieldset.field-control")).toHaveCount(0);
  const horizontalOverflow = await editor.evaluate(
    (element) => element.scrollWidth - element.clientWidth,
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
  await editor.getByRole("button", { name: "Close account editor" }).click();
});

test("Accounts Add Account uses the global catalogue for every provider type", async ({ page }) => {
  await page.route("**/account-catalogue/source", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        schema_version: "1.0",
        catalogue_name: "Synthetic canonical catalogue",
        updated_at: "2026-08-28",
        default_operating_context: {
          jurisdiction: "",
          subdivision: "",
          channels: [],
        },
        records: [
          {
            catalogue_id: "BOOKMAKER-CANONICAL-A",
            account_type: "Bookmaker",
            operating_jurisdictions: ["GB"],
            operating_subdivisions: [],
            operating_channels: ["web", "mobile"],
            brand_name: "Canonical Bookmaker",
            short_display_name: "Canonical Bookmaker",
            operator_group: "Canonical Group",
            platform: "Canonical Platform",
            status: "Active",
            foreground_colour: "#FFFFFF",
            background_colour: "#455A64",
          },
          {
            catalogue_id: "EXCHANGE-CANONICAL-A",
            account_type: "Exchange",
            operating_jurisdictions: ["GB"],
            operating_subdivisions: [],
            operating_channels: ["web"],
            brand_name: "Canonical Exchange",
            short_display_name: "Canonical Exchange",
            operator_group: "Canonical Group",
            platform: "Canonical Platform",
            status: "Active",
            foreground_colour: "#FFFFFF",
            background_colour: "#455A64",
          },
          {
            catalogue_id: "BANK-CANONICAL-A",
            account_type: "Bank",
            operating_jurisdictions: ["GB"],
            operating_subdivisions: [],
            operating_channels: ["web"],
            brand_name: "Canonical Bank",
            short_display_name: "Canonical Bank",
            operator_group: "Canonical Group",
            platform: "Canonical Platform",
            status: "Active",
            foreground_colour: "#FFFFFF",
            background_colour: "#455A64",
          },
        ],
      },
      status: 200,
    });
  });
  await page.route("**/bookmaker-catalogue", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: [{
        bookmaker_id: "BM-OLD-TEST",
        brand_name: "Old Test Bookmaker",
        short_display_name: "Old Test",
        status: "Active",
      }],
      status: 200,
    });
  });

  await page.goto("/profiles/profile-demo-001/tracker/accounts");
  await page.getByRole("button", { name: "Add Account" }).click();
  const editor = page.getByRole("dialog", { name: "Create account" });
  const accountSelect = editor.getByRole("combobox", { name: "Account" });
  await expect(accountSelect.locator("optgroup[label='Bookmakers'] option")).toHaveText([
    "Canonical Bookmaker",
  ]);
  await expect(accountSelect.locator("optgroup[label='Exchanges'] option")).toHaveText([
    "Canonical Exchange",
  ]);
  await expect(accountSelect.locator("optgroup[label='Banks'] option")).toHaveText([
    "Canonical Bank",
  ]);
  await expect(accountSelect.locator("option", { hasText: "Old Test Bookmaker" })).toHaveCount(0);

  await accountSelect.selectOption("EXCHANGE-CANONICAL-A");
  await expect(editor.locator("label").filter({ hasText: /^Type/ }).locator("input")).toHaveValue(
    "Exchange",
  );
  await expect(editor.getByLabel("Exchange commission")).toBeVisible();
});
