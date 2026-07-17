"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { StatusToast } from "@/components/status-toast";
import { apiBaseUrl } from "@/lib/api";

const PAGE_SIZE = 25;
type LedgerKey = "sportsbook" | "free-bets" | "casino-offers" | "cash-adjustments" | "accounts";

type ImportIssue = { code: string; message: string };
type JsonScalar = string | number | boolean | null;

type StagedRow = {
  import_staged_row_id: string;
  source_sheet: string;
  source_record_id: string;
  source_row: number | null;
  staged_action: string;
  errors: ImportIssue[];
  warnings: ImportIssue[];
  fields: Record<string, JsonScalar>;
  mapped_fields: Record<string, JsonScalar>;
  existing_mapped_fields: Record<string, JsonScalar>;
  field_diffs: Record<string, { before: JsonScalar; after: JsonScalar }>;
};

type ImportBatch = {
  import_batch_id: string;
  profile_id: string;
  source_filename: string;
  mapping_version: string;
  status: string;
  row_count: number;
  error_count: number;
  warning_count: number;
  summary: Record<string, number>;
  row_accounting: {
    source_row_count: number;
    accounted_row_count: number;
    state: "complete" | "mismatch";
    message: string;
  };
  financial_reconciliation: {
    ledger: string;
    state: "matched" | "mismatch" | "incomplete" | "not_available";
    source_total: string | null;
    recomputed_total: string | null;
    difference: string | null;
    compared_row_count: number;
    source_row_count: number;
    tolerance: string;
    message: string;
  };
  started_at: string;
  rows: StagedRow[];
};

type Confirmation = {
  backup_snapshot_id: string;
  backup_checksum_sha256: string;
  imported_sportsbook_bet_ids: string[];
  imported_free_bet_ids: string[];
  imported_casino_offer_ids: string[];
  imported_cash_adjustment_ids: string[];
  imported_account_ids: string[];
};

function ledgerLabel(ledger: LedgerKey): string {
  if (ledger === "accounts") return "Accounts";
  if (ledger === "cash-adjustments") return "Cash Adjustments";
  if (ledger === "casino-offers") return "Casino Offers";
  return ledger === "free-bets" ? "Free Bets" : "Sportsbook Bets";
}

function ledgerRowLabel(ledger: LedgerKey): string {
  if (ledger === "accounts") return "account";
  if (ledger === "cash-adjustments") return "cash-adjustment";
  if (ledger === "casino-offers") return "casino-offer";
  return ledger === "free-bets" ? "free-bet" : "sportsbook";
}

function formatReconciliationMoney(value: string | null): string {
  if (value === null) return "—";
  return value.startsWith("-") ? `-£${value.slice(1)}` : `£${value}`;
}

function batchLedger(batch: ImportBatch): LedgerKey {
  if (batch.mapping_version === "accounts-v1") return "accounts";
  if (batch.mapping_version === "cash-adjustments-v1") return "cash-adjustments";
  if (batch.mapping_version === "casino-offers-v1") return "casino-offers";
  return batch.mapping_version === "free-bets-v1" ? "free-bets" : "sportsbook";
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The spreadsheet request failed.";
}

async function responseJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { detail?: string };
  if (!response.ok) throw new Error(payload.detail ?? `Request failed (${response.status}).`);
  return payload;
}

async function fileToBase64(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The selected workbook could not be read."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
  const separator = dataUrl.indexOf(",");
  if (separator < 0) throw new Error("The selected workbook could not be encoded.");
  return dataUrl.slice(separator + 1);
}

function formatBatchTime(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

function field(row: StagedRow, name: string): string {
  const value = row.fields[name];
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

function actionLabel(action: string): string {
  if (action === "insert") return "New row";
  if (action === "update") return "Changed row";
  if (action === "no_op") return "Already imported";
  if (action === "blocked") return "Needs attention";
  if (action === "ignored") return "Excluded";
  if (action === "imported") return "Imported";
  if (action === "skipped_by_operator") return "Skipped by operator";
  return action.replaceAll("_", " ");
}

function compatibilityLabel(row: StagedRow): string {
  if (row.staged_action === "blocked") return "Not compatible";
  if (row.staged_action === "insert" && row.warnings.length) return "Compatible with review";
  if (row.staged_action === "insert") return "Compatible";
  if (row.staged_action === "update") return "Compatible; approval required";
  if (row.staged_action === "no_op") return "Unchanged; skipped";
  return "Not imported";
}

export function ProfileSpreadsheetTransfer({ profileId }: { profileId: string }) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogTriggerRef = useRef<HTMLElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [activeBatch, setActiveBatch] = useState<ImportBatch | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedLedger, setSelectedLedger] = useState<LedgerKey>("sportsbook");

  const closeModal = useCallback(() => {
    setIsOpen(false);
    window.setTimeout(() => dialogTriggerRef.current?.focus(), 0);
  }, []);

  async function loadBatches() {
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/imports`, { cache: "no-store" });
    setBatches(await responseJson<ImportBatch[]>(response));
  }

  useEffect(() => {
    let cancelled = false;
    void fetch(`${apiBaseUrl}/profiles/${profileId}/imports`, { cache: "no-store" })
      .then(responseJson<ImportBatch[]>)
      .then((records) => { if (!cancelled) setBatches(records); })
      .catch((error: unknown) => { if (!cancelled) setMessage(getErrorMessage(error)); });
    return () => { cancelled = true; };
  }, [profileId]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((element) => !element.hasAttribute("hidden"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeModal, isOpen]);

  function prepareBatch(batch: ImportBatch) {
    setActiveBatch(batch);
    setSelectedRowIds(new Set(
      batch.status === "dry_run_ready"
        ? batch.rows.filter((row) => row.staged_action === "insert").map((row) => row.import_staged_row_id)
        : [],
    ));
    setAcknowledged(false);
    setConfirmation(null);
    setSearch("");
    setPage(1);
  }

  async function openBatch(batchId: string, trigger?: HTMLElement) {
    dialogTriggerRef.current = trigger ?? (document.activeElement as HTMLElement | null);
    setIsOpen(true);
    setIsLoading(true);
    setActiveBatch(null);
    try {
      const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/imports/${batchId}`, { cache: "no-store" });
      prepareBatch(await responseJson<ImportBatch>(response));
    } catch (error) {
      setMessage(getErrorMessage(error));
      closeModal();
    } finally {
      setIsLoading(false);
    }
  }

  async function handleWorkbook(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    dialogTriggerRef.current = event.currentTarget;
    setIsOpen(true);
    setIsLoading(true);
    setActiveBatch(null);
    try {
      const requestedLedger = selectedLedger;
      const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/imports/xlsx/dry-run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_filename: file.name,
          content_base64: await fileToBase64(file),
          ledger: selectedLedger,
        }),
      });
      const batch = await responseJson<ImportBatch>(response);
      const detectedLedger = batchLedger(batch);
      if (detectedLedger !== requestedLedger) {
        setSelectedLedger(detectedLedger);
      }
      prepareBatch(batch);
      const newRows = batch.summary.insert ?? 0;
      const changedRows = batch.summary.update ?? 0;
      const label = ledgerRowLabel(detectedLedger);
      const detectionMessage = detectedLedger !== requestedLedger
        ? `${ledgerLabel(detectedLedger)} workbook detected. Spreadsheet type changed from ${ledgerLabel(requestedLedger)}. `
        : "";
      setMessage(detectionMessage + (newRows || changedRows
        ? `Review complete. ${newRows} new and ${changedRows} changed ${label} rows are available to review.`
        : `Review complete. The workbook contains no new compatible ${label} rows.`));
      await loadBatches();
    } catch (error) {
      setMessage(getErrorMessage(error));
      closeModal();
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteBatch(batch: ImportBatch) {
    if (!window.confirm(`Remove the unconfirmed review for ${batch.source_filename}?`)) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/imports/${batch.import_batch_id}`, { method: "DELETE" });
      if (!response.ok) await responseJson<never>(response);
      if (activeBatch?.import_batch_id === batch.import_batch_id) closeModal();
      setMessage("Unconfirmed spreadsheet review removed. No ledger rows were deleted.");
      await loadBatches();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function confirmImport() {
    if (!activeBatch || !acknowledged || !selectedRowIds.size) return;
    const ledger = batchLedger(activeBatch);
    const selectedChangedCount = activeBatch.rows.filter(
      (row) => row.staged_action === "update" && selectedRowIds.has(row.import_staged_row_id),
    ).length;
    setIsLoading(true);
    try {
      const response = await fetch(
        `${apiBaseUrl}/profiles/${profileId}/imports/${activeBatch.import_batch_id}/${ledger === "accounts" ? "confirm-accounts" : ledger === "cash-adjustments" ? "confirm-cash-adjustments" : ledger === "casino-offers" ? "confirm-casino-offers" : ledger === "free-bets" ? "confirm-free-bets" : "confirm-sportsbook"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmed: true, selected_staged_row_ids: [...selectedRowIds] }),
        },
      );
      const result = await responseJson<Confirmation>(response);
      setConfirmation(result);
      setAcknowledged(false);
      const importedCount = ledger === "accounts"
        ? result.imported_account_ids.length
        : ledger === "casino-offers"
        ? result.imported_casino_offer_ids.length
        : ledger === "cash-adjustments"
          ? result.imported_cash_adjustment_ids.length
        : ledger === "free-bets"
          ? result.imported_free_bet_ids.length
          : result.imported_sportsbook_bet_ids.length;
      setMessage(selectedChangedCount
        ? `Import complete. ${importedCount} selected ${ledgerRowLabel(ledger)} changes were applied after a verified local backup.`
        : `Import complete. ${importedCount} selected ${ledgerRowLabel(ledger)} rows were added after a verified local backup.`);
      await loadBatches();
      const refreshed = await fetch(`${apiBaseUrl}/profiles/${profileId}/imports/${activeBatch.import_batch_id}`, { cache: "no-store" });
      prepareBatch(await responseJson<ImportBatch>(refreshed));
      setConfirmation(result);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  const filteredRows = useMemo(() => {
    if (!activeBatch) return [];
    const query = search.trim().toLocaleLowerCase();
    if (!query) return activeBatch.rows;
    return activeBatch.rows.filter((row) => [
      row.source_record_id,
      field(row, "EventName"),
      field(row, "OfferName"),
      field(row, "Game"),
      field(row, "Bookmaker"),
      field(row, "Offer"),
      field(row, "Status"),
      field(row, "AdjustmentType"),
      field(row, "Direction"),
      field(row, "LinkedAccount"),
      field(row, "Description"),
      field(row, "Account"),
      field(row, "Type"),
      field(row, "Group"),
      field(row, "Platform"),
      actionLabel(row.staged_action),
      compatibilityLabel(row),
      ...row.errors.map((item) => item.message),
      ...row.warnings.map((item) => item.message),
    ].some((value) => value.toLocaleLowerCase().includes(query)));
  }, [activeBatch, search]);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const visibleRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filteredSelectableIds = filteredRows
    .filter((row) => row.staged_action === "insert")
    .map((row) => row.import_staged_row_id);
  const allFilteredSelected = filteredSelectableIds.length > 0
    && filteredSelectableIds.every((id) => selectedRowIds.has(id));
  const canConfirm = activeBatch?.status === "dry_run_ready"
    && activeBatch.error_count === 0
    && activeBatch.row_accounting.state === "complete"
    && selectedRowIds.size > 0
    && acknowledged;
  const confirmDisabledReason = isLoading
    ? "Import review is processing."
    : !selectedRowIds.size
      ? "Select at least one compatible new or changed row to import."
      : activeBatch?.row_accounting.state === "mismatch"
        ? activeBatch.row_accounting.message
      : activeBatch?.error_count
        ? "Resolve blocking review issues before import."
        : !acknowledged
          ? "Confirm the target profile and backup acknowledgement before import."
          : "Ready to import the selected rows.";
  const visibleBatches = batches.filter((batch) => batchLedger(batch) === selectedLedger);

  function toggleAllFiltered() {
    setSelectedRowIds((current) => {
      const next = new Set(current);
      filteredSelectableIds.forEach((id) => allFilteredSelected ? next.delete(id) : next.add(id));
      return next;
    });
  }

  const modal = isOpen ? (
    <div className="modal-backdrop modal-backdrop-elevated" data-pd-id="import-review.backdrop" onClick={closeModal}>
      <section
        aria-label="Spreadsheet import review"
        aria-modal="true"
        className="modal-panel workflow-editor-modal spreadsheet-review-modal stack"
        data-pd-id="import-review.dialog"
        onClick={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
      >
        <div className="workflow-panel-header spreadsheet-review-header">
          <div>
            <span className="eyebrow">Profile-scoped spreadsheet review</span>
            <h2>{activeBatch ? `${ledgerLabel(batchLedger(activeBatch))} import review` : "Reviewing workbook"}</h2>
          </div>
          <button ref={closeButtonRef} aria-label="Close import review dialog" className="modal-close-button" data-pd-id="import-review.close" onClick={closeModal} type="button">×</button>
        </div>
        {isLoading && !activeBatch ? <LedgerLoadingIndicator label={`Reviewing ${ledgerLabel(selectedLedger).toLocaleLowerCase()} workbook`} /> : null}
        {activeBatch ? (
          <>
            <section className="spreadsheet-import-summary" aria-label="Import summary">
              <div><span>{activeBatch.status === "confirmed" ? "Imported rows" : "New rows"}</span><strong>{activeBatch.status === "confirmed" ? activeBatch.summary.imported ?? 0 : activeBatch.summary.insert ?? 0}</strong></div>
              <div><span>Changed rows</span><strong>{activeBatch.summary.update ?? 0}</strong></div>
              <div><span>Already imported</span><strong>{activeBatch.summary.no_op ?? 0}</strong></div>
              <div><span>Needs attention</span><strong>{activeBatch.summary.blocked ?? 0}</strong></div>
            </section>
            <div className="spreadsheet-review-statuses">
              <div
                className={`spreadsheet-row-accounting spreadsheet-row-accounting-${activeBatch.row_accounting.state}`}
                data-pd-id="import-review.row-accounting"
                role={activeBatch.row_accounting.state === "mismatch" ? "alert" : "status"}
              >
                <strong>{activeBatch.row_accounting.state === "complete" ? "All source rows accounted for" : "Source row mismatch"}</strong>
                <span>{activeBatch.row_accounting.accounted_row_count} of {activeBatch.row_accounting.source_row_count}</span>
              </div>
              {activeBatch.financial_reconciliation.state !== "not_available" ? (
                <div
                  aria-label={`${activeBatch.financial_reconciliation.ledger} financial comparison: ${activeBatch.financial_reconciliation.message}`}
                  className={`spreadsheet-financial-reconciliation spreadsheet-financial-reconciliation-${activeBatch.financial_reconciliation.state}`}
                  data-pd-id="import-review.financial-reconciliation"
                  role="status"
                  title={activeBatch.financial_reconciliation.message}
                >
                  <strong>{activeBatch.financial_reconciliation.state === "matched" ? "Matched financial values" : activeBatch.financial_reconciliation.state === "mismatch" ? `Financial difference ${formatReconciliationMoney(activeBatch.financial_reconciliation.difference)}` : "Financial comparison incomplete"}</strong>
                  <span>Workbook {formatReconciliationMoney(activeBatch.financial_reconciliation.source_total)} • Plum Duff {formatReconciliationMoney(activeBatch.financial_reconciliation.recomputed_total)}</span>
                </div>
              ) : null}
              <span className="spreadsheet-review-context">{profileId} • {activeBatch.source_filename}</span>
            </div>
            <div className="spreadsheet-review-controls">
              <label className="field-control table-search-field spreadsheet-search-control">
                <span>Search</span>
                <input aria-label="Search import review rows" data-pd-id="import-review.search" onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Event, account, description, ID or finding" type="search" value={search} />
              </label>
              <button className="button-link" disabled={!filteredSelectableIds.length} onClick={toggleAllFiltered} type="button">
                {allFilteredSelected ? "Deselect new rows" : "Select all new rows"}
              </button>
            </div>
            <div className="table-scroll spreadsheet-review-table-wrap" data-pd-id="import-review.table-scroll">
              <table className="data-table spreadsheet-review-table">
                <thead><tr>
                  <th scope="col">Select</th><th scope="col">Row</th><th scope="col">State</th>
                  <th scope="col">Item</th><th scope="col">Account or type</th><th scope="col">Import status</th>
                </tr></thead>
                <tbody>
                  {visibleRows.map((row) => {
                    const findings = [...row.errors, ...row.warnings];
                    return <tr key={row.import_staged_row_id}>
                      <td>
                        <input
                          aria-label={`${row.staged_action === "update" ? "Update" : "Import"} source row ${row.source_row ?? "unknown"}`}
                          checked={selectedRowIds.has(row.import_staged_row_id)}
                          disabled={!(["insert", "update"].includes(row.staged_action)) || activeBatch.status !== "dry_run_ready"}
                          onChange={() => setSelectedRowIds((current) => {
                            const next = new Set(current);
                            if (next.has(row.import_staged_row_id)) {
                              next.delete(row.import_staged_row_id);
                            } else {
                              next.add(row.import_staged_row_id);
                            }
                            return next;
                          })}
                          type="checkbox"
                        />
                      </td>
                      <td><strong>{row.source_row ?? "—"}</strong><span className="spreadsheet-row-id">{row.source_record_id || "Missing ID"}</span></td>
                      <td><span className={`status-chip import-action-${row.staged_action}`}>{actionLabel(row.staged_action)}</span></td>
                      <td>{field(row, "Account") !== "—" ? field(row, "Account") : field(row, "EventName") === "—" ? field(row, "OfferName") === "—" ? field(row, "Description") : field(row, "OfferName") : field(row, "EventName")}</td>
                      <td>{field(row, "Type") !== "—" ? field(row, "Type") : field(row, "Bookmaker") === "—" ? field(row, "LinkedAccount") : field(row, "Bookmaker")}</td>
                      <td>
                        <strong>{row.staged_action === "imported" ? "Imported in this batch" : row.staged_action === "skipped_by_operator" ? "Not imported by operator choice" : compatibilityLabel(row)}</strong>
                        {findings.length ? <details><summary>Review note</summary><ul className="spreadsheet-findings">{findings.map((finding) => <li key={finding.code}>{finding.message}</li>)}</ul></details> : null}
                        {row.staged_action === "update" && Object.keys(row.field_diffs ?? {}).length ? <details><summary>Review changed fields</summary><dl className="spreadsheet-row-details spreadsheet-row-diff">
                          {Object.entries(row.field_diffs).map(([name, values]) => <div key={name}><dt>{name.replaceAll("_", " ")}</dt><dd><span>Before: {values.before === "" || values.before === null ? "Blank" : String(values.before)}</span><span>After: {values.after === "" || values.after === null ? "Blank" : String(values.after)}</span></dd></div>)}
                        </dl></details> : null}
                      </td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
            <div className="spreadsheet-pagination">
              <span>Showing {visibleRows.length} of {filteredRows.length} rows • {selectedRowIds.size} selected</span>
              <div className="tracker-nav">
                <button className="button-link compact-action" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} type="button">Previous</button>
                <span>Page {page} of {pageCount}</span>
                <button className="button-link compact-action" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)} type="button">Next</button>
              </div>
            </div>
            {activeBatch.status === "dry_run_ready" && selectedRowIds.size ? (
              <label className="spreadsheet-confirmation-control">
                <input checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} type="checkbox" />
                <span>I confirm the {selectedRowIds.size} selected rows target this profile. Create a verified local backup before import.</span>
              </label>
            ) : null}
            {!selectedRowIds.size && activeBatch.status === "dry_run_ready" ? <p className="spreadsheet-no-change">No new rows are selected. Unchanged rows are skipped and do not require another import.</p> : null}
            {confirmation ? <div className="spreadsheet-backup-proof" role="status"><strong>Verified backup: {confirmation.backup_snapshot_id}</strong><span>SHA-256: {confirmation.backup_checksum_sha256}</span></div> : null}
            <div className="tracker-nav spreadsheet-review-actions">
              <button
                className="danger-button"
                disabled={isLoading || !activeBatch.status.startsWith("dry_run_")}
                onClick={() => deleteBatch(activeBatch)}
                title={activeBatch.status.startsWith("dry_run_") ? "Delete this unconfirmed review" : "Imported reviews are retained for audit and cannot be deleted"}
                type="button"
              >
                Delete review
              </button>
              {!activeBatch.status.startsWith("dry_run_") ? <span className="spreadsheet-audit-retention">Imported review retained for audit.</span> : null}
              <button className="button-link" onClick={closeModal} type="button">Close import review</button>
              {activeBatch.status === "dry_run_ready" ? <><span className="spreadsheet-action-reason" id="import-review-action-reason">{confirmDisabledReason}</span><button aria-describedby="import-review-action-reason" className="modal-primary-button" data-pd-id="import-review.import-selected-button" disabled={!canConfirm || isLoading} onClick={confirmImport} type="button">Create backup and import selected</button></> : null}
            </div>
          </>
        ) : null}
      </section>
    </div>
  ) : null;

  return <>
    <StatusToast message={message} onDismiss={() => setMessage("")} />
    <section className="content-subpanel stack spreadsheet-transfer-panel">
      <div className="workflow-panel-header">
        <div><span className="eyebrow">Profile data</span><h2>Spreadsheet transfer</h2></div>
        <div className="tracker-nav">
          <label className="field-control table-filter-field spreadsheet-ledger-control">
            <span className="visually-hidden">Spreadsheet type</span>
            <select aria-label="Spreadsheet transfer ledger" data-pd-id="spreadsheet-transfer.ledger" onChange={(event) => setSelectedLedger(event.target.value as LedgerKey)} value={selectedLedger}>
              <option value="sportsbook">Sportsbook Bets</option>
              <option value="free-bets">Free Bets</option>
              <option value="casino-offers">Casino Offers</option>
              <option value="cash-adjustments">Cash Adjustments</option>
              <option value="accounts">Accounts</option>
            </select>
          </label>
          <a aria-label={`Export ${ledgerLabel(selectedLedger)} XLSX`} className="button-link" data-pd-id="spreadsheet-transfer.export-ledger" download href={`${apiBaseUrl}/profiles/${profileId}/imports/${selectedLedger}/export.xlsx`}>Export XLSX</a>
          <label className="modal-primary-button spreadsheet-upload-button">Import XLSX<input accept=".xlsx" aria-label={`Choose ${ledgerLabel(selectedLedger)} workbook for import review`} data-pd-id="spreadsheet-transfer.import-file" onChange={handleWorkbook} type="file" /></label>
        </div>
      </div>
      {visibleBatches.length ? <div className="table-scroll" data-pd-id="spreadsheet-transfer.review-history"><table className="data-table spreadsheet-batch-table">
        <thead><tr><th scope="col">Workbook review</th><th scope="col">Reviewed</th><th scope="col">Rows</th><th scope="col">State</th><th scope="col">Actions</th></tr></thead>
        <tbody>{visibleBatches.slice(0, 10).map((batch) => <tr key={batch.import_batch_id}>
          <td>{batch.source_filename}</td><td>{formatBatchTime(batch.started_at)}</td><td>{batch.row_count}</td>
          <td><span className="status-chip">{batch.status === "confirmed" ? "Imported" : "Review available"}</span></td>
          <td><div className="tracker-nav"><button className="button-link compact-action" onClick={(event) => openBatch(batch.import_batch_id, event.currentTarget)} type="button">Review</button><button aria-label={`Delete review ${batch.source_filename}`} className="icon-action danger-icon-action" disabled={!batch.status.startsWith("dry_run_")} onClick={() => deleteBatch(batch)} title={batch.status.startsWith("dry_run_") ? "Delete this unconfirmed review" : "Imported reviews are retained for audit and cannot be deleted"} type="button"><span aria-hidden="true" className="material-symbols-outlined">delete</span></button></div></td>
        </tr>)}</tbody>
      </table></div> : <p className="spreadsheet-no-change" data-pd-id="spreadsheet-transfer.empty-history">No {ledgerLabel(selectedLedger)} spreadsheet reviews yet.</p>}
    </section>
    {modal && typeof document !== "undefined" ? createPortal(modal, document.body) : null}
  </>;
}
