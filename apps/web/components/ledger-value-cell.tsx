"use client";

import { FinancialValue } from "@/components/financial-value";

type LedgerValueCellProps = {
  fallback?: string;
  label?: string;
  value: number | null;
};

function getLedgerValueIcon(label: string): {
  accessibleLabel: string;
  icon: "done_all" | "hourglass_top" | "payments";
  state: "current" | "final" | "neutral";
  tooltip: string;
} {
  const normalisedLabel = label.toLowerCase();
  if (normalisedLabel.includes("final")) {
    return {
      accessibleLabel: "Final value",
      icon: "done_all",
      state: "final",
      tooltip: "Final value: settled result value for this row.",
    };
  }
  if (normalisedLabel.includes("current") || normalisedLabel.includes("projected")) {
    return {
      accessibleLabel: "Current value",
      icon: "hourglass_top",
      state: "current",
      tooltip: "Current value: cash-first value while this row is still open.",
    };
  }
  return {
    accessibleLabel: label || "Ledger value",
    icon: "payments",
    state: "neutral",
    tooltip: `${label || "Ledger value"}: displayed money value for this row.`,
  };
}

export function LedgerValueCell({ fallback = "—", label = "Value", value }: LedgerValueCellProps) {
  const valueState = getLedgerValueIcon(label);

  return (
    <span
      aria-label={valueState.tooltip}
      className="table-value-cell ledger-value-cell"
      title={valueState.tooltip}
    >
      <strong>
        {value === null ? (
          <span
            className="ledger-financial-value ledger-financial-value-unavailable"
            title={valueState.tooltip}
          >
            {fallback}
          </span>
        ) : (
          <FinancialValue
            className="ledger-financial-value"
            label={valueState.accessibleLabel}
            title={valueState.tooltip}
            value={value}
          />
        )}
      </strong>
      <span
        aria-label={valueState.accessibleLabel}
        className={`ledger-value-state ledger-value-state-${valueState.state}`}
        title={valueState.tooltip}
      >
        <span aria-hidden="true" className="material-symbols-outlined">
          {valueState.icon}
        </span>
      </span>
    </span>
  );
}
