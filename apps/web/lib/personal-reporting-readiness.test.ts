import { describe, expect, it } from "vitest";
import { summarizeTrackerData, resolveDateRange, type TrackerSummaryDataset } from "./tracker-summary";
import { aggregateCrossProfileReporting } from "./cross-profile-reporting";
import { combineFeePositions, summarizeFeePeriods } from "./fee-period-summary";

function summary(id: string, settled: string, cost: string) {
  const data: TrackerSummaryDataset = { accounts: [], freeBets: [], casinoOffers: [], eachWayExtraPlaces: [],
    sportsbookBets: [{ sportsbook_bet_id: `${id}-bet`, bookmaker: "Bookmaker A", event_name: "Synthetic event", offer_type: "Bet & Get", offer_name: "Synthetic offer", status: "Settled", result: "Lay Won", date_settled: "2026-09-10", exchange_name: "Exchange A", match_strategy: "Standard", calculated_liability_1: "0", projected_current_pnl: settled, final_net_pnl: settled, reporting_value: settled, lay_status: "Matched", counts_as_open: false, is_overdue: false }],
    cashAdjustments: [
      { cash_adjustment_id: `${id}-cost`, adjustment_date: "2026-09-10", direction: "Out", amount: cost, adjustment_type: "Costs", linked_account: "Bank A", description: "Genuine synthetic operating cost", signed_amount: `-${cost}`, week_label: "2026-W37" },
      { cash_adjustment_id: `${id}-funding`, adjustment_date: "2026-09-10", direction: "In", amount: "500.00", adjustment_type: "TopUp", linked_account: "Bank A", description: "Funding, not betting profit", signed_amount: "500.00", week_label: "2026-W37" },
    ] };
  return summarizeTrackerData(data, resolveDateRange({ preset: "All Dates", today: new Date("2026-09-25T12:00:00Z") }));
}
describe("personal and managed reporting boundaries", () => {
  it.each([["100.00", 95], ["-20.00", -25], ["0.00", -5]] as const)("retains personal settled result %s and genuine costs independently and together", (amount, retained) => {
    // Final betting values already include the exchange engine's real commission.
    // Fee configuration must neither recompute that value nor erase operating costs.
    const personal = summary("personal", amount, "5.00"), managed = summary("managed", "200.00", "10.00");
    expect(personal.reportingModel.selectedRange.retainedProfit).toBe(retained);
    expect(personal.weeklyReports[0].retainedProfit).toBe(retained);
    expect(managed.reportingModel.selectedRange.retainedProfit).toBe(190);
    const profiles = [personal, managed].map((summary, i) => ({ profileId: `${i}`, displayName: i ? "Synthetic managed" : "Synthetic personal", profileCode: `${i}`, status: "Active", summary }));
    expect(aggregateCrossProfileReporting([profiles[0]]).totals.retainedProfit).toBe(retained);
    expect(aggregateCrossProfileReporting(profiles).totals.retainedProfit).toBe(retained + 190);
    const fee = (id: string, amount: string) => summarizeFeePeriods([{ fee_period_id: `${id}-fee`, profile_id: id, period_start: "2026-09-01", period_end: "2026-09-30", state: "crystallised", current_revision: { total_fee_due: amount, management_fee_amount: amount, investment_fee_amount: "0.00" }, fee_withdrawn_amount: "0.00", fee_outstanding_amount: amount }], new Date("2026-09-01"), new Date("2026-09-30"));
    expect(fee("personal", "0.00").feesEarned).toBe(0);
    expect(combineFeePositions([fee("personal", "0.00"), fee("managed", "80.00")]).feesEarned).toBe(80);
  });
});
