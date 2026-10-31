import { describe, expect, it } from "vitest";
import fixture from "../../../tests/fixtures/cross-profile-reporting-fixtures.json";
import { aggregateCrossProfileReporting, type ProfileReportingInput } from "./cross-profile-reporting";
import type { ModuleBreakdownRow, TrackerSummaryResult } from "./tracker-summary";

function fixtureSummary(
  profile: (typeof fixture.profiles)[number]
): TrackerSummaryResult {
  return {
    resolvedDateRange: {
      preset: "Week (Mon-Sun)",
      start: new Date("2026-07-06T00:00:00"),
      end: new Date("2026-07-12T23:59:59.999"),
      rangeBackDays: 0,
      rangeForwardDays: 0,
    },
    accountQuickView: {
      bookieBalance: profile.cashSnapshot,
      exchangeBalance: 0,
      bankBalance: 0,
      pendingWithdrawals: 0,
      cashSnapshot: profile.cashSnapshot,
    },
    profitQuickView: {
      sportsbook: { count: 0, reportingValue: 0, currentValue: 0, finalValue: 0 },
      freeBets: { count: 0, reportingValue: 0, currentValue: 0, finalValue: 0 },
      casino: { count: 0, reportingValue: 0, currentValue: 0, finalValue: 0 },
      eachWayExtraPlaces: { count: 0, reportingValue: 0, currentValue: 0, finalValue: 0 },
      openCurrentValue: profile.selectedRange.openCurrentValue,
      settledFinalValue: profile.selectedRange.settledFinalValue,
      overallPnl: profile.selectedRange.grossBettingPnl,
    },
    betsQuickView: {
      openBets: profile.openBets,
      overdueBets: profile.overdueBets,
      partLaidBets: 0,
      currentLiability: profile.currentLiability,
      selectedRangeCashAdjustments: profile.selectedRange.cashAdjustments,
      expiringFreeBetCount: profile.expiringFreeBetCount,
      accountsNeedingMugReview: 0,
    },
    accountHealthQuickView: { placeMugBetCount: 0, reviewMugCadenceCount: 0, noActionCount: 0 },
    activityQuickView: {
      sportsbookCount: 0,
      freeBetCount: 0,
      casinoCount: 0,
      eachWayExtraPlaceCount: 0,
      cashAdjustmentCount: 0,
      latestActivityDate: "",
    },
    cashAdjustmentBreakdown: {
      topUps: 0,
      deposits: 0,
      withdrawals: 0,
      deductionsAndSubscriptions: 0,
      retainedProfit: profile.selectedRange.retainedProfit,
    },
    reportingModel: {
      selectedRange: {
        ...profile.selectedRange,
        grossBettingPnlAggregate: {
          knownValue: profile.selectedRange.grossBettingPnl,
          knownCount: 1,
          unknownCount: 0,
          isComplete: true,
        },
        retainedProfitAggregate: {
          knownValue: profile.selectedRange.retainedProfit,
          knownCount: 1,
          unknownCount: 0,
          isComplete: true,
        },
      },
      formalReports: {
        weeklyPeriods: profile.weeklyReports.length,
        monthlyPeriods: profile.monthlyReports.length,
        yearlyPeriods: 0,
        latestWeeklyLabel: profile.weeklyReports[0]?.periodLabel ?? "No periods yet",
        latestMonthlyLabel: profile.monthlyReports[0]?.periodLabel ?? "No periods yet",
        latestYearlyLabel: "No periods yet",
        latestWeeklyRetainedProfit: profile.weeklyReports[0]?.retainedProfit ?? 0,
        latestMonthlyRetainedProfit: profile.monthlyReports[0]?.retainedProfit ?? 0,
        latestYearlyRetainedProfit: 0,
      },
    },
    accountHealth: [],
    expiringFreeBets: [],
    recentActivity: [],
    recentBalanceSnapshots: [],
    moduleBreakdown: profile.moduleBreakdown.map((row) => ({
      ...row,
      moduleKey: row.moduleKey as ModuleBreakdownRow["moduleKey"],
    })),
    bookmakerBreakdown: profile.bookmakerBreakdown.map((row) => ({
      ...row,
      sportsbookOpenRowCount: 0,
      freeBetOpenRowCount: 0,
      casinoOpenRowCount: 0,
      extraPlaceOpenRowCount: 0,
    })),
    weeklyReports: profile.weeklyReports,
    monthlyReports: profile.monthlyReports,
    yearlyReports: [],
  };
}

const inputs: ProfileReportingInput[] = fixture.profiles.map((profile) => ({
  profileId: profile.profileId,
  displayName: profile.displayName,
  profileCode: profile.profileCode,
  status: profile.status,
  summary: fixtureSummary(profile),
  trueOpenPositionCount: profile.trueOpenBets,
}));

describe("aggregateCrossProfileReporting", () => {
  it("keeps profile rows while summing contract-backed selected-range outputs", () => {
    const result = aggregateCrossProfileReporting(inputs);

    expect(result.profileRows).toHaveLength(2);
    expect(result.totals).toMatchObject({
      grossBettingPnl: fixture.expected.grossBettingPnl,
      retainedProfit: fixture.expected.retainedProfit,
      cashSnapshot: fixture.expected.cashSnapshot,
      openCurrentValue: fixture.expected.openCurrentValue,
      settledFinalValue: fixture.expected.settledFinalValue,
      openBets: fixture.expected.openBets,
      overdueBets: fixture.expected.overdueBets,
      expiringFreeBetCount: fixture.expected.expiringFreeBetCount,
      currentLiability: fixture.expected.currentLiability,
    });
  });

  it("uses the explicit current open-position count when supplied", () => {
    const result = aggregateCrossProfileReporting([
      { ...inputs[0]!, trueOpenPositionCount: 1 },
      { ...inputs[1]!, trueOpenPositionCount: 0 },
    ]);

    expect(result.profileRows.map((row) => row.openBets)).toEqual([1, 0]);
    expect(result.totals.openBets).toBe(1);
  });

  it("groups category, bookmaker, weekly, and monthly outputs without changing signs", () => {
    const result = aggregateCrossProfileReporting(inputs);
    const bookmaker = result.bookmakerBreakdown.find((row) => row.bookmaker === "Bookmaker A");
    const week = result.weeklyReports.find(
      (row) => row.periodKey === fixture.expected.week.periodKey
    );
    const month = result.monthlyReports.find(
      (row) => row.periodKey === fixture.expected.month.periodKey
    );

    expect(result.moduleBreakdown.find((row) => row.moduleKey === "sportsbook")).toMatchObject({
      rowCount: 3,
      reportingValue: -4.5,
    });
    expect(bookmaker).toMatchObject(fixture.expected.bookmakerA);
    expect(week).toMatchObject(fixture.expected.week);
    expect(month).toMatchObject(fixture.expected.month);
  });

  it("returns a safe empty aggregate when no profile summaries load", () => {
    const result = aggregateCrossProfileReporting([]);

    expect(result.profileRows).toEqual([]);
    expect(result.totals.grossBettingPnl).toBe(0);
    expect(result.weeklyReports).toEqual([]);
    expect(result.yearlyReports).toEqual([]);
  });

  it("keeps committed and historical Sportsbook readiness collections separate", () => {
    const source = structuredClone(inputs[0]!);
    source.summary.sportsbookCommittedFinancialIssues = ["SB-OPEN · missing commission"];
    source.summary.sportsbookHistoricalFinancialIssues = ["SB-HISTORY · missing final P&L"];
    source.summary.sportsbookFinancialIssues = [
      ...source.summary.sportsbookCommittedFinancialIssues,
      ...source.summary.sportsbookHistoricalFinancialIssues,
    ];
    const result = aggregateCrossProfileReporting([source]);
    expect(result.sportsbookCommittedFinancialIssues).toEqual([
      `${source.displayName} · SB-OPEN · missing commission`,
    ]);
    expect(result.sportsbookHistoricalFinancialIssues).toEqual([
      `${source.displayName} · SB-HISTORY · missing final P&L`,
    ]);
  });

  it("combines known selected-range subtotals without converting unknown Profile records to zero", () => {
    const partial = structuredClone(inputs[0]!);
    partial.summary.reportingModel.selectedRange.grossBettingPnl = Number.NaN;
    partial.summary.reportingModel.selectedRange.retainedProfit = Number.NaN;
    partial.summary.reportingModel.selectedRange.grossBettingPnlAggregate = {
      knownValue: 7.5, knownCount: 2, unknownCount: 3, isComplete: false,
    };
    partial.summary.reportingModel.selectedRange.retainedProfitAggregate = {
      knownValue: 5, knownCount: 3, unknownCount: 3, isComplete: false,
    };
    const result = aggregateCrossProfileReporting([partial, inputs[1]!]);
    expect(result.totals.grossBettingPnl).toBeNaN();
    expect(result.selectedRangeFinancials.grossBettingPnl).toEqual({
      knownValue: 5, knownCount: 3, unknownCount: 3, isComplete: false,
    });
    expect(result.selectedRangeFinancials.retainedProfit).toEqual({
      knownValue: 1.5, knownCount: 4, unknownCount: 3, isComplete: false,
    });
  });

  it("recalculates all aggregate families from an explicit profile subset", () => {
    const result = aggregateCrossProfileReporting(inputs.slice(0, 1));

    expect(result.profileRows.map((row) => row.profileId)).toEqual(["PROFILE-001"]);
    expect(result.totals.grossBettingPnl).toBe(14.5);
    expect(result.bookmakerBreakdown[0]?.totalPnl).toBe(10.5);
    expect(result.weeklyReports[0]?.retainedProfit).toBe(11.5);
  });

  it("retains archived Profile history in Fund Manager reporting", () => {
    const activeResult = aggregateCrossProfileReporting(inputs);
    const archivedResult = aggregateCrossProfileReporting(
      inputs.map((profile) =>
        profile.profileId === "PROFILE-001"
          ? { ...profile, status: "Archived" }
          : profile
      )
    );

    expect(archivedResult.totals).toEqual(activeResult.totals);
    expect(archivedResult.weeklyReports).toEqual(activeResult.weeklyReports);
    expect(archivedResult.monthlyReports).toEqual(activeResult.monthlyReports);
    expect(archivedResult.profileRows.find((row) => row.profileId === "PROFILE-001")?.status)
      .toBe("Archived");
  });

  it("preserves authoritative composed totals for a 64-Profile scope", () => {
    const population = Array.from({ length: 64 }, (_, index) => ({
      ...inputs[index % inputs.length]!,
      profileId: `PROFILE-${String(index).padStart(2, "0")}`,
    }));

    const result = aggregateCrossProfileReporting(population);
    const authoritativeGross = population.reduce(
      (sum, profile) => sum + profile.summary.reportingModel.selectedRange.grossBettingPnl,
      0,
    );
    const authoritativeRetained = population.reduce(
      (sum, profile) => sum + profile.summary.reportingModel.selectedRange.retainedProfit,
      0,
    );

    expect(result.profileRows).toHaveLength(64);
    expect(result.totals.grossBettingPnl).toBe(authoritativeGross);
    expect(result.totals.retainedProfit).toBe(authoritativeRetained);
    expect(result.moduleBreakdown.find((row) => row.moduleKey === "sportsbook")?.reportingValue)
      .toBe(population.reduce((sum, profile) => sum + (
        profile.summary.moduleBreakdown.find((row) => row.moduleKey === "sportsbook")?.reportingValue ?? 0
      ), 0));
  });
});
