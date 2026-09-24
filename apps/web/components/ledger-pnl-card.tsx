"use client";

import { FinancialReadValue, type FinancialReadState } from "@/components/financial-read-value";
import { MotionReplayGroup } from "@/components/motion-replay-group";

export type LedgerReadState = FinancialReadState;

/** Same stat-card geometry; unresolved reads are not zero financial results. */
export function LedgerPnlCard({ label, description, value, state }: {
  label: string; description: string; value: number; state: "loading" | "ready" | "error";
}) {
  return <MotionReplayGroup>
    <article className="stat-card" data-pd-id="ledger.pnl-card" aria-busy={state === "loading"}>
      <span className="eyebrow">{label}</span>
      <strong><FinancialReadValue state={state} subject="P&L" value={value} /></strong>
      <span>{description}</span>
    </article>
  </MotionReplayGroup>;
}
