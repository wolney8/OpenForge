import { expect, test } from "@playwright/test";

const profileId = "profile-demo-001";
const batchId = "IMPORT-PLAYWRIGHT";

function batch(status = "dry_run_ready") {
  return {
    import_batch_id: batchId,
    profile_id: profileId,
    source_filename: "synthetic-sportsbook.xlsx",
    source_type: "xlsx",
    mapping_version: "sportsbook-v1",
    status,
    row_count: 2,
    error_count: 0,
    warning_count: 0,
    summary: { insert: 1, no_op: 1 },
    row_accounting: {
      source_row_count: 2,
      accounted_row_count: 2,
      state: "complete",
      message: "All 2 source rows are represented in this review.",
    },
    financial_reconciliation: {
      ledger: "Sportsbook Bets",
      state: "matched",
      source_total: "-1.16",
      recomputed_total: "-1.16",
      difference: "0.00",
      compared_row_count: 2,
      source_row_count: 2,
      tolerance: "0.01",
      message: "Workbook and Plum Duff cash-first Sportsbook totals match.",
    },
    backup_snapshot_id: status === "confirmed" ? "BACKUP-PLAYWRIGHT" : "",
    started_at: "2026-07-15T10:00:00Z",
    completed_at: "2026-07-15T10:00:00Z",
    rows: [
      {
        import_staged_row_id: "STAGED-PLAYWRIGHT",
        source_sheet: "Sportsbook Bets",
        source_record_id: "DEMO-QB-PW-001",
        source_row: 2,
        source_hash: "synthetic-hash",
        staged_action: "insert",
        errors: [],
        warnings: [],
        fields: {
          EventName: "Synthetic Team A v Synthetic Team B",
          Bookmaker: "Bookmaker A",
          Offer: "Synthetic offer",
          Status: "Placed",
        },
        mapped_fields: {
          event_name: "Synthetic Team A v Synthetic Team B",
          bookmaker: "Bookmaker A",
          offer_text: "Synthetic offer",
          status: "Placed",
        },
      },
      {
        import_staged_row_id: "STAGED-UNCHANGED",
        source_sheet: "Sportsbook Bets",
        source_record_id: "DEMO-QB-PW-UNCHANGED",
        source_row: 3,
        source_hash: "synthetic-unchanged-hash",
        staged_action: "no_op",
        errors: [],
        warnings: [],
        fields: {
          EventName: "Previously imported event",
          Bookmaker: "Bookmaker B",
          Offer: "Existing synthetic offer",
          Status: "Placed",
        },
        mapped_fields: {},
      },
    ],
  };
}

function freeBetBatch(status = "dry_run_ready") {
  const record = batch(status);
  return {
    ...record,
    source_filename: "synthetic-free-bets.xlsx",
    mapping_version: "free-bets-v1",
    financial_reconciliation: {
      ledger: "Free Bets",
      state: "matched",
      source_total: "7.57",
      recomputed_total: "7.57",
      difference: "0.00",
      compared_row_count: 2,
      source_row_count: 2,
      tolerance: "0.01",
      message: "Workbook and Plum Duff cash-first Free Bet totals match.",
    },
    rows: record.rows.map((row, index) => ({
      ...row,
      source_sheet: "Free Bets",
      source_record_id: index ? "DEMO-FB-PW-UNCHANGED" : "DEMO-FB-PW-001",
      fields: {
        ...row.fields,
        ExpiryDateTime: "2026-07-20T23:59:00",
        FreeBetRetentionMode: "SNR",
        FreeBetValue: "5.00",
      },
    })),
  };
}

function casinoOfferBatch(status = "dry_run_ready") {
  const record = batch(status);
  return {
    ...record,
    source_filename: "synthetic-casino-offers.xlsx",
    mapping_version: "casino-offers-v1",
    financial_reconciliation: {
      ledger: "Casino Offers",
      state: "matched",
      source_total: "-2.50",
      recomputed_total: "-2.50",
      difference: "0.00",
      compared_row_count: 2,
      source_row_count: 2,
      tolerance: "0.01",
      message: "Workbook and Plum Duff resolved casino totals match.",
    },
    rows: record.rows.map((row, index) => ({
      ...row,
      source_sheet: "Casino Offers",
      source_record_id: index ? "DEMO-CO-PW-UNCHANGED" : "DEMO-CO-PW-001",
      fields: {
        Bookmaker: index ? "Bookmaker B" : "Bookmaker A",
        OfferName: index ? "Existing casino offer" : "Synthetic casino wager",
        Game: "Demo Slots",
        Status: "In Progress",
      },
    })),
  };
}

function cashAdjustmentBatch(status = "dry_run_ready") {
  const record = batch(status);
  return {
    ...record,
    source_filename: "synthetic-cash-adjustments.xlsx",
    mapping_version: "cash-adjustments-v1",
    financial_reconciliation: {
      ledger: "Cash Adjustments",
      state: "matched",
      source_total: "30.00",
      recomputed_total: "30.00",
      difference: "0.00",
      compared_row_count: 2,
      source_row_count: 2,
      tolerance: "0.01",
      message: "Workbook and Plum Duff signed cash-adjustment totals match.",
    },
    rows: record.rows.map((row, index) => ({
      ...row,
      source_sheet: "Cash Adjustments",
      source_record_id: index ? "DEMO-CA-PW-UNCHANGED" : "DEMO-CA-PW-001",
      fields: {
        AdjustmentDate: "2026-07-06",
        AdjustmentType: index ? "Withdrawal" : "TopUp",
        Direction: index ? "Out" : "In",
        Amount: index ? "20.00" : "50.00",
        LinkedAccount: "Bank A",
        Description: index ? "Existing synthetic withdrawal" : "Synthetic top-up",
      },
    })),
  };
}

function accountBatch(status = "dry_run_ready") {
  const record = batch(status);
  return {
    ...record,
    source_filename: "synthetic-accounts.xlsx",
    mapping_version: "accounts-v1",
    financial_reconciliation: {
      ledger: "",
      state: "not_available",
      source_total: null,
      recomputed_total: null,
      difference: null,
      compared_row_count: 0,
      source_row_count: 2,
      tolerance: "0.01",
      message: "Financial reconciliation is not available for this import mapping.",
    },
    rows: record.rows.map((row, index) => ({
      ...row,
      source_sheet: "Accounts",
      source_record_id: index ? "DEMO-ACCOUNT-PW-UNCHANGED" : "DEMO-ACCOUNT-PW-001",
      fields: {
        Account: index ? "Smarkets" : "Bet365",
        Type: index ? "Exchange" : "Bookie",
        Status: "Active",
        CurrentBalance: index ? "80.00" : "125.40",
        PendingWithdrawalAmount: index ? "" : "10.00",
        Group: index ? "" : "Bet365 Group",
        Platform: index ? "" : "Proprietary",
      },
    })),
  };
}

function accountUpdateBatch(status = "dry_run_ready") {
  const record = accountBatch(status);
  return {
    ...record,
    summary: status === "confirmed" ? { imported: 1 } : { update: 1 },
    row_count: 1,
    row_accounting: {
      source_row_count: 1,
      accounted_row_count: 1,
      state: "complete",
      message: "All 1 source row is represented in this review.",
    },
    warning_count: 1,
    rows: [
      {
        ...record.rows[0],
        staged_action: status === "confirmed" ? "imported" : "update",
        warnings: status === "confirmed" ? [] : [{
          code: "explicit_update_approval_required",
          message: "This changed Account row requires individual approval.",
        }],
        fields: {
          ...record.rows[0].fields,
          Status: "Limited",
          CurrentBalance: "130.55",
          PendingWithdrawalAmount: "",
        },
        existing_mapped_fields: {
          account: "Bet365",
          status: "Active",
          current_balance: "125.40",
          pending_withdrawal_amount: "10.00",
        },
        field_diffs: {
          status: { before: "Active", after: "Limited" },
          current_balance: { before: "125.40", after: "130.55" },
          pending_withdrawal_amount: { before: "10.00", after: "" },
        },
      },
    ],
  };
}

test("profile settings reviews and explicitly confirms a sportsbook XLSX import", async ({
  page,
}) => {
  let batchStatus = "dry_run_ready";
  await page.route(`http://127.0.0.1:8010/profiles/${profileId}/imports**`, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "POST" && path.endsWith("/xlsx/dry-run")) {
      expect(request.postDataJSON()).toMatchObject({ ledger: "sportsbook" });
      await route.fulfill({ body: JSON.stringify(batch()), contentType: "application/json", status: 201 });
      return;
    }
    if (request.method() === "POST" && path.endsWith("/confirm-sportsbook")) {
      expect(request.postDataJSON()).toEqual({
        confirmed: true,
        selected_staged_row_ids: ["STAGED-PLAYWRIGHT"],
      });
      batchStatus = "confirmed";
      await route.fulfill({
        body: JSON.stringify({
          import_batch_id: batchId,
          profile_id: profileId,
          status: "confirmed",
          backup_snapshot_id: "BACKUP-PLAYWRIGHT",
          backup_storage_path: "private-backup-path",
          backup_checksum_sha256: "abc123",
          imported_sportsbook_bet_ids: ["SB-PLAYWRIGHT"],
          imported_free_bet_ids: [],
        }),
        contentType: "application/json",
        status: 200,
      });
      return;
    }
    if (request.method() === "GET" && path.endsWith(`/${batchId}`)) {
      await route.fulfill({
        body: JSON.stringify(batch(batchStatus)),
        contentType: "application/json",
        status: 200,
      });
      return;
    }
    await route.fulfill({
      body: JSON.stringify(batchStatus === "confirmed" ? [batch("confirmed")] : []),
      contentType: "application/json",
      status: 200,
    });
  });

  await page.goto(`/profiles/${profileId}/tracker/settings`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole("heading", { name: "Spreadsheet transfer" })).toBeVisible();
  await expect(page.getByText("Import XLSX", { exact: true })).toBeVisible();
  await expect(page.getByText("Export XLSX", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Export Sportsbook Bets XLSX" })).toHaveAttribute(
    "href",
    `http://127.0.0.1:8010/profiles/${profileId}/imports/sportsbook/export.xlsx`,
  );

  const fileInput = page.locator('[data-pd-id="spreadsheet-transfer.import-file"]');
  await fileInput.setInputFiles({
    buffer: Buffer.from("synthetic intercepted XLSX"),
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    name: "synthetic-sportsbook.xlsx",
  });

  const dialog = page.getByRole("dialog", { name: "Spreadsheet import review" });
  await expect(dialog).toBeVisible();
  await expect(page.locator('[data-pd-id="import-review.dialog"]')).toBeVisible();
  await expect(page.locator("body > .modal-backdrop-elevated")).toBeVisible();
  await expect(page.locator('[data-pd-id="import-review.close"]')).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  const dialogBounds = await dialog.boundingBox();
  expect(dialogBounds).not.toBeNull();
  expect(dialogBounds!.x).toBeGreaterThanOrEqual(0);
  expect(dialogBounds!.x + dialogBounds!.width).toBeLessThanOrEqual(1280);
  const tableScroll = page.locator('[data-pd-id="import-review.table-scroll"]');
  await expect.poll(() => tableScroll.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }))).toMatchObject({ clientWidth: expect.any(Number), scrollWidth: expect.any(Number) });
  const tableDimensions = await tableScroll.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(tableDimensions.scrollWidth).toBeLessThanOrEqual(tableDimensions.clientWidth + 1);
  await expect(dialog.getByRole("region", { name: "Import summary" })).toBeVisible();
  await expect(dialog).toContainText(profileId);
  await expect(dialog).toContainText("DEMO-QB-PW-001");
  await expect(dialog).toContainText("New row");
  await expect(dialog).toContainText("Already imported");
  await expect(dialog.locator('[data-pd-id="import-review.financial-reconciliation"]')).toContainText("Matched");
  await expect(dialog.locator('[data-pd-id="import-review.financial-reconciliation"]')).toContainText("Workbook -£1.16 • Plum Duff -£1.16");
  await expect(dialog.getByLabel("Import source row 3")).toBeDisabled();
  await expect(dialog.getByLabel("Import review ledger")).toHaveCount(0);
  const reviewSearch = dialog.getByRole("searchbox", { name: "Search import review rows" });
  await reviewSearch.fill("DEMO-QB-PW");
  await expect(dialog).toContainText("Synthetic Team A v Synthetic Team B");
  const confirmButton = dialog.getByRole("button", { name: "Create backup and import selected" });
  await expect(dialog.getByRole("button", { name: "Delete review" })).toBeVisible();
  await expect(confirmButton).toHaveAttribute("data-pd-id", "import-review.import-selected-button");
  await expect(confirmButton).toBeVisible();
  await expect(confirmButton).toBeDisabled();

  const newRowCheckbox = dialog.getByLabel("Import source row 2");
  await newRowCheckbox.uncheck();
  await expect(confirmButton).toBeDisabled();
  await expect(dialog.getByText("No new rows are selected")).toBeVisible();
  await expect(dialog.locator("#import-review-action-reason")).toContainText(
    "Select at least one compatible new or changed row",
  );
  await newRowCheckbox.check();

  await dialog.getByRole("checkbox", { name: /I confirm the 1 selected rows/ }).check();
  await expect(confirmButton).toBeEnabled();
  await confirmButton.click();

  await expect(dialog).toContainText("Verified backup: BACKUP-PLAYWRIGHT");
  await expect(dialog).toContainText("Imported review retained for audit.");
  await expect(dialog.getByRole("button", { name: "Delete review" })).toBeDisabled();
  await expect(page.locator(".status-toast")).toContainText(
    "1 selected sportsbook rows were added after a verified local backup",
  );
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(fileInput).toBeFocused();
});

test("workbook detection corrects a mismatched spreadsheet selection", async ({ page }) => {
  await page.route(`http://127.0.0.1:8010/profiles/${profileId}/imports**`, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "POST" && path.endsWith("/xlsx/dry-run")) {
      expect(request.postDataJSON()).toMatchObject({ ledger: "free-bets" });
      await route.fulfill({ body: JSON.stringify(batch()), contentType: "application/json", status: 201 });
      return;
    }
    await route.fulfill({ body: "[]", contentType: "application/json", status: 200 });
  });

  await page.goto(`/profiles/${profileId}/tracker/settings`);
  const ledger = page.getByLabel("Spreadsheet transfer ledger");
  await ledger.selectOption("free-bets");
  await page.locator('[data-pd-id="spreadsheet-transfer.import-file"]').setInputFiles({
    buffer: Buffer.from("synthetic sportsbook XLSX"),
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    name: "synthetic-sportsbook.xlsx",
  });

  await expect(page.getByRole("heading", { name: "Sportsbook Bets import review" })).toBeVisible();
  await expect(ledger).toHaveValue("sportsbook");
  await expect(page.locator(".status-toast")).toContainText(
    "Sportsbook Bets workbook detected. Spreadsheet type changed from Free Bets.",
  );
});

test("free-bet spreadsheet selection uses the free-bet review and confirmation path", async ({
  page,
}) => {
  let batchStatus = "dry_run_ready";
  await page.route(`http://127.0.0.1:8010/profiles/${profileId}/imports**`, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "POST" && path.endsWith("/xlsx/dry-run")) {
      expect(request.postDataJSON()).toMatchObject({ ledger: "free-bets" });
      await route.fulfill({ body: JSON.stringify(freeBetBatch()), contentType: "application/json", status: 201 });
      return;
    }
    if (request.method() === "POST" && path.endsWith("/confirm-free-bets")) {
      batchStatus = "confirmed";
      await route.fulfill({
        body: JSON.stringify({
          import_batch_id: batchId,
          profile_id: profileId,
          status: "confirmed",
          backup_snapshot_id: "BACKUP-FREE-BET",
          backup_storage_path: "private-backup-path",
          backup_checksum_sha256: "freebet123",
          imported_sportsbook_bet_ids: [],
          imported_free_bet_ids: ["FB-PLAYWRIGHT"],
        }),
        contentType: "application/json",
        status: 200,
      });
      return;
    }
    if (request.method() === "GET" && path.endsWith(`/${batchId}`)) {
      await route.fulfill({
        body: JSON.stringify(freeBetBatch(batchStatus)),
        contentType: "application/json",
        status: 200,
      });
      return;
    }
    await route.fulfill({ body: "[]", contentType: "application/json", status: 200 });
  });

  await page.goto(`/profiles/${profileId}/tracker/settings`);
  const ledger = page.getByLabel("Spreadsheet transfer ledger");
  await ledger.selectOption("free-bets");
  await expect(page.getByRole("link", { name: "Export Free Bets XLSX" })).toHaveAttribute(
    "href",
    `http://127.0.0.1:8010/profiles/${profileId}/imports/free-bets/export.xlsx`,
  );

  await page.locator('[data-pd-id="spreadsheet-transfer.import-file"]').setInputFiles({
    buffer: Buffer.from("synthetic intercepted free-bet XLSX"),
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    name: "synthetic-free-bets.xlsx",
  });

  const dialog = page.getByRole("dialog", { name: "Spreadsheet import review" });
  await expect(dialog.getByRole("heading", { name: "Free Bets import review" })).toBeVisible();
  await expect(dialog.locator('[data-pd-id="import-review.financial-reconciliation"]')).toContainText("Matched");
  await expect(dialog.locator('[data-pd-id="import-review.financial-reconciliation"]')).toContainText("Workbook £7.57 • Plum Duff £7.57");
  await dialog.getByRole("checkbox", { name: /I confirm the 1 selected rows/ }).check();
  await dialog.getByRole("button", { name: "Create backup and import selected" }).click();
  await expect(page.locator(".status-toast")).toContainText(
    "1 selected free-bet rows were added after a verified local backup",
  );
});

test("casino-offer spreadsheet selection uses the casino review and confirmation path", async ({
  page,
}) => {
  let batchStatus = "dry_run_ready";
  await page.route(`http://127.0.0.1:8010/profiles/${profileId}/imports**`, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "POST" && path.endsWith("/xlsx/dry-run")) {
      expect(request.postDataJSON()).toMatchObject({ ledger: "casino-offers" });
      await route.fulfill({ body: JSON.stringify(casinoOfferBatch()), contentType: "application/json", status: 201 });
      return;
    }
    if (request.method() === "POST" && path.endsWith("/confirm-casino-offers")) {
      batchStatus = "confirmed";
      await route.fulfill({
        body: JSON.stringify({
          import_batch_id: batchId,
          profile_id: profileId,
          status: "confirmed",
          backup_snapshot_id: "BACKUP-CASINO",
          backup_storage_path: "private-backup-path",
          backup_checksum_sha256: "casino123",
          imported_sportsbook_bet_ids: [],
          imported_free_bet_ids: [],
          imported_casino_offer_ids: ["CO-PLAYWRIGHT"],
        }),
        contentType: "application/json",
        status: 200,
      });
      return;
    }
    if (request.method() === "GET" && path.endsWith(`/${batchId}`)) {
      await route.fulfill({
        body: JSON.stringify(casinoOfferBatch(batchStatus)),
        contentType: "application/json",
        status: 200,
      });
      return;
    }
    await route.fulfill({ body: "[]", contentType: "application/json", status: 200 });
  });

  await page.goto(`/profiles/${profileId}/tracker/settings`);
  await page.getByLabel("Spreadsheet transfer ledger").selectOption("casino-offers");
  await expect(page.getByRole("link", { name: "Export Casino Offers XLSX" })).toHaveAttribute(
    "href",
    `http://127.0.0.1:8010/profiles/${profileId}/imports/casino-offers/export.xlsx`,
  );
  await page.locator('[data-pd-id="spreadsheet-transfer.import-file"]').setInputFiles({
    buffer: Buffer.from("synthetic intercepted casino XLSX"),
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    name: "synthetic-casino-offers.xlsx",
  });

  const dialog = page.getByRole("dialog", { name: "Spreadsheet import review" });
  await expect(dialog.getByRole("heading", { name: "Casino Offers import review" })).toBeVisible();
  await expect(dialog).toContainText("Synthetic casino wager");
  await expect(dialog.locator('[data-pd-id="import-review.financial-reconciliation"]')).toContainText("Matched");
  await expect(dialog.locator('[data-pd-id="import-review.financial-reconciliation"]')).toContainText("Workbook -£2.50 • Plum Duff -£2.50");
  await dialog.getByRole("checkbox", { name: /I confirm the 1 selected rows/ }).check();
  await dialog.getByRole("button", { name: "Create backup and import selected" }).click();
  await expect(page.locator(".status-toast")).toContainText(
    "1 selected casino-offer rows were added after a verified local backup",
  );
});

test("cash-adjustment spreadsheet selection uses the cash review and confirmation path", async ({
  page,
}) => {
  let batchStatus = "dry_run_ready";
  await page.route(`http://127.0.0.1:8010/profiles/${profileId}/imports**`, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "POST" && path.endsWith("/xlsx/dry-run")) {
      expect(request.postDataJSON()).toMatchObject({ ledger: "cash-adjustments" });
      await route.fulfill({ body: JSON.stringify(cashAdjustmentBatch()), contentType: "application/json", status: 201 });
      return;
    }
    if (request.method() === "POST" && path.endsWith("/confirm-cash-adjustments")) {
      batchStatus = "confirmed";
      await route.fulfill({
        body: JSON.stringify({
          import_batch_id: batchId,
          profile_id: profileId,
          status: "confirmed",
          backup_snapshot_id: "BACKUP-CASH",
          backup_storage_path: "private-backup-path",
          backup_checksum_sha256: "cash123",
          imported_sportsbook_bet_ids: [],
          imported_free_bet_ids: [],
          imported_casino_offer_ids: [],
          imported_cash_adjustment_ids: ["CA-PLAYWRIGHT"],
        }),
        contentType: "application/json",
        status: 200,
      });
      return;
    }
    if (request.method() === "GET" && path.endsWith(`/${batchId}`)) {
      await route.fulfill({
        body: JSON.stringify(cashAdjustmentBatch(batchStatus)),
        contentType: "application/json",
        status: 200,
      });
      return;
    }
    await route.fulfill({ body: "[]", contentType: "application/json", status: 200 });
  });

  await page.goto(`/profiles/${profileId}/tracker/settings`);
  await page.getByLabel("Spreadsheet transfer ledger").selectOption("cash-adjustments");
  await expect(page.getByRole("link", { name: "Export Cash Adjustments XLSX" })).toHaveAttribute(
    "href",
    `http://127.0.0.1:8010/profiles/${profileId}/imports/cash-adjustments/export.xlsx`,
  );
  await page.locator('[data-pd-id="spreadsheet-transfer.import-file"]').setInputFiles({
    buffer: Buffer.from("synthetic intercepted cash-adjustment XLSX"),
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    name: "synthetic-cash-adjustments.xlsx",
  });

  const dialog = page.getByRole("dialog", { name: "Spreadsheet import review" });
  await expect(dialog.getByRole("heading", { name: "Cash Adjustments import review" })).toBeVisible();
  await expect(dialog).toContainText("Synthetic top-up");
  await expect(dialog).toContainText("Bank A");
  await expect(dialog.locator('[data-pd-id="import-review.financial-reconciliation"]')).toContainText("Matched");
  await expect(dialog.locator('[data-pd-id="import-review.financial-reconciliation"]')).toContainText("Workbook £30.00 • Plum Duff £30.00");
  await dialog.getByRole("checkbox", { name: /I confirm the 1 selected rows/ }).check();
  await dialog.getByRole("button", { name: "Create backup and import selected" }).click();
  await expect(page.locator(".status-toast")).toContainText(
    "1 selected cash-adjustment rows were added after a verified local backup",
  );
});

test("account spreadsheet selection uses the account review and confirmation path", async ({
  page,
}) => {
  let batchStatus = "dry_run_ready";
  await page.route(`http://127.0.0.1:8010/profiles/${profileId}/imports**`, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "POST" && path.endsWith("/xlsx/dry-run")) {
      expect(request.postDataJSON()).toMatchObject({ ledger: "accounts" });
      await route.fulfill({ body: JSON.stringify(accountBatch()), contentType: "application/json", status: 201 });
      return;
    }
    if (request.method() === "POST" && path.endsWith("/confirm-accounts")) {
      batchStatus = "confirmed";
      await route.fulfill({
        body: JSON.stringify({
          import_batch_id: batchId,
          profile_id: profileId,
          status: "confirmed",
          backup_snapshot_id: "BACKUP-ACCOUNT",
          backup_storage_path: "private-backup-path",
          backup_checksum_sha256: "account123",
          imported_sportsbook_bet_ids: [],
          imported_free_bet_ids: [],
          imported_casino_offer_ids: [],
          imported_cash_adjustment_ids: [],
          imported_account_ids: ["AC-PLAYWRIGHT"],
        }),
        contentType: "application/json",
        status: 200,
      });
      return;
    }
    if (request.method() === "GET" && path.endsWith(`/${batchId}`)) {
      await route.fulfill({
        body: JSON.stringify(accountBatch(batchStatus)),
        contentType: "application/json",
        status: 200,
      });
      return;
    }
    await route.fulfill({ body: "[]", contentType: "application/json", status: 200 });
  });

  await page.goto(`/profiles/${profileId}/tracker/settings`);
  await page.getByLabel("Spreadsheet transfer ledger").selectOption("accounts");
  await expect(page.getByRole("link", { name: "Export Accounts XLSX" })).toHaveAttribute(
    "href",
    `http://127.0.0.1:8010/profiles/${profileId}/imports/accounts/export.xlsx`,
  );
  await page.locator('[data-pd-id="spreadsheet-transfer.import-file"]').setInputFiles({
    buffer: Buffer.from("synthetic intercepted accounts XLSX"),
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    name: "synthetic-accounts.xlsx",
  });

  const dialog = page.getByRole("dialog", { name: "Spreadsheet import review" });
  await expect(dialog.getByRole("heading", { name: "Accounts import review" })).toBeVisible();
  await expect(dialog.locator('[data-pd-id="import-review.row-accounting"]')).toContainText("2 of 2");
  await expect(dialog.locator('[data-pd-id="import-review.row-accounting"]')).toContainText("All source rows accounted for");
  await expect(dialog).toContainText("Bet365");
  await dialog.getByRole("checkbox", { name: /I confirm the 1 selected rows/ }).check();
  await dialog.getByRole("button", { name: "Create backup and import selected" }).click();
  await expect(page.locator(".status-toast")).toContainText(
    "1 selected account rows were added after a verified local backup",
  );
});

test("row-accounting mismatch is visible and blocks import confirmation", async ({ page }) => {
  await page.route(`http://127.0.0.1:8010/profiles/${profileId}/imports**`, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "POST" && path.endsWith("/xlsx/dry-run")) {
      await route.fulfill({
        body: JSON.stringify({
          ...accountBatch(),
          row_accounting: {
            source_row_count: 2,
            accounted_row_count: 1,
            state: "mismatch",
            message: "Only 1 of 2 source rows are represented; confirmation is blocked.",
          },
        }),
        contentType: "application/json",
        status: 201,
      });
      return;
    }
    await route.fulfill({ body: "[]", contentType: "application/json", status: 200 });
  });

  await page.goto(`/profiles/${profileId}/tracker/settings`);
  await page.getByLabel("Spreadsheet transfer ledger").selectOption("accounts");
  await page.locator('[data-pd-id="spreadsheet-transfer.import-file"]').setInputFiles({
    buffer: Buffer.from("synthetic incomplete accounts XLSX"),
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    name: "synthetic-incomplete-accounts.xlsx",
  });

  const dialog = page.getByRole("dialog", { name: "Spreadsheet import review" });
  await expect(dialog.getByRole("alert")).toContainText("1 of 2");
  await expect(dialog.getByRole("alert")).toContainText("Source row mismatch");
  await dialog.getByRole("checkbox", { name: /I confirm the 1 selected rows/ }).check();
  const confirmButton = dialog.getByRole("button", { name: "Create backup and import selected" });
  await expect(confirmButton).toBeDisabled();
  await expect(dialog.locator("#import-review-action-reason")).toContainText(
    "Only 1 of 2 source rows are represented",
  );
});

test("changed account rows require individual diff review and selection", async ({ page }) => {
  let batchStatus = "dry_run_ready";
  await page.route(`http://127.0.0.1:8010/profiles/${profileId}/imports**`, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "POST" && path.endsWith("/xlsx/dry-run")) {
      await route.fulfill({ body: JSON.stringify(accountUpdateBatch()), contentType: "application/json", status: 201 });
      return;
    }
    if (request.method() === "POST" && path.endsWith("/confirm-accounts")) {
      expect(request.postDataJSON()).toEqual({
        confirmed: true,
        selected_staged_row_ids: ["STAGED-PLAYWRIGHT"],
      });
      batchStatus = "confirmed";
      await route.fulfill({
        body: JSON.stringify({
          backup_snapshot_id: "BACKUP-ACCOUNT-UPDATE",
          backup_checksum_sha256: "account-update-123",
          imported_account_ids: ["AC-PLAYWRIGHT"],
          imported_sportsbook_bet_ids: [],
          imported_free_bet_ids: [],
          imported_casino_offer_ids: [],
          imported_cash_adjustment_ids: [],
        }),
        contentType: "application/json",
        status: 200,
      });
      return;
    }
    if (request.method() === "GET" && path.endsWith(`/${batchId}`)) {
      await route.fulfill({ body: JSON.stringify(accountUpdateBatch(batchStatus)), contentType: "application/json", status: 200 });
      return;
    }
    await route.fulfill({ body: "[]", contentType: "application/json", status: 200 });
  });

  await page.goto(`/profiles/${profileId}/tracker/settings`);
  await page.getByLabel("Spreadsheet transfer ledger").selectOption("accounts");
  await page.locator('[data-pd-id="spreadsheet-transfer.import-file"]').setInputFiles({
    buffer: Buffer.from("synthetic changed accounts XLSX"),
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    name: "synthetic-changed-accounts.xlsx",
  });

  const dialog = page.getByRole("dialog", { name: "Spreadsheet import review" });
  await expect(dialog.getByText("Changed row", { exact: true })).toBeVisible();
  await dialog.getByText("Review changed fields").click();
  await expect(dialog.getByText("Before: 125.40")).toBeVisible();
  await expect(dialog.getByText("After: 130.55")).toBeVisible();
  const confirmButton = dialog.getByRole("button", { name: "Create backup and import selected" });
  await expect(confirmButton).toBeDisabled();
  await dialog.getByRole("checkbox", { name: "Update source row 2" }).check();
  await dialog.getByRole("checkbox", { name: /I confirm the 1 selected rows/ }).check();
  await expect(confirmButton).toBeEnabled();
  await confirmButton.click();
  await expect(page.locator(".status-toast")).toContainText(
    "1 selected account changes were applied after a verified local backup",
  );
});

test("an unconfirmed spreadsheet review can be removed from settings history", async ({ page }) => {
  let removed = false;
  await page.route(`http://127.0.0.1:8010/profiles/${profileId}/imports**`, async (route) => {
    const request = route.request();
    if (request.method() === "DELETE") {
      removed = true;
      await route.fulfill({ status: 204 });
      return;
    }
    await route.fulfill({
      body: JSON.stringify(removed ? [] : [batch()]),
      contentType: "application/json",
      status: 200,
    });
  });
  page.on("dialog", (dialog) => dialog.accept());

  await page.goto(`/profiles/${profileId}/tracker/settings`);
  const removeButton = page.getByRole("button", {
    name: "Delete review synthetic-sportsbook.xlsx",
  });
  await expect(removeButton).toBeVisible();
  await removeButton.click();

  await expect(removeButton).toBeHidden();
  await expect(page.locator(".status-toast")).toContainText(
    "No ledger rows were deleted",
  );
});

test("spreadsheet review history follows the selected ledger", async ({ page }) => {
  await page.route(`http://127.0.0.1:8010/profiles/${profileId}/imports**`, async (route) => {
    await route.fulfill({
      body: JSON.stringify([
        { ...batch("confirmed"), import_batch_id: "IMPORT-SPORTSBOOK" },
        { ...freeBetBatch(), import_batch_id: "IMPORT-FREE-BETS" },
        { ...casinoOfferBatch(), import_batch_id: "IMPORT-CASINO" },
        { ...cashAdjustmentBatch(), import_batch_id: "IMPORT-CASH" },
        { ...accountBatch(), import_batch_id: "IMPORT-ACCOUNTS" },
      ]),
      contentType: "application/json",
      status: 200,
    });
  });

  await page.goto(`/profiles/${profileId}/tracker/settings`);
  const ledger = page.getByLabel("Spreadsheet transfer ledger");
  await expect(page.getByText("synthetic-sportsbook.xlsx", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete review synthetic-sportsbook.xlsx" })).toBeDisabled();
  await expect(page.getByText("synthetic-free-bets.xlsx", { exact: true })).toBeHidden();

  await ledger.selectOption("free-bets");
  await expect(page.getByText("synthetic-free-bets.xlsx", { exact: true })).toBeVisible();
  await expect(page.getByText("synthetic-sportsbook.xlsx", { exact: true })).toBeHidden();

  await ledger.selectOption("casino-offers");
  await expect(page.getByText("synthetic-casino-offers.xlsx", { exact: true })).toBeVisible();
  await expect(page.getByText("synthetic-free-bets.xlsx", { exact: true })).toBeHidden();

  await ledger.selectOption("cash-adjustments");
  await expect(page.getByText("synthetic-cash-adjustments.xlsx", { exact: true })).toBeVisible();
  await expect(page.getByText("synthetic-casino-offers.xlsx", { exact: true })).toBeHidden();

  await ledger.selectOption("accounts");
  await expect(page.getByText("synthetic-accounts.xlsx", { exact: true })).toBeVisible();
  await expect(page.getByText("synthetic-cash-adjustments.xlsx", { exact: true })).toBeHidden();
});
