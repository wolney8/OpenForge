import { describe, expect, it } from "vitest";
import { filterFormalReportRows } from "./formal-report-filters";
import type { ReportRow } from "./tracker-summary";

const rows: ReportRow[] = [
  { periodKey: "2026-03", periodLabel: "March 2026", sportsbookPnl: 10, freeBetPnl: 0, casinoPnl: 0, totalPnl: 10, withdrawals: 0, costs: 0, retainedProfit: 10 },
  { periodKey: "2026-02", periodLabel: "February 2026", sportsbookPnl: -5, freeBetPnl: 0, casinoPnl: 0, totalPnl: -5, withdrawals: 0, costs: 0, retainedProfit: -5 },
  { periodKey: "2026-01", periodLabel: "January 2026", sportsbookPnl: 2, freeBetPnl: 0, casinoPnl: 0, totalPnl: 2, withdrawals: 0, costs: 0, retainedProfit: 2 },
];

describe("filterFormalReportRows", () => {
  it("limits the latest periods unless a specific period is selected", () => {
    const latest = filterFormalReportRows({
      rows,
      maximumPeriods: 2,
      periodKey: "",
      financialFilter: "all",
      feeValue: () => 0,
      feeReviewRequired: () => false,
    });
    expect(latest.map((row) => row.periodKey)).toEqual(["2026-03", "2026-02"]);

    const selected = filterFormalReportRows({
      rows,
      maximumPeriods: 2,
      periodKey: "2026-01",
      financialFilter: "all",
      feeValue: () => 0,
      feeReviewRequired: () => false,
    });
    expect(selected.map((row) => row.periodKey)).toEqual(["2026-01"]);
  });

  it("filters independently by profit, fee sign, and review state", () => {
    const common = {
      rows,
      maximumPeriods: null,
      periodKey: "",
      feeValue: (row: ReportRow) => (row.periodKey === "2026-02" ? -1 : 2),
      feeReviewRequired: (row: ReportRow) => row.periodKey === "2026-01",
    };
    expect(filterFormalReportRows({ ...common, financialFilter: "positive-pnl" })).toHaveLength(2);
    expect(filterFormalReportRows({ ...common, financialFilter: "negative-fees" })[0].periodKey).toBe("2026-02");
    expect(filterFormalReportRows({ ...common, financialFilter: "fee-review-required" })[0].periodKey).toBe("2026-01");
  });
});
