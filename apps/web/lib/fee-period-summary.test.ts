import { describe, expect, it } from "vitest";
import {
  buildFeeBlockerHref,
  calculateWeeklyIndicativeFeeImpact,
  combineFeePositions,
  getClosedMonthOptions,
  getPreviousMonthValue,
  summarizeFeePeriods,
  summarizeFeePeriodsForReports,
  summarizeWeeklyIndicativeFeeImpacts,
  type FeePeriodApiRecord,
} from "./fee-period-summary";

const periods: FeePeriodApiRecord[] = [
  {
    fee_period_id: "FEE-PERIOD-001",
    profile_id: "PROFILE-001",
    period_start: "2026-06-01",
    period_end: "2026-06-30",
    state: "crystallised",
    current_revision: {
      total_fee_due: "50.00",
      management_fee_amount: "10.00",
      investment_fee_amount: "40.00",
    },
    fee_withdrawn_amount: "10.00",
    fee_outstanding_amount: "40.00",
  },
  {
    fee_period_id: "FEE-PERIOD-002",
    profile_id: "PROFILE-001",
    period_start: "2026-07-01",
    period_end: "2026-07-31",
    state: "ready_to_crystallise",
    current_revision: {
      total_fee_due: "15.00",
      management_fee_amount: "3.00",
      investment_fee_amount: "12.00",
    },
    fee_withdrawn_amount: "0.00",
    fee_outstanding_amount: "15.00",
  },
];

describe("fee-period summary", () => {
  it("shows signed weekly indicative impact without crystallising a fee", () => {
    expect(calculateWeeklyIndicativeFeeImpact(45, "35.00", "5.00")).toBe(18);
    expect(calculateWeeklyIndicativeFeeImpact(-10, "35.00", "5.00")).toBe(-4);
  });

  it("rounds fee components per profile before combining weekly impact", () => {
    const impacts = summarizeWeeklyIndicativeFeeImpacts([
      {
        managementFeePercent: "10.00",
        investmentFeePercent: "5.00",
        weeklyReports: [{ periodKey: "2026-07-06", totalPnl: 10.03 }],
      },
      {
        managementFeePercent: "20.00",
        investmentFeePercent: "0.00",
        weeklyReports: [{ periodKey: "2026-07-06", totalPnl: 5.02 }],
      },
    ]);
    expect(impacts.get("2026-07-06")).toBe(2.5);
  });

  it("offers every completed month from tracking start, including June 2026", () => {
    const now = new Date("2026-07-18T12:00:00Z");

    expect(getPreviousMonthValue(now)).toBe("2026-06");
    expect(getClosedMonthOptions("2026-05-15", now)).toEqual([
      { label: "June 2026", value: "2026-06" },
      { label: "May 2026", value: "2026-05" },
    ]);
  });

  it("builds exact ledger searches for actionable fee blockers", () => {
    expect(buildFeeBlockerHref("PROFILE-001", "sportsbook", "SB ACTION/1")).toBe(
      "/profiles/PROFILE-001/tracker/sportsbook-bets?search=SB%20ACTION%2F1&record=SB%20ACTION%2F1&source=fee-review"
    );
    expect(buildFeeBlockerHref("PROFILE-001", "free_bet", "FB-001")).toContain(
      "/tracker/free-bets?search=FB-001&record=FB-001"
    );
    expect(buildFeeBlockerHref("PROFILE-001", "casino", "CO-001")).toContain(
      "/tracker/casino-offers?search=CO-001&record=CO-001"
    );
    expect(buildFeeBlockerHref("PROFILE-001", "unknown", "ROW-001")).toBeNull();
  });

  it("separates unconfirmed estimates from crystallised fee values", () => {
    const summary = summarizeFeePeriods(
      periods,
      new Date("2026-06-01T00:00:00"),
      new Date("2026-07-31T23:59:59")
    );

    expect(summary).toEqual({
      estimatedFees: 15,
      feesEarned: 50,
      availableToWithdraw: 40,
      feesWithdrawn: 10,
      readyPeriodCount: 1,
      crystallisedPeriodCount: 1,
    });
  });

  it("includes a monthly period when the selected range overlaps it", () => {
    const summary = summarizeFeePeriods(
      periods,
      new Date("2026-06-15T00:00:00"),
      new Date("2026-06-21T23:59:59")
    );

    expect(summary.feesEarned).toBe(50);
    expect(summary.estimatedFees).toBe(0);
  });

  it("combines profile summaries without changing fee-state meaning", () => {
    const first = summarizeFeePeriods(
      periods,
      new Date("2026-06-01T00:00:00"),
      new Date("2026-07-31T23:59:59")
    );
    const combined = combineFeePositions([first, first]);

    expect(combined.availableToWithdraw).toBe(80);
    expect(combined.feesEarned).toBe(100);
    expect(combined.estimatedFees).toBe(30);
  });

  it("groups authoritative fee states for monthly and yearly formal reports", () => {
    const monthly = summarizeFeePeriodsForReports(periods, "month");
    const yearly = summarizeFeePeriodsForReports(periods, "year");

    expect(monthly.get("2026-06")).toEqual({
      feesEarned: 50,
      awaitingConfirmation: 0,
      crystallisedPeriodCount: 1,
      readyPeriodCount: 0,
    });
    expect(monthly.get("2026-07")).toEqual({
      feesEarned: 0,
      awaitingConfirmation: 15,
      crystallisedPeriodCount: 0,
      readyPeriodCount: 1,
    });
    expect(yearly.get("2026")).toEqual({
      feesEarned: 50,
      awaitingConfirmation: 15,
      crystallisedPeriodCount: 1,
      readyPeriodCount: 1,
    });
  });
});
