import type { ReactNode } from "react";

import { FinancialValue, FinancialValueReplayGroup } from "@/components/financial-value";
import { CopyableFinancialValue } from "@/components/copyable-financial-value";
import { CalculatorTableSection } from "@/components/calculator-table-section";
import { formatFinancialValue } from "@/lib/financial-display";

export type CalculatorOutcomeValue = string | number | null | undefined;

export type CalculatorOutcomeScenario = {
  key: string;
  label: string;
  tone?: "primary" | "exchange" | "positive" | "warning" | "danger" | "neutral";
  components?: CalculatorOutcomeValue[][];
  total: CalculatorOutcomeValue;
  selected?: boolean;
  copyableTotal?: boolean;
};

function asNumber(value: CalculatorOutcomeValue) {
  const parsed = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(parsed)
    ? null
    : parsed;
}

function accessibleValue(value: CalculatorOutcomeValue) {
  const parsed = asNumber(value);
  return parsed === null ? "£ -" : formatFinancialValue(parsed);
}

export function CalculatorOutcomeValueDisplay({ label, value }: { label: string; value: CalculatorOutcomeValue }) {
  const parsed = asNumber(value);
  return <span className="extra-place-matrix-value">{parsed === null ? "£ -" : <FinancialValue label={label} value={parsed} />}</span>;
}

export function CalculatorOutcomes({
  className,
  columns = [],
  busy = false,
  description,
  headingAction,
  inspectionId,
  rows,
  summary,
  title = "Outcomes",
}: {
  className?: string;
  busy?: boolean;
  columns?: string[];
  description?: ReactNode;
  headingAction?: ReactNode;
  inspectionId: string;
  rows: CalculatorOutcomeScenario[];
  summary?: ReactNode;
  title?: ReactNode;
}) {
  return <CalculatorTableSection busy={busy} className={`calculator-outcomes-matrix extra-place-outcome-matrix${className ? ` ${className}` : ""}`} headingAction={headingAction} inspectionId={inspectionId} title={title}>
    {description ? <p className="calculator-section-guidance">{description}</p> : null}
    <div className="calculator-outcomes-table extra-place-outcome-table" role="table">
      {columns.length > 0 ? <div className={`extra-place-outcome-row extra-place-outcome-row-heading calculator-outcome-columns-${Math.min(columns.length, 3)}`} role="row">
        <strong role="columnheader">Scenario</strong>
        {columns.map((column) => <span key={column} role="columnheader">{column}</span>)}
        <strong role="columnheader">Total</strong>
      </div> : null}
      {rows.map((row) => {
        const components = row.components ?? [];
        const accessibleComponents = components.map((values, index) => `${columns[index] ?? `component ${index + 1}`} ${values.map(accessibleValue).join(" and ")}`).join("; ");
        const accessibleLabel = `${row.label}${accessibleComponents ? `: ${accessibleComponents};` : ":"} total ${accessibleValue(row.total)}`;
        return <FinancialValueReplayGroup key={row.key}>
          <div
            aria-label={accessibleLabel}
            className={`calculator-outcome-scenario-row extra-place-outcome-row calculator-outcome-columns-${Math.min(columns.length, 3)} calculator-outcome-tone-${row.tone ?? "neutral"}${row.selected ? " is-selected" : ""}`}
            role="row"
          >
            <strong>{row.label}</strong>
            {components.map((values, componentIndex) => <span data-label={columns[componentIndex]} key={`${row.key}-${columns[componentIndex] ?? componentIndex}`}>
              {values.map((value, valueIndex) => <span className="calculator-outcome-component-value" key={`${valueIndex}-${String(value)}`}>
                {valueIndex > 0 ? <b aria-hidden="true">+</b> : null}
                <CalculatorOutcomeValueDisplay label={`${row.label} ${columns[componentIndex] ?? "component"} ${valueIndex + 1}`} value={value} />
              </span>)}
            </span>)}
            <strong data-label="Total">{row.copyableTotal
              ? <CopyableFinancialValue disabled={busy} dataPdId={`${inspectionId}.${row.key}.copyable`} label={`${row.label} total`} value={row.total} />
              : <CalculatorOutcomeValueDisplay label={`${row.label} total`} value={row.total} />}</strong>
          </div>
        </FinancialValueReplayGroup>;
      })}
    </div>
    {summary ? <div className="calculator-outcomes-summary extra-place-outcome-summary">{summary}</div> : null}
  </CalculatorTableSection>;
}
