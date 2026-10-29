"use client";

import { FinancialValue } from "@/components/financial-value";
import type { FinancialAggregateResult } from "@/lib/financial-aggregate";

export function FinancialAggregateReadValue({
  aggregate,
  label,
  state,
  subject,
}: {
  aggregate: FinancialAggregateResult;
  label: string;
  state: "loading" | "ready" | "error";
  subject: string;
}) {
  if (state === "loading") {
    return <span className="financial-aggregate-read-state" role="status">Loading {subject}…</span>;
  }
  if (state === "error") {
    return <span className="financial-aggregate-read-state"><strong>Unavailable</strong><small>{subject} could not be loaded</small></span>;
  }
  if (aggregate.unknownCount === 0) {
    return <FinancialValue label={label} value={aggregate.knownValue} />;
  }
  if (aggregate.knownCount === 0) {
    return (
      <span className="financial-aggregate-read-state" data-financial-state="unavailable">
        <strong>Unavailable</strong>
        <small>{aggregate.unknownCount} {aggregate.unknownCount === 1 ? "record" : "records"} without an authoritative value</small>
      </span>
    );
  }
  return (
    <span className="financial-aggregate-read-state" data-financial-state="partial">
      <strong><FinancialValue label={`Known ${label}`} value={aggregate.knownValue} /> <span className="financial-known-qualifier">known</span></strong>
      <small>Incomplete · {aggregate.unknownCount} {aggregate.unknownCount === 1 ? "record" : "records"} unavailable</small>
    </span>
  );
}
