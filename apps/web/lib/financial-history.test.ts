import { describe, expect, it } from "vitest";
import {
  financialHistoryOperationLabel,
  historyEventSummary,
  snapshotFinancialValue,
  type FinancialHistoryEvent,
} from "./financial-history";

const event: FinancialHistoryEvent = {
  history_id: "FH-SYNTHETIC",
  operation: "corrected",
  recorded_at: "2026-09-17T12:00:00Z",
  before_snapshot: { direction: "Out", amount: "10.00" },
  after_snapshot: { direction: "In", amount: "5.00" },
  source_identity: {},
  provenance: {},
  reason: "Corrected synthetic direction",
  actor_type: "local_user",
};

describe("financial history presentation", () => {
  it("shows a correction as previous and current meaning rather than a sum", () => {
    expect(snapshotFinancialValue("cash_adjustment", event.before_snapshot)).toBe(-10);
    expect(snapshotFinancialValue("cash_adjustment", event.after_snapshot)).toBe(5);
    expect(financialHistoryOperationLabel(event.operation)).toBe("Corrected");
  });

  it("explains archive as visibility rather than reversal", () => {
    expect(historyEventSummary({ ...event, operation: "archived" })).toContain(
      "settled result remains reportable"
    );
  });

  it("does not invent a value when a snapshot lacks governed financial meaning", () => {
    expect(snapshotFinancialValue("sportsbook", { status: "Settled" })).toBeNull();
  });
});
