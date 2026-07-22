import { expect, test } from "@playwright/test";

type Snapshot = {
  backup_snapshot_id: string;
  created_at: string;
  backup_scope: string;
  schema_version: string;
  storage_name: string;
  status: string;
  notes: string;
  checksum_sha256: string;
  byte_size: number;
  integrity_check: string;
  cloud_state: "not_configured";
  is_delete_allowed: boolean;
  delete_blocked_reason: string;
};

test("Fund Manager creates and verifies a contained local database backup", async ({ page }) => {
  const snapshots: Snapshot[] = [];
  let verificationShouldFail = false;

  await page.route("**/fund-manager/backups/*/verify", async (route) => {
    const snapshotId = route.request().url().split("/").at(-2) ?? "";
    if (verificationShouldFail) {
      const snapshot = snapshots.find(
        (candidate) => candidate.backup_snapshot_id === snapshotId
      );
      if (snapshot) snapshot.status = "verification_failed";
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Backup checksum verification failed" }),
      });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        backup_snapshot_id: snapshotId,
        status: "verified",
        checksum_valid: true,
        integrity_check: "ok",
        manifest_valid: true,
      }),
    });
  });
  await page.route("**/fund-manager/backups", async (route) => {
    if (route.request().method() === "POST") {
      const payload = route.request().postDataJSON() as { reason: string };
      const created: Snapshot = {
        backup_snapshot_id: "BACKUP-SYNTHETIC",
        created_at: "2026-07-22T12:00:00Z",
        backup_scope: "full",
        schema_version: "sqlite-v1",
        storage_name: "plum-duff-synthetic.sqlite3",
        status: "verified",
        notes: payload.reason,
        checksum_sha256: "a".repeat(64),
        byte_size: 1_572_864,
        integrity_check: "ok",
        cloud_state: "not_configured",
        is_delete_allowed: false,
        delete_blocked_reason: "Keep the latest three verified backups before deleting older restore points.",
      };
      snapshots.unshift(created);
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(created) });
      return;
    }
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(snapshots) });
  });

  await page.setViewportSize({ width: 900, height: 720 });
  await page.goto("/settings");

  const openButton = page.getByRole("button", { name: "Manage Database Backups" });
  await openButton.click();
  const dialog = page.getByRole("dialog", { name: "Database Backups" });
  await expect(dialog).toBeVisible();
  await expect(page.getByText("No local backups yet")).toBeVisible();
  await expect(dialog.getByText("Deferred", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Close Database Backups" })).toBeFocused();

  const lightSurface = await dialog.evaluate((element) => getComputedStyle(element).backgroundColor);
  await dialog.getByRole("button", { name: "Close Database Backups" }).click();
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await openButton.click();
  await expect(dialog).toBeVisible();
  const darkSurface = await dialog.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(darkSurface).not.toBe(lightSurface);

  const openReasonButton = dialog.getByRole("button", { name: "Create Verified Backup" });
  await expect(dialog.getByRole("textbox", { name: "Backup Reason" })).toBeHidden();
  await openReasonButton.click();
  const reasonField = dialog.getByRole("textbox", { name: "Backup Reason" });
  const createButton = dialog.getByRole("button", { name: "Create Backup" });
  await expect(reasonField).toBeFocused();
  await reasonField.fill(" ");
  await expect(createButton).toBeDisabled();
  await reasonField.fill("Before synthetic reporting review");
  await expect(createButton).toBeEnabled();
  await createButton.click();
  await expect(dialog.getByText("Before synthetic reporting review")).toBeVisible();
  await expect(reasonField).toBeHidden();
  await expect(dialog.getByText("1.5 MB")).toBeVisible();
  await expect(page.getByText("Verified local database backup created.")).toBeVisible();
  const protectedDelete = dialog.getByRole("button", {
    name: "Delete unavailable for plum-duff-synthetic.sqlite3",
  });
  await expect(protectedDelete).toBeDisabled();
  await expect(protectedDelete).toHaveAttribute(
    "title",
    "Keep the latest three verified backups before deleting older restore points."
  );
  const protectedDeleteStyle = await protectedDelete.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      cursor: styles.cursor,
      opacity: Number(styles.opacity),
    };
  });
  expect(protectedDeleteStyle.cursor).toBe("not-allowed");
  expect(protectedDeleteStyle.opacity).toBeLessThan(0.6);

  const tableScroll = dialog.locator('[data-pd-id="database-backups.table-scroll"]');
  await expect(tableScroll).toBeVisible();
  const geometry = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      insideViewport:
        rect.top >= 0 && rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(geometry.insideViewport).toBe(true);
  expect(geometry.pageOverflow).toBe(false);

  const scrollState = await tableScroll.evaluate((element) => ({
    localOverflow: element.scrollWidth >= element.clientWidth,
    overflowX: getComputedStyle(element).overflowX,
  }));
  expect(scrollState.localOverflow).toBe(true);
  expect(["auto", "scroll"]).toContain(scrollState.overflowX);

  await dialog.getByRole("button", { name: "Verify plum-duff-synthetic.sqlite3" }).click();
  await expect(
    page.getByText("plum-duff-synthetic.sqlite3 passed checksum and integrity verification.")
  ).toBeVisible();

  verificationShouldFail = true;
  await dialog.getByRole("button", { name: "Verify plum-duff-synthetic.sqlite3" }).click();
  await expect(dialog.getByText("Verification Failed", { exact: true })).toBeVisible();
  await expect(page.getByText("Backup checksum verification failed")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(openButton).toBeFocused();
});

test("Fund Manager exports, previews and restores a full local database package", async ({
  page,
}) => {
  const snapshot: Snapshot = {
    backup_snapshot_id: "BACKUP-PORTABLE",
    created_at: "2026-07-22T12:00:00Z",
    backup_scope: "full",
    schema_version: "sqlite-v1",
    storage_name: "plum-duff-portable.sqlite3",
    status: "verified",
    notes: "Before synthetic restore",
    checksum_sha256: "b".repeat(64),
    byte_size: 2_097_152,
    integrity_check: "ok",
    cloud_state: "not_configured",
    is_delete_allowed: true,
    delete_blocked_reason: "",
  };
  let stagedImportCancelled = false;
  let restorePayload: { confirmation: string; reason: string } | null = null;

  await page.route("**/fund-manager/backups/BACKUP-PORTABLE/export", async (route) => {
    await route.fulfill({
      contentType: "application/vnd.plumduff.backup+zip",
      headers: {
        "Content-Disposition":
          'attachment; filename="plum-duff-portable.plumduff-backup"',
      },
      body: "synthetic-portable-package",
    });
  });
  await page.route("**/fund-manager/backups/import/preview", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        import_token: "a".repeat(32),
        source_filename: "synthetic.plumduff-backup",
        source_instance_id: "synthetic-fund-manager",
        source_created_at: "2026-07-20T09:30:00Z",
        schema_version: "sqlite-v1",
        profile_count: 2,
        table_count: 24,
        total_row_count: 412,
        financial_control_count: 18,
        checksum_valid: true,
        integrity_check: "ok",
        foreign_key_check: "ok",
        ready_to_restore: true,
      }),
    });
  });
  await page.route(`**/fund-manager/backups/import/${"a".repeat(32)}`, async (route) => {
    stagedImportCancelled = true;
    await route.fulfill({ status: 204, body: "" });
  });
  await page.route(
    `**/fund-manager/backups/import/${"a".repeat(32)}/restore`,
    async (route) => {
      restorePayload = route.request().postDataJSON() as {
        confirmation: string;
        reason: string;
      };
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          restore_event_id: "RESTORE-SYNTHETIC",
          restored_at: "2026-07-22T13:00:00Z",
          pre_restore_backup_snapshot_id: "BACKUP-SAFETY",
          imported_backup_snapshot_id: "BACKUP-IMPORTED",
          status: "restored",
          reload_required: true,
        }),
      });
    }
  );
  await page.route("**/fund-manager/backups", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([snapshot]),
    });
  });

  await page.setViewportSize({ width: 900, height: 720 });
  await page.goto("/settings");
  await page.getByRole("button", { name: "Manage Database Backups" }).click();
  const dialog = page.getByRole("dialog", { name: "Database Backups" });

  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", {
    name: "Export plum-duff-portable.sqlite3 as a full database backup",
  }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("plum-duff-portable.plumduff-backup");

  const deleteButton = dialog.getByRole("button", { name: "Delete plum-duff-portable.sqlite3" });
  await expect(deleteButton).toBeEnabled();
  await deleteButton.click();
  const confirmDelete = dialog.locator(
    '[data-pd-id="database-backups.delete-confirm.BACKUP-PORTABLE"]'
  );
  await expect(confirmDelete).toBeVisible();
  await expect(confirmDelete.getByRole("button", { name: "Delete" })).toBeVisible();
  await expect(
    confirmDelete.getByRole("button", { name: "Cancel deletion of plum-duff-portable.sqlite3" })
  ).toBeVisible();
  const confirmGeometry = await confirmDelete.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const deleteAction = element
      .querySelector('[data-pd-id="database-backups.delete-confirm-action.BACKUP-PORTABLE"]')
      ?.getBoundingClientRect();
    const cancelAction = element
      .querySelector('[data-pd-id="database-backups.delete-cancel.BACKUP-PORTABLE"]')
      ?.getBoundingClientRect();
    return {
      compact: rect.width < 280,
      deleteHeight: Math.round(deleteAction?.height ?? 0),
      cancelHeight: Math.round(cancelAction?.height ?? 0),
    };
  });
  expect(confirmGeometry.compact).toBe(true);
  expect(confirmGeometry.deleteHeight).toBe(confirmGeometry.cancelHeight);
  await confirmDelete
    .getByRole("button", { name: "Cancel deletion of plum-duff-portable.sqlite3" })
    .click();
  await expect(confirmDelete).toBeHidden();

  await dialog.locator('[data-pd-id="database-backups.import-file"]').setInputFiles({
    name: "synthetic.plumduff-backup",
    mimeType: "application/vnd.plumduff.backup+zip",
    buffer: Buffer.from("synthetic-portable-package"),
  });
  await expect(dialog.getByText("Full Database Replacement")).toBeVisible();
  await expect(dialog.getByText("412")).toBeVisible();
  const restoreButton = dialog.getByRole("button", {
    name: "Create Safety Backup and Restore",
  });
  await expect(restoreButton).toBeDisabled();

  const geometry = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const footer = element.querySelector("footer")?.getBoundingClientRect();
    return {
      insideViewport:
        rect.top >= 0 && rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
      footerVisible: Boolean(footer && footer.top >= rect.top && footer.bottom <= rect.bottom),
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(geometry).toEqual({
    insideViewport: true,
    footerVisible: true,
    pageOverflow: false,
  });

  await dialog.getByRole("button", { name: "Cancel Import" }).click();
  await expect.poll(() => stagedImportCancelled).toBe(true);
  await expect(dialog.getByText("Full Database Replacement")).toBeHidden();

  await dialog.locator('[data-pd-id="database-backups.import-file"]').setInputFiles({
    name: "synthetic.plumduff-backup",
    mimeType: "application/vnd.plumduff.backup+zip",
    buffer: Buffer.from("synthetic-portable-package"),
  });
  await dialog.getByRole("textbox", { name: "Restore Reason" }).fill("Synthetic recovery test");
  await dialog
    .getByRole("checkbox", {
      name: "I understand this replaces the complete current Plum Duff database.",
    })
    .check();
  await expect(restoreButton).toBeEnabled();
  await restoreButton.click();

  await expect(dialog.getByText("Database Restored")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Reload Plum Duff" })).toBeVisible();
  expect(restorePayload).toEqual({
    confirmation: "RESTORE PLUM DUFF DATABASE",
    reason: "Synthetic recovery test",
  });
});
