import { expect, test, type Page } from "@playwright/test";

const baseItem = {
  source_fingerprint: "b".repeat(64),
  source_record_id: "DEMO-001",
  confidence: "review_required",
  missing_fields: [] as string[],
  calculation_provenance: "imported_historical",
  review_status: "UNREVIEWED",
  decision: null,
  source_fields: { Bookmaker: "Demo Bet", FinalNetPnL: "4.25" },
  context: {
    date: "2026-08-01",
    provider: "Demo Bet",
    offer_type: "Bet & Get",
    offer_name: "",
    event: "Demo event",
    stake: "5.00",
    odds: "3.20",
    exchange: "Demo Exchange",
    lay_type: "",
    lay_odds: "3.30",
    lay_stake: "4.80",
    pnl: "4.25",
  },
};

function workspace() {
  return {
    metadata: {
      source_filename: "founder-snapshot.xlsx",
      effective_at: "2026-08-29T16:05:00+01:00[Europe/London]",
      workbook_checksum: "a".repeat(64),
      mapping_version: "founder-snapshot-v1",
      original_partial_count: 114,
      provider_conflict_count: 1,
      historical_ep_count: 2,
      real_import_performed: false,
    },
    items: [
      {
        ...baseItem,
        item_id: "review-advanced-123456",
        import_id: "sportsbook-import-1",
        source_sheet: "Sportsbook Bets",
        source_row: 42,
        category: "sportsbook_partial",
        issue_type: "advanced_lay",
        issue_types: ["advanced_lay"],
        reason: "Advanced sportsbook branches require the branch-preserving import mapper.",
        proposed_target: "Historical imported calculation",
      },
      {
        ...baseItem,
        item_id: "review-ep-1234567890",
        import_id: "sportsbook-import-2",
        source_sheet: "Sportsbook Bets",
        source_row: 66,
        category: "historical_extra_place",
        issue_type: "historical_extra_place",
        issue_types: ["historical_extra_place"],
        reason: "Current Extra Place fields are absent from this historical Sportsbook row.",
        proposed_target: "Historical Extra Place or retained Sportsbook EP row",
        confidence: "insufficient_historical_data",
        missing_fields: ["place_terms", "bookmaker_places", "finishing_position"],
        context: { ...baseItem.context, offer_type: "EP (Extra Places)" },
      },
      {
        ...baseItem,
        item_id: "review-provider-123456",
        import_id: "account-import-1",
        source_sheet: "Accounts",
        source_row: 14,
        category: "missing_provider",
        issue_type: "missing_provider",
        issue_types: ["missing_provider"],
        reason: "Provider is not resolved in the global Account Catalogue.",
        proposed_target: "Existing provider, validated catalogue candidate, or historical provider",
        confidence: "blocked",
        context: { ...baseItem.context, provider: "Historical Provider", pnl: "" },
      },
    ],
    reconciliation: {
      original_partial_count: 114,
      resolved_partial_count: 0,
      remaining_partial_count: 114,
      excluded_count: 0,
      deferred_count: 0,
      review_status_counts: {
        UNREVIEWED: 3,
        REVIEWED_ACCEPTED: 0,
        REVIEWED_OVERRIDDEN: 0,
        DEFERRED: 0,
        EXCLUDED: 0,
        BLOCKED: 0,
      },
      valid_decision_count: 0,
      stale_decision_count: 0,
      pnl_impact: "0.00",
      row_count_impact: 0,
      import_ready: false,
      real_import_performed: false,
    },
  };
}

async function mockShell(page: Page) {
  await page.route("**/fund-manager/import-review", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(workspace()) });
      return;
    }
    await route.fallback();
  });
  await page.route("**/account-catalogue/source", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        records: [{
          catalogue_id: "BOOKMAKER-DEMO",
          account_type: "Bookmaker",
          brand_name: "Demo Bet",
          short_display_name: "DemoBet",
          foreground_colour: "#ffffff",
          background_colour: "#111111",
          status: "Active",
        }],
      }),
    });
  });
  await page.route("**/profiles", async (route) => route.fulfill({ json: [] }));
  await page.route("**/fund-manager/notifications**", async (route) => route.fulfill({ json: [] }));
}

test("founder review uses canonical controls and exposes explicit EP choices", async ({ page }) => {
  await mockShell(page);
  await page.goto("/imports/founder/review");

  await expect(page.getByRole("heading", { name: "Import Review" })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Search import exceptions" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Extra Place" })).toBeVisible();
  await expect(page.getByLabel("Import review top controls")).toBeVisible();
  await expect(page.getByLabel("Import review bottom controls")).toBeVisible();

  await page.getByRole("button", { name: "Extra Place" }).click();
  await expect(page.getByText("EP (Extra Places)")).toBeVisible();
  await page.getByRole("button", { name: "Review Sportsbook Bets row 66" }).click();

  const dialog = page.getByRole("dialog", { name: "Review import mapping" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("option", { name: "Historical Extra Place" })).toBeAttached();
  await expect(dialog.getByRole("option", { name: "Keep as Sportsbook historical EP" })).toBeAttached();
  await expect(dialog.getByRole("option", { name: "Reclassify with reason" })).toBeAttached();
  await expect(dialog).toContainText("Unsupported fields remain null");
  await expect(dialog).toContainText("£ 4.25");

  const box = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
  await expect(dialog.getByRole("button", { name: "Close import mapping review" })).toBeVisible();
  for (const theme of ["light", "dark"]) {
    await page.locator("html").evaluate((element, value) => element.setAttribute("data-theme", value), theme);
    await expect(dialog).toHaveCSS("background-color", /rgb/);
    const pageGeometry = await page.evaluate(() => ({
      body: document.body.scrollWidth,
      document: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(pageGeometry.body).toBeLessThanOrEqual(pageGeometry.viewport);
    expect(pageGeometry.document).toBeLessThanOrEqual(pageGeometry.viewport);
  }
});

test("safe batch review previews count, rule and examples", async ({ page }) => {
  await mockShell(page);
  await page.goto("/imports/founder/review");

  await page.getByRole("button", { name: "Advanced Lay" }).click();
  await page.getByLabel("Select Sportsbook Bets row 42 for batch review").check();
  await page.getByRole("button", { name: "Review selected" }).click();

  const confirmation = page.getByRole("alertdialog", { name: "Confirm 1 decisions" });
  await expect(confirmation).toContainText("Advanced lay");
  await expect(confirmation).toContainText("Preserve source realised P&L");
  await expect(confirmation).toContainText("Sportsbook Bets row 42");
  await expect(confirmation).toContainText("does not import or alter workbook rows");
});

test("filter modal and missing-provider actions use canonical dialogs", async ({ page }) => {
  await mockShell(page);
  await page.goto("/imports/founder/review");

  await page.getByRole("button", { name: "Filter import review" }).click();
  const filters = page.getByRole("dialog", { name: "Filter import review" });
  await expect(filters.getByLabel("Source sheet")).toBeVisible();
  await expect(filters.getByLabel("Review state")).toBeVisible();
  await expect(filters.getByLabel("Issue type")).toBeVisible();
  await filters.getByRole("button", { name: "Done" }).click();

  await page.getByRole("button", { name: "Missing Provider" }).click();
  await page.getByRole("button", { name: "Review Accounts row 14" }).click();
  const editor = page.getByRole("dialog", { name: "Review import mapping" });
  await expect(editor.getByRole("option", { name: "Map to existing provider" })).toBeAttached();
  await expect(editor.getByRole("option", { name: "Create catalogue candidate" })).toBeAttached();
  await expect(editor.getByRole("option", { name: "Mark historical / archived" })).toBeAttached();
});
