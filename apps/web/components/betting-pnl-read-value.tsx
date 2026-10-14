"use client";

import { FinancialValue } from "@/components/financial-value";

export function BettingPnlReadValue({ activityCount, state, value }: {
  activityCount: number;
  state: "loading" | "ready" | "error";
  value: number;
}) {
  if (state === "loading") return <span className="betting-pnl-read-state"><span>Updating…</span></span>;
  if (state === "error") return <span className="betting-pnl-read-state"><span>Unavailable</span><small>Profit and loss could not be loaded</small></span>;
  if (activityCount === 0) return <span className="betting-pnl-empty"><span>£ 0.00</span><small>No betting activity in this range</small></span>;
  if (!Number.isFinite(value)) return <span className="betting-pnl-read-state"><span>Unavailable</span><small>Inspect affected betting records</small></span>;
  return <FinancialValue value={value} />;
}
