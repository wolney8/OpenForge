"use client";

import { FinancialValue } from "@/components/financial-value";

export function BettingPnlReadValue({ activityCount, state, value }: {
  activityCount: number;
  state: "loading" | "ready" | "error";
  value: number;
}) {
  if (state === "loading") return <span>Loading profit and loss…</span>;
  if (state === "error") return <span>Profit and loss unavailable · data could not be loaded</span>;
  if (activityCount === 0) return <span className="betting-pnl-empty"><span>£ 0.00</span><small>No betting activity in this range</small></span>;
  if (!Number.isFinite(value)) return <span>Profit and loss unavailable · inspect affected betting records</span>;
  return <FinancialValue value={value} />;
}
