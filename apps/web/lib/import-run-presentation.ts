type ImportRunPresentationInput = {
  approvedAt?: string;
  currentStatus?: string;
  preflightPassed: boolean;
  reconciliationResult?: string;
  rollbackStatus?: string;
  rolledBackAt?: string;
};

export type ImportRunPresentation = {
  approvedReady: boolean;
  currentRetryable: boolean;
  currentStateLabel: string;
  hasPreviousFailedAttempt: boolean;
  importActionLabel: "Import to Profile" | "Retry import";
  restoredRetryable: boolean;
};

export function resolveImportRunPresentation({
  approvedAt,
  currentStatus,
  preflightPassed,
  reconciliationResult,
  rollbackStatus,
  rolledBackAt,
}: ImportRunPresentationInput): ImportRunPresentation {
  const approved = Boolean(approvedAt);
  const approvedReady = currentStatus === "READY_APPROVED" && approved;
  const currentRetryable = approvedReady && preflightPassed;
  const hasPreviousFailedAttempt = currentRetryable
    && rollbackStatus === "COMPLETE"
    && Boolean(rolledBackAt)
    && reconciliationResult === "POST-IMPORT RECONCILIATION: FAILED";
  const restoredRetryable = hasPreviousFailedAttempt;

  return {
    approvedReady,
    currentRetryable,
    currentStateLabel: restoredRetryable ? "Restored and ready to retry" : "Ready for import",
    hasPreviousFailedAttempt,
    importActionLabel: restoredRetryable ? "Retry import" : "Import to Profile",
    restoredRetryable,
  };
}
