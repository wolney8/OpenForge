import { describe, expect, it } from "vitest";
import { deriveFeeCentreRow } from "./fee-centre-status";
import type { FeePeriodApiRecord } from "./fee-period-summary";

function period(overrides: Partial<FeePeriodApiRecord> = {}): FeePeriodApiRecord {
  return {
    fee_period_id: "fee-period-demo-2026-06",
    profile_id: "profile-demo-001",
    period_start: "2026-06-01",
    period_end: "2026-06-30",
    state: "crystallised",
    current_revision: {
      total_fee_due: "20.00",
      management_fee_amount: "15.00",
      investment_fee_amount: "5.00",
    },
    fee_withdrawn_amount: "0.00",
    fee_outstanding_amount: "20.00",
    ...overrides,
  };
}

const common = {
  month: "2026-06",
  lastClosedMonth: "2026-06",
  trackingStartDate: "2026-01-01",
};

describe("fee centre status", () => {
  it("marks a missing closed period for review", () => {
    expect(deriveFeeCentreRow({ ...common, periods: [] }).state).toBe("review_required");
  });

  it("marks a prepared period as waiting for confirmation", () => {
    expect(
      deriveFeeCentreRow({ ...common, periods: [period({ state: "ready_to_crystallise" })] }).state
    ).toBe("waiting_for_confirmation");
  });

  it("distinguishes available, partial, and completed withdrawals", () => {
    expect(deriveFeeCentreRow({ ...common, periods: [period()] }).state).toBe("ready_to_withdraw");
    expect(
      deriveFeeCentreRow({
        ...common,
        periods: [period({ fee_withdrawn_amount: "5.00", fee_outstanding_amount: "15.00" })],
      }).state
    ).toBe("part_withdrawn");
    expect(
      deriveFeeCentreRow({
        ...common,
        periods: [period({ fee_withdrawn_amount: "20.00", fee_outstanding_amount: "0.00" })],
      }).state
    ).toBe("done");
  });

  it("keeps open and pre-tracking months non-actionable", () => {
    expect(
      deriveFeeCentreRow({ ...common, month: "2026-07", periods: [] }).state
    ).toBe("open");
    expect(
      deriveFeeCentreRow({ ...common, trackingStartDate: "2026-07-01", periods: [] }).state
    ).toBe("not_applicable");
  });
});
