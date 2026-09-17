export type FinancialHistoryLedger =
  | "cash_adjustment"
  | "extra_place"
  | "casino"
  | "sportsbook"
  | "free_bet";

export type FinancialHistoryEvent = {
  history_id: string;
  operation: string;
  recorded_at: string;
  before_snapshot: Record<string, unknown> | null;
  after_snapshot: Record<string, unknown> | null;
  source_identity: Record<string, unknown>;
  provenance: Record<string, unknown>;
  reason: string;
  actor_type: string;
};

const operationLabels: Record<string, string> = {
  baseline_observed: "Existing record observed",
  created: "Created",
  edited: "Edited",
  placement_recorded: "Placement recorded",
  settled: "Settled",
  corrected: "Corrected",
  voided: "Voided",
  archived: "Archived",
  removed: "Removed",
  reversed: "Reversed",
};

export function financialHistoryOperationLabel(operation: string): string {
  return operationLabels[operation] ?? operation.replaceAll("_", " ");
}

function text(snapshot: Record<string, unknown> | null, key: string): string {
  const value = snapshot?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function numeric(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function snapshotFinancialValue(
  ledger: FinancialHistoryLedger,
  snapshot: Record<string, unknown> | null
): number | null {
  if (!snapshot) return null;
  const override = numeric(text(snapshot, "manual_override_value"));
  if (override !== null) return override;
  if (ledger === "cash_adjustment") {
    const amount = numeric(text(snapshot, "amount"));
    if (amount === null) return null;
    return text(snapshot, "direction").toLowerCase() === "out" ? -amount : amount;
  }
  if (ledger === "casino") {
    return numeric(text(snapshot, "final_net_pnl")) ?? numeric(text(snapshot, "calc_net_pnl"));
  }
  if (ledger === "extra_place") {
    return numeric(text(snapshot, "imported_historical_pnl"));
  }
  return null;
}

export function historyEventSummary(event: FinancialHistoryEvent): string {
  const snapshot = event.after_snapshot ?? event.before_snapshot;
  const status = text(snapshot, "status");
  const result = text(snapshot, "result");
  if (event.operation === "archived") {
    return "Hidden from the active list; its settled result remains reportable.";
  }
  if (event.operation === "baseline_observed") {
    return "Earlier changes were not recorded. This is the first truthful history baseline.";
  }
  if (status && result && result !== "Pending") return `${status} · ${result}`;
  return status || result || "Recorded in Plum Duff";
}
