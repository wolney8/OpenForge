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

  it.each([null, undefined, "", "  ", "invalid", "Infinity"])(
    "does not infer a withdrawal status from missing or invalid output %s",
    (value) => {
      const missingAvailable = period({ fee_withdrawn_amount: "5.00" });
      Object.assign(missingAvailable, { fee_outstanding_amount: value });
      const availableResult = deriveFeeCentreRow({ ...common, periods: [missingAvailable] });
      expect(availableResult.state).toBe("unavailable");
      expect(availableResult.availableToWithdraw).toBeNaN();
      expect(availableResult.feesEarned).toBe(20);
      expect(availableResult.feesWithdrawn).toBe(5);

      const missingWithdrawn = period();
      Object.assign(missingWithdrawn, { fee_withdrawn_amount: value });
      const withdrawnResult = deriveFeeCentreRow({ ...common, periods: [missingWithdrawn] });
      expect(withdrawnResult.state).toBe("unavailable");
      expect(withdrawnResult.feesWithdrawn).toBeNaN();
      expect(withdrawnResult.feesEarned).toBe(20);
      expect(withdrawnResult.availableToWithdraw).toBe(20);
    }
  );

  it("keeps independently known withdrawal outputs when earned fees are unavailable", () => {
    const source = period({ fee_withdrawn_amount: "5.00", fee_outstanding_amount: "15.00" });
    Object.assign(source.current_revision, { total_fee_due: null });
    const result = deriveFeeCentreRow({ ...common, periods: [source] });
    expect(result.feesEarned).toBeNaN();
    expect(result.feesWithdrawn).toBe(5);
    expect(result.availableToWithdraw).toBe(15);
  });

  it("does not classify a zero outstanding amount as done when withdrawals are unknown", () => {
    const source = period({ fee_outstanding_amount: "0.00" });
    Object.assign(source, { fee_withdrawn_amount: null });
    const result = deriveFeeCentreRow({ ...common, periods: [source] });
    expect(result.state).toBe("unavailable");
    expect(result.availableToWithdraw).toBe(0);
    expect(result.feesWithdrawn).toBeNaN();
  });
});
