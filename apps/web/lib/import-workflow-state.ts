export type ImportWorkflowState =
  | "ANALYSED"
  | "REVIEW_REQUIRED"
  | "REVIEW_COMPLETE"
  | "DRY_RUN_READY"
  | "APPROVING"
  | "APPROVAL_INTERRUPTED"
  | "READY_APPROVED"
  | "IMPORTING"
  | "RECONCILING"
  | "COMPLETE"
  | "FAILED";

export type ImportWorkflowStepState = "completed" | "current" | "blocked" | "failed" | "upcoming";

export type ImportWorkflowStep = {
  key: "upload" | "analysis" | "review" | "dry-run" | "approval" | "import" | "reconciliation";
  label: string;
  state: ImportWorkflowStepState;
};

const steps = [
  ["upload", "Upload"],
  ["analysis", "Analysis"],
  ["review", "Review"],
  ["dry-run", "Dry Run"],
  ["approval", "Approval"],
  ["import", "Import"],
  ["reconciliation", "Reconciliation"],
] as const;

const currentStepByState: Record<ImportWorkflowState, number> = {
  ANALYSED: 1,
  REVIEW_REQUIRED: 2,
  REVIEW_COMPLETE: 3,
  DRY_RUN_READY: 4,
  APPROVING: 4,
  APPROVAL_INTERRUPTED: 4,
  READY_APPROVED: 5,
  IMPORTING: 5,
  RECONCILING: 6,
  COMPLETE: 6,
  FAILED: 1,
};

export function normalizeImportWorkflowState(
  persistedStatus: string | undefined,
  options: { approvedAt?: string; executionStage?: string; failureStage?: string } = {},
): ImportWorkflowState {
  if (persistedStatus === "READY") return "DRY_RUN_READY";
  if (persistedStatus === "ANALYSING") return "ANALYSED";
  if (persistedStatus === "IMPORT_FAILED" || persistedStatus === "ROLLED_BACK") return "FAILED";
  if (persistedStatus === "POST_IMPORT_RECONCILIATION_FAILED") return "FAILED";
  if (persistedStatus === "FAILED") return "FAILED";
  if (persistedStatus && persistedStatus in currentStepByState) {
    return persistedStatus as ImportWorkflowState;
  }
  if (options.executionStage === "RECONCILING") return "RECONCILING";
  if (options.approvedAt) return "READY_APPROVED";
  return "ANALYSED";
}

function failedStep(options: { approvedAt?: string; executionStage?: string; failureStage?: string }): number {
  const stage = `${options.executionStage ?? ""} ${options.failureStage ?? ""}`.toLocaleUpperCase();
  if (stage.includes("RECONCIL")) return 6;
  if (options.approvedAt || stage.includes("IMPORT") || stage.includes("ACCOUNT") || stage.includes("LEDGER")) return 5;
  if (stage.includes("APPROV")) return 4;
  if (stage.includes("REVIEW")) return 2;
  return 1;
}

export function importWorkflowSteps(
  state: ImportWorkflowState,
  options: { approvedAt?: string; executionStage?: string; failureStage?: string } = {},
): ImportWorkflowStep[] {
  const current = state === "FAILED" ? failedStep(options) : currentStepByState[state];
  return steps.map(([key, label], index) => {
    let stepState: ImportWorkflowStepState = index < current ? "completed" : index === current ? "current" : "upcoming";
    if (state === "REVIEW_REQUIRED" && index === current) stepState = "blocked";
    if ((state === "FAILED" || state === "APPROVAL_INTERRUPTED") && index === current) {
      stepState = "failed";
    }
    if (state === "COMPLETE") stepState = "completed";
    return { key, label, state: stepState };
  });
}

export function importWorkflowLabel(state: ImportWorkflowState): string {
  const labels: Record<ImportWorkflowState, string> = {
    ANALYSED: "Analysis in progress",
    REVIEW_REQUIRED: "Review required",
    REVIEW_COMPLETE: "Review complete",
    DRY_RUN_READY: "Dry run ready",
    APPROVING: "Approving dry run",
    APPROVAL_INTERRUPTED: "Approval interrupted",
    READY_APPROVED: "Ready to import",
    IMPORTING: "Importing",
    RECONCILING: "Reconciling",
    COMPLETE: "Complete",
    FAILED: "Action failed",
  };
  return labels[state];
}

export function isConflictingImportMutation(state: ImportWorkflowState, persistedStatus?: string): boolean {
  return ["APPROVING", "IMPORTING", "RECONCILING"].includes(state)
    || persistedStatus === "ANALYSING"
    || persistedStatus === "ANALYSED";
}
