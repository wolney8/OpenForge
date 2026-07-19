import type { ReportRow } from "./tracker-summary";

export type FormalReportFinancialFilter =
  | "all"
  | "positive-pnl"
  | "negative-pnl"
  | "positive-fees"
  | "negative-fees"
  | "fee-review-required";

export function filterFormalReportRows({
  rows,
  maximumPeriods,
  periodKey,
  financialFilter,
  feeValue,
  feeReviewRequired,
}: {
  rows: ReportRow[];
  maximumPeriods: number | null;
  periodKey: string;
  financialFilter: FormalReportFinancialFilter;
  feeValue: (row: ReportRow) => number;
  feeReviewRequired: (row: ReportRow) => boolean;
}): ReportRow[] {
  const periodRows = periodKey
    ? rows.filter((row) => row.periodKey === periodKey)
    : maximumPeriods === null
      ? rows
      : rows.slice(0, maximumPeriods);

  return periodRows.filter((row) => {
    if (financialFilter === "positive-pnl") return row.totalPnl > 0;
    if (financialFilter === "negative-pnl") return row.totalPnl < 0;
    if (financialFilter === "positive-fees") return feeValue(row) > 0;
    if (financialFilter === "negative-fees") return feeValue(row) < 0;
    if (financialFilter === "fee-review-required") return feeReviewRequired(row);
    return true;
  });
}
