"use client";

type LedgerSettledDeleteGuardProps = {
  disabled?: boolean;
  ledgerLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  onReasonChange: (reason: string) => void;
  reason: string;
  rowLabel: string;
};

export function LedgerSettledDeleteGuard({
  disabled = false,
  ledgerLabel,
  onCancel,
  onConfirm,
  onReasonChange,
  reason,
  rowLabel,
}: LedgerSettledDeleteGuardProps) {
  const trimmedReason = reason.trim();

  return (
    <section
      aria-label={`Confirm settled ${ledgerLabel} deletion`}
      className="ledger-settled-delete-guard"
      data-pd-id={`${ledgerLabel}.settled-delete-guard`}
    >
      <div className="ledger-settled-delete-guard-copy">
        <span className="eyebrow">Deletion Reason Required</span>
        <strong>Delete settled row {rowLabel}?</strong>
        <span>Settled rows need a reason before they can be removed.</span>
      </div>
      <label className="field-control ledger-settled-delete-reason">
        <span>Deletion Reason</span>
        <input
          aria-label={`Deletion reason for settled ${ledgerLabel} row ${rowLabel}`}
          disabled={disabled}
          onChange={(event) => onReasonChange(event.target.value)}
          placeholder="Enter the audit reason"
          value={reason}
        />
      </label>
      <div className="ledger-settled-delete-guard-actions">
        <button
          className="review-chip review-chip-danger"
          disabled={disabled || !trimmedReason}
          onClick={onConfirm}
          type="button"
        >
          Delete
        </button>
        <button className="review-chip" disabled={disabled} onClick={onCancel} type="button">
          Cancel
        </button>
      </div>
    </section>
  );
}
