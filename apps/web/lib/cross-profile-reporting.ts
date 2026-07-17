import type {
  BookmakerBreakdownRow,
  ModuleBreakdownRow,
  ReportRow,
  TrackerSummaryResult,
} from "./tracker-summary";
import type { OperationalActionCounts } from "./operational-actions";

export type ProfileReportingInput = {
  profileId: string;
  displayName: string;
  profileCode: string;
  status: string;
  summary: TrackerSummaryResult;
  actionable?: OperationalActionCounts;
  trueOpenPositionCount?: number;
};

export type ProfileComparisonRow = {
  profileId: string;
  displayName: string;
  profileCode: string;
  status: string;
  grossBettingPnl: number;
  retainedProfit: number;
  cashSnapshot: number;
  openCurrentValue: number;
  settledFinalValue: number;
  openBets: number;
  overdueBets: number;
  sportsbookActionCount: number;
  freeBetActionCount: number;
  casinoActionCount: number;
  expiringFreeBetCount: number;
  currentLiability: number;
};

export type CrossProfileReportingResult = {
  profileRows: ProfileComparisonRow[];
  totals: Omit<
    ProfileComparisonRow,
    "profileId" | "displayName" | "profileCode" | "status"
  >;
  moduleBreakdown: ModuleBreakdownRow[];
  bookmakerBreakdown: BookmakerBreakdownRow[];
  weeklyReports: ReportRow[];
  monthlyReports: ReportRow[];
  yearlyReports: ReportRow[];
};

function emptyReportRow(periodKey: string, periodLabel: string): ReportRow {
  return {
    periodKey,
    periodLabel,
    sportsbookPnl: 0,
    freeBetPnl: 0,
    casinoPnl: 0,
    totalPnl: 0,
    withdrawals: 0,
    costs: 0,
    retainedProfit: 0,
  };
}

function aggregateReportRows(rows: ReportRow[]): ReportRow[] {
  const periods = new Map<string, ReportRow>();

  for (const row of rows) {
    const aggregate = periods.get(row.periodKey) ?? emptyReportRow(row.periodKey, row.periodLabel);
    aggregate.sportsbookPnl += row.sportsbookPnl;
    aggregate.freeBetPnl += row.freeBetPnl;
    aggregate.casinoPnl += row.casinoPnl;
    aggregate.withdrawals += row.withdrawals;
    aggregate.costs += row.costs;
    aggregate.totalPnl =
      aggregate.sportsbookPnl + aggregate.freeBetPnl + aggregate.casinoPnl;
    aggregate.retainedProfit = aggregate.totalPnl + aggregate.withdrawals + aggregate.costs;
    periods.set(row.periodKey, aggregate);
  }

  return [...periods.values()].sort((left, right) =>
    right.periodKey.localeCompare(left.periodKey)
  );
}

export function aggregateCrossProfileReporting(
  profiles: ProfileReportingInput[]
): CrossProfileReportingResult {
  const profileRows = profiles.map(({ profileId, displayName, profileCode, status, summary, actionable, trueOpenPositionCount }) => {
    const actionCounts = actionable ?? { sportsbook: 0, freeBets: 0, casinoOffers: 0 };
    return {
      profileId,
      displayName,
      profileCode,
      status,
      grossBettingPnl: summary.reportingModel.selectedRange.grossBettingPnl,
      retainedProfit: summary.reportingModel.selectedRange.retainedProfit,
      cashSnapshot: summary.accountQuickView.cashSnapshot,
      openCurrentValue: summary.reportingModel.selectedRange.openCurrentValue,
      settledFinalValue: summary.reportingModel.selectedRange.settledFinalValue,
      openBets: trueOpenPositionCount ?? summary.betsQuickView.openBets,
      overdueBets: summary.betsQuickView.overdueBets,
      sportsbookActionCount: actionCounts.sportsbook,
      freeBetActionCount: actionCounts.freeBets,
      casinoActionCount: actionCounts.casinoOffers,
      expiringFreeBetCount: summary.betsQuickView.expiringFreeBetCount,
      currentLiability: summary.betsQuickView.currentLiability,
    };
  });

  const totals = profileRows.reduce(
    (aggregate, row) => ({
      grossBettingPnl: aggregate.grossBettingPnl + row.grossBettingPnl,
      retainedProfit: aggregate.retainedProfit + row.retainedProfit,
      cashSnapshot: aggregate.cashSnapshot + row.cashSnapshot,
      openCurrentValue: aggregate.openCurrentValue + row.openCurrentValue,
      settledFinalValue: aggregate.settledFinalValue + row.settledFinalValue,
      openBets: aggregate.openBets + row.openBets,
      overdueBets: aggregate.overdueBets + row.overdueBets,
      sportsbookActionCount: aggregate.sportsbookActionCount + row.sportsbookActionCount,
      freeBetActionCount: aggregate.freeBetActionCount + row.freeBetActionCount,
      casinoActionCount: aggregate.casinoActionCount + row.casinoActionCount,
      expiringFreeBetCount: aggregate.expiringFreeBetCount + row.expiringFreeBetCount,
      currentLiability: aggregate.currentLiability + row.currentLiability,
    }),
    {
      grossBettingPnl: 0,
      retainedProfit: 0,
      cashSnapshot: 0,
      openCurrentValue: 0,
      settledFinalValue: 0,
      openBets: 0,
      overdueBets: 0,
      sportsbookActionCount: 0,
      freeBetActionCount: 0,
      casinoActionCount: 0,
      expiringFreeBetCount: 0,
      currentLiability: 0,
    }
  );

  const moduleMap = new Map<string, ModuleBreakdownRow>();
  const bookmakerMap = new Map<string, BookmakerBreakdownRow>();

  for (const profile of profiles) {
    for (const row of profile.summary.moduleBreakdown) {
      const aggregate = moduleMap.get(row.moduleKey) ?? {
        moduleKey: row.moduleKey,
        label: row.label,
        rowCount: 0,
        reportingValue: 0,
      };
      aggregate.rowCount += row.rowCount;
      aggregate.reportingValue += row.reportingValue;
      moduleMap.set(row.moduleKey, aggregate);
    }

    for (const row of profile.summary.bookmakerBreakdown) {
      const aggregate = bookmakerMap.get(row.bookmaker) ?? {
        bookmaker: row.bookmaker,
        sportsbookPnl: 0,
        freeBetPnl: 0,
        casinoPnl: 0,
        totalPnl: 0,
        openRowCount: 0,
      };
      aggregate.sportsbookPnl += row.sportsbookPnl;
      aggregate.freeBetPnl += row.freeBetPnl;
      aggregate.casinoPnl += row.casinoPnl;
      aggregate.totalPnl =
        aggregate.sportsbookPnl + aggregate.freeBetPnl + aggregate.casinoPnl;
      aggregate.openRowCount += row.openRowCount;
      bookmakerMap.set(row.bookmaker, aggregate);
    }
  }

  return {
    profileRows,
    totals,
    moduleBreakdown: [...moduleMap.values()],
    bookmakerBreakdown: [...bookmakerMap.values()].sort(
      (left, right) => right.totalPnl - left.totalPnl
    ),
    weeklyReports: aggregateReportRows(profiles.flatMap((profile) => profile.summary.weeklyReports)),
    monthlyReports: aggregateReportRows(
      profiles.flatMap((profile) => profile.summary.monthlyReports)
    ),
    yearlyReports: aggregateReportRows(
      profiles.flatMap((profile) => profile.summary.yearlyReports)
    ),
  };
}
