"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { StatusToast } from "@/components/status-toast";
import { apiBaseUrl } from "@/lib/api";
import { formatHumanDisplayDate } from "@/lib/tracker-summary";

type BackupSnapshot = {
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

type BackupImportPreview = {
  import_token: string;
  source_filename: string;
  source_instance_id: string;
  source_created_at: string;
  schema_version: string;
  profile_count: number;
  table_count: number;
  total_row_count: number;
  financial_control_count: number;
  checksum_valid: boolean;
  integrity_check: string;
  foreign_key_check: string;
  ready_to_restore: boolean;
};

type RestoreResult = {
  restore_event_id: string;
  restored_at: string;
  pre_restore_backup_snapshot_id: string;
  imported_backup_snapshot_id: string;
  status: string;
  reload_required: boolean;
};

const defaultBackupReason = "Manual Fund Manager backup";
const restoreConfirmation = "RESTORE PLUM DUFF DATABASE";

function responseError(body: string): string {
  try {
    const parsed = JSON.parse(body) as { detail?: string };
    return parsed.detail ?? body;
  } catch {
    return body;
  }
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadFilename(response: Response, fallback: string): string {
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? fallback;
}

export function DatabaseBackupSettings() {
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("open") === "database-backups";
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isReasonEntryOpen, setIsReasonEntryOpen] = useState(false);
  const [backupReason, setBackupReason] = useState(defaultBackupReason);
  const [verifyingId, setVerifyingId] = useState("");
  const [exportingId, setExportingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [importPreview, setImportPreview] = useState<BackupImportPreview | null>(null);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [restoreReason, setRestoreReason] = useState("");
  const [restoreConfirmed, setRestoreConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const openButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const reasonInputRef = useRef<HTMLInputElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const isBusy =
    isCreating ||
    Boolean(verifyingId) ||
    Boolean(exportingId) ||
    Boolean(deletingId) ||
    isImporting ||
    isRestoring;

  const loadSnapshots = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`${apiBaseUrl}/fund-manager/backups`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error(responseError(await response.text()));
      setSnapshots((await response.json()) as BackupSnapshot[]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const discardImportPreview = useCallback(async () => {
    if (importPreview) {
      await fetch(`${apiBaseUrl}/fund-manager/backups/import/${importPreview.import_token}`, {
        method: "DELETE",
      }).catch(() => undefined);
    }
    setImportPreview(null);
    setRestoreReason("");
    setRestoreConfirmed(false);
  }, [importPreview]);

  const closeDialog = useCallback(async () => {
    if (isBusy) return;
    await discardImportPreview();
    setIsOpen(false);
    setIsReasonEntryOpen(false);
    setBackupReason(defaultBackupReason);
    window.setTimeout(() => openButtonRef.current?.focus(), 0);
  }, [discardImportPreview, isBusy]);

  useEffect(() => {
    if (!isOpen) return;
    const timeoutId = window.setTimeout(() => {
      void loadSnapshots().catch((loadError: Error) => setError(loadError.message));
      closeButtonRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [isOpen, loadSnapshots]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isBusy) {
        void closeDialog();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeDialog, isBusy, isOpen]);

  function beginBackupCreation() {
    setIsReasonEntryOpen(true);
    window.setTimeout(() => reasonInputRef.current?.focus(), 0);
  }

  async function createBackup() {
    const reason = backupReason.trim();
    if (!reason) return;
    setIsCreating(true);
    setError("");
    try {
      const response = await fetch(`${apiBaseUrl}/fund-manager/backups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw new Error(responseError(await response.text()));
      const created = (await response.json()) as BackupSnapshot;
      setSnapshots((current) => [created, ...current]);
      setBackupReason(defaultBackupReason);
      setIsReasonEntryOpen(false);
      setMessage("Verified local database backup created.");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create backup.");
    } finally {
      setIsCreating(false);
    }
  }

  async function verifyBackup(snapshot: BackupSnapshot) {
    setVerifyingId(snapshot.backup_snapshot_id);
    setError("");
    try {
      const response = await fetch(
        `${apiBaseUrl}/fund-manager/backups/${snapshot.backup_snapshot_id}/verify`,
        { method: "POST" }
      );
      if (!response.ok) {
        if (response.status === 409) {
          setSnapshots((current) =>
            current.map((candidate) =>
              candidate.backup_snapshot_id === snapshot.backup_snapshot_id
                ? { ...candidate, status: "verification_failed" }
                : candidate
            )
          );
        }
        throw new Error(responseError(await response.text()));
      }
      setSnapshots((current) =>
        current.map((candidate) =>
          candidate.backup_snapshot_id === snapshot.backup_snapshot_id
            ? { ...candidate, status: "verified" }
            : candidate
        )
      );
      setMessage(`${snapshot.storage_name} passed checksum and integrity verification.`);
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Unable to verify backup.");
    } finally {
      setVerifyingId("");
    }
  }

  async function exportBackup(snapshot: BackupSnapshot) {
    setExportingId(snapshot.backup_snapshot_id);
    setError("");
    try {
      const response = await fetch(
        `${apiBaseUrl}/fund-manager/backups/${snapshot.backup_snapshot_id}/export`
      );
      if (!response.ok) throw new Error(responseError(await response.text()));
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadFilename(
        response,
        `${snapshot.storage_name.replace(/\.sqlite3$/, "")}.plumduff-backup`
      );
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage("Verified full database backup exported.");
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Unable to export backup.");
    } finally {
      setExportingId("");
    }
  }

  async function deleteBackup(snapshot: BackupSnapshot) {
    if (!snapshot.is_delete_allowed) return;
    setDeletingId(snapshot.backup_snapshot_id);
    setError("");
    try {
      const response = await fetch(
        `${apiBaseUrl}/fund-manager/backups/${snapshot.backup_snapshot_id}`,
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error(responseError(await response.text()));
      setSnapshots((current) =>
        current.filter(
          (candidate) => candidate.backup_snapshot_id !== snapshot.backup_snapshot_id
        )
      );
      setConfirmDeleteId("");
      setMessage("Local database backup deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete backup.");
    } finally {
      setDeletingId("");
    }
  }

  async function previewImport(file: File) {
    setIsImporting(true);
    setError("");
    setRestoreResult(null);
    try {
      const response = await fetch(`${apiBaseUrl}/fund-manager/backups/import/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/vnd.plumduff.backup+zip",
          "X-Plum-Duff-Filename": file.name,
        },
        body: file,
      });
      if (!response.ok) throw new Error(responseError(await response.text()));
      setImportPreview((await response.json()) as BackupImportPreview);
      setRestoreReason("");
      setRestoreConfirmed(false);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Unable to inspect backup.");
    } finally {
      setIsImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  async function restoreDatabase() {
    if (!importPreview || !restoreConfirmed || !restoreReason.trim()) return;
    setIsRestoring(true);
    setError("");
    try {
      const response = await fetch(
        `${apiBaseUrl}/fund-manager/backups/import/${importPreview.import_token}/restore`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            confirmation: restoreConfirmation,
            reason: restoreReason.trim(),
          }),
        }
      );
      if (!response.ok) throw new Error(responseError(await response.text()));
      setRestoreResult((await response.json()) as RestoreResult);
      setImportPreview(null);
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : "Unable to restore database.");
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <>
      <section className="content-panel stack" data-pd-id="database-backups.section">
        <span className="eyebrow">Local data protection</span>
        <h2>Database Backups</h2>
        <button
          aria-haspopup="dialog"
          className="button-link settings-card-action"
          data-pd-id="database-backups.open"
          onClick={() => setIsOpen(true)}
          ref={openButtonRef}
          type="button"
        >
          Manage Database Backups
        </button>
      </section>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="modal-backdrop modal-backdrop-elevated">
              <section
                aria-labelledby="database-backups-title"
                aria-modal="true"
                className="modal-panel workflow-editor-modal fund-manager-settings-modal database-backups-modal"
                data-pd-id="database-backups.dialog"
                ref={dialogRef}
                role="dialog"
              >
                <header className="workflow-editor-modal-header">
                  <div>
                    <span className="eyebrow">Fund Manager Settings</span>
                    <h2 id="database-backups-title">Database Backups</h2>
                  </div>
                  <button
                    aria-label="Close Database Backups"
                    className="modal-close-button"
                    data-pd-id="database-backups.close"
                    disabled={isBusy}
                    onClick={() => void closeDialog()}
                    ref={closeButtonRef}
                    type="button"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined">close</span>
                  </button>
                </header>

                <div className="workflow-editor-modal-body stack database-backups-body">
                  {isLoading || isImporting || isRestoring ? (
                    <LedgerLoadingIndicator
                      dataPdId="database-backups.loading"
                      label={
                        isRestoring
                          ? "Creating safety backup and restoring database"
                          : isImporting
                            ? "Validating full database backup"
                            : "Loading database backups"
                      }
                    />
                  ) : null}
                  {error ? <p className="error-text" role="alert">{error}</p> : null}

                  {restoreResult ? (
                    <div className="database-restore-success stack" data-pd-id="database-backups.restore-success" role="status">
                      <span aria-hidden="true" className="material-symbols-outlined">verified</span>
                      <h3>Database Restored</h3>
                      <p>
                        The selected database is active. Plum Duff also retained an automatic
                        pre-restore backup and an audited copy of the imported recovery point.
                      </p>
                      <p>Reload Plum Duff before continuing so every screen reads the restored data.</p>
                    </div>
                  ) : null}

                  {importPreview ? (
                    <div className="database-import-preview stack" data-pd-id="database-backups.import-preview">
                      <div className="meta-grid database-import-preview-status">
                        <dl><dt>Package</dt><dd title={importPreview.source_filename}>{importPreview.source_filename}</dd></dl>
                        <dl><dt>Created</dt><dd>{formatHumanDisplayDate(importPreview.source_created_at, true)}</dd></dl>
                        <dl><dt>Profiles</dt><dd>{importPreview.profile_count}</dd></dl>
                        <dl><dt>Rows</dt><dd>{importPreview.total_row_count}</dd></dl>
                        <dl><dt>Schema</dt><dd>{importPreview.schema_version}</dd></dl>
                        <dl><dt>Checks</dt><dd>Passed</dd></dl>
                      </div>
                      <div className="database-restore-warning" role="note">
                        <span aria-hidden="true" className="material-symbols-outlined">warning</span>
                        <div>
                          <h3>Full Database Replacement</h3>
                          <p>
                            Restoring replaces every current profile, ledger row, setting, report,
                            fee record and audit record. Plum Duff creates a verified local safety
                            backup immediately before replacement.
                          </p>
                        </div>
                      </div>
                      <label className="field-control database-backup-reason-field">
                        <span>Restore Reason</span>
                        <input
                          data-pd-id="database-backups.restore-reason"
                          disabled={isBusy}
                          maxLength={160}
                          onChange={(event) => setRestoreReason(event.target.value)}
                          value={restoreReason}
                        />
                        <small>Required in the local restore audit trail.</small>
                      </label>
                      <label className="database-restore-confirmation">
                        <input
                          checked={restoreConfirmed}
                          data-pd-id="database-backups.restore-confirmation"
                          disabled={isBusy}
                          onChange={(event) => setRestoreConfirmed(event.target.checked)}
                          type="checkbox"
                        />
                        <span>I understand this replaces the complete current Plum Duff database.</span>
                      </label>
                    </div>
                  ) : null}

                  {!importPreview && !restoreResult && isReasonEntryOpen ? (
                    <label className="field-control database-backup-reason-field">
                      <span>Backup Reason</span>
                      <input
                        aria-describedby="database-backup-reason-support"
                        data-pd-id="database-backups.reason"
                        disabled={isCreating || Boolean(verifyingId)}
                        maxLength={160}
                        onChange={(event) => setBackupReason(event.target.value)}
                        ref={reasonInputRef}
                        value={backupReason}
                      />
                      <small id="database-backup-reason-support">
                        {backupReason.trim()
                          ? "Stored in the local backup history."
                          : "Enter a reason before creating the backup."}
                      </small>
                    </label>
                  ) : null}

                  {!isLoading && !importPreview && !restoreResult ? (
                    <div className="meta-grid database-backups-status" data-pd-id="database-backups.status">
                      <dl><dt>Local backups</dt><dd>{snapshots.length}</dd></dl>
                      <dl><dt>Latest state</dt><dd>{snapshots[0]?.status === "verified" ? "Verified" : "No backup"}</dd></dl>
                      <dl><dt>Cloud backup</dt><dd>Deferred</dd></dl>
                    </div>
                  ) : null}

                  {!isLoading && !importPreview && !restoreResult && snapshots.length === 0 ? (
                    <div className="empty-state" data-pd-id="database-backups.empty">
                      <h3>No local backups yet</h3>
                      <p>Create a verified snapshot before a risky import or system change.</p>
                    </div>
                  ) : null}

                  {!isLoading && !importPreview && !restoreResult && snapshots.length > 0 ? (
                    <div className="table-scroll database-backups-table-scroll" data-pd-id="database-backups.table-scroll">
                      <table className="data-table database-backups-table">
                        <thead><tr><th>Created</th><th>Reason</th><th>Size</th><th>Local State</th><th>Cloud</th><th>Actions</th></tr></thead>
                        <tbody>
                          {snapshots.map((snapshot) => (
                            <tr key={snapshot.backup_snapshot_id}>
                              <td><time dateTime={snapshot.created_at}>{formatHumanDisplayDate(snapshot.created_at, true)}</time></td>
                              <td>
                                <span className="database-backup-reason" title={snapshot.notes}>
                                  {snapshot.notes}
                                </span>
                              </td>
                              <td>{formatBytes(snapshot.byte_size)}</td>
                              <td>
                                <span
                                  className={`table-chip ${
                                    snapshot.status === "verified"
                                      ? "table-chip-status-placed"
                                      : "table-chip-warning"
                                  }`}
                                >
                                  {snapshot.status === "verified"
                                    ? "Verified"
                                    : "Verification Failed"}
                                </span>
                              </td>
                              <td><span className="table-chip table-chip-muted">Deferred</span></td>
                              <td>
                                <div className="database-backup-row-actions">
                                  <button
                                    aria-label={`Verify ${snapshot.storage_name}`}
                                    className="icon-button"
                                    data-pd-id={`database-backups.verify.${snapshot.backup_snapshot_id}`}
                                    disabled={isBusy}
                                    onClick={() => void verifyBackup(snapshot)}
                                    title="Verify checksum, manifest and SQLite integrity"
                                    type="button"
                                  >
                                    <span aria-hidden="true" className="material-symbols-outlined">{verifyingId === snapshot.backup_snapshot_id ? "progress_activity" : "verified"}</span>
                                  </button>
                                  <button
                                    aria-label={`Export ${snapshot.storage_name} as a full database backup`}
                                    className="icon-button"
                                    data-pd-id={`database-backups.export.${snapshot.backup_snapshot_id}`}
                                    disabled={isBusy || snapshot.status !== "verified"}
                                    onClick={() => void exportBackup(snapshot)}
                                    title={snapshot.status === "verified" ? "Export full database backup" : "Verify this backup before export"}
                                    type="button"
                                  >
                                    <span aria-hidden="true" className="material-symbols-outlined">{exportingId === snapshot.backup_snapshot_id ? "progress_activity" : "download"}</span>
                                  </button>
                                  {confirmDeleteId === snapshot.backup_snapshot_id ? (
                                    <div
                                      aria-label={`Confirm deletion of ${snapshot.storage_name}`}
                                      className="database-backup-delete-confirm"
                                      data-pd-id={`database-backups.delete-confirm.${snapshot.backup_snapshot_id}`}
                                      role="group"
                                    >
                                      <span>Delete?</span>
                                      <button
                                        className="button-link compact-action destructive-action"
                                        data-pd-id={`database-backups.delete-confirm-action.${snapshot.backup_snapshot_id}`}
                                        disabled={isBusy}
                                        onClick={() => void deleteBackup(snapshot)}
                                        type="button"
                                      >
                                        <span aria-hidden="true" className="material-symbols-outlined">delete</span>
                                        <span>Delete</span>
                                      </button>
                                      <button
                                        aria-label={`Cancel deletion of ${snapshot.storage_name}`}
                                        className="icon-button database-backup-cancel-delete"
                                        data-pd-id={`database-backups.delete-cancel.${snapshot.backup_snapshot_id}`}
                                        disabled={isBusy}
                                        onClick={() => setConfirmDeleteId("")}
                                        type="button"
                                      >
                                        <span aria-hidden="true" className="material-symbols-outlined">close</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        aria-describedby={
                                          snapshot.is_delete_allowed
                                            ? undefined
                                            : `database-backup-delete-reason-${snapshot.backup_snapshot_id}`
                                        }
                                        aria-label={
                                          snapshot.is_delete_allowed
                                            ? `Delete ${snapshot.storage_name}`
                                            : `Delete unavailable for ${snapshot.storage_name}`
                                        }
                                        className={`icon-button ${
                                          snapshot.is_delete_allowed
                                            ? "icon-button-destructive"
                                            : "database-backup-delete-disabled"
                                        }`}
                                        data-pd-id={`database-backups.delete.${snapshot.backup_snapshot_id}`}
                                        disabled={isBusy || !snapshot.is_delete_allowed}
                                        onClick={() => setConfirmDeleteId(snapshot.backup_snapshot_id)}
                                        title={
                                          snapshot.is_delete_allowed
                                            ? "Delete this local backup and manifest"
                                            : snapshot.delete_blocked_reason
                                        }
                                        type="button"
                                      >
                                        <span aria-hidden="true" className="material-symbols-outlined">
                                          {deletingId === snapshot.backup_snapshot_id ? "progress_activity" : "delete"}
                                        </span>
                                      </button>
                                      {!snapshot.is_delete_allowed ? (
                                        <span
                                          className="visually-hidden"
                                          id={`database-backup-delete-reason-${snapshot.backup_snapshot_id}`}
                                        >
                                          {snapshot.delete_blocked_reason}
                                        </span>
                                      ) : null}
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>

                <footer className="workflow-editor-modal-footer">
                  {restoreResult ? (
                    <button className="modal-primary-button icon-text-action" data-pd-id="database-backups.reload" onClick={() => window.location.reload()} type="button">
                      <span aria-hidden="true" className="material-symbols-outlined">refresh</span>
                      <span>Reload Plum Duff</span>
                    </button>
                  ) : importPreview ? (
                    <>
                      <button className="button-link" disabled={isBusy} onClick={() => void discardImportPreview()} type="button">Cancel Import</button>
                      <button
                        className="modal-primary-button icon-text-action"
                        data-pd-id="database-backups.restore"
                        disabled={isBusy || !restoreConfirmed || !restoreReason.trim() || !importPreview.ready_to_restore}
                        onClick={() => void restoreDatabase()}
                        title={!restoreConfirmed || !restoreReason.trim() ? "Enter a reason and confirm full database replacement" : undefined}
                        type="button"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined">restore_page</span>
                        <span>Create Safety Backup and Restore</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="button-link" disabled={isBusy} onClick={() => void closeDialog()} type="button">Close</button>
                      <div className="inline-actions database-backup-footer-actions">
                        <input
                          accept=".plumduff-backup,application/vnd.plumduff.backup+zip"
                          className="visually-hidden"
                          data-pd-id="database-backups.import-file"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void previewImport(file);
                          }}
                          ref={importInputRef}
                          type="file"
                        />
                        <button
                          className="button-link icon-text-action"
                          data-pd-id="database-backups.import"
                          disabled={isBusy}
                          onClick={() => importInputRef.current?.click()}
                          type="button"
                        >
                          <span aria-hidden="true" className="material-symbols-outlined">upload_file</span>
                          <span>Import Database</span>
                        </button>
                        <button
                          className="modal-primary-button icon-text-action"
                          data-pd-id="database-backups.create"
                          disabled={isBusy || (isReasonEntryOpen && !backupReason.trim())}
                          onClick={() => {
                            if (isReasonEntryOpen) void createBackup();
                            else beginBackupCreation();
                          }}
                          type="button"
                        >
                          <span aria-hidden="true" className="material-symbols-outlined">backup</span>
                          <span>
                            {isCreating
                              ? "Creating Backup"
                              : isReasonEntryOpen
                                ? "Create Backup"
                                : "Create Verified Backup"}
                          </span>
                        </button>
                      </div>
                    </>
                  )}
                </footer>
              </section>
            </div>,
            document.body
          )
        : null}
      <StatusToast message={message} onDismiss={() => setMessage("")} />
    </>
  );
}
