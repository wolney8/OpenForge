"use client";

import type { ReactNode } from "react";

import { CalculatorSectionHeading } from "@/components/calculator-section-heading";
import { ContextHelp } from "@/components/context-help";
import { CopyableFinancialValue } from "@/components/copyable-financial-value";
import { FinancialValue, FinancialValueReplayGroup } from "@/components/financial-value";
import { useFinancialMotionPreference } from "@/components/financial-motion-preference";

export type CalculatorReferenceRow = {
  copyable?: boolean;
  label: string;
  value: string | null | undefined;
};

function referenceValue(value: string | null | undefined, label: string) {
  const parsed = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(parsed)
    ? <span>£ -</span>
    : <FinancialValue label={label} value={parsed} />;
}

export function CalculatorReferenceSection({
  action,
  busy = false,
  copyActionLabel,
  description,
  inspectionId,
  live = false,
  onCopy,
  rows,
  title,
  tone = "standard",
}: {
  action?: ReactNode;
  busy?: boolean;
  copyActionLabel?: string;
  description: string;
  inspectionId: string;
  live?: boolean;
  onCopy?: (value: string) => boolean | Promise<boolean>;
  rows: CalculatorReferenceRow[];
  title: string;
  tone?: "standard" | "underlay" | "overlay" | "custom";
}) {
  const motion = useFinancialMotionPreference();

  const heading = <>{live ? <span className={`table-chip table-chip-danger calculator-live-chip${motion.ready && motion.enabled ? " is-motion-enabled" : ""}`}>LIVE</span> : null}{title}</>;

  return <section aria-busy={busy} className={`calculator-reference-section calculator-reference-tone-${tone}`} data-pd-id={inspectionId}>
    <CalculatorSectionHeading action={<ContextHelp label={`About ${title}`} text={description} />} className="calculator-reference-card-heading" title={heading} />
    {action ? <div className="calculator-reference-card-control">{action}</div> : null}
    <dl className="calculator-reference-card-values">
      {rows.map((row) => <FinancialValueReplayGroup key={row.label.toLowerCase().replaceAll(" ", "-")}>
        <div className="calculator-reference-card-row">
          <dt>{row.label}</dt>
          <dd>{row.copyable
            ? <CopyableFinancialValue actionLabel={copyActionLabel} disabled={busy} dataPdId={`${inspectionId}.${row.label.toLowerCase().replaceAll(" ", "-")}.copyable`} label={row.label} onCopy={onCopy} value={row.value} />
            : referenceValue(row.value, row.label)}</dd>
        </div>
      </FinancialValueReplayGroup>)}
    </dl>
  </section>;
}
