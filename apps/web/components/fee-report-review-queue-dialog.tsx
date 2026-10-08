"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FinancialValue, FinancialValueReplayRow } from "./financial-value";
import { LedgerPagination } from "./ledger-pagination";

export type FeeReportQueueEntry = {
  key: string;
  profileId: string;
  profileName: string;
  month: string;
  monthLabel: string;
  state: "review_required" | "awaiting_confirmation" | "crystallised" | "open" | "not_applicable";
  amount: number | null;
};

type FeeReportReviewQueueDialogProps = {
  entries: FeeReportQueueEntry[];
  label: string;
  onClose: () => void;
  onReview: (profileId: string, month: string) => void;
  open: boolean;
};

const stateLabels: Record<FeeReportQueueEntry["state"], string> = {
  review_required: "Review Required",
  awaiting_confirmation: "Awaiting Confirmation",
  crystallised: "Fees Earned",
  open: "Open Month",
  not_applicable: "Not Applicable",
};

export function FeeReportReviewQueueDialog({
  entries,
  label,
  onClose,
  onReview,
  open,
}: FeeReportReviewQueueDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(16);
  const pageCount = Math.max(1, Math.ceil(entries.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleEntries = useMemo(
    () => entries.slice((safePage - 1) * pageSize, safePage * pageSize),
    [entries, pageSize, safePage]
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      aria-labelledby="fee-report-queue-title"
      className="fee-report-queue-dialog"
      data-pd-id="formal-reports.fee-review-queue.dialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      <header className="modal-sticky-header section-heading-row">
        <div>
          <span className="eyebrow">Fund Manager Fees</span>
          <h2 id="fee-report-queue-title">Fee Review Queue</h2>
          <span>{label}</span>
        </div>
        <button
          aria-label="Close fee review queue"
          className="dialog-close-button"
          data-pd-id="formal-reports.fee-review-queue.close"
          onClick={onClose}
          type="button"
        >
          <span aria-hidden="true" className="material-symbols-outlined">close</span>
        </button>
      </header>

      <div className="fee-report-queue-body">
        <LedgerPagination
          ariaLabel="Fee Review Queue"
          currentPage={safePage}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          pageCount={pageCount}
          pageSize={pageSize}
          position="top"
          totalRows={entries.length}
        />
        <div className="table-scroll" data-pd-id="formal-reports.fee-review-queue.table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Profile</th>
                <th scope="col">Month</th>
                <th scope="col">State</th>
                <th scope="col">Amount</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleEntries.map((entry) => {
                const canOpen = entry.state !== "open" && entry.state !== "not_applicable";
                const actionLabel =
                  entry.state === "crystallised"
                    ? "View Details"
                    : entry.state === "awaiting_confirmation"
                      ? "Confirm Fees"
                      : "Review Fees";
                return (
                  <FinancialValueReplayRow key={entry.key}>
                    <td>{entry.profileName}</td>
                    <td>{entry.monthLabel}</td>
                    <td><span className="table-status">{stateLabels[entry.state]}</span></td>
                    <td>{entry.amount === null ? "—" : <FinancialValue value={entry.amount} />}</td>
                    <td>
                      <button
                        aria-label={`${actionLabel} for ${entry.profileName}, ${entry.monthLabel}`}
                        className="button-link report-action-link"
                        data-pd-id={`formal-reports.fee-review-queue.${entry.profileId}.${entry.month}`}
                        disabled={!canOpen}
                        onClick={() => onReview(entry.profileId, entry.month)}
                        type="button"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined">
                          {entry.state === "crystallised" ? "visibility" : "calculate"}
                        </span>
                        {actionLabel}
                      </button>
                    </td>
                  </FinancialValueReplayRow>
                );
              })}
            </tbody>
          </table>
        </div>
        <LedgerPagination
          ariaLabel="Fee Review Queue"
          currentPage={safePage}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          pageCount={pageCount}
          pageSize={pageSize}
          position="bottom"
          totalRows={entries.length}
        />
      </div>

      <footer className="modal-sticky-footer">
        <button className="button-link" onClick={onClose} type="button">Close</button>
      </footer>
    </dialog>
  );
}
