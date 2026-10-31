import {expect, it} from "vitest";
import {getMoneyInputErrors} from "./decimal-input";
import {sportsbookFinancialReadiness, summarizeTrackerData, resolveDateRange, type SportsbookSummaryRecord, type TrackerSummaryDataset} from "./tracker-summary";
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

it("keeps reviewed imported realised P&L authoritative without claiming scenario reconstruction", () => {
  const row = {
    sportsbook_bet_id:"SB-IMPORTED-SETTLED", event_name:"Synthetic settled event", bookmaker:"Bookmaker A",
    offer_type:"Qualifying", offer_name:"", exchange_name:"Exchange A", match_strategy:"Standard",
    lay_status:"Matched", is_overdue:false, status:"Settled", result:"Lay Won", date_settled:"2026-09-13",
    calculation_state:"review_required", calculation_notes:[
      "Exchange commission is required before scenario values can be recalculated.",
      "The imported workbook value remains authoritative meanwhile.",
    ], reporting_value:"-3.52", final_net_pnl:"-3.52", projected_current_pnl:null,
    calculated_liability_1:"9.50", counts_as_open:false,
  } satisfies SportsbookSummaryRecord;
  const readiness = sportsbookFinancialReadiness(row);
  expect(readiness).toEqual({
    realisedPnlKnown:true,
    scenarioRecalculationReady:false,
    currentFinancialReady:null,
  });
  const result = summarizeTrackerData({accounts:[],freeBets:[],casinoOffers:[],eachWayExtraPlaces:[],cashAdjustments:[],sportsbookBets:[row]}, resolveDateRange({preset:"All Dates"}));
  expect(result.profitQuickView.overallPnl).toBe(-3.52);
  expect(result.profitQuickView.sportsbook.finalValue).toBe(-3.52);
  expect(result.sportsbookFinancialIssues).toEqual([]);
  expect(result.financialReadinessIssues).toEqual([]);
});

it("keeps missing realised P&L and committed missing-commission values actionable", () => {
  const base = {
    sportsbook_bet_id:"SB-MISSING", event_name:"Synthetic", bookmaker:"Bookmaker A", offer_type:"Qualifying",
    offer_name:"", exchange_name:"Exchange A", match_strategy:"Standard", lay_status:"Matched", is_overdue:false,
    result:"Lay Won", date_settled:"2026-09-13", calculation_state:"review_required",
    calculation_notes:["Exchange commission is required before scenario values can be recalculated."],
    reporting_value:null, final_net_pnl:null, projected_current_pnl:null, calculated_liability_1:"9.50",
    counts_as_open:false,
  } satisfies Omit<SportsbookSummaryRecord,"status">;
  const settled = {...base,status:"Settled"} satisfies SportsbookSummaryRecord;
  const committed = {...base,sportsbook_bet_id:"SB-COMMITTED",status:"Placed",result:"Pending",counts_as_open:true} satisfies SportsbookSummaryRecord;
  const result = summarizeTrackerData({accounts:[],freeBets:[],casinoOffers:[],eachWayExtraPlaces:[],cashAdjustments:[],sportsbookBets:[settled,committed]}, resolveDateRange({preset:"All Dates"}));
  expect(sportsbookFinancialReadiness(settled).realisedPnlKnown).toBe(false);
  expect(sportsbookFinancialReadiness(committed).currentFinancialReady).toBe(false);
  expect(result.sportsbookFinancialIssues).toHaveLength(2);
  expect(result.sportsbookCommittedFinancialIssues).toHaveLength(1);
  expect(result.sportsbookHistoricalFinancialIssues).toHaveLength(1);
  expect(result.profitQuickView.overallPnl).toBeNaN();
});
