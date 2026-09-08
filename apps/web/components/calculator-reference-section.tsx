"use client";

import type { ReactNode } from "react";

import { FinancialValue, FinancialValueReplayGroup } from "@/components/financial-value";
import { useFinancialMotionPreference } from "@/components/financial-motion-preference";

export type CalculatorReferenceRow = {
  label: string;
  value: string | null | undefined;
};

export function CalculatorReferenceSection({
  action,
  busy = false,
  description,
  inspectionId,
  live = false,
  rows,
  title,
}: {
  action?: ReactNode;
  busy?: boolean;
  description: string;
  inspectionId: string;
  live?: boolean;
  rows: CalculatorReferenceRow[];
  title: string;
}) {
  const motion = useFinancialMotionPreference();

  return <FinancialValueReplayGroup>
    <section aria-busy={busy} className="calculator-reference-section calculator-result-card" data-pd-id={inspectionId}>
      <div className="calculator-result-card-heading calculator-reference-heading">
        <h3>{live ? <><span className={`table-chip table-chip-danger calculator-live-chip${motion.ready && motion.enabled ? " is-motion-enabled" : ""}`}>LIVE</span><span>{title}</span></> : title}</h3>
      </div>
      <p className="calculator-section-guidance">{description}</p>
      <dl className="calculator-reference-rows">
        {rows.map((row) => <div className="calculator-reference-row" key={row.label}>
          <dt><span>{row.label}</span></dt>
          <dd>{row.value === null || row.value === undefined || row.value === "" ? <span>£ -</span> : <FinancialValue label={row.label} value={row.value} />}</dd>
        </div>)}
      </dl>
      {action ? <div className="calculator-reference-action">{action}</div> : null}
    </section>
  </FinancialValueReplayGroup>;
}
