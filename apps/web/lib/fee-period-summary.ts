export type FeePeriodApiRecord = {
  fee_period_id: string;
  profile_id: string;
  period_start: string;
  period_end: string;
  state: "ready_to_crystallise" | "crystallised" | string;
  current_revision_number?: number;
  crystallised_at?: string | null;
  crystallised_by?: string | null;
  reopened_at?: string | null;
  reopened_by?: string | null;
  current_revision: {
    total_fee_due: string;
    management_fee_amount: string;
    investment_fee_amount: string;
    eligible_period_profit?: string;
    opening_loss_carryforward?: string;
    closing_loss_carryforward?: string;
    fee_base?: string;
    fee_base_breakdown_json?: string;
  };
  withdrawal_links?: {
    cash_adjustment_id: string;
    component: "management" | "investment" | string;
    amount: string;
  }[];
  corrections?: {
    fee_correction_id: string;
    adjustment_type: "fee_credit" | "fee_debit" | string;
    amount: string;
    reason: string;
    state: string;
  }[];
  fee_withdrawn_amount: string;
  fee_outstanding_amount: string;
};

export type FeePeriodRevisionApiRecord = {
  fee_revision_id: string;
  profile_id: string;
  fee_period_id: string;
  revision_number: number;
  reporting_basis: string;
  fee_base_source_version: string;
  eligible_period_profit: string;
  opening_loss_carryforward: string;
  closing_loss_carryforward: string;
  fee_base: string;
  management_fee_percent: string;
  investment_fee_percent: string;
  management_fee_amount: string;
  investment_fee_amount: string;
  total_fee_due: string;
  change_reason: string;
  created_by: string;
  created_at: string;
};

export type FeePositionSummary = {
  estimatedFees: number;
  feesEarned: number;
  availableToWithdraw: number;
  feesWithdrawn: number;
  readyPeriodCount: number;
  crystallisedPeriodCount: number;
};

export type FeeReportValue = {
  feesEarned: number;
  awaitingConfirmation: number;
  crystallisedPeriodCount: number;
  readyPeriodCount: number;
};

export type FeeBlockerModule = "sportsbook" | "free_bet" | "casino" | string;

export type WeeklyFeeImpactSource = {
  managementFeePercent: string;
  investmentFeePercent: string;
  weeklyReports: { periodKey: string; totalPnl: number }[];
};

function roundHalfUpMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const sign = value < 0 ? -1 : 1;
  return (sign * Math.floor(Math.abs(value) * 100 + 0.5)) / 100;
}

export function calculateWeeklyIndicativeFeeImpact(
  weeklySettledProfit: number,
  managementFeePercent: string,
  investmentFeePercent: string
): number {
  const managementPercent = Number(managementFeePercent);
  const investmentPercent = Number(investmentFeePercent);
  if (
    !Number.isFinite(weeklySettledProfit) ||
    !Number.isFinite(managementPercent) ||
    !Number.isFinite(investmentPercent) ||
    managementPercent < 0 ||
    investmentPercent < 0 ||
    managementPercent + investmentPercent > 100
  ) {
    return 0;
  }
  const managementImpact = roundHalfUpMoney(
    (weeklySettledProfit * managementPercent) / 100
  );
  const investmentImpact = roundHalfUpMoney(
    (weeklySettledProfit * investmentPercent) / 100
  );
  return roundHalfUpMoney(managementImpact + investmentImpact);
}

export function summarizeWeeklyIndicativeFeeImpacts(
  profiles: WeeklyFeeImpactSource[]
): Map<string, number> {
  const impacts = new Map<string, number>();
  profiles.forEach((profile) => {
    profile.weeklyReports.forEach((week) => {
      const impact = calculateWeeklyIndicativeFeeImpact(
        week.totalPnl,
        profile.managementFeePercent,
        profile.investmentFeePercent
      );
      impacts.set(
        week.periodKey,
        roundHalfUpMoney((impacts.get(week.periodKey) ?? 0) + impact)
      );
    });
  });
  return impacts;
}

export function getPreviousMonthValue(now = new Date()): string {
  return new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1))
    .toISOString()
    .slice(0, 7);
}

export function getClosedMonthOptions(trackingStartDate: string, now = new Date()) {
  const lastClosedMonth = getPreviousMonthValue(now);
  const fallbackStart = `${lastClosedMonth.slice(0, 4)}-01`;
  const startValue = /^\d{4}-\d{2}/.test(trackingStartDate)
    ? trackingStartDate.slice(0, 7)
    : fallbackStart;
  const safeStart = startValue <= lastClosedMonth ? startValue : lastClosedMonth;
  const [startYear, startMonth] = safeStart.split("-").map(Number);
  const [endYear, endMonth] = lastClosedMonth.split("-").map(Number);
  const options: { label: string; value: string }[] = [];

  for (
    let cursor = new Date(Date.UTC(startYear, startMonth - 1, 1));
    cursor <= new Date(Date.UTC(endYear, endMonth - 1, 1));
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
  ) {
    options.push({
      label: new Intl.DateTimeFormat("en-GB", {
        month: "long",
        timeZone: "UTC",
        year: "numeric",
      }).format(cursor),
      value: cursor.toISOString().slice(0, 7),
    });
  }

  return options.reverse();
}

export function buildFeeBlockerHref(
  profileId: string,
  module: FeeBlockerModule,
  recordId: string
): string | null {
  const routes: Record<string, string> = {
    sportsbook: "sportsbook-bets",
    free_bet: "free-bets",
    casino: "casino-offers",
  };
  const route = routes[module];
  if (!route) return null;
  const encodedRecordId = encodeURIComponent(recordId);
  return `/profiles/${profileId}/tracker/${route}?search=${encodedRecordId}&record=${encodedRecordId}&source=fee-review`;
}

function parseMoney(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateValue(value: string, endOfDay = false): number {
  const suffix = endOfDay ? "T23:59:59.999" : "T00:00:00.000";
  return new Date(`${value.slice(0, 10)}${suffix}`).getTime();
}

export function summarizeFeePeriods(
  periods: FeePeriodApiRecord[],
  rangeStart: Date,
  rangeEnd: Date
): FeePositionSummary {
  const rangeStartValue = rangeStart.getTime();
  const rangeEndValue = rangeEnd.getTime();
  const included = periods.filter((period) => {
    const periodStart = dateValue(period.period_start);
    const periodEnd = dateValue(period.period_end, true);
    return periodStart <= rangeEndValue && periodEnd >= rangeStartValue;
  });

  return included.reduce<FeePositionSummary>(
    (summary, period) => {
      const totalDue = parseMoney(period.current_revision.total_fee_due);
      if (period.state === "ready_to_crystallise") {
        summary.estimatedFees += totalDue;
        summary.readyPeriodCount += 1;
      }
      if (period.state === "crystallised") {
        summary.feesEarned += totalDue;
        summary.availableToWithdraw += parseMoney(period.fee_outstanding_amount);
        summary.feesWithdrawn += parseMoney(period.fee_withdrawn_amount);
        summary.crystallisedPeriodCount += 1;
      }
      return summary;
    },
    {
      estimatedFees: 0,
      feesEarned: 0,
      availableToWithdraw: 0,
      feesWithdrawn: 0,
      readyPeriodCount: 0,
      crystallisedPeriodCount: 0,
    }
  );
}

export function combineFeePositions(summaries: FeePositionSummary[]): FeePositionSummary {
  return summaries.reduce<FeePositionSummary>(
    (total, summary) => ({
      estimatedFees: total.estimatedFees + summary.estimatedFees,
      feesEarned: total.feesEarned + summary.feesEarned,
      availableToWithdraw: total.availableToWithdraw + summary.availableToWithdraw,
      feesWithdrawn: total.feesWithdrawn + summary.feesWithdrawn,
      readyPeriodCount: total.readyPeriodCount + summary.readyPeriodCount,
      crystallisedPeriodCount: total.crystallisedPeriodCount + summary.crystallisedPeriodCount,
    }),
    {
      estimatedFees: 0,
      feesEarned: 0,
      availableToWithdraw: 0,
      feesWithdrawn: 0,
      readyPeriodCount: 0,
      crystallisedPeriodCount: 0,
    }
  );
}

export function summarizeFeePeriodsForReports(
  periods: FeePeriodApiRecord[],
  granularity: "month" | "year"
): Map<string, FeeReportValue> {
  const summaries = new Map<string, FeeReportValue>();
  periods.forEach((period) => {
    const key = granularity === "month" ? period.period_start.slice(0, 7) : period.period_start.slice(0, 4);
    const current = summaries.get(key) ?? {
      feesEarned: 0,
      awaitingConfirmation: 0,
      crystallisedPeriodCount: 0,
      readyPeriodCount: 0,
    };
    const amount = parseMoney(period.current_revision.total_fee_due);
    if (period.state === "crystallised") {
      current.feesEarned += amount;
      current.crystallisedPeriodCount += 1;
    }
    if (period.state === "ready_to_crystallise") {
      current.awaitingConfirmation += amount;
      current.readyPeriodCount += 1;
    }
    summaries.set(key, current);
  });
  return summaries;
}
