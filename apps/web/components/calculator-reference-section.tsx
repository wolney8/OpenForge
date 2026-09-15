"use client";

import type { ReactNode } from "react";

import { CalculatorOutcomes } from "@/components/calculator-outcomes";
import { ContextHelp } from "@/components/context-help";
import { useFinancialMotionPreference } from "@/components/financial-motion-preference";

export type CalculatorReferenceRow = {
  copyable?: boolean;
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
  tone = "standard",
}: {
  action?: ReactNode;
  busy?: boolean;
  description: string;
  inspectionId: string;
  live?: boolean;
  rows: CalculatorReferenceRow[];
  title: string;
  tone?: "standard" | "underlay" | "overlay" | "custom";
}) {
  const motion = useFinancialMotionPreference();

  const heading = <>{live ? <span className={`table-chip table-chip-danger calculator-live-chip${motion.ready && motion.enabled ? " is-motion-enabled" : ""}`}>LIVE</span> : null}{title}</>;

  return <CalculatorOutcomes busy={busy} className={`calculator-reference-section calculator-reference-tone-${tone}`} inspectionId={inspectionId}
    headingAction={<ContextHelp label={`About ${title}`} text={description} />} title={heading} variant="reference"
    rows={rows.map((row) => ({
      key: row.label.toLowerCase().replaceAll(" ", "-"), label: row.label, total: row.value,
      copyableTotal: row.copyable,
      tone: row.label === "Back wins" ? "positive" : row.label === "Back loses" ? "exchange" : row.label === "Liability" ? "warning" : "primary",
    }))} summary={action} />;
}
