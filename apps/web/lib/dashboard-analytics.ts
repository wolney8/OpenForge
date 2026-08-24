import type {
  DatePreset,
  ResolvedDateRange,
  TrackerSummaryDataset,
  TrackerSummaryResult,
} from "./tracker-summary";

export type DashboardDisplayMode = "Compact" | "High-Density" | "Visual Comparison";

export type DashboardPeriodShortcut = "1D" | "1W" | "1M" | "1Y" | "ALL";

export type DashboardTargetSettings = {
  weekly_profit_target?: string | null;
  monthly_profit_target?: string | null;
  annual_profit_target?: string | null;
};

export type DashboardTargetProgress = {
  label: string;
  targetKey: "weekly_profit_target" | "monthly_profit_target" | "annual_profit_target" | "none";
  targetValue: number | null;
  currentValue: number;
  progressPercent: number;
  remainingValue: number | null;
  isSet: boolean;
  isExceeded: boolean;
};

export type DashboardTrendPoint = {
  key: string;
  label: string;
  value: number;
  cumulativeValue: number;
};

const dashboardDisplayModes: DashboardDisplayMode[] = [
  "Compact",
  "High-Density",
  "Visual Comparison",
];

export function normalizeDashboardDisplayMode(value: string | null | undefined): DashboardDisplayMode {
  return dashboardDisplayModes.includes(value as DashboardDisplayMode)
    ? (value as DashboardDisplayMode)
    : "High-Density";
}

export function mapDashboardShortcutToPreset(shortcut: DashboardPeriodShortcut): DatePreset {
  switch (shortcut) {
    case "1D":
      return "Today";
    case "1W":
      return "Week (Mon-Sun)";
    case "1M":
      return "This Month";
    case "1Y":
      return "This Year";
    case "ALL":
      return "All Dates";
  }
}

export function getDashboardShortcutForPreset(preset: DatePreset): DashboardPeriodShortcut | null {
  switch (preset) {
    case "Today":
      return "1D";
    case "Week (Mon-Sun)":
    case "This Week":
      return "1W";
    case "This Month":
      return "1M";
    case "This Year":
      return "1Y";
    case "All Dates":
      return "ALL";
    default:
      return null;
  }
}

export function parseDashboardTargetValue(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function buildDashboardTrend(summary: TrackerSummaryResult): Array<{ label: string; value: number }> {
  if (summary.weeklyReports.length > 0) {
    return summary.weeklyReports
      .slice(0, 6)
      .reverse()
      .map((row) => ({
        label: row.periodLabel,
        value: row.totalPnl,
      }));
  }

  return summary.moduleBreakdown.map((row) => ({
    label: row.label,
    value: row.reportingValue,
  }));
}

function parseDashboardMoney(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Number(String(value).replace(/[£,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDashboardDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}

function isDateInRange(date: Date | null, range: ResolvedDateRange): date is Date {
  return date !== null && date.getTime() >= range.start.getTime() && date.getTime() <= range.end.getTime();
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getIsoDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getQuarterKey(date: Date): string {
  return `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
}

function getWeekKey(date: Date): string {
  const day = startOfDay(date);
  const dayOfWeek = day.getDay() === 0 ? 7 : day.getDay();
  day.setDate(day.getDate() - dayOfWeek + 1);
  return getIsoDateKey(day);
}

const shortDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});

const monthLabelFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "2-digit",
});

function getTrendBucket(range: ResolvedDateRange): "day" | "week" | "month" | "quarter" {
  const spanDays = Math.max(1, Math.ceil((range.end.getTime() - range.start.getTime()) / 86_400_000));
  if (range.preset === "Today" || spanDays <= 14) return "day";
  if (spanDays <= 93) return "week";
  if (spanDays <= 400) return "month";
  return "quarter";
}

function formatTrendLabel(key: string, bucket: ReturnType<typeof getTrendBucket>): string {
  if (bucket === "quarter") return key.replace("-", " ");
  if (bucket === "month") {
    const [year, month] = key.split("-").map(Number);
    return monthLabelFormatter.format(new Date(year, month - 1, 1));
  }
  const date = new Date(`${key}T00:00:00`);
  if (bucket === "week") return `W/C ${shortDateFormatter.format(date)}`;
  return shortDateFormatter.format(date);
}

function getBucketKey(date: Date, bucket: ReturnType<typeof getTrendBucket>): string {
  switch (bucket) {
    case "quarter":
      return getQuarterKey(date);
    case "month":
      return getMonthKey(date);
    case "week":
      return getWeekKey(date);
    case "day":
      return getIsoDateKey(date);
  }
}

export function buildDashboardTrendFromDataset({
  dataset,
  range,
  summary,
}: {
  dataset: TrackerSummaryDataset;
  range: ResolvedDateRange;
  summary: TrackerSummaryResult;
}): DashboardTrendPoint[] {
  const bucket = getTrendBucket(range);
  const rows: Array<{ date: Date; value: number }> = [
    ...dataset.sportsbookBets.map((row) => ({
      date: parseDashboardDate(row.date_settled) ?? parseDashboardDate(row.created_at) ?? range.start,
      value: parseDashboardMoney(row.reporting_value),
    })),
    ...dataset.freeBets.map((row) => ({
      date:
        parseDashboardDate(row.date_settled) ??
        parseDashboardDate(row.expiry_datetime) ??
        parseDashboardDate(row.created_at) ??
        range.start,
      value: parseDashboardMoney(row.reporting_value),
    })),
    ...dataset.casinoOffers.map((row) => ({
      date:
        parseDashboardDate(row.date_settling) ??
        parseDashboardDate(row.date_started) ??
        parseDashboardDate(row.expiry_datetime) ??
        range.start,
      value: parseDashboardMoney(row.resolved_net_pnl),
    })),
    ...(dataset.eachWayExtraPlaces ?? []).map((row) => ({
      date: parseDashboardDate(row.placed_at) ?? range.start,
      value: parseDashboardMoney(row.final_value ?? row.current_value),
    })),
  ].filter((row) => isDateInRange(row.date, range));

  const buckets = new Map<string, number>();
  for (const row of rows) {
    const key = getBucketKey(row.date, bucket);
    buckets.set(key, (buckets.get(key) ?? 0) + row.value);
  }

  const sorted = [...buckets.entries()].sort(([left], [right]) => left.localeCompare(right));
  if (sorted.length === 0) {
    return [
      {
        key: "empty-range",
        label: "No activity",
        value: 0,
        cumulativeValue: 0,
      },
    ];
  }

  let cumulativeValue = 0;
  const points = sorted.map(([key, value]) => {
    cumulativeValue += value;
    return {
      key,
      label: formatTrendLabel(key, bucket),
      value,
      cumulativeValue,
    };
  });

  const summaryTotal = summary.profitQuickView.overallPnl;
  const delta = summaryTotal - cumulativeValue;
  if (Math.abs(delta) >= 0.005) {
    const last = points[points.length - 1];
    points[points.length - 1] = {
      ...last,
      value: last.value + delta,
      cumulativeValue: summaryTotal,
    };
  }

  return points;
}

export function buildSparklinePoints(points: Array<{ value: number }>): { line: string; area: string } {
  if (points.length === 0) {
    return { line: "", area: "" };
  }

  const width = 100;
  const height = 42;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const coordinates = points.map((point, index) => {
    const x = points.length === 1 ? width : (index / (points.length - 1)) * width;
    const y = height - ((point.value - min) / range) * (height - 8) - 4;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return {
    line: coordinates.join(" "),
    area: `0,${height} ${coordinates.join(" ")} ${width},${height}`,
  };
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function getTargetKeyForRange(
  range: ResolvedDateRange
): Pick<DashboardTargetProgress, "label" | "targetKey"> {
  switch (range.preset) {
    case "Today":
    case "This Week":
    case "Week (Mon-Sun)":
    case "Last Week":
    case "Past 7 Days":
    case "Past 8 Days":
    case "Fortnight":
      return { label: "Weekly target", targetKey: "weekly_profit_target" };
    case "This Month":
    case "Last Month":
      return { label: "Monthly target", targetKey: "monthly_profit_target" };
    case "This Year":
      return { label: "Annual target", targetKey: "annual_profit_target" };
    case "All Dates":
    case "Custom":
    case "Yesterday":
      return { label: "Target", targetKey: "none" };
  }
}

export function buildDashboardTargetProgress({
  range,
  settings,
  summary,
}: {
  range: ResolvedDateRange;
  settings: DashboardTargetSettings;
  summary: TrackerSummaryResult;
}): DashboardTargetProgress {
  const binding = getTargetKeyForRange(range);
  const currentValue = summary.profitQuickView.overallPnl;
  const targetValue =
    binding.targetKey === "none" ? null : parseDashboardTargetValue(settings[binding.targetKey]);

  if (targetValue === null) {
    return {
      ...binding,
      targetValue,
      currentValue,
      progressPercent: 0,
      remainingValue: null,
      isSet: false,
      isExceeded: false,
    };
  }

  const progressPercent = clampPercent((Math.max(0, currentValue) / targetValue) * 100);
  const remainingValue = Math.max(0, targetValue - currentValue);
  return {
    ...binding,
    targetValue,
    currentValue,
    progressPercent,
    remainingValue,
    isSet: true,
    isExceeded: currentValue >= targetValue,
  };
}
