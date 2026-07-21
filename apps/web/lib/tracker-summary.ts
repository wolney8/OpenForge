export type DatePreset =
  | "Today"
  | "Yesterday"
  | "This Week"
  | "Week (Mon-Sun)"
  | "Last Week"
  | "Past 7 Days"
  | "Past 8 Days"
  | "Fortnight"
  | "This Month"
  | "Last Month"
  | "Custom";

export type AccountSummaryRecord = {
  account_id: string;
  account: string;
  type: string;
  counts_in_cash_total: boolean;
  status: string;
  current_balance: string;
  pending_withdrawal_amount: string;
  last_balance_update: string;
  group_name: string;
  platform: string;
};

export type SportsbookSummaryRecord = {
  sportsbook_bet_id: string;
  bookmaker: string;
  event_name: string;
  offer_type: string;
  offer_name: string;
  status: string;
  result: string;
  date_settled: string;
  exchange_name: string;
  match_strategy: string;
  calculated_liability_1: string | null;
  projected_current_pnl: string | null;
  final_net_pnl: string | null;
  reporting_value: string | null;
  lay_status: string;
  counts_as_open: boolean;
  is_overdue: boolean;
  partial_lay_reminder_state?: string;
  partial_lay_reminder_due_at?: string;
};

export type FreeBetSummaryRecord = {
  free_bet_id: string;
  bookmaker: string;
  event_name: string;
  status: string;
  result: string;
  retention_mode: string;
  date_settled: string;
  expiry_datetime: string;
  exchange_name: string;
  calculated_liability_1: string | null;
  projected_current_pnl: string | null;
  final_net_pnl: string | null;
  reporting_value: string | null;
  lay_status: string;
  counts_as_open: boolean;
  is_overdue: boolean;
};

export type CasinoSummaryRecord = {
  casino_offer_id: string;
  bookmaker: string;
  offer_name: string;
  status: string;
  result: string;
  date_started: string;
  date_settling: string;
  expiry_datetime: string;
  resolved_net_pnl: string | null;
  counts_as_open: boolean;
  is_overdue: boolean;
  week_label: string;
};

export type CashAdjustmentSummaryRecord = {
  cash_adjustment_id: string;
  adjustment_date: string;
  direction: string;
  amount: string;
  adjustment_type: string;
  linked_account: string;
  description: string;
  signed_amount: string | null;
  week_label: string;
};

export type BalanceSnapshotSummaryRecord = {
  balance_snapshot_id: string;
  profile_id: string;
  snapshot_at: string;
  snapshot_type: string;
  account_id: string | null;
  balance_amount: string;
  notes: string;
  created_at: string;
};

export type TrackerSummaryDataset = {
  accounts: AccountSummaryRecord[];
  sportsbookBets: SportsbookSummaryRecord[];
  freeBets: FreeBetSummaryRecord[];
  casinoOffers: CasinoSummaryRecord[];
  cashAdjustments: CashAdjustmentSummaryRecord[];
  balanceSnapshots?: BalanceSnapshotSummaryRecord[];
};

export function formatTrackingTenure(value: string, asOf = new Date()): string {
  const started = parseDateInput(value);
  if (!started) return "Unknown";
  const elapsedDays = Math.max(
    0,
    Math.floor((startOfDay(asOf).getTime() - startOfDay(started).getTime()) / 86_400_000)
  );
  if (elapsedDays < 31) return "< 1 month";
  const elapsedMonths = Math.max(1, Math.floor(elapsedDays / 30.4375));
  if (elapsedMonths < 24) return `+${elapsedMonths} ${elapsedMonths === 1 ? "month" : "months"}`;
  const elapsedYears = Math.max(2, Math.floor(elapsedMonths / 12));
  return `+${elapsedYears} years`;
}

function hasFutureSettlement(
  status: string,
  result: string,
  settlementValue: string,
  committedStatus: string,
  asOf: Date
): boolean {
  if (status !== committedStatus || result !== "Pending") return false;
  const settlement = parseDateInput(settlementValue);
  return settlement !== null && settlement.getTime() > asOf.getTime();
}

export function countTrueOpenPositions(
  dataset: TrackerSummaryDataset,
  asOf = new Date()
): number {
  return (
    dataset.sportsbookBets.filter((row) =>
      hasFutureSettlement(row.status, row.result, row.date_settled, "Placed", asOf)
    ).length +
    dataset.freeBets.filter((row) =>
      hasFutureSettlement(row.status, row.result, row.date_settled, "Placed", asOf)
    ).length +
    dataset.casinoOffers.filter((row) =>
      hasFutureSettlement(row.status, row.result, row.date_settling, "Started", asOf)
    ).length
  );
}

export type TrackerSummarySettings = {
  mugBetFrequencyDays?: number;
  freeBetExpiryAlertWindowDays?: number;
  useGlobalDateRangeToggle?: boolean;
};

export type ResolvedDateRange = {
  preset: DatePreset;
  start: Date;
  end: Date;
  rangeBackDays: number;
  rangeForwardDays: number;
  customStart?: string;
  customEnd?: string;
};

type ModuleMetric = {
  count: number;
  reportingValue: number;
  currentValue: number;
  finalValue: number;
};

type ActivityItem = {
  id: string;
  module: "sportsbook" | "free-bet" | "casino" | "cash-adjustment";
  label: string;
  bookmakerOrAccount: string;
  status: string;
  date: string;
  value: number;
};

type AccountHealthItem = {
  accountName: string;
  accountStatus: string;
  lastOfferActivityAt: string;
  lastMugBetAt: string;
  daysSinceMugBet: string;
  suggestedAction: string;
  lastOfferType: string;
  lastOfferName: string;
  lastOfferResult: string;
};

export type ReportRow = {
  periodKey: string;
  periodLabel: string;
  sportsbookPnl: number;
  freeBetPnl: number;
  casinoPnl: number;
  totalPnl: number;
  withdrawals: number;
  costs: number;
  retainedProfit: number;
};

export type ModuleBreakdownRow = {
  moduleKey: "sportsbook" | "free-bets" | "casino" | "cash-adjustments";
  label: string;
  rowCount: number;
  reportingValue: number;
};

export type BookmakerBreakdownRow = {
  bookmaker: string;
  sportsbookPnl: number;
  freeBetPnl: number;
  casinoPnl: number;
  totalPnl: number;
  openRowCount: number;
};

export type TrackerSummaryResult = {
  resolvedDateRange: ResolvedDateRange;
  accountQuickView: {
    bookieBalance: number;
    exchangeBalance: number;
    bankBalance: number;
    pendingWithdrawals: number;
    cashSnapshot: number;
  };
  profitQuickView: {
    sportsbook: ModuleMetric;
    freeBets: ModuleMetric;
    casino: ModuleMetric;
    openCurrentValue: number;
    settledFinalValue: number;
    overallPnl: number;
  };
  betsQuickView: {
    openBets: number;
    overdueBets: number;
    partLaidBets: number;
    currentLiability: number;
    selectedRangeCashAdjustments: number;
    expiringFreeBetCount: number;
    accountsNeedingMugReview: number;
  };
  accountHealthQuickView: {
    placeMugBetCount: number;
    reviewMugCadenceCount: number;
    noActionCount: number;
  };
  activityQuickView: {
    sportsbookCount: number;
    freeBetCount: number;
    casinoCount: number;
    cashAdjustmentCount: number;
    latestActivityDate: string;
  };
  cashAdjustmentBreakdown: {
    topUps: number;
    deposits: number;
    withdrawals: number;
    deductionsAndSubscriptions: number;
    retainedProfit: number;
  };
  reportingModel: {
    selectedRange: {
      grossBettingPnl: number;
      cashAdjustments: number;
      retainedProfit: number;
      openCurrentValue: number;
      settledFinalValue: number;
    };
    formalReports: {
      weeklyPeriods: number;
      monthlyPeriods: number;
      yearlyPeriods: number;
      latestWeeklyLabel: string;
      latestMonthlyLabel: string;
      latestYearlyLabel: string;
      latestWeeklyRetainedProfit: number;
      latestMonthlyRetainedProfit: number;
      latestYearlyRetainedProfit: number;
    };
  };
  accountHealth: AccountHealthItem[];
  expiringFreeBets: FreeBetSummaryRecord[];
  recentActivity: ActivityItem[];
  recentBalanceSnapshots: BalanceSnapshotSummaryRecord[];
  moduleBreakdown: ModuleBreakdownRow[];
  bookmakerBreakdown: BookmakerBreakdownRow[];
  weeklyReports: ReportRow[];
  monthlyReports: ReportRow[];
  yearlyReports: ReportRow[];
};

const reportFreeBetStatuses = new Set(["Placed", "Settled"]);
const cashAdjustmentTypesForDashboard = new Set([
  "Deduction",
  "Subscription",
  "TopUp",
  "Withdrawal",
]);
const accountHealthStatuses = new Set(["Active", "Bonus Restricted", "Limited"]);
const defaultMugFrequencyDays = 14;
const defaultFreeBetExpiryAlertWindowDays = 3;
const costAdjustmentTypes = new Set(["Deduction", "Subscription", "Costs"]);
const moneyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const monthFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});

function ordinalSuffix(day: number): string {
  const remainder = day % 100;
  if (remainder >= 11 && remainder <= 13) {
    return "th";
  }
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function formatHumanDate(value: Date, includeTime: boolean): string {
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(value);
  const month = new Intl.DateTimeFormat("en-GB", { month: "long" }).format(value);
  const date = `${weekday} ${value.getDate()}${ordinalSuffix(value.getDate())} ${month} ${value.getFullYear()}`;
  if (!includeTime || (value.getHours() === 0 && value.getMinutes() === 0)) {
    return date;
  }
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(value);
  return `${date}, ${time}`;
}

function parseMoney(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }

  const normalized = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(normalized) ? normalized : 0;
}

function parseDateInput(value: string | null | undefined): Date | null {
  if (!value?.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function endOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeekMonday(value: Date): Date {
  return addDays(startOfDay(value), 1 - ((value.getDay() + 6) % 7 + 1));
}

function endOfWeekSunday(value: Date): Date {
  return endOfDay(addDays(startOfWeekMonday(value), 6));
}

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function endOfMonth(value: Date): Date {
  return endOfDay(new Date(value.getFullYear(), value.getMonth() + 1, 0));
}

function toPeriodDate(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function toLocalDateKey(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
    value.getDate()
  ).padStart(2, "0")}`;
}

function dateWithinRange(value: Date | null, range: ResolvedDateRange): boolean {
  if (!value) {
    return false;
  }
  return value >= range.start && value <= range.end;
}

export function formatMoney(value: number): string {
  return moneyFormatter.format(value);
}

export function formatDisplayDate(value: string): string {
  const parsed = parseDateInput(value);
  if (!parsed) {
    return "Unscheduled";
  }
  return dateFormatter.format(parsed);
}

export function formatHumanDisplayDate(value: string, includeTime = false): string {
  const parsed = parseDateInput(value);
  if (!parsed) {
    return "Unscheduled";
  }
  return formatHumanDate(parsed, includeTime);
}

export function getDatePresetOptions(): DatePreset[] {
  return [
    "Today",
    "Yesterday",
    "This Week",
    "Week (Mon-Sun)",
    "Last Week",
    "Past 7 Days",
    "Past 8 Days",
    "Fortnight",
    "This Month",
    "Last Month",
    "Custom",
  ];
}

export function resolveDateRange({
  preset,
  today,
  rangeBackDays,
  rangeForwardDays,
  customStart,
  customEnd,
}: {
  preset: DatePreset;
  today?: Date;
  rangeBackDays?: number;
  rangeForwardDays?: number;
  customStart?: string;
  customEnd?: string;
}): ResolvedDateRange {
  const baseToday = startOfDay(today ?? new Date());
  const backDays = Number.isFinite(rangeBackDays) ? Math.max(0, rangeBackDays ?? 0) : 0;
  const forwardDays = Number.isFinite(rangeForwardDays)
    ? Math.max(0, rangeForwardDays ?? 0)
    : 0;
  let baseStart = baseToday;
  let baseEnd = endOfDay(baseToday);

  switch (preset) {
    case "Today":
      break;
    case "Yesterday":
      baseStart = addDays(baseToday, -1);
      baseEnd = endOfDay(baseStart);
      break;
    case "This Week":
    case "Week (Mon-Sun)":
      baseStart = startOfWeekMonday(baseToday);
      baseEnd = preset === "This Week" ? endOfDay(baseToday) : endOfWeekSunday(baseToday);
      break;
    case "Last Week": {
      const thisWeekStart = startOfWeekMonday(baseToday);
      baseStart = addDays(thisWeekStart, -7);
      baseEnd = endOfDay(addDays(thisWeekStart, -1));
      break;
    }
    case "Past 7 Days":
      baseStart = addDays(baseToday, -6);
      baseEnd = endOfDay(baseToday);
      break;
    case "Past 8 Days":
      baseStart = addDays(baseToday, -7);
      baseEnd = endOfDay(baseToday);
      break;
    case "Fortnight":
      baseStart = addDays(baseToday, -13);
      baseEnd = endOfDay(baseToday);
      break;
    case "This Month":
      baseStart = startOfMonth(baseToday);
      baseEnd = endOfMonth(baseToday);
      break;
    case "Last Month": {
      const lastMonthDate = new Date(baseToday.getFullYear(), baseToday.getMonth() - 1, 1);
      baseStart = startOfMonth(lastMonthDate);
      baseEnd = endOfMonth(lastMonthDate);
      break;
    }
    case "Custom":
      baseStart = startOfDay(parseDateInput(customStart) ?? baseToday);
      baseEnd = endOfDay(parseDateInput(customEnd) ?? baseStart);
      break;
  }

  return {
    preset,
    start: addDays(baseStart, -backDays),
    end: endOfDay(addDays(baseEnd, forwardDays)),
    rangeBackDays: backDays,
    rangeForwardDays: forwardDays,
    customStart,
    customEnd,
  };
}

function buildReportAccumulator() {
  return {
    sportsbookPnl: 0,
    freeBetPnl: 0,
    casinoPnl: 0,
    totalPnl: 0,
    withdrawals: 0,
    costs: 0,
    retainedProfit: 0,
  };
}

function getWeekKey(value: Date): string {
  return toLocalDateKey(startOfWeekMonday(value));
}

function getWeekLabel(value: Date): string {
  return `Week commencing; ${formatHumanDate(startOfWeekMonday(value), false)}`;
}

function getMonthKey(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(value: Date): string {
  return monthFormatter.format(value);
}

function getYearKey(value: Date): string {
  return String(value.getFullYear());
}

function getYearLabel(value: Date): string {
  return String(value.getFullYear());
}

function pushOrAdd(
  store: Map<string, ReportRow>,
  key: string,
  label: string,
  updater: (row: ReportRow) => void
) {
  const existing =
    store.get(key) ??
    ({
      periodKey: key,
      periodLabel: label,
      ...buildReportAccumulator(),
    } satisfies ReportRow);

  updater(existing);
  existing.totalPnl = existing.sportsbookPnl + existing.freeBetPnl + existing.casinoPnl;
  existing.retainedProfit = existing.totalPnl + existing.withdrawals + existing.costs;
  store.set(key, existing);
}

function sortReportRows(rows: ReportRow[]): ReportRow[] {
  return [...rows].sort((left, right) => right.periodKey.localeCompare(left.periodKey));
}

function sortBookmakerRows(rows: BookmakerBreakdownRow[]): BookmakerBreakdownRow[] {
  return [...rows].sort((left, right) => right.totalPnl - left.totalPnl);
}

function firstRetainedProfit(rows: ReportRow[]): number {
  return rows[0]?.retainedProfit ?? 0;
}

function firstPeriodLabel(rows: ReportRow[]): string {
  return rows[0]?.periodLabel ?? "No periods yet";
}

export function summarizeTrackerData(
  dataset: TrackerSummaryDataset,
  resolvedDateRange: ResolvedDateRange,
  today?: Date,
  settings?: TrackerSummarySettings
): TrackerSummaryResult {
  const asOf = today ?? new Date();
  const mugBetFrequencyDays =
    Number.isFinite(settings?.mugBetFrequencyDays) && (settings?.mugBetFrequencyDays ?? 0) > 0
      ? Number(settings?.mugBetFrequencyDays)
      : defaultMugFrequencyDays;
  const freeBetExpiryAlertWindowDays =
    Number.isFinite(settings?.freeBetExpiryAlertWindowDays) &&
    (settings?.freeBetExpiryAlertWindowDays ?? -1) >= 0
      ? Number(settings?.freeBetExpiryAlertWindowDays)
      : defaultFreeBetExpiryAlertWindowDays;
  const expiryAlertCutoff = endOfDay(addDays(startOfDay(asOf), freeBetExpiryAlertWindowDays));
  const bookieBalance = dataset.accounts
    .filter((row) => row.counts_in_cash_total && row.type === "Bookie")
    .reduce((sum, row) => sum + parseMoney(row.current_balance), 0);
  const exchangeBalance = dataset.accounts
    .filter((row) => row.counts_in_cash_total && row.type === "Exchange")
    .reduce((sum, row) => sum + parseMoney(row.current_balance), 0);
  const bankBalance = dataset.accounts
    .filter((row) => row.counts_in_cash_total && row.type === "Bank")
    .reduce((sum, row) => sum + parseMoney(row.current_balance), 0);
  const pendingWithdrawals = dataset.accounts
    .filter((row) => row.counts_in_cash_total)
    .reduce((sum, row) => sum + parseMoney(row.pending_withdrawal_amount), 0);

  const sportsbookInRange = dataset.sportsbookBets.filter((row) =>
    dateWithinRange(parseDateInput(row.date_settled), resolvedDateRange)
  );
  const freeBetsInRange = dataset.freeBets.filter((row) =>
    dateWithinRange(parseDateInput(row.date_settled), resolvedDateRange)
  );
  const casinoInRange = dataset.casinoOffers.filter((row) =>
    dateWithinRange(parseDateInput(row.date_settling), resolvedDateRange)
  );
  const cashAdjustmentsInRange = dataset.cashAdjustments.filter((row) =>
    dateWithinRange(parseDateInput(row.adjustment_date), resolvedDateRange)
  );
  const recentBalanceSnapshots = (dataset.balanceSnapshots ?? [])
    .filter((row) => dateWithinRange(parseDateInput(row.snapshot_at), resolvedDateRange))
    .sort((left, right) => right.snapshot_at.localeCompare(left.snapshot_at))
    .slice(0, 20);

  const sportsbookReportingValue = sportsbookInRange.reduce(
    (sum, row) => sum + parseMoney(row.reporting_value),
    0
  );
  const sportsbookOpenCurrentValue = sportsbookInRange
    .filter((row) => row.counts_as_open)
    .reduce((sum, row) => sum + parseMoney(row.projected_current_pnl), 0);
  const sportsbookSettledFinalValue = sportsbookInRange
    .filter((row) => !row.counts_as_open)
    .reduce((sum, row) => sum + parseMoney(row.final_net_pnl), 0);
  const freeBetReportingValue = freeBetsInRange.reduce(
    (sum, row) => sum + parseMoney(row.reporting_value),
    0
  );
  const freeBetOpenCurrentValue = freeBetsInRange
    .filter((row) => row.counts_as_open)
    .reduce((sum, row) => sum + parseMoney(row.projected_current_pnl), 0);
  const freeBetSettledFinalValue = freeBetsInRange
    .filter((row) => !row.counts_as_open)
    .reduce((sum, row) => sum + parseMoney(row.final_net_pnl), 0);
  const casinoReportingValue = casinoInRange.reduce(
    (sum, row) => sum + parseMoney(row.resolved_net_pnl),
    0
  );
  const casinoSettledFinalValue = casinoInRange
    .filter((row) => !row.counts_as_open)
    .reduce((sum, row) => sum + parseMoney(row.resolved_net_pnl), 0);
  const selectedRangeCashAdjustments = cashAdjustmentsInRange
    .filter((row) => cashAdjustmentTypesForDashboard.has(row.adjustment_type))
    .reduce((sum, row) => sum + parseMoney(row.signed_amount), 0);

  // Dashboard operational metrics follow the same resolved range as its P&L.
  // Account balances remain current-state values and are intentionally handled above.
  const openSportsbook = sportsbookInRange.filter((row) => row.counts_as_open);
  const openFreeBets = freeBetsInRange.filter((row) => row.counts_as_open);
  const openCasino = casinoInRange.filter((row) => row.counts_as_open);

  const overdueBets =
    sportsbookInRange.filter((row) => row.is_overdue).length +
    freeBetsInRange.filter((row) => row.is_overdue).length +
    casinoInRange.filter((row) => row.is_overdue).length;

  const partLaidBets =
    dataset.sportsbookBets.filter(
      (row) =>
        row.lay_status === "Part Laid" &&
        dateWithinRange(parseDateInput(row.date_settled), resolvedDateRange)
    ).length +
    dataset.freeBets.filter(
      (row) =>
        row.lay_status === "Part Laid" &&
        dateWithinRange(parseDateInput(row.date_settled), resolvedDateRange)
    ).length;

  const currentLiability =
    openSportsbook.reduce((sum, row) => sum + parseMoney(row.calculated_liability_1), 0) +
    openFreeBets.reduce((sum, row) => sum + parseMoney(row.calculated_liability_1), 0);

  const topUps = cashAdjustmentsInRange
    .filter((row) => row.adjustment_type === "TopUp")
    .reduce((sum, row) => sum + parseMoney(row.signed_amount), 0);
  const deposits = cashAdjustmentsInRange
    .filter((row) => row.adjustment_type === "Deposit")
    .reduce((sum, row) => sum + parseMoney(row.signed_amount), 0);
  const withdrawals = cashAdjustmentsInRange
    .filter((row) => row.adjustment_type === "Withdrawal")
    .reduce((sum, row) => sum + parseMoney(row.signed_amount), 0);
  const deductionsAndSubscriptions = cashAdjustmentsInRange
    .filter((row) => costAdjustmentTypes.has(row.adjustment_type))
    .reduce((sum, row) => sum + parseMoney(row.signed_amount), 0);

  const expiringFreeBets = freeBetsInRange
    .filter(
      (row) =>
        ["Prospecting", "Available", "Not Yet Awarded"].includes(row.status) &&
        row.result === "Pending" &&
        !!parseDateInput(row.expiry_datetime)
    )
    .sort((left, right) => left.expiry_datetime.localeCompare(right.expiry_datetime))
    .filter((row) => {
      const expiryDate = parseDateInput(row.expiry_datetime);
      return expiryDate ? expiryDate >= asOf && expiryDate <= expiryAlertCutoff : false;
    })
    .slice(0, 8);

  const recentActivity: ActivityItem[] = [
    ...sportsbookInRange.map((row) => ({
      id: row.sportsbook_bet_id,
      module: "sportsbook" as const,
      label: row.event_name || row.sportsbook_bet_id,
      bookmakerOrAccount: row.bookmaker,
      status: `${row.status} / ${row.result}`,
      date: row.date_settled,
      value: parseMoney(row.reporting_value),
    })),
    ...freeBetsInRange.map((row) => ({
      id: row.free_bet_id,
      module: "free-bet" as const,
      label: row.event_name || row.free_bet_id,
      bookmakerOrAccount: row.bookmaker,
      status: `${row.status} / ${row.result}`,
      date: row.date_settled,
      value: parseMoney(row.reporting_value),
    })),
    ...casinoInRange.map((row) => ({
      id: row.casino_offer_id,
      module: "casino" as const,
      label: row.offer_name || row.casino_offer_id,
      bookmakerOrAccount: row.bookmaker,
      status: `${row.status} / ${row.result}`,
      date: row.date_settling,
      value: parseMoney(row.resolved_net_pnl),
    })),
    ...cashAdjustmentsInRange.map((row) => ({
      id: row.cash_adjustment_id,
      module: "cash-adjustment" as const,
      label: row.description || row.adjustment_type,
      bookmakerOrAccount: row.linked_account || "Cash adjustment",
      status: `${row.adjustment_type} / ${row.direction}`,
      date: row.adjustment_date,
      value: parseMoney(row.signed_amount),
    })),
  ]
    .filter((row) => !!parseDateInput(row.date))
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, 12);
  const latestActivityDate = recentActivity[0]?.date ?? "";

  const accountHealth = dataset.accounts
    .filter((row) => row.type === "Bookie" && accountHealthStatuses.has(row.status))
    .map((account) => {
      const matchingRows = dataset.sportsbookBets
        .filter((row) => row.bookmaker === account.account)
        .sort((left, right) => right.date_settled.localeCompare(left.date_settled));

      const nonMugRows = matchingRows.filter((row) => row.offer_type !== "Mug Bet");
      const mugRows = matchingRows.filter((row) => row.offer_type === "Mug Bet");
      const lastOfferRow = nonMugRows[0];
      const lastMugRow = mugRows[0];

      let daysSinceMugBet = "Never";
      let suggestedAction = "To confirm";
      if (lastMugRow?.date_settled) {
        const mugDate = parseDateInput(lastMugRow.date_settled);
        if (mugDate) {
          const wholeDays = Math.floor(
            (startOfDay(asOf).getTime() - startOfDay(mugDate).getTime()) / 86_400_000
          );
          daysSinceMugBet = String(Math.max(wholeDays, 0));
          suggestedAction = wholeDays >= mugBetFrequencyDays ? "Place Mug Bet" : "No action";
        }
      } else {
        suggestedAction = "Review mug cadence";
      }

      return {
        accountName: account.account,
        accountStatus: account.status,
        lastOfferActivityAt: lastOfferRow?.date_settled ?? "",
        lastMugBetAt: lastMugRow?.date_settled ?? "",
        daysSinceMugBet,
        suggestedAction,
        lastOfferType: lastOfferRow?.offer_type ?? "",
        lastOfferName: lastOfferRow?.offer_name || lastOfferRow?.event_name || "",
        lastOfferResult: lastOfferRow?.result ?? "",
      };
    })
    .sort((left, right) => left.accountName.localeCompare(right.accountName));

  const accountsNeedingMugReview = accountHealth.filter((row) =>
    ["Place Mug Bet", "Review mug cadence"].includes(row.suggestedAction)
  ).length;
  const placeMugBetCount = accountHealth.filter(
    (row) => row.suggestedAction === "Place Mug Bet"
  ).length;
  const reviewMugCadenceCount = accountHealth.filter(
    (row) => row.suggestedAction === "Review mug cadence"
  ).length;
  const noActionCount = accountHealth.filter((row) => row.suggestedAction === "No action").length;

  const weeklyMap = new Map<string, ReportRow>();
  const monthlyMap = new Map<string, ReportRow>();
  const yearlyMap = new Map<string, ReportRow>();

  for (const row of dataset.sportsbookBets) {
    const value = parseMoney(row.reporting_value);
    const settledDate = parseDateInput(row.date_settled);
    if (!settledDate) {
      continue;
    }
    const periodDate = toPeriodDate(settledDate);
    pushOrAdd(weeklyMap, getWeekKey(periodDate), getWeekLabel(periodDate), (reportRow) => {
      reportRow.sportsbookPnl += value;
    });
    pushOrAdd(monthlyMap, getMonthKey(periodDate), getMonthLabel(periodDate), (reportRow) => {
      reportRow.sportsbookPnl += value;
    });
    pushOrAdd(yearlyMap, getYearKey(periodDate), getYearLabel(periodDate), (reportRow) => {
      reportRow.sportsbookPnl += value;
    });
  }

  for (const row of dataset.freeBets) {
    if (!reportFreeBetStatuses.has(row.status)) {
      continue;
    }
    const value = parseMoney(row.reporting_value);
    const settledDate = parseDateInput(row.date_settled);
    if (!settledDate) {
      continue;
    }
    const periodDate = toPeriodDate(settledDate);
    pushOrAdd(weeklyMap, getWeekKey(periodDate), getWeekLabel(periodDate), (reportRow) => {
      reportRow.freeBetPnl += value;
    });
    pushOrAdd(monthlyMap, getMonthKey(periodDate), getMonthLabel(periodDate), (reportRow) => {
      reportRow.freeBetPnl += value;
    });
    pushOrAdd(yearlyMap, getYearKey(periodDate), getYearLabel(periodDate), (reportRow) => {
      reportRow.freeBetPnl += value;
    });
  }

  for (const row of dataset.casinoOffers) {
    const value = parseMoney(row.resolved_net_pnl);
    const settledDate = parseDateInput(row.date_settling);
    if (!settledDate) {
      continue;
    }
    const periodDate = toPeriodDate(settledDate);
    pushOrAdd(weeklyMap, getWeekKey(periodDate), getWeekLabel(periodDate), (reportRow) => {
      reportRow.casinoPnl += value;
    });
    pushOrAdd(monthlyMap, getMonthKey(periodDate), getMonthLabel(periodDate), (reportRow) => {
      reportRow.casinoPnl += value;
    });
    pushOrAdd(yearlyMap, getYearKey(periodDate), getYearLabel(periodDate), (reportRow) => {
      reportRow.casinoPnl += value;
    });
  }

  for (const row of dataset.cashAdjustments) {
    const value = parseMoney(row.signed_amount);
    const adjustmentDate = parseDateInput(row.adjustment_date);
    if (!adjustmentDate) {
      continue;
    }
    const apply = (reportRow: ReportRow) => {
      if (row.adjustment_type === "Withdrawal") {
        reportRow.withdrawals += value;
      }
      if (costAdjustmentTypes.has(row.adjustment_type)) {
        reportRow.costs += value;
      }
    };
    const periodDate = toPeriodDate(adjustmentDate);
    pushOrAdd(weeklyMap, getWeekKey(periodDate), getWeekLabel(periodDate), apply);
    pushOrAdd(monthlyMap, getMonthKey(periodDate), getMonthLabel(periodDate), apply);
    pushOrAdd(yearlyMap, getYearKey(periodDate), getYearLabel(periodDate), apply);
  }

  const weeklyReports = sortReportRows([...weeklyMap.values()]);
  const monthlyReports = sortReportRows([...monthlyMap.values()]);
  const yearlyReports = sortReportRows([...yearlyMap.values()]);
  const moduleBreakdown: ModuleBreakdownRow[] = [
    {
      moduleKey: "sportsbook",
      label: "Sportsbook",
      rowCount: sportsbookInRange.length,
      reportingValue: sportsbookReportingValue,
    },
    {
      moduleKey: "free-bets",
      label: "Free Bets",
      rowCount: freeBetsInRange.length,
      reportingValue: freeBetReportingValue,
    },
    {
      moduleKey: "casino",
      label: "Casino",
      rowCount: casinoInRange.length,
      reportingValue: casinoReportingValue,
    },
    {
      moduleKey: "cash-adjustments",
      label: "Cash Adjustments",
      rowCount: cashAdjustmentsInRange.length,
      reportingValue: selectedRangeCashAdjustments,
    },
  ];
  const bookmakerMap = new Map<string, BookmakerBreakdownRow>();
  const bookmakerRow = (bookmaker: string) =>
    bookmakerMap.get(bookmaker) ?? {
      bookmaker,
      sportsbookPnl: 0,
      freeBetPnl: 0,
      casinoPnl: 0,
      totalPnl: 0,
      openRowCount: 0,
    };

  for (const row of sportsbookInRange) {
    const next = bookmakerRow(row.bookmaker);
    next.sportsbookPnl += parseMoney(row.reporting_value);
    next.totalPnl = next.sportsbookPnl + next.freeBetPnl + next.casinoPnl;
    if (row.counts_as_open) {
      next.openRowCount += 1;
    }
    bookmakerMap.set(row.bookmaker, next);
  }

  for (const row of freeBetsInRange) {
    const next = bookmakerRow(row.bookmaker);
    next.freeBetPnl += parseMoney(row.reporting_value);
    next.totalPnl = next.sportsbookPnl + next.freeBetPnl + next.casinoPnl;
    if (row.counts_as_open) {
      next.openRowCount += 1;
    }
    bookmakerMap.set(row.bookmaker, next);
  }

  for (const row of casinoInRange) {
    const next = bookmakerRow(row.bookmaker);
    next.casinoPnl += parseMoney(row.resolved_net_pnl);
    next.totalPnl = next.sportsbookPnl + next.freeBetPnl + next.casinoPnl;
    if (row.counts_as_open) {
      next.openRowCount += 1;
    }
    bookmakerMap.set(row.bookmaker, next);
  }

  const bookmakerBreakdown = sortBookmakerRows([...bookmakerMap.values()]);
  const retainedProfit =
    sportsbookReportingValue +
    freeBetReportingValue +
    casinoReportingValue +
    withdrawals +
    deductionsAndSubscriptions;

  return {
    resolvedDateRange,
    accountQuickView: {
      bookieBalance,
      exchangeBalance,
      bankBalance,
      pendingWithdrawals,
      cashSnapshot: bookieBalance + exchangeBalance + bankBalance,
    },
    profitQuickView: {
      sportsbook: {
        count: sportsbookInRange.length,
        reportingValue: sportsbookReportingValue,
        currentValue: sportsbookOpenCurrentValue,
        finalValue: sportsbookSettledFinalValue,
      },
      freeBets: {
        count: freeBetsInRange.length,
        reportingValue: freeBetReportingValue,
        currentValue: freeBetOpenCurrentValue,
        finalValue: freeBetSettledFinalValue,
      },
      casino: {
        count: casinoInRange.length,
        reportingValue: casinoReportingValue,
        currentValue: 0,
        finalValue: casinoSettledFinalValue,
      },
      openCurrentValue: sportsbookOpenCurrentValue + freeBetOpenCurrentValue,
      settledFinalValue:
        sportsbookSettledFinalValue + freeBetSettledFinalValue + casinoSettledFinalValue,
      overallPnl: sportsbookReportingValue + freeBetReportingValue + casinoReportingValue,
    },
    betsQuickView: {
      openBets: openSportsbook.length + openFreeBets.length + openCasino.length,
      overdueBets,
      partLaidBets,
      currentLiability,
      selectedRangeCashAdjustments,
      expiringFreeBetCount: expiringFreeBets.length,
      accountsNeedingMugReview,
    },
    accountHealthQuickView: {
      placeMugBetCount,
      reviewMugCadenceCount,
      noActionCount,
    },
    activityQuickView: {
      sportsbookCount: sportsbookInRange.length,
      freeBetCount: freeBetsInRange.length,
      casinoCount: casinoInRange.length,
      cashAdjustmentCount: cashAdjustmentsInRange.length,
      latestActivityDate,
    },
    cashAdjustmentBreakdown: {
      topUps,
      deposits,
      withdrawals,
      deductionsAndSubscriptions,
      retainedProfit,
    },
    reportingModel: {
      selectedRange: {
        grossBettingPnl: sportsbookReportingValue + freeBetReportingValue + casinoReportingValue,
        cashAdjustments: selectedRangeCashAdjustments,
        retainedProfit,
        openCurrentValue: sportsbookOpenCurrentValue + freeBetOpenCurrentValue,
        settledFinalValue:
          sportsbookSettledFinalValue + freeBetSettledFinalValue + casinoSettledFinalValue,
      },
      formalReports: {
        weeklyPeriods: weeklyReports.length,
        monthlyPeriods: monthlyReports.length,
        yearlyPeriods: yearlyReports.length,
        latestWeeklyLabel: firstPeriodLabel(weeklyReports),
        latestMonthlyLabel: firstPeriodLabel(monthlyReports),
        latestYearlyLabel: firstPeriodLabel(yearlyReports),
        latestWeeklyRetainedProfit: firstRetainedProfit(weeklyReports),
        latestMonthlyRetainedProfit: firstRetainedProfit(monthlyReports),
        latestYearlyRetainedProfit: firstRetainedProfit(yearlyReports),
      },
    },
    accountHealth,
    expiringFreeBets,
    recentActivity,
    recentBalanceSnapshots,
    moduleBreakdown,
    bookmakerBreakdown,
    weeklyReports,
    monthlyReports,
    yearlyReports,
  };
}
