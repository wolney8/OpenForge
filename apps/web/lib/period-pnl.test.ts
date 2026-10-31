import { describe, expect, it } from "vitest";
import { buildFormalReportRecords, formalReportWeekKey, resolveDateRange, summarizeTrackerData,
  type TrackerSummaryDataset } from "./tracker-summary";
import { aggregateCrossProfileReporting } from "./cross-profile-reporting";

const empty = (): TrackerSummaryDataset => ({
  accounts: [], sportsbookBets: [], freeBets: [], casinoOffers: [], cashAdjustments: [],
  eachWayExtraPlaces: [], balanceSnapshots: [],
});
const range = resolveDateRange({ preset: "All Dates" });
const sportsbook = (id: string, value: string, date = "2026-09-21T00:00:00") => ({
  sportsbook_bet_id: id, bookmaker: "Synthetic A", event_name: id, offer_type: "", offer_name: "",
  status: "Settled", result: "Back Won", date_settled: date, exchange_name: "", match_strategy: "",
  calculated_liability_1: null, projected_current_pnl: null, final_net_pnl: value, reporting_value: value,
  lay_status: "", counts_as_open: false, is_overdue: false,
});
function fixture(): TrackerSummaryDataset {
  return { ...empty(),
    sportsbookBets: [sportsbook("corrected", "5.00"), { ...sportsbook("void", "0.00"), result: "Void" },
      sportsbook("before", "40.00", "2026-09-20T23:59:59"),
      sportsbook("after", "80.00", "2026-09-28T00:00:00"), sportsbook("undated", "100.00", "")],
    freeBets: [{ free_bet_id: "placed", bookmaker: "Synthetic A", event_name: "Placed free bet",
      status: "Placed", result: "Pending", retention_mode: "SNR", date_settled: "2026-09-27T23:59:59",
      expiry_datetime: "", exchange_name: "", calculated_liability_1: null, projected_current_pnl: "4.00",
      final_net_pnl: null, reporting_value: "4.00", lay_status: "", counts_as_open: true, is_overdue: false }],
    casinoOffers: [{ casino_offer_id: "casino", bookmaker: "Synthetic A", offer_name: "Gross 10 less fee 2",
      status: "Settled", result: "Completed", date_started: "", date_settling: "2026-09-23",
      expiry_datetime: "", resolved_net_pnl: "8.00", counts_as_open: false, is_overdue: false, week_label: "" }],
    eachWayExtraPlaces: [{ each_way_extra_place_id: "extra", placed_at: "2026-09-24", runner: "Synthetic",
      race: "Synthetic", bookmaker: "Synthetic A", mode: "Extra Place", status: "Settled", result: "Lost",
      current_value: "-9.00", final_value: "-2.00" }],
    cashAdjustments: [["Top Up", "200.00"], ["Deposit", "100.00"], ["Deduction", "-2.00"], ["Withdrawal", "-3.00"]]
      .map(([kind, value]) => ({ cash_adjustment_id: kind, adjustment_date: "2026-09-24",
        direction: "In", amount: value, adjustment_type: kind, linked_account: "", description: kind,
        signed_amount: value, week_label: "" })),
  };
}
describe("period P&L uses formal report records, not a second profit policy", () => {
  it("reconciles corrected/void/current rows, embedded fees, costs and funding independently", () => {
    const data = fixture();
    const summary = summarizeTrackerData(data, range);
    const week = summary.weeklyReports.find((row) => row.periodKey === "2026-09-21")!;
    expect(week).toMatchObject({ sportsbookPnl: 5, freeBetPnl: 4, casinoPnl: 8, eachWayExtraPlacePnl: -2,
      totalPnl: 15, costs: -2, withdrawals: -3, retainedProfit: 10 });
    const records = buildFormalReportRecords(data).filter((row) => row.weekKey === week.periodKey);
    const betting = records.filter((row) => !["funding", "costs", "withdrawals"].includes(row.component));
    expect(betting.map((row) => [row.id, row.value])).toEqual([
      ["corrected", 5], ["void", 0], ["placed", 4], ["casino", 8], ["extra", -2]]);
    expect(betting.reduce((sum, row) => sum + row.value, 0)).toBe(15);
    expect(records.some((row) => row.id === "undated")).toBe(false);
  });
  it("retains both boundary points and excludes unavailable Free Bets without date fallbacks", () => {
    const data = fixture();
    data.freeBets.push({ ...data.freeBets[0], free_bet_id: "available", status: "Available", reporting_value: "900.00" });
    const rows = summarizeTrackerData(data, range).weeklyReports;
    expect(rows.map((row) => [row.periodKey, row.totalPnl])).toEqual([
      ["2026-09-28", 80], ["2026-09-21", 15], ["2026-09-14", 40]]);
    expect(buildFormalReportRecords(data).some((row) => row.id === "available")).toBe(false);
  });
  it("sums only explicitly authorised selected Profile summaries; archived selection is deliberate", () => {
    const profiles = [
      { profileId: "A", displayName: "A", profileCode: "A", status: "Active", summary: summarizeTrackerData(fixture(), range) },
      { profileId: "B", displayName: "B", profileCode: "B", status: "Active",
        summary: summarizeTrackerData({ ...empty(), sportsbookBets: [sportsbook("B", "-3.00")] }, range) },
      { profileId: "C", displayName: "C", profileCode: "C", status: "Archived",
        summary: summarizeTrackerData({ ...empty(), sportsbookBets: [sportsbook("C", "7.00")] }, range) },
    ];
    expect(aggregateCrossProfileReporting(profiles.filter((p) => p.status === "Active"))
      .weeklyReports.find((row) => row.periodKey === "2026-09-21")).toMatchObject({ totalPnl: 12, retainedProfit: 7 });
    expect(aggregateCrossProfileReporting(profiles).weeklyReports.find((row) => row.periodKey === "2026-09-21"))
      .toMatchObject({ totalPnl: 19, retainedProfit: 14 });
  });
  it("has a genuine empty period and validates stored week selection", () => {
    expect(summarizeTrackerData(empty(), range).weeklyReports).toEqual([]);
    expect(formalReportWeekKey("2026-09-27")).toBe("2026-09-21");
    expect(formalReportWeekKey("2026-09-28")).toBe("2026-09-28");
    expect(formalReportWeekKey("2026-02-30")).toBeNull();
    expect(formalReportWeekKey("bad")).toBeNull();
  });
  it("retains unknown money rather than painting it as zero", () => {
    const data = { ...empty(), sportsbookBets: [{ ...sportsbook("unknown", ""), calculation_state: "review_required" }] };
    expect(buildFormalReportRecords(data)[0].value).toBeNaN();
    expect(summarizeTrackerData(data, range).weeklyReports[0].totalPnl).toBeNaN();
  });
  it("reports an authoritative imported settled value when historical scenarios cannot be reconstructed", () => {
    const data = { ...empty(), sportsbookBets: [{
      ...sportsbook("imported-authority", "-4.25"),
      calculation_state: "review_required",
      calculation_notes: [
        "Exchange commission is required before scenario values can be recalculated.",
        "The imported workbook value remains authoritative meanwhile.",
      ],
    }] };
    expect(buildFormalReportRecords(data)[0].value).toBe(-4.25);
    const summary = summarizeTrackerData(data, range);
    expect(summary.weeklyReports[0].totalPnl).toBe(-4.25);
    expect(summary.sportsbookFinancialIssues).toEqual([]);
  });
});
