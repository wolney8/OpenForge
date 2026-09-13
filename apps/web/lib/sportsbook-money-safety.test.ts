import {expect, it} from "vitest";
import {getMoneyInputErrors} from "./decimal-input";
import {summarizeTrackerData, resolveDateRange, type TrackerSummaryDataset} from "./tracker-summary";
import {aggregateCrossProfileReporting} from "./cross-profile-reporting";

it("PD-QA-020 preserves editable invalid money and exact-zero/signed-override syntax", () => {
  for (const raw of ["NaN", "Infinity", "-Infinity", "not-money", "1.234", "1e2"])
    expect(getMoneyInputErrors({back_stake:raw}, ["back_stake"]).back_stake).toBeTruthy();
  expect(getMoneyInputErrors({back_stake:".50", lay_actual:"0", manual_override_value:"-1.18"}, ["back_stake","lay_actual","manual_override_value"])).toEqual({});
});

it("PD-QA-020 legacy invalid row makes included P&L/exposure incomplete, not zero; cash stays independent", () => {
  const make = (state: string, value: string|null) => summarizeTrackerData({
    accounts:[], freeBets:[], casinoOffers:[], eachWayExtraPlaces:[], cashAdjustments:[],
    sportsbookBets:[{sportsbook_bet_id:"SB-SYNTHETIC", event_name:"Synthetic", bookmaker:"Bookmaker A", offer_type:"Bet & Get", offer_name:"", exchange_name:"", match_strategy:"Standard", lay_status:"Unavailable", is_overdue:false, status:"Placed", result:"Pending", date_settled:"2026-09-13", calculation_state:state, calculation_notes:["back_stake requires correction"], reporting_value:value, final_net_pnl:value, projected_current_pnl:value, calculated_liability_1:null, counts_as_open:true}],
  } as TrackerSummaryDataset, resolveDateRange({preset:"All Dates"}));
  const invalid = make("review_required",null);
  expect(invalid.profitQuickView.overallPnl).toBeNaN();
  expect(invalid.profitQuickView.sportsbook.currentValue).toBeNaN();
  expect(invalid.betsQuickView.currentLiability).toBeNaN();
  expect(invalid.accountQuickView.cashSnapshot).toBe(0);
  expect(invalid.sportsbookFinancialIssues?.[0]).toContain("SB-SYNTHETIC");
  const combined=aggregateCrossProfileReporting([{profileId:"a",displayName:"Synthetic A",profileCode:"A",status:"Active",summary:invalid},{profileId:"b",displayName:"Synthetic B",profileCode:"B",status:"Active",summary:make("resolved","2.20")}]);
  expect(combined.totals.grossBettingPnl).toBeNaN();
  expect(combined.sportsbookFinancialIssues?.[0]).toContain("Synthetic A");
});
