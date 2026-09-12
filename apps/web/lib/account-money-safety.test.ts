import { describe, expect, it } from "vitest";
import { resolveDateRange, summarizeTrackerData, type TrackerSummaryDataset } from "./tracker-summary";
import { aggregateCrossProfileReporting } from "./cross-profile-reporting";
import { accountMoneyDisplayValue } from "./account-money";

const account = (id: string, balance: string, included = true, pending = "0.00") => ({ account_id:id,account:`Synthetic ${id}`,type:"Bank",counts_in_cash_total:included,status:"Active",current_balance:balance,pending_withdrawal_amount:pending,last_balance_update:"",group_name:"",platform:"" });
const summary = (balance:string, included=true, pending="0.00") => summarizeTrackerData({accounts:[account("known","10.00"),account("tested",balance,included,pending)],sportsbookBets:[],freeBets:[],casinoOffers:[],eachWayExtraPlaces:[],cashAdjustments:[],balanceSnapshots:[]} as TrackerSummaryDataset, resolveDateRange({preset:"All Dates"}));

describe("#91 independent exact-cent Account totals",()=>{
  it.each(["", "NaN", "1.234", "90071992547409.93"])("invalid/unknown/unrepresentable %s is not fabricated in a cell",raw=>expect(accountMoneyDisplayValue(raw)).toBe("Unavailable"));
  it("zero remains a valid individual observation",()=>expect(accountMoneyDisplayValue("0")).toBe("0.00"));
  it.each([["12.34",22.34],["0.00",10],["-1.25",8.75]])("%s plus £10",(raw,expected)=>expect(summary(raw).accountQuickView.cashSnapshot).toBe(expected));
  it.each(["not-money","NaN","Infinity","-Infinity", "", "1.234", "1e2", "1,23"])("included %s is unavailable, not complete £10",raw=>{
    const s=summary(raw);expect(s.accountQuickView.cashSnapshot).toBeNaN();expect(s.profitQuickView.overallPnl).toBe(0);
    const combined=aggregateCrossProfileReporting([{profileId:"a",displayName:"Synthetic A",profileCode:"A",status:"Active",summary:s},{profileId:"b",displayName:"Synthetic B",profileCode:"B",status:"Active",summary:summary("0.00")}]);
    expect(combined.totals.cashSnapshot).toBeNaN();expect(combined.totals.grossBettingPnl).toBe(0);
  });
  it("excluded invalid balance does not contaminate included cash",()=>expect(summary("NaN",false).accountQuickView.cashSnapshot).toBe(10));
  it("invalid pending value is independently unavailable",()=>{const s=summary("12.34",true,"NaN");expect(s.accountQuickView.cashSnapshot).toBe(22.34);expect(s.accountQuickView.pendingWithdrawals).toBeNaN();});
});
