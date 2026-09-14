"use client";

import type { ReactNode } from "react";

import { CalculatorOutcomes } from "@/components/calculator-outcomes";
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

  return <CalculatorOutcomes busy={busy} description={description} inspectionId={inspectionId}
    title={live ? <><span className={`table-chip table-chip-danger calculator-live-chip${motion.ready && motion.enabled ? " is-motion-enabled" : ""}`}>LIVE</span><span>{title}</span></> : title}
    rows={rows.map((row) => ({
      key: row.label.toLowerCase().replaceAll(" ", "-"), label: row.label, total: row.value,
      copyableTotal: row.copyable || row.label === "Back wins" || row.label === "Back loses",
      tone: row.label === "Back wins" ? "positive" : row.label === "Back loses" ? "exchange" : row.label === "Liability" ? "warning" : "primary",
    }))} summary={action} />;
}
