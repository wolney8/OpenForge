import type { ReactNode } from "react";

import { FinancialValue, FinancialValueReplayGroup } from "@/components/financial-value";
import { formatFinancialValue } from "@/lib/financial-display";

export type CalculatorOutcomeValue = string | number | null | undefined;

export type CalculatorOutcomeScenario = {
  key: string;
  label: string;
  tone?: "primary" | "exchange" | "positive" | "warning" | "danger" | "neutral";
  components?: CalculatorOutcomeValue[][];
  total: CalculatorOutcomeValue;
  selected?: boolean;
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
  columns = [],
  description,
  inspectionId,
  rows,
  summary,
}: {
  columns?: string[];
  description?: ReactNode;
  inspectionId: string;
  rows: CalculatorOutcomeScenario[];
  summary?: ReactNode;
}) {
  return <section className="calculator-outcomes-matrix extra-place-outcome-matrix calculator-result-card" data-pd-id={inspectionId}>
    <div className="calculator-result-card-heading"><h3>Outcomes</h3></div>
    {description ? <p className="calculator-section-guidance">{description}</p> : null}
    <div className="calculator-outcomes-table extra-place-outcome-table" role="table">
      {rows.map((row) => {
        const components = row.components ?? [];
        const accessibleComponents = components.map((values, index) => `${columns[index] ?? `component ${index + 1}`} ${values.map(accessibleValue).join(" and ")}`).join("; ");
        return <FinancialValueReplayGroup key={row.key}>
          <div
            aria-label={`${row.label}${accessibleComponents ? `: ${accessibleComponents};` : ":"} total ${accessibleValue(row.total)}`}
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
            <strong data-label="Total"><CalculatorOutcomeValueDisplay label={`${row.label} total`} value={row.total} /></strong>
          </div>
        </FinancialValueReplayGroup>;
      })}
    </div>
    {summary ? <div className="calculator-outcomes-summary extra-place-outcome-summary">{summary}</div> : null}
  </section>;
}
