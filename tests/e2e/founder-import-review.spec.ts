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
    status: "Settled",
    result: "Won",
    bet_type: "Qualifying bet",
    notes: "Legacy branch retained",
  },
};

function workspace() {
  return {
    metadata: {
      source_filename: "founder-snapshot.xlsx",
      effective_at: "2026-08-29T16:05:00+01:00[Europe/London]",
      workbook_checksum: "a".repeat(64),
      mapping_version: "founder-snapshot-v2",
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
    source_summary: {
      accounts: {
        change_reconciliation: {
          default_absent_strategy: "leave_unchanged",
          counts: {
            new_profile_accounts: 119,
            existing_profile_accounts_matched: 0,
            balances_to_update: 0,
            statuses_to_update: 0,
            unchanged_accounts: 0,
            workbook_accounts_not_found_globally: 1,
            profile_accounts_absent_from_workbook: 1,
          },
          entries: [{
            source_row: 2,
            canonical_brand: "Demo Bet",
            account_type: "Bookmaker",
            action: "create",
            changes: [{ field: "current_balance", from: "", to: "25.00" }],
          }],
          existing_absent_from_workbook: [{
            account_id: "account-existing",
            account: "Existing Bet",
            type: "Bookie",
            current_balance: "10.00",
            status: "Active",
            planned_action: "leave_unchanged",
          }],
        },
      },
      ledgers: {
        sportsbook: {
          source_rows: 502,
          accounted_rows: 502,
          open: 15,
          settled: 485,
          future_settling_open: 3,
          open_exposure: "477.05",
        },
        free_bets: {
          source_rows: 165,
          accounted_rows: 165,
          open: 8,
          settled: 157,
          future_settling_open: 0,
          open_exposure: "405.08",
        },
        casino: {
          source_rows: 20,
          accounted_rows: 20,
          open: 0,
          settled: 20,
          future_settling_open: 0,
          open_exposure: "0.00",
        },
        cash_adjustments: {
          source_rows: 23,
          accounted_rows: 23,
          open: 0,
          settled: 23,
          future_settling_open: 0,
          open_exposure: "0.00",
        },
      },
    },
    financial_reconciliation: {
      week: financialReconciliation("2026-08-24", "46.97", "50.79", "-3.82"),
      month: financialReconciliation("2026-08-01", "118.07", "105.14", "12.93"),
      year: financialReconciliation("2026", "1080.18", "1049.71", "39.07"),
    },
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
      pnl_impact_items: [],
      row_count_impact: 0,
      import_ready: false,
      real_import_performed: false,
    },
  };
}

function financialReconciliation(
  periodKey: string,
  total: string,
  realised: string,
  openCurrent: string,
) {
  const ledgerValues = { sportsbook: "0.00", free_bets: "0.00", casino: "0.00" };
  return {
    period_key: periodKey,
    plum_duff_from_mapped_rows: { ...ledgerValues, total },
    workbook_report: { ...ledgerValues, total },
    financial_views: {
      realised_settled_pnl: { ...ledgerValues, total: realised },
      open_current_worst_case_pnl: { ...ledgerValues, total: openCurrent },
      workbook_equivalent_total: total,
    },
    difference: "0.00",
  };
}

async function mockShell(page: Page) {
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        authenticated: true,
        email: "founder@example.invalid",
        expires_at: 2_100_000_000,
        name: "Demo Founder",
        role: "fund_manager",
      },
      status: 200,
    });
  });
  await page.route("**/api/auth/activity", async (route) => {
    await route.fulfill({ status: 204 });
  });
  await page.route("**/profiles/profile-demo/workbook-imports/import-run-demo", async (route) => {
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
  await page.goto("/profiles/profile-demo/imports/import-run-demo/review");

  await expect(page.getByRole("heading", { name: "Import Review" })).toBeVisible();
  await expect(page.getByText(/Financial reconciliation · 710 \/ 710 rows accounted/)).toBeVisible();
  await expect(page.getByText("710 / 710")).toBeVisible();
  await page.getByText(/Financial reconciliation · 710 \/ 710 rows accounted/).click();
  await expect(page.getByText("2026", { exact: true })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Search import exceptions" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Extra Place" })).toBeVisible();
  await expect(page.getByText(/Profile Account changes · 119 new/)).toBeVisible();
  await page.getByText(/Profile Account changes · 119 new/).click();
  await expect(page.getByLabel("Profile Accounts absent from workbook strategy")).toHaveValue("leave_unchanged");
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
  await expect(dialog).toContainText("Unsupported fields: place_terms, bookmaker_places, finishing_position");
  await expect(dialog).toContainText("£4.25");

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
  await page.goto("/profiles/profile-demo/imports/import-run-demo/review");

  await page.getByRole("button", { name: "Advanced Lay" }).click();
  await page.getByLabel("Select Sportsbook Bets row 42 for review action").check();
  await page.getByRole("button", { name: "Review selected" }).click();

  const confirmation = page.getByRole("alertdialog", { name: "Confirm 1 decisions" });
  await expect(confirmation).toContainText("Advanced lay");
  await expect(confirmation).toContainText("Preserve source realised P&L");
  await expect(confirmation).toContainText("Sportsbook Bets row 42");
  await expect(confirmation).toContainText("does not import or alter workbook rows");
});

test("review rows toggle selection without hijacking explicit actions", async ({ page }) => {
  await mockShell(page);
  await page.goto("/profiles/profile-demo/imports/import-run-demo/review");

  const checkbox = page.getByLabel("Select Sportsbook Bets row 42 for review action");
  const row = checkbox.locator("xpath=ancestor::tr");
  await row.getByText("Sportsbook Bets · 42").click();
  await expect(checkbox).toBeChecked();
  await row.press("Space");
  await expect(checkbox).not.toBeChecked();
  await row.getByRole("button", { name: "Review Sportsbook Bets row 42" }).click();
  await expect(page.getByRole("dialog", { name: "Review import mapping" })).toBeVisible();
  await expect(checkbox).not.toBeChecked();
});

test("filter modal and missing-provider actions use canonical dialogs", async ({ page }) => {
  await mockShell(page);
  await page.goto("/profiles/profile-demo/imports/import-run-demo/review");

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

test("persisted analysis progress completes without holding the review page", async ({ page }) => {
  await mockShell(page);
  const analysing = workspace();
  Object.assign(analysing, { run_status: "ANALYSING" });
  analysing.source_summary = {
    ...analysing.source_summary,
    job: {
      stage: "Inspecting workbook and mapping rows",
      percentage: 15,
      rows_analysed: 0,
      total_rows: 710,
      estimated_seconds_remaining: null,
      error: "",
    },
  } as typeof analysing.source_summary;
  let requests = 0;
  await page.route("**/profiles/profile-demo/workbook-imports/import-run-demo", async (route) => {
    requests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(requests < 3 ? analysing : workspace()),
    });
  });

  await page.goto("/profiles/profile-demo/imports/import-run-demo/review");
  await expect(page.getByRole("progressbar", { name: /Inspecting workbook/ })).toHaveAttribute("aria-valuenow", "15");
  await expect(page.getByRole("link", { name: "Save & leave" })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: /Inspecting workbook/ })).toBeHidden({ timeout: 6_000 });
  await expect(page.getByText(/Review decisions remain saved/)).toBeVisible();
});

test("persisted import execution resumes through the authenticated shell monitor", async ({
  page,
}) => {
  await mockShell(page);
  const execution = {
    import_run_id: "import-run-demo",
    status: "RUNNING",
    stage: "SPORTSBOOK",
    completed_units: 125,
    total_units: 835,
    percentage: 15,
  };
  const importing = {
    ...workspace(),
    run_status: "IMPORTING",
    execution,
  };
  let advanced = false;
  await page.route("**/profiles/profile-demo/workbook-imports/import-run-demo", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(importing) });
  });
  await page.route("**/fund-manager/import-executions", async (route) => {
    await route.fulfill({ json: advanced ? [] : [execution] });
  });
  await page.route("**/fund-manager/import-executions/import-run-demo/advance", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    advanced = true;
    await route.fulfill({ json: { ...execution, stage: "FREE_BETS", percentage: 76 } });
  });

  await page.goto("/profiles/profile-demo/imports/import-run-demo/review");
  const progress = page.locator('[data-pd-id="profile-import.execution-progress"]');
  await expect(progress).toContainText("Sportsbook");
  await expect.poll(() => advanced).toBe(true);
});

test("decision impact is explicit and selected reset restores the original review state", async ({ page }) => {
  await mockShell(page);
  const reviewed = workspace();
  reviewed.items[0].review_status = "EXCLUDED";
  reviewed.items[0].decision = {
    action: "exclude",
    status: "EXCLUDED",
    note: "Not part of the target Profile",
    target_type: reviewed.items[0].proposed_target,
    catalogue_id: "",
    actor: "founder@example.invalid",
    updated_at: "2026-08-30T10:00:00Z",
  };
  reviewed.reconciliation.valid_decision_count = 1;
  reviewed.reconciliation.resolved_partial_count = 1;
  reviewed.reconciliation.remaining_partial_count = 113;
  reviewed.reconciliation.pnl_impact = "4.25";
  reviewed.reconciliation.pnl_impact_items = [{
    item_id: reviewed.items[0].item_id,
    import_id: reviewed.items[0].import_id,
    source_sheet: reviewed.items[0].source_sheet,
    source_row: reviewed.items[0].source_row,
    action: "exclude",
    value: "4.25",
  }];
  await page.route("**/profiles/profile-demo/workbook-imports/import-run-demo", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(reviewed) });
  });
  await page.route("**/profiles/profile-demo/workbook-imports/import-run-demo/decisions/reset", async (route) => {
    const reset = workspace();
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(reset) });
  });

  await page.goto("/profiles/profile-demo/imports/import-run-demo/review");
  await expect(page.getByText("1 review decisions change imported P&L")).toBeVisible();
  await expect(page.getByText("Sportsbook Bets row 42 · exclude")).toBeVisible();
  await page.getByLabel("Select Sportsbook Bets row 42 for review action").check();
  await page.getByRole("button", { name: "Reset selected" }).click();
  const confirmation = page.getByRole("dialog", { name: "Reset review decisions?" });
  await expect(confirmation).toContainText("source workbook or imported Profile data");
  await confirmation.getByRole("button", { name: "Reset selected" }).click();
  await expect(page.getByText("£0.00 change to imported P&L")).toBeVisible();
});

test("completed import exposes the persisted reconciliation and rollback gate", async ({ page }) => {
  await mockShell(page);
  const completed = {
    ...workspace(),
    run_status: "COMPLETE",
    rollback_status: "AVAILABLE",
    import_result: {
      status: "COMPLETE",
      rollback_available: true,
      post_import_reconciliation: {
        profile: {
          profile_id: "profile-demo",
          profile_name: "Demo Profile",
          import_run_id: "import-run-demo",
          workbook_filename: "founder-snapshot.xlsx",
          checksum: "a".repeat(64),
          effective_timestamp: "2026-08-29T16:05:00+01:00",
          mapping_version: "founder-snapshot-v2",
          import_timestamp: "2026-08-30T12:00:00Z",
        },
        accounts: {
          total_profile_accounts: { expected: 119, actual: 119, difference: 0 },
        },
        ledgers: {
          sportsbook: {
            expected_imported_rows: 479,
            actual_persisted_rows: 479,
            difference: 0,
            open_rows: 15,
            settled_rows: 464,
            excluded_non_transactional_rows: 5,
            duplicate_count: 0,
            missing_count: 0,
          },
        },
        financial_reconciliation: {
          periods: {
            week: { workbook_dry_run: "61.54", post_import: "61.54", difference: "0.00" },
            month: { workbook_dry_run: "131.63", post_import: "131.63", difference: "0.00" },
            year: { workbook_dry_run: "1093.74", post_import: "1093.74", difference: "0.00" },
          },
          views: {
            settled_realised_pnl: { expected: "1054.67", actual: "1054.67", difference: "0.00" },
            open_current_worst_case_pnl: { expected: "39.07", actual: "39.07", difference: "0.00" },
            review_decision_pnl_impact: "0.00",
          },
        },
        open_positions: {
          future_settling_open: { expected: 4, actual: 4, difference: 0 },
          no_open_row_silently_removed: true,
          no_open_row_accidentally_settled: true,
        },
        review_decisions: { applied: 39, exclusions: 0 },
        integrity: {
          deterministic_import_ids: true,
          duplicate_protection: true,
          all_expected_source_rows_accounted_for: true,
          silent_partial_writes: false,
          import_run_traceability: true,
        },
        mismatches: [],
        rollback_available: true,
        result: "POST-IMPORT RECONCILIATION: PASSED",
        handoff: {
          workbook: { checksum: "a".repeat(64) },
          profile: { import_run_id: "import-run-demo" },
          status: "POST-IMPORT RECONCILIATION: PASSED",
        },
      },
    },
  };
  await page.route("**/profiles/profile-demo/workbook-imports/import-run-demo", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(completed) });
  });

  await page.goto("/profiles/profile-demo/imports/import-run-demo/review");
  await expect(page.getByRole("heading", { name: "Post-Import Reconciliation" })).toBeVisible();
  await expect(page.getByText("POST-IMPORT RECONCILIATION: PASSED")).toBeVisible();
  await expect(page.getByRole("button", { name: "Download reconciliation" })).toBeVisible();
  await page.getByText("Open positions").click();
  await expect(page.getByText("future settling open")).toBeVisible();
  await page.getByRole("button", { name: "Roll back import" }).click();
  await expect(page.getByRole("dialog", { name: "Roll back this import?" })).toContainText(
    "import-run-demo",
  );
});

test("failed import preserves the approved run and exposes a validated retry path", async ({ page }) => {
  await mockShell(page);
  const failed = {
    ...workspace(),
    run_status: "IMPORT_FAILED",
    approved_at: "2026-08-31T12:00:00Z",
    import_safety: {
      checkpoint_available: true,
      profile_matches_checkpoint: true,
      committed_write_audit_rows: 0,
      no_partial_profile_changes: true,
      retry_available: true,
    },
    import_result: {
      status: "IMPORT_FAILED",
      message: "Import could not be completed",
      safe_state: "No Profile changes were committed",
      retry_available: true,
      latest_attempt: {
        stage: "Profile Accounts",
        category: "account_create",
        import_id: "accounts:2",
      },
    },
  };
  await page.route("**/profiles/profile-demo/workbook-imports/import-run-demo", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(failed) });
  });

  await page.goto("/profiles/profile-demo/imports/import-run-demo/review");
  const failure = page.getByRole("alert", { name: "Import could not be completed" });
  await expect(failure).toContainText("No Profile changes were committed");
  await expect(failure).toContainText("pre-import Profile checkpoint still matches");
  await expect(failure.getByRole("button", { name: "Validate retry" })).toBeEnabled();
  await failure.getByText("Technical/audit details").click();
  await expect(failure).toContainText("Stage: Profile Accounts");
  await expect(failure).toContainText("Import ID: accounts:2");
  await expect(failure).toContainText("Committed write audit rows: 0");
});

test("passed retry preflight clears stale failure state and guards real import confirmation", async ({ page }) => {
  await mockShell(page);
  const failed = {
    ...workspace(),
    run_status: "IMPORT_FAILED",
    approved_at: "2026-08-31T12:00:00Z",
    import_safety: {
      checkpoint_available: true,
      profile_matches_checkpoint: true,
      committed_write_audit_rows: 0,
      no_partial_profile_changes: true,
      retry_available: true,
    },
    import_result: {
      status: "IMPORT_FAILED",
      message: "Import could not be completed",
      safe_state: "No Profile changes were committed",
      retry_available: true,
      latest_attempt: { stage: "Profile Accounts", category: "account_create" },
    },
    final_import_summary: {
      ready: false,
      blockers: ["Validate the approved write plan against the current persistence schema"],
      profile: { profile_id: "profile-demo", profile_name: "Demo Profile" },
      profile_settings: [{ field: "display_name", value: "Demo", target: "profile.display_name" }],
      provider_resolutions: [],
      historical_ep_resolutions: [],
      accounts: { total_source: 120, create: 116, update: 4 },
      ledgers: {},
      extra_places: {},
      financial: {
        open_current_pnl: "0.00",
        settled_pnl: "0.00",
        open_exposure: "0.00",
        review_pnl_impact: "0.00",
        periods: {},
      },
      rollback: { application_checkpoint: true, neon_platform_restore: "manual_plan_dependent_backstop" },
    },
  };
  const passed = {
    ...failed,
    run_status: "READY_APPROVED",
    rollback_status: "COMPLETE",
    rolled_back_at: "2026-08-31T19:54:05Z",
    import_result: {
      ...failed.import_result,
      status: "POST_IMPORT_RECONCILIATION_FAILED",
      post_import_reconciliation: {
        profile: {
          profile_id: "profile-demo",
          profile_name: "Demo Profile",
          import_run_id: "import-run-demo",
          workbook_filename: "founder-snapshot.xlsx",
          checksum: "a".repeat(64),
        },
        accounts: {},
        ledgers: {},
        financial_reconciliation: { periods: {}, views: {} },
        open_positions: {},
        review_decisions: {},
        integrity: {},
        mismatches: [{ category: "historical_attempt" }],
        rollback_available: false,
        result: "POST-IMPORT RECONCILIATION: FAILED",
        handoff: {},
      },
    },
    persistence_preflight: {
      status: "PASSED",
      workbook_checksum: "a".repeat(64),
      mapping_version: "founder-snapshot-v2",
      transaction_constructed: true,
      writes_committed: false,
    },
    final_import_summary: {
      ...failed.final_import_summary,
      ready: true,
      blockers: [],
      profile_settings: Array.from({ length: 4 }, (_, index) => ({
        field: `setting_${index + 1}`,
        value: "Demo",
        target: `profile.setting_${index + 1}`,
      })),
      accounts: { total_source: 120, create: 116, update: 4 },
      ledgers: {
        cash_adjustments: { source_rows: 23, transactional_rows: 23 },
        casino: { source_rows: 20, transactional_rows: 20 },
        free_bets: { source_rows: 166, transactional_rows: 166 },
        extra_places: { source_rows: 2, transactional_rows: 2 },
        sportsbook: { source_rows: 503, transactional_rows: 503 },
      },
    },
  };
  let current: Record<string, unknown> = failed;
  await page.route("**/profiles/profile-demo/workbook-imports/import-run-demo", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(current) });
  });
  await page.route("**/profiles/profile-demo/workbook-imports/import-run-demo/preflight", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    current = passed;
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(passed.persistence_preflight) });
  });

  await page.goto("/profiles/profile-demo/imports/import-run-demo/review");
  await page.getByRole("button", { name: "Validate retry" }).click();
  await expect(page.getByText("Validating import plan…")).toBeVisible();
  await expect(page.locator('[data-pd-id="profile-import.preflight-passed"]')).toContainText("Validation passed");
  await expect(page.getByRole("alert", { name: "Import could not be completed" })).toHaveCount(0);
  const currentState = page.locator('[data-pd-id="profile-import.current-state"]');
  await expect(currentState).toContainText("Restored and ready to retry");
  await expect(currentState).toContainText("READY_APPROVED");
  await expect(currentState).toContainText("Rollback complete");
  await expect(page.getByRole("heading", { name: "Previous post-import reconciliation" })).toBeVisible();
  await expect(page.getByText("Historical failed attempt.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry import" })).toBeEnabled();
  await page.getByRole("button", { name: "Retry import" }).click();
  await expect(page.getByRole("dialog", { name: "Import approved workbook?" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Import approved workbook?" })).toContainText("120 source Accounts");
  await expect(page.getByRole("dialog", { name: "Import approved workbook?" }).getByRole("button", { name: "Retry import" })).toBeEnabled();
});
