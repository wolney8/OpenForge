import { describe, expect, it } from "vitest";
import {
  buildDashboardTrendFromDataset,
  buildDashboardTargetProgress,
  getDashboardShortcutForPreset,
  mapDashboardShortcutToPreset,
  normalizeDashboardDisplayMode,
  parseDashboardTargetValue,
} from "./dashboard-analytics";
import { resolveDateRange, type TrackerSummaryDataset, type TrackerSummaryResult } from "./tracker-summary";

function summaryWithPnl(value: number): TrackerSummaryResult {
  return {
    resolvedDateRange: resolveDateRange({ preset: "Week (Mon-Sun)" }),
    accountQuickView: {
      bookieBalance: 0,
      exchangeBalance: 0,
      bankBalance: 0,
      pendingWithdrawals: 0,
      cashSnapshot: 0,
    },
    betsQuickView: {
      openBets: 0,
      overdueBets: 0,
      partLaidBets: 0,
      currentLiability: 0,
      selectedRangeCashAdjustments: 0,
      expiringFreeBetCount: 0,
      accountsNeedingMugReview: 0,
    },
    profitQuickView: {
      sportsbook: { count: 0, reportingValue: 0, currentValue: 0, finalValue: 0 },
      freeBets: { count: 0, reportingValue: 0, currentValue: 0, finalValue: 0 },
      casino: { count: 0, reportingValue: 0, currentValue: 0, finalValue: 0 },
      openCurrentValue: 0,
      settledFinalValue: value,
      overallPnl: value,
    },
    reportingModel: {
      selectedRange: {
        grossBettingPnl: value,
        cashAdjustments: 0,
        retainedProfit: value,
        openCurrentValue: 0,
        settledFinalValue: value,
      },
      formalReports: {
        weeklyPeriods: 0,
        monthlyPeriods: 0,
        yearlyPeriods: 0,
        latestWeeklyLabel: "",
        latestMonthlyLabel: "",
        latestYearlyLabel: "",
        latestWeeklyRetainedProfit: 0,
        latestMonthlyRetainedProfit: 0,
        latestYearlyRetainedProfit: 0,
      },
    },
    accountHealthQuickView: {
      placeMugBetCount: 0,
      reviewMugCadenceCount: 0,
      noActionCount: 0,
    },
    activityQuickView: {
      sportsbookCount: 0,
      freeBetCount: 0,
      casinoCount: 0,
      cashAdjustmentCount: 0,
      latestActivityDate: "",
    },
    cashAdjustmentBreakdown: {
      topUps: 0,
      deposits: 0,
      withdrawals: 0,
      deductionsAndSubscriptions: 0,
      retainedProfit: 0,
    },
    weeklyReports: [],
    monthlyReports: [],
    yearlyReports: [],
    moduleBreakdown: [],
    bookmakerBreakdown: [],
    recentActivity: [],
    accountHealth: [],
    expiringFreeBets: [],
    recentBalanceSnapshots: [],
  };
}

function emptyDataset(): TrackerSummaryDataset {
  return {
    accounts: [],
    sportsbookBets: [],
    freeBets: [],
    casinoOffers: [],
    cashAdjustments: [],
  };
}

function sportsbookRow({
  id,
  date,
  value,
}: {
  id: string;
  date: string;
  value: string;
}): TrackerSummaryDataset["sportsbookBets"][number] {
  return {
    sportsbook_bet_id: id,
    bookmaker: "Bookmaker A",
    event_name: "Synthetic match",
    offer_type: "Bet & Get",
    offer_name: "Synthetic offer",
    status: "Settled",
    result: "Back Won",
    date_settled: date,
    exchange_name: "Exchange A",
    match_strategy: "Standard",
    calculated_liability_1: null,
    projected_current_pnl: null,
    final_net_pnl: value,
    reporting_value: value,
    lay_status: "Fully Laid",
    counts_as_open: false,
    is_overdue: false,
    created_at: date,
  };
}

describe("dashboard period shortcuts", () => {
  it("maps Coinbase-style shortcuts to the shared tracker range presets", () => {
    expect(mapDashboardShortcutToPreset("1D")).toBe("Today");
    expect(mapDashboardShortcutToPreset("1W")).toBe("Week (Mon-Sun)");
    expect(mapDashboardShortcutToPreset("1M")).toBe("This Month");
    expect(mapDashboardShortcutToPreset("1Y")).toBe("This Year");
    expect(mapDashboardShortcutToPreset("ALL")).toBe("All Dates");
  });

  it("resolves the active shortcut from the shared tracker preset", () => {
    expect(getDashboardShortcutForPreset("This Week")).toBe("1W");
    expect(getDashboardShortcutForPreset("This Month")).toBe("1M");
    expect(getDashboardShortcutForPreset("Custom")).toBeNull();
  });
});

describe("dashboard target progress", () => {
  it("normalizes dashboard display mode safely", () => {
    expect(normalizeDashboardDisplayMode("Compact")).toBe("Compact");
    expect(normalizeDashboardDisplayMode("Unknown")).toBe("High-Density");
  });

  it("treats unset, zero, and invalid targets as neutral states", () => {
    expect(parseDashboardTargetValue("")).toBeNull();
    expect(parseDashboardTargetValue("0")).toBeNull();
    expect(parseDashboardTargetValue("-10")).toBeNull();
    expect(parseDashboardTargetValue("abc")).toBeNull();
  });

  it("calculates positive weekly progress without changing workbook P&L", () => {
    const progress = buildDashboardTargetProgress({
      range: resolveDateRange({ preset: "Week (Mon-Sun)" }),
      settings: { weekly_profit_target: "100" },
      summary: summaryWithPnl(62.5),
    });

    expect(progress.label).toBe("Weekly target");
    expect(progress.progressPercent).toBe(62.5);
    expect(progress.remainingValue).toBe(37.5);
    expect(progress.isExceeded).toBe(false);
  });

  it("caps over-target progress at 100 percent", () => {
    const progress = buildDashboardTargetProgress({
      range: resolveDateRange({ preset: "This Month" }),
      settings: { monthly_profit_target: "50" },
      summary: summaryWithPnl(87.4),
    });

    expect(progress.label).toBe("Monthly target");
    expect(progress.progressPercent).toBe(100);
    expect(progress.remainingValue).toBe(0);
    expect(progress.isExceeded).toBe(true);
  });

  it("shows negative current values as zero progress with the loss still visible", () => {
    const progress = buildDashboardTargetProgress({
      range: resolveDateRange({ preset: "This Year" }),
      settings: { annual_profit_target: "1000" },
      summary: summaryWithPnl(-3.6),
    });

    expect(progress.targetKey).toBe("annual_profit_target");
    expect(progress.currentValue).toBe(-3.6);
    expect(progress.progressPercent).toBe(0);
    expect(progress.remainingValue).toBe(1003.6);
  });

  it("does not bind all-date ranges to a fake target", () => {
    const progress = buildDashboardTargetProgress({
      range: resolveDateRange({ preset: "All Dates" }),
      settings: { weekly_profit_target: "50", monthly_profit_target: "200" },
      summary: summaryWithPnl(100),
    });

    expect(progress.targetKey).toBe("none");
    expect(progress.isSet).toBe(false);
  });
});

describe("dashboard range-aware trends", () => {
  it("buckets week ranges by day and preserves the selected-range summary total", () => {
    const range = resolveDateRange({
      preset: "Custom",
      customStart: "2026-07-06",
      customEnd: "2026-07-12",
    });
    const dataset = emptyDataset();
    dataset.sportsbookBets = [
      sportsbookRow({ id: "SB-001", date: "2026-07-06T12:00:00", value: "10.00" }),
      sportsbookRow({ id: "SB-002", date: "2026-07-08T12:00:00", value: "-2.50" }),
      sportsbookRow({ id: "SB-003", date: "2026-08-01T12:00:00", value: "999.00" }),
    ];

    const trend = buildDashboardTrendFromDataset({
      dataset,
      range,
      summary: summaryWithPnl(7.5),
    });

    expect(trend).toHaveLength(2);
    expect(trend.map((point) => point.value)).toEqual([10, -2.5]);
    expect(trend.at(-1)?.cumulativeValue).toBe(7.5);
  });

  it("buckets month ranges by week labels without introducing alternate P&L totals", () => {
    const range = resolveDateRange({
      preset: "Last Month",
      today: new Date("2026-08-04T12:00:00"),
    });
    const dataset = emptyDataset();
    dataset.sportsbookBets = [
      sportsbookRow({ id: "SB-001", date: "2026-07-01T12:00:00", value: "5.00" }),
      sportsbookRow({ id: "SB-002", date: "2026-07-20T12:00:00", value: "12.00" }),
    ];

    const trend = buildDashboardTrendFromDataset({
      dataset,
      range,
      summary: summaryWithPnl(17),
    });

    expect(trend.length).toBeGreaterThanOrEqual(2);
    expect(trend.every((point) => point.label.startsWith("W/C "))).toBe(true);
    expect(trend.at(-1)?.cumulativeValue).toBe(17);
  });

  it("returns a bounded zero point for empty dashboard ranges", () => {
    const trend = buildDashboardTrendFromDataset({
      dataset: emptyDataset(),
      range: resolveDateRange({ preset: "This Month" }),
      summary: summaryWithPnl(0),
    });

    expect(trend).toEqual([
      {
        key: "empty-range",
        label: "No activity",
        value: 0,
        cumulativeValue: 0,
      },
    ]);
  });
});
