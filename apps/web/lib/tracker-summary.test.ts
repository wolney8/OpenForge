import { describe, expect, it } from "vitest";
import {
  countTrueOpenPositions,
  buildFormalReportRecords,
  readSummaryMoney,
  formatHumanDisplayDate,
  formatResolvedDateRangeContext,
  formatTrackingTenure,
  resolveDateRange,
  summarizeTrackerData,
  type TrackerSummaryDataset,
} from "./tracker-summary";

function localDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
    value.getDate()
  ).padStart(2, "0")}`;
}

const dataset: TrackerSummaryDataset = {
  accounts: [
    {
      account_id: "AC-1",
      account: "Bookie A",
      type: "Bookie",
      counts_in_cash_total: true,
      status: "Active",
      current_balance: "100.00",
      pending_withdrawal_amount: "10.00",
      last_balance_update: "2026-07-01T10:00:00",
      group_name: "Group A",
      platform: "Platform A",
    },
    {
      account_id: "AC-2",
      account: "Exchange A",
      type: "Exchange",
      counts_in_cash_total: true,
      status: "Active",
      current_balance: "50.00",
      pending_withdrawal_amount: "2.50",
      last_balance_update: "2026-07-01T10:00:00",
      group_name: "Group B",
      platform: "Platform B",
    },
    {
      account_id: "AC-3",
      account: "Bank A",
      type: "Bank",
      counts_in_cash_total: true,
      status: "Active",
      current_balance: "200.00",
      pending_withdrawal_amount: "0",
      last_balance_update: "2026-07-01T10:00:00",
      group_name: "Bank",
      platform: "Bank",
    },
    {
      account_id: "AC-4",
      account: "Bookie B",
      type: "Bookie",
      counts_in_cash_total: false,
      status: "Active",
      current_balance: "0.00",
      pending_withdrawal_amount: "0.00",
      last_balance_update: "2026-07-01T10:00:00",
      group_name: "Group B",
      platform: "Platform B",
    },
  ],
  sportsbookBets: [
    {
      sportsbook_bet_id: "SB-1",
      bookmaker: "Bookie A",
      event_name: "Event A",
      offer_type: "Bet & Get",
      offer_name: "Offer A",
      status: "Settled",
      result: "Lay Won",
      date_settled: "2026-07-01T12:00:00",
      exchange_name: "Exchange A",
      match_strategy: "Standard",
      calculated_liability_1: "12.40",
      projected_current_pnl: "-2.50",
      final_net_pnl: "-2.50",
      reporting_value: "-2.50",
      lay_status: "Matched",
      counts_as_open: false,
      is_overdue: false,
    },
    {
      sportsbook_bet_id: "SB-2",
      bookmaker: "Bookie B",
      event_name: "Event B",
      offer_type: "Mug Bet",
      offer_name: "Mug Offer",
      status: "Placed",
      result: "Pending",
      date_settled: "2026-07-02T12:00:00",
      exchange_name: "Exchange A",
      match_strategy: "Partial Lay",
      calculated_liability_1: "7.50",
      projected_current_pnl: "-1.10",
      final_net_pnl: "",
      reporting_value: "-1.10",
      lay_status: "Part Laid",
      counts_as_open: true,
      is_overdue: true,
    },
  ],
  freeBets: [
    {
      free_bet_id: "FB-1",
      bookmaker: "Bookie A",
      event_name: "Free Bet A",
      status: "Placed",
      result: "Pending",
      retention_mode: "SNR",
      date_settled: "2026-07-02T20:00:00",
      expiry_datetime: "2026-07-05T20:00:00",
      exchange_name: "Exchange A",
      calculated_liability_1: "3.00",
      projected_current_pnl: "7.80",
      final_net_pnl: "",
      reporting_value: "7.80",
      lay_status: "Part Laid",
      counts_as_open: true,
      is_overdue: false,
    },
  ],
  casinoOffers: [
    {
      casino_offer_id: "CO-1",
      bookmaker: "Casino A",
      offer_name: "Offer A",
      status: "Settled",
      result: "Win",
      date_started: "2026-07-01T00:00:00",
      date_settling: "2026-07-03T00:00:00",
      expiry_datetime: "",
      resolved_net_pnl: "4.20",
      counts_as_open: false,
      is_overdue: false,
      week_label: "2026-W27",
    },
  ],
  cashAdjustments: [
    {
      cash_adjustment_id: "CA-1",
      adjustment_date: "2026-07-01T09:00:00",
      direction: "Out",
      amount: "12.00",
      adjustment_type: "Withdrawal",
      linked_account: "Bank A",
      description: "Weekly withdrawal",
      signed_amount: "-12.00",
      week_label: "2026-W27",
    },
    {
      cash_adjustment_id: "CA-2",
      adjustment_date: "2026-07-02T09:00:00",
      direction: "Out",
      amount: "3.00",
      adjustment_type: "Deduction",
      linked_account: "Bank A",
      description: "Fee",
      signed_amount: "-3.00",
      week_label: "2026-W27",
    },
    {
      cash_adjustment_id: "CA-3",
      adjustment_date: "2026-07-02T09:00:00",
      direction: "In",
      amount: "20.00",
      adjustment_type: "TopUp",
      linked_account: "Bank A",
      description: "Top up",
      signed_amount: "20.00",
      week_label: "2026-W27",
    },
  ],
};

describe("resolveDateRange", () => {
  it("matches workbook week mon-sun behaviour", () => {
    const resolved = resolveDateRange({
      preset: "Week (Mon-Sun)",
      today: new Date("2026-07-01T10:00:00Z"),
    });

    expect(localDateKey(resolved.start)).toBe("2026-06-29");
    expect(localDateKey(resolved.end)).toBe("2026-07-05");
  });

  it("resolves the current July 2026 fund-manager week as monday to sunday", () => {
    const resolved = resolveDateRange({
      preset: "Week (Mon-Sun)",
      today: new Date("2026-07-29T12:00:00"),
    });

    expect(localDateKey(resolved.start)).toBe("2026-07-27");
    expect(localDateKey(resolved.end)).toBe("2026-08-02");
    expect(formatResolvedDateRangeContext(resolved)).toBe(
      "Tracker range: Week (Mon-Sun) • Mon 27th Jul to Sun 2nd Aug"
    );
  });

  it("resolves the current year for dashboard annual shortcuts", () => {
    const resolved = resolveDateRange({
      preset: "This Year",
      today: new Date("2026-07-29T12:00:00"),
    });

    expect(localDateKey(resolved.start)).toBe("2026-01-01");
    expect(localDateKey(resolved.end)).toBe("2026-12-31");
  });

  it("resolves all dates as a broad tracker-safe window", () => {
    const resolved = resolveDateRange({
      preset: "All Dates",
      today: new Date("2026-07-29T12:00:00"),
    });

    expect(localDateKey(resolved.start)).toBe("2000-01-01");
    expect(localDateKey(resolved.end)).toBe("2100-12-31");
  });
});

describe("formatHumanDisplayDate", () => {
  it("formats report dates with British ordinals and optional time", () => {
    expect(formatHumanDisplayDate("2026-07-20T00:00:00")).toBe(
      "Monday 20th July 2026"
    );
    expect(formatHumanDisplayDate("2026-07-20T16:30:00", true)).toBe(
      "Monday 20th July 2026, 4:30 pm"
    );
  });
});

describe("profile directory operational helpers", () => {
  it("formats tracking tenure without replacing the exact display date", () => {
    const asOf = new Date("2026-07-16T12:00:00Z");
    expect(formatTrackingTenure("2026-07-01", asOf)).toBe("< 1 month");
    expect(formatTrackingTenure("2026-06-01", asOf)).toBe("+1 month");
    expect(formatTrackingTenure("2025-07-01", asOf)).toBe("+12 months");
    expect(formatTrackingTenure("2024-01-01", asOf)).toBe("+2 years");
  });

  it("counts only committed pending rows whose settlement is still in the future", () => {
    const asOf = new Date("2026-07-16T12:00:00Z");
    const futureRows: TrackerSummaryDataset = {
      ...dataset,
      sportsbookBets: [
        { ...dataset.sportsbookBets[1]!, date_settled: "2026-07-16T18:00:00Z", is_overdue: false },
        { ...dataset.sportsbookBets[1]!, sportsbook_bet_id: "SB-OVERDUE", date_settled: "2026-07-16T10:00:00Z" },
        { ...dataset.sportsbookBets[1]!, sportsbook_bet_id: "SB-MISSING", date_settled: "" },
      ],
      freeBets: [
        { ...dataset.freeBets[0]!, date_settled: "2026-07-17T12:00:00Z" },
        { ...dataset.freeBets[0]!, free_bet_id: "FB-AVAILABLE", status: "Available", date_settled: "2026-07-18T12:00:00Z" },
      ],
      casinoOffers: [
        { ...dataset.casinoOffers[0]!, status: "Started", result: "Pending", date_settling: "2026-07-17T12:00:00Z", counts_as_open: true },
      ],
    };

    expect(countTrueOpenPositions(futureRows, asOf)).toBe(3);
  });
});

describe("summarizeTrackerData", () => {
  it("builds workbook-style dashboard totals from live rows", () => {
    const range = resolveDateRange({
      preset: "Week (Mon-Sun)",
      today: new Date("2026-07-01T10:00:00Z"),
    });

    const summary = summarizeTrackerData(dataset, range, new Date("2026-07-01T10:00:00Z"));

    expect(summary.accountQuickView.cashSnapshot).toBe(350);
    expect(summary.accountQuickView.pendingWithdrawals).toBe(12.5);
    expect(summary.profitQuickView.sportsbook.reportingValue).toBeCloseTo(-3.6, 6);
    expect(summary.profitQuickView.freeBets.reportingValue).toBeCloseTo(7.8, 6);
    expect(summary.profitQuickView.casino.reportingValue).toBeCloseTo(4.2, 6);
    expect(summary.profitQuickView.openCurrentValue).toBeCloseTo(6.7, 6);
    expect(summary.profitQuickView.settledFinalValue).toBeCloseTo(1.7, 6);
    expect(summary.profitQuickView.overallPnl).toBeCloseTo(8.4, 6);
    expect(summary.betsQuickView.openBets).toBe(2);
    expect(summary.betsQuickView.overdueBets).toBe(1);
    expect(summary.betsQuickView.partLaidBets).toBe(2);
    expect(summary.betsQuickView.currentLiability).toBeCloseTo(10.5, 6);
    expect(summary.betsQuickView.selectedRangeCashAdjustments).toBeCloseTo(5, 6);
    expect(summary.betsQuickView.expiringFreeBetCount).toBe(0);
    expect(summary.betsQuickView.accountsNeedingMugReview).toBe(1);
    expect(summary.reportingModel.selectedRange.grossBettingPnl).toBeCloseTo(8.4, 6);
    expect(summary.reportingModel.selectedRange.retainedProfit).toBeCloseTo(-6.6, 6);
    expect(summary.activityQuickView.sportsbookCount).toBe(2);
    expect(summary.activityQuickView.freeBetCount).toBe(1);
    expect(summary.activityQuickView.casinoCount).toBe(1);
    expect(summary.activityQuickView.cashAdjustmentCount).toBe(3);
    expect(summary.activityQuickView.latestActivityDate).toBe("2026-07-03T00:00:00");
    expect(summary.moduleBreakdown).toHaveLength(5);
    expect(summary.moduleBreakdown[0]?.label).toBe("Sportsbook");
  });

  it("uses ledger display-value fallbacks when reporting value is blank", () => {
    const range = resolveDateRange({
      preset: "Week (Mon-Sun)",
      today: new Date("2026-07-01T10:00:00Z"),
    });
    const fallbackDataset: TrackerSummaryDataset = {
      ...dataset,
      sportsbookBets: [
        {
          ...dataset.sportsbookBets[0]!,
          sportsbook_bet_id: "SB-FALLBACK-FINAL",
          reporting_value: "",
          final_net_pnl: "4.25",
          projected_current_pnl: "99.00",
        },
        {
          ...dataset.sportsbookBets[1]!,
          sportsbook_bet_id: "SB-FALLBACK-CURRENT",
          reporting_value: "",
          final_net_pnl: "",
          projected_current_pnl: "-1.75",
        },
      ],
      freeBets: [
        {
          ...dataset.freeBets[0]!,
          reporting_value: "",
          final_net_pnl: "",
          projected_current_pnl: "2.50",
        },
      ],
      casinoOffers: [],
      cashAdjustments: [],
    };

    const summary = summarizeTrackerData(fallbackDataset, range, new Date("2026-07-01T10:00:00Z"));

    expect(summary.profitQuickView.sportsbook.reportingValue).toBeCloseTo(2.5, 6);
    expect(summary.profitQuickView.freeBets.reportingValue).toBeCloseTo(2.5, 6);
    expect(summary.profitQuickView.overallPnl).toBeCloseTo(5, 6);
    expect(summary.moduleBreakdown.find((row) => row.moduleKey === "sportsbook")?.reportingValue).toBeCloseTo(
      2.5,
      6
    );
    expect(summary.bookmakerBreakdown.find((row) => row.bookmaker === "Bookie A")?.sportsbookPnl).toBeCloseTo(
      4.25,
      6
    );
  });

  it("keeps selected-range operational counts and liability inside the resolved range", () => {
    const range = resolveDateRange({
      preset: "Week (Mon-Sun)",
      today: new Date("2026-07-01T10:00:00Z"),
    });
    const outsideRange: TrackerSummaryDataset = {
      ...dataset,
      sportsbookBets: [
        ...dataset.sportsbookBets,
        {
          ...dataset.sportsbookBets[1]!,
          sportsbook_bet_id: "SB-OUTSIDE",
          date_settled: "2026-07-15T12:00:00",
          calculated_liability_1: "99.00",
        },
      ],
      freeBets: [
        ...dataset.freeBets,
        {
          ...dataset.freeBets[0]!,
          free_bet_id: "FB-OUTSIDE",
          date_settled: "2026-07-15T20:00:00",
          expiry_datetime: "2026-07-16T20:00:00",
          calculated_liability_1: "88.00",
          is_overdue: true,
        },
      ],
    };

    const summary = summarizeTrackerData(
      outsideRange,
      range,
      new Date("2026-07-01T10:00:00Z"),
      { freeBetExpiryAlertWindowDays: 30 }
    );

    expect(summary.betsQuickView.openBets).toBe(2);
    expect(summary.betsQuickView.overdueBets).toBe(1);
    expect(summary.betsQuickView.currentLiability).toBeCloseTo(10.5, 6);
    expect(summary.betsQuickView.expiringFreeBetCount).toBe(0);
  });

  it("excludes placed and settled free bets from expiry alerts", () => {
    const range = resolveDateRange({
      preset: "Week (Mon-Sun)",
      today: new Date("2026-07-01T10:00:00Z"),
    });
    const expiryRows: TrackerSummaryDataset = {
      ...dataset,
      freeBets: [
        {
          ...dataset.freeBets[0]!,
          free_bet_id: "FB-AVAILABLE",
          status: "Available",
          date_settled: "2026-07-02T20:00:00",
          expiry_datetime: "2026-07-02T12:00:00",
        },
        {
          ...dataset.freeBets[0]!,
          free_bet_id: "FB-PLACED",
          status: "Placed",
          date_settled: "2026-07-02T20:00:00",
          expiry_datetime: "2026-07-02T12:00:00",
        },
        {
          ...dataset.freeBets[0]!,
          free_bet_id: "FB-SETTLED",
          status: "Settled",
          result: "Lay Won",
          counts_as_open: false,
          date_settled: "2026-07-02T20:00:00",
          expiry_datetime: "2026-07-02T12:00:00",
        },
      ],
    };

    const summary = summarizeTrackerData(
      expiryRows,
      range,
      new Date("2026-07-01T10:00:00Z"),
      { freeBetExpiryAlertWindowDays: 4 }
    );

    expect(summary.expiringFreeBets.map((row) => row.free_bet_id)).toEqual(["FB-AVAILABLE"]);
  });

  it("keeps free-bet expiry alerts and recent activity ordered", () => {
    const range = resolveDateRange({
      preset: "Week (Mon-Sun)",
      today: new Date("2026-07-01T10:00:00Z"),
    });

    const summary = summarizeTrackerData(dataset, range, new Date("2026-07-01T10:00:00Z"));

    expect(summary.expiringFreeBets).toHaveLength(0);
    expect(summary.recentActivity[0]?.id).toBe("CO-1");
  });

  it("uses profile free-bet expiry alert window for expiring list", () => {
    const range = resolveDateRange({
      preset: "Week (Mon-Sun)",
      today: new Date("2026-07-01T10:00:00Z"),
    });

    const withExtraFreeBets: TrackerSummaryDataset = {
      ...dataset,
      freeBets: [
        ...dataset.freeBets,
        {
          free_bet_id: "FB-2",
          bookmaker: "Bookie A",
          event_name: "Expiring Soon",
          status: "Available",
          result: "Pending",
          retention_mode: "SNR",
          date_settled: "2026-07-03T20:00:00",
          expiry_datetime: "2026-07-02T12:00:00",
          exchange_name: "Exchange A",
          calculated_liability_1: "0",
          projected_current_pnl: "0",
          final_net_pnl: "",
          reporting_value: "0",
          lay_status: "Not Laid",
          counts_as_open: true,
          is_overdue: false,
        },
        {
          free_bet_id: "FB-3",
          bookmaker: "Bookie A",
          event_name: "Outside Window",
          status: "Available",
          result: "Pending",
          retention_mode: "SNR",
          date_settled: "2026-07-08T20:00:00",
          expiry_datetime: "2026-07-08T12:00:00",
          exchange_name: "Exchange A",
          calculated_liability_1: "0",
          projected_current_pnl: "0",
          final_net_pnl: "",
          reporting_value: "0",
          lay_status: "Not Laid",
          counts_as_open: true,
          is_overdue: false,
        },
      ],
    };

    const summary = summarizeTrackerData(
      withExtraFreeBets,
      range,
      new Date("2026-07-01T10:00:00Z"),
      { freeBetExpiryAlertWindowDays: 4 }
    );

    expect(summary.expiringFreeBets.map((row) => row.free_bet_id)).toEqual(["FB-2"]);
  });

  it("derives workbook-style account-health cues from sportsbook activity", () => {
    const range = resolveDateRange({
      preset: "Week (Mon-Sun)",
      today: new Date("2026-07-20T10:00:00Z"),
    });

    const summary = summarizeTrackerData(dataset, range, new Date("2026-07-20T10:00:00Z"));
    const accountHealth = summary.accountHealth.find((row) => row.accountName === "Bookie A");

    expect(accountHealth?.lastOfferType).toBe("Bet & Get");
    expect(accountHealth?.lastOfferResult).toBe("Lay Won");
    expect(accountHealth?.daysSinceMugBet).toBe("Never");
    expect(accountHealth?.suggestedAction).toBe("Review mug cadence");
    expect(summary.betsQuickView.accountsNeedingMugReview).toBe(2);
  });

  it("uses the profile tracker mug-bet cadence setting for account-health prompts", () => {
    const range = resolveDateRange({
      preset: "Week (Mon-Sun)",
      today: new Date("2026-07-20T10:00:00Z"),
    });

    const summary = summarizeTrackerData(
      dataset,
      range,
      new Date("2026-07-20T10:00:00Z"),
      { mugBetFrequencyDays: 14 }
    );
    const accountHealth = summary.accountHealth.find((row) => row.accountName === "Bookie B");

    expect(accountHealth?.daysSinceMugBet).toBe("18");
    expect(accountHealth?.suggestedAction).toBe("Place Mug Bet");
    expect(summary.betsQuickView.accountsNeedingMugReview).toBe(2);
    expect(summary.accountHealthQuickView.placeMugBetCount).toBe(1);
    expect(summary.accountHealthQuickView.reviewMugCadenceCount).toBe(1);
    expect(summary.accountHealthQuickView.noActionCount).toBe(0);
  });

  it("rolls weekly and monthly retained profit from ledgers and cash adjustments", () => {
    const range = resolveDateRange({
      preset: "Week (Mon-Sun)",
      today: new Date("2026-07-01T10:00:00Z"),
    });

    const summary = summarizeTrackerData(dataset, range, new Date("2026-07-01T10:00:00Z"));
    const weekly = summary.weeklyReports[0];
    const monthly = summary.monthlyReports[0];

    expect(weekly?.sportsbookPnl).toBeCloseTo(-3.6, 6);
    expect(weekly?.freeBetPnl).toBeCloseTo(7.8, 6);
    expect(weekly?.casinoPnl).toBeCloseTo(4.2, 6);
    expect(weekly?.withdrawals).toBeCloseTo(-12, 6);
    expect(weekly?.costs).toBeCloseTo(-3, 6);
    expect(weekly?.retainedProfit).toBeCloseTo(-6.6, 6);
    expect(monthly?.retainedProfit).toBeCloseTo(-6.6, 6);
    expect(summary.reportingModel.formalReports.weeklyPeriods).toBe(1);
    expect(summary.reportingModel.formalReports.monthlyPeriods).toBe(1);
    expect(summary.reportingModel.formalReports.yearlyPeriods).toBe(1);
    expect(summary.reportingModel.formalReports.latestWeeklyLabel).toBe(
      "Week commencing; Monday 29th June 2026"
    );
    expect(summary.reportingModel.formalReports.latestMonthlyLabel).toBe("July 2026");
    expect(summary.reportingModel.formalReports.latestYearlyLabel).toBe("2026");
    expect(summary.reportingModel.formalReports.latestWeeklyRetainedProfit).toBeCloseTo(-6.6, 6);
    expect(summary.reportingModel.formalReports.latestMonthlyRetainedProfit).toBeCloseTo(-6.6, 6);
    expect(summary.reportingModel.formalReports.latestYearlyRetainedProfit).toBeCloseTo(-6.6, 6);
    expect(summary.bookmakerBreakdown[0]?.bookmaker).toBe("Bookie A");
    expect(summary.bookmakerBreakdown[0]?.totalPnl).toBeCloseTo(5.3, 6);
  });

  it("keeps selected-range live values separate from formal free-bet reporting inclusion", () => {
    const range = resolveDateRange({
      preset: "Week (Mon-Sun)",
      today: new Date("2026-07-01T10:00:00Z"),
    });

    const withAvailableFreeBet: TrackerSummaryDataset = {
      ...dataset,
      freeBets: [
        ...dataset.freeBets,
        {
          free_bet_id: "FB-AVAILABLE-1",
          bookmaker: "Bookie C",
          event_name: "Free Bet Available",
          status: "Available",
          result: "Pending",
          retention_mode: "SNR",
          date_settled: "2026-07-03T20:00:00",
          expiry_datetime: "2026-07-06T20:00:00",
          exchange_name: "Exchange A",
          calculated_liability_1: "0.00",
          projected_current_pnl: "6.50",
          final_net_pnl: "",
          reporting_value: "6.50",
          lay_status: "Not Laid",
          counts_as_open: true,
          is_overdue: false,
        },
      ],
    };

    const summary = summarizeTrackerData(
      withAvailableFreeBet,
      range,
      new Date("2026-07-01T10:00:00Z")
    );

    expect(summary.profitQuickView.freeBets.reportingValue).toBeCloseTo(14.3, 6);
    expect(summary.profitQuickView.openCurrentValue).toBeCloseTo(13.2, 6);
    expect(summary.weeklyReports[0]?.freeBetPnl).toBeCloseTo(7.8, 6);
    expect(summary.monthlyReports[0]?.freeBetPnl).toBeCloseTo(7.8, 6);
    expect(summary.reportingModel.selectedRange.grossBettingPnl).toBeCloseTo(14.9, 6);
    expect(summary.reportingModel.selectedRange.retainedProfit).toBeCloseTo(-0.1, 6);
  });

  it("keeps Each Way / Extra Place rows as a distinct selected-range and reporting module", () => {
    const range = resolveDateRange({
      preset: "Week (Mon-Sun)",
      today: new Date("2026-07-01T10:00:00Z"),
    });
    const withEachWayExtraPlaces: TrackerSummaryDataset = {
      ...dataset,
      eachWayExtraPlaces: [
        {
          each_way_extra_place_id: "EWP-001",
          placed_at: "2026-07-03T12:00:00Z",
          runner: "Synthetic Runner",
          race: "Synthetic Race",
          bookmaker: "Bookie A",
          mode: "Extra Place",
          status: "Placed",
          result: "Pending",
          current_value: "-0.83",
          final_value: null,
          win_liability: "12.00",
          place_liability: "3.00",
        },
        {
          each_way_extra_place_id: "EWP-002",
          placed_at: "2026-07-04T12:00:00Z",
          runner: "Synthetic Winner",
          race: "Synthetic Race",
          bookmaker: "Bookie B",
          mode: "Extra Place",
          status: "Settled",
          result: "Extra Place",
          current_value: null,
          final_value: "30.53",
          win_liability: "0.00",
          place_liability: "0.00",
        },
      ],
    };

    const summary = summarizeTrackerData(withEachWayExtraPlaces, range, new Date("2026-07-01T10:00:00Z"));

    expect(summary.profitQuickView.eachWayExtraPlaces.reportingValue).toBeCloseTo(29.7, 6);
    expect(summary.profitQuickView.eachWayExtraPlaces.currentValue).toBeCloseTo(-0.83, 6);
    expect(summary.profitQuickView.eachWayExtraPlaces.finalValue).toBeCloseTo(30.53, 6);
    expect(summary.betsQuickView.currentLiability).toBeCloseTo(25.5, 6);
    expect(summary.moduleBreakdown.find((row) => row.moduleKey === "each-way-extra-places")?.rowCount).toBe(2);
    expect(summary.weeklyReports[0]?.eachWayExtraPlacePnl).toBeCloseTo(29.7, 6);
  });

  it("keeps deposits out of retained-profit reporting while preserving selected-range cash adjustments", () => {
    const range = resolveDateRange({
      preset: "Week (Mon-Sun)",
      today: new Date("2026-07-01T10:00:00Z"),
    });

    const withDeposit: TrackerSummaryDataset = {
      ...dataset,
      cashAdjustments: [
        ...dataset.cashAdjustments,
        {
          cash_adjustment_id: "CA-4",
          adjustment_date: "2026-07-03T09:00:00",
          direction: "In",
          amount: "15.00",
          adjustment_type: "Deposit",
          linked_account: "Bank A",
          description: "Cash deposit",
          signed_amount: "15.00",
          week_label: "2026-W27",
        },
      ],
    };

    const summary = summarizeTrackerData(withDeposit, range, new Date("2026-07-01T10:00:00Z"));

    expect(summary.betsQuickView.selectedRangeCashAdjustments).toBeCloseTo(5, 6);
    expect(summary.cashAdjustmentBreakdown.deposits).toBeCloseTo(15, 6);
    expect(summary.cashAdjustmentBreakdown.retainedProfit).toBeCloseTo(-6.6, 6);
    expect(summary.weeklyReports[0]?.withdrawals).toBeCloseTo(-12, 6);
    expect(summary.weeklyReports[0]?.costs).toBeCloseTo(-3, 6);
    expect(summary.weeklyReports[0]?.retainedProfit).toBeCloseTo(-6.6, 6);
  });
});


describe("Reports required output readiness", () => {
  const range = resolveDateRange({ preset: "All Dates", today: new Date("2026-07-01T12:00:00Z") });
  function fixture(): TrackerSummaryDataset {
    return { accounts: [], sportsbookBets: [], freeBets: [], eachWayExtraPlaces: [],
      casinoOffers: [{ ...dataset.casinoOffers[0]!, status: "Settled", counts_as_open: false, resolved_net_pnl: "5" }],
      cashAdjustments: [
        {...dataset.cashAdjustments[0]!, adjustment_type:"Deduction", signed_amount:"-7"},
        {...dataset.cashAdjustments[0]!, cash_adjustment_id:"COST-2", adjustment_type:"Costs", signed_amount:"-2"},
        {...dataset.cashAdjustments[0]!, cash_adjustment_id:"FUND", adjustment_type:"TopUp", signed_amount:"200"},
      ] };
  }
  it.each([null, undefined, "", "  ", "broken", "Infinity"])("keeps required output %s unavailable", value => {
    expect(readSummaryMoney(value)).toBeNaN();
  });
  it("preserves genuine costs, signed funding and authoritative zero without changing membership", () => {
    const source=fixture(), result=summarizeTrackerData(source,range);
    expect(result.profitQuickView.overallPnl).toBe(5);
    expect(result.cashAdjustmentBreakdown.deductionsAndSubscriptions).toBe(-9);
    expect(result.reportingModel.selectedRange.retainedProfit).toBe(-4);
    expect(result.betsQuickView.selectedRangeCashAdjustments).toBe(193);
    expect(result.weeklyReports[0]!.retainedProfit).toBe(-4);
    expect(buildFormalReportRecords(source)).toHaveLength(4);
    source.casinoOffers[0]!.status="Prospecting";source.casinoOffers[0]!.resolved_net_pnl="0.00";
    expect(summarizeTrackerData(source,range).profitQuickView.casino.reportingValue).toBe(0);
  });
  it("does not present known partial costs as a complete retained result", () => {
    const source=fixture();source.cashAdjustments[0]!.signed_amount=null;
    const result=summarizeTrackerData(source,range);
    expect(result.profitQuickView.overallPnl).toBe(5);
    expect(result.cashAdjustmentBreakdown.deductionsAndSubscriptions).toBeNaN();
    expect(result.reportingModel.selectedRange.retainedProfit).toBeNaN();
    expect(result.weeklyReports[0]!.costs).toBeNaN();
    expect(result.weeklyReports[0]!.retainedProfit).toBeNaN();
    expect(buildFormalReportRecords(source).find(row=>row.component==="costs")!.value).toBeNaN();
  });
  it("does not let unavailable funding erase known betting and genuine costs", () => {
    const source=fixture();source.cashAdjustments[2]!.signed_amount=null;
    const result=summarizeTrackerData(source,range);
    expect(result.betsQuickView.selectedRangeCashAdjustments).toBeNaN();
    expect(result.reportingModel.selectedRange.retainedProfit).toBe(-4);
    expect(result.weeklyReports[0]!.retainedProfit).toBe(-4);
  });
  it("keeps Cash known when Casino output is unavailable and never invents a Void zero", () => {
    const source=fixture();source.casinoOffers[0]!.resolved_net_pnl=null;source.casinoOffers[0]!.result="Void";
    const result=summarizeTrackerData(source,range);
    expect(result.profitQuickView.overallPnl).toBeNaN();
    expect(result.profitQuickView.casino.finalValue).toBeNaN();
    expect(result.reportingModel.selectedRange.retainedProfit).toBeNaN();
    expect(result.weeklyReports[0]!.totalPnl).toBeNaN();
    expect(result.cashAdjustmentBreakdown.deductionsAndSubscriptions).toBe(-9);
    expect(result.betsQuickView.selectedRangeCashAdjustments).toBe(193);
  });
  it("preserves Extra Place historical current/final and explicit Void outputs with independent exposure readiness", () => {
    const source=fixture();source.eachWayExtraPlaces=[{each_way_extra_place_id:"EP-READ",placed_at:"2026-07-01T12:00:00",runner:"Synthetic",race:"Synthetic",bookmaker:"Bookie A",mode:"Extra Place",status:"Placed",result:"Pending",current_value:null,final_value:null,win_liability:null,place_liability:null}];
    let result=summarizeTrackerData(source,range);
    expect(result.profitQuickView.eachWayExtraPlaces.reportingValue).toBeNaN();expect(result.betsQuickView.currentLiability).toBeNaN();
    source.eachWayExtraPlaces[0]!.current_value="12.34";result=summarizeTrackerData(source,range);
    expect(result.profitQuickView.eachWayExtraPlaces.reportingValue).toBe(12.34);expect(result.profitQuickView.eachWayExtraPlaces.finalValue).toBe(0);
    Object.assign(source.eachWayExtraPlaces[0]!,{status:"Void",result:"Void/NR",current_value:"0",final_value:"0"});
    result=summarizeTrackerData(source,range);expect(result.profitQuickView.eachWayExtraPlaces.reportingValue).toBe(0);
    expect(result.weeklyReports[0]!.eachWayExtraPlacePnl).toBe(0);
    Object.assign(source.eachWayExtraPlaces[0]!,{status:"Prospecting",result:"Pending",current_value:null,final_value:null});
    result=summarizeTrackerData(source,range);expect(result.profitQuickView.eachWayExtraPlaces.reportingValue).toBeNaN();expect(result.profitQuickView.eachWayExtraPlaces.finalValue).toBe(0);
    source.eachWayExtraPlaces[0]!.final_value="7.00";
    result=summarizeTrackerData(source,range);expect(result.profitQuickView.eachWayExtraPlaces.finalValue).toBe(7);
  });
});

describe.each(["sportsbook", "free-bets"] as const)("%s required liability output", (module) => {
  const range = resolveDateRange({ preset: "Custom", customStart: "2026-07-01", customEnd: "2026-07-31" });
  function fixture(): TrackerSummaryDataset {
    const openValue = {
      status: "Placed", result: "Pending", date_settled: "2026-07-01T12:00:00",
      counts_as_open: true, calculation_state: "resolved", calculated_liability_1: "15.00",
      reporting_value: "12.50", projected_current_pnl: "12.50", final_net_pnl: null,
      calculation_notes: ["The audited manual override remains the authoritative reporting value."],
    };
    return {
      accounts: [dataset.accounts[0]!],
      sportsbookBets: module === "sportsbook" ? [{ ...dataset.sportsbookBets[0]!, ...openValue }] : [],
      freeBets: module === "free-bets" ? [{ ...dataset.freeBets[0]!, ...openValue }] : [],
      casinoOffers: [], cashAdjustments: [], eachWayExtraPlaces: [],
    };
  }

  it.each([null, "", "  ", "invalid", "Infinity"])(
    "retains known historical P&L while required liability %s stays unavailable",
    (value) => {
      const source = fixture();
      const row = source.sportsbookBets[0] ?? source.freeBets[0]!;
      row.calculated_liability_1 = value;
      const result = summarizeTrackerData(source, range);
      expect(result.betsQuickView.currentLiability).toBeNaN();
      expect(result.profitQuickView.overallPnl).toBe(12.5);
      expect(result.reportingModel.selectedRange.openCurrentValue).toBe(12.5);
      expect(result.accountQuickView.cashSnapshot).toBe(100);
    }
  );

  it("does not infer zero liability from an incomplete calculation state", () => {
    const source = fixture();
    const row = source.sportsbookBets[0] ?? source.freeBets[0]!;
    Object.assign(row, { calculation_state: "incomplete", calculated_liability_1: null,
      reporting_value: null, projected_current_pnl: null });
    expect(summarizeTrackerData(source, range).betsQuickView.currentLiability).toBeNaN();
  });

  it("keeps zero, known liability and existing open/date membership authoritative", () => {
    const source = fixture();
    const row = source.sportsbookBets[0] ?? source.freeBets[0]!;
    expect(summarizeTrackerData(source, range).betsQuickView.currentLiability).toBe(15);
    row.calculated_liability_1 = "0.00";
    expect(summarizeTrackerData(source, range).betsQuickView.currentLiability).toBe(0);
    row.calculated_liability_1 = null;
    row.counts_as_open = false;
    expect(summarizeTrackerData(source, range).betsQuickView.currentLiability).toBe(0);
    row.counts_as_open = true;
    row.date_settled = "2026-08-01T12:00:00";
    expect(summarizeTrackerData(source, range).betsQuickView.currentLiability).toBe(0);
  });

  it("never exposes a known partial liability as the complete sum", () => {
    const source = fixture();
    const row = source.sportsbookBets[0] ?? source.freeBets[0]!;
    row.calculated_liability_1 = null;
    source.eachWayExtraPlaces = [{
      each_way_extra_place_id: "EP-KNOWN", mode: "Extra Place", placed_at: "2026-07-01T12:00:00",
      runner: "Synthetic runner", race: "Synthetic race", bookmaker: "Bookie A",
      status: "Placed", result: "Pending", current_value: "0.00", final_value: null,
      win_liability: "5.00", place_liability: "2.50",
    }];
    const result = summarizeTrackerData(source, range);
    expect(result.betsQuickView.currentLiability).toBeNaN();
    expect(result.profitQuickView.overallPnl).toBe(12.5);
  });
});


it("uses the operational Multi-Lay market reservation, not primary-fill liability", () => {
  const source: TrackerSummaryDataset = { ...dataset, freeBets: [], eachWayExtraPlaces: [], sportsbookBets: [{
    ...dataset.sportsbookBets[0], status: "Placed", result: "Pending", counts_as_open: true,
    calculated_liability_1: "17.00", multi_lay_actual: { exchange_exposure: "14.00" },
    projected_current_pnl: "7.10", final_net_pnl: null, reporting_value: "7.10",
  }] };
  const result = summarizeTrackerData(source, resolveDateRange({ preset: "All Dates", today: new Date("2026-07-01T10:00:00Z") }), new Date("2026-07-01T10:00:00Z"));
  expect(result.betsQuickView.currentLiability).toBe(14);
  expect(result.profitQuickView.sportsbook.reportingValue).toBe(7.1);
});
