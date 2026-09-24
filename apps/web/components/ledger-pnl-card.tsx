"use client";

import { FinancialValue } from "@/components/financial-value";
import { MotionReplayGroup } from "@/components/motion-replay-group";

export type LedgerReadState = { profileId: string; state: "loading" | "ready" | "error" } | null;

/** Same stat-card geometry; unresolved reads are not zero financial results. */
export function LedgerPnlCard({ label, description, value, state }: {
  label: string; description: string; value: number; state: "loading" | "ready" | "error";
}) {
  return <MotionReplayGroup>
    <article className="stat-card" data-pd-id="ledger.pnl-card" aria-busy={state === "loading"}>
      <span className="eyebrow">{label}</span>
      <strong>{state === "ready" ? <FinancialValue value={value} /> :
        <span>{state === "loading" ? "Loading P&L…" : "P&L unavailable"}</span>}</strong>
      <span>{description}</span>
    </article>
  </MotionReplayGroup>;
}
