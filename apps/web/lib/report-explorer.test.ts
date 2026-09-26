import { describe, expect, it } from "vitest";
import { buildExplorerRecords, exploreRecords, explorerRange, londonReportDay } from "./report-explorer";
import type { SportsbookSummaryRecord, TrackerSummaryDataset } from "./tracker-summary";
const row=(id:string,value:string|null,extra:Partial<SportsbookSummaryRecord>={}):SportsbookSummaryRecord=>({
  sportsbook_bet_id:id,bookmaker:"Bookmaker A",event_name:id,offer_type:"Profit Boost",offer_name:"",
  bet_type:"Normal",fixture_type:"Single",status:"Settled",result:"Win",date_settled:"2026-09-23",
  exchange_name:"",match_strategy:"NoLay",calculated_liability_1:null,projected_current_pnl:"999.00",
  final_net_pnl:value,reporting_value:value,lay_status:"",counts_as_open:false,is_overdue:false,...extra});
const dataset=(rows:SportsbookSummaryRecord[]):TrackerSummaryDataset=>({accounts:[],sportsbookBets:rows,freeBets:[],casinoOffers:[],cashAdjustments:[]});
const scopes=[{profileId:"personal",label:"Personal",dataset:dataset([row("same","12.34"),row("zero","0"),row("prospect","500",{status:"Prospecting"}),row("void","-1",{status:"Void",result:"Void"})])},
 {profileId:"managed",label:"Managed",dataset:dataset([row("same","-2.34",{bookmaker:"Bookmaker B",bet_type:"SNR"})])}];
const range={start:"2026-09-21",end:"2026-09-27"};
describe("Reports Explorer canonical projection",()=>{
 it("uses London midnight, Monday week, month and DST boundaries",()=>{
   expect(londonReportDay("2026-09-30T23:30:00Z")).toBe("2026-10-01");
   expect(londonReportDay("2026-09-30T23:30:00")).toBe("2026-09-30");
   expect(londonReportDay("2026-02-30")).toBeNull();
   expect(explorerRange("Today",new Date("2026-03-29T23:30:00Z"),"","")).toEqual({start:"2026-03-30",end:"2026-03-30"});
   expect(explorerRange("This Week",new Date("2026-10-25T12:00:00Z"),"","")).toEqual({start:"2026-10-19",end:"2026-10-25"});
   expect(explorerRange("This Month",new Date("2026-09-30T23:30:00Z"),"","")).toEqual({start:"2026-10-01",end:"2026-10-31"});
 });
 it("aggregates Personal and Managed performance without fee ownership inference; identities remain Profile scoped",()=>{
   const r=exploreRecords(buildExplorerRecords(scopes),"pnl",range,{},"provider");
   expect(r.known).toBe(9);expect(r.count).toBe(4);expect(r.unknown).toBe(0);
   expect(r.groups.map(g=>[g.key,g.known])).toEqual([["Bookmaker A",11.34],["Bookmaker B",-2.34]]);
   expect(exploreRecords(buildExplorerRecords([scopes[0]]),"pnl",range,{},"betType").known).toBe(11.34);
 });
 it("counts operational records, excludes opportunities and Void, filters provider/module/type",()=>{
   const rows=buildExplorerRecords(scopes);
   expect(exploreRecords(rows,"count",range,{},"betType").known).toBe(3);
   const r=exploreRecords(rows,"count",range,{provider:"Bookmaker A",module:"sportsbook-bets",betType:"Normal"},"betType");
   expect(r.known).toBe(2);expect(r.records.map(r=>r.id)).toEqual(["same","zero"]);
 });
 it("retains known subtotal and distinguishes missing, undated, zero and empty periods",()=>{
   const d=dataset([row("p","12.34"),row("n","-2.34"),row("unknown",null),row("undated","8",{date_settled:""})]);
   const rows=buildExplorerRecords([{profileId:"p",label:"P",dataset:d}]);
   const r=exploreRecords(rows,"pnl",range,{},"module");
   expect(r.known).toBe(10);expect(r.unknown).toBe(1);expect(r.undated).toHaveLength(1);
   const empty=exploreRecords(rows,"pnl",{start:"2027-01-01",end:"2027-01-31"},{},"module");
   expect(empty.known).toBe(0);expect(empty.undated).toHaveLength(1);
   expect(exploreRecords(rows,"pnl",{start:null,end:null},{},"module").valid).toBe(false);
 });
 it("deduplicates corrections and keeps funding/balances/history outside betting profit",()=>{
   const d=dataset([row("corrected","9"),row("corrected","4")]);
   d.cashAdjustments=[{cash_adjustment_id:"fund",adjustment_date:"2026-09-23",adjustment_type:"TopUp",signed_amount:"500",direction:"In",amount:"500",description:"",linked_account:"Bank A",week_label:""},
     {cash_adjustment_id:"cost",adjustment_date:"2026-09-23",adjustment_type:"Costs",signed_amount:"-3",direction:"Out",amount:"3",description:"",linked_account:"Bank A",week_label:""},
     {cash_adjustment_id:"withdraw",adjustment_date:"2026-09-23",adjustment_type:"Withdrawal",signed_amount:"-2",direction:"Out",amount:"2",description:"",linked_account:"Bank A",week_label:""}];
   const rows=buildExplorerRecords([{profileId:"p",label:"P",dataset:d}]);
   expect(exploreRecords(rows,"pnl",range,{},"module").known).toBe(4);
   expect(exploreRecords(rows,"costs",range,{},"module").known).toBe(-3);
   expect(exploreRecords(rows,"withdrawals",range,{},"module").known).toBe(-2);
 });
 it("counts placed Free Bets, active Casino and Extra Place without unplaced rewards",()=>{
   const d=dataset([]);
   d.freeBets=[{...row("x","2"),free_bet_id:"f",status:"Available",retention_mode:"SNR",expiry_datetime:""},
     {...row("y","3"),free_bet_id:"f2",status:"Placed",retention_mode:"SNR",expiry_datetime:""}];
   d.casinoOffers=[{casino_offer_id:"c",bookmaker:"A",offer_name:"C",status:"Started",result:"Pending",date_started:"2026-09-20",date_settling:"2026-09-23",expiry_datetime:"",resolved_net_pnl:null,counts_as_open:true,is_overdue:false,week_label:""}];
   d.eachWayExtraPlaces=[{each_way_extra_place_id:"e",placed_at:"2026-09-23",runner:"E",race:"",bookmaker:"A",mode:"Extra Place",status:"Settled",result:"Unplaced",current_value:"99",final_value:"-1"}];
   const rows=buildExplorerRecords([{profileId:"p",label:"P",dataset:d}]);
   expect(exploreRecords(rows,"count",range,{},"module").known).toBe(3);
   expect(exploreRecords(rows,"pnl",range,{},"module").known).toBe(-1);
 });
});
