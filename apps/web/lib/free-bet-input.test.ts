import { describe, expect, it } from "vitest";
import { getFreeBetInputErrors } from "./free-bet-input";
import { summarizeTrackerData, resolveDateRange, type TrackerSummaryDataset } from "./tracker-summary";
import { aggregateCrossProfileReporting } from "./cross-profile-reporting";

const summary = (value: string | null, state = "resolved", status = "Settled") => summarizeTrackerData({
  accounts: [], sportsbookBets: [], casinoOffers: [], eachWayExtraPlaces: [], cashAdjustments: [],
  freeBets: [{
    free_bet_id: "FB-SYNTHETIC", bookmaker: "Bookmaker A", event_name: "Synthetic event",
    status, result: "Back Won", retention_mode: "SNR", date_settled: "2026-09-12",
    expiry_datetime: "", exchange_name: "", calculated_liability_1: null,
    projected_current_pnl: value, final_net_pnl: value, reporting_value: value,
    calculation_state: state, calculation_notes: ["free_bet_value requires correction"],
    lay_status: "Unavailable", counts_as_open: status === "Placed", is_overdue: false,
  }],
} as TrackerSummaryDataset, resolveDateRange({preset:"All Dates"}));

describe("PD-QA-014 complete-string Free Bet fields", () => {
  it.each(["NaN", "Infinity", "-Infinity", "not-money", "1.234", "1e2", "1,00"])("rejects %s without parsing", value => {
    for (const field of ["free_bet_value", "lay_actual", "lay_matched_stake_1", "manual_override_value"])
      expect(getFreeBetInputErrors({[field]:value})[field]).toBeTruthy();
  });
  it("preserves field-specific zero/blank/sign/precision", () => {
    expect(getFreeBetInputErrors({free_bet_value:"", lay_actual:"0", manual_override_value:"-1.25", back_odds:"5.001", lay_commission_1:"0.02345"})).toEqual({});
    expect(getFreeBetInputErrors({free_bet_value:"-1.00"}).free_bet_value).toBeTruthy();
    expect(getFreeBetInputErrors({lay_actual:null}).lay_actual).toBeTruthy();
  });
  it("keeps independent £10.60 and £20.60 settlement results", () => {
    expect(summary("10.60").profitQuickView.overallPnl).toBe(10.60);
    expect(summary("20.60").profitQuickView.overallPnl).toBe(20.60);
    expect((summary("10.60").profitQuickView.overallPnl + summary("20.60").profitQuickView.overallPnl).toFixed(2)).toBe("31.20");
  });
  it("invalid legacy included row is unavailable, not a complete zero subtotal", () => {
    const invalid=summary(null,"review_required");
    expect(invalid.profitQuickView.overallPnl).toBeNaN();
    expect(invalid.accountQuickView.cashSnapshot).toBe(0);
    expect(invalid.freeBetFinancialIssues?.[0]).toContain("FB-SYNTHETIC");
    expect(summary(null,"review_required","Placed").betsQuickView.currentLiability).toBeNaN();
    const combined=aggregateCrossProfileReporting([
      {profileId:"a",displayName:"Synthetic A",profileCode:"A",status:"Active",summary:invalid},
      {profileId:"b",displayName:"Synthetic B",profileCode:"B",status:"Active",summary:summary("10.60")},
    ]);
    expect(combined.totals.grossBettingPnl).toBeNaN();
    expect(combined.freeBetFinancialIssues?.[0]).toContain("Synthetic A");
  });
  it("empty drafts and known historical overrides retain their existing meanings", () => {
    expect(summary(null,"incomplete","Prospecting").profitQuickView.overallPnl).toBe(0);
    expect(summary("2.50","review_required").profitQuickView.overallPnl).toBe(2.50);
  });
});
