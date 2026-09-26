import { readSummaryMoney, type TrackerSummaryDataset } from "./tracker-summary";

export type ExplorerScope = { profileId: string; label: string; dataset: TrackerSummaryDataset };
export type ExplorerMetric = "pnl" | "count" | "costs" | "withdrawals";
export type ExplorerDimension = "provider" | "module" | "betType" | "offerType" | "fixtureType" | "status" | "result";
export const explorerDimensions: Record<ExplorerDimension, string> = {
  provider: "Bookmaker / provider", module: "Module", betType: "Bet type", offerType: "Offer type",
  fixtureType: "Fixture type", status: "Status", result: "Result",
};
export const explorerModules: Record<string, string> = {
  "sportsbook-bets": "Sportsbook", "free-bets": "Free Bets", "casino-offers": "Casino",
  "each-way-extra-places": "Each Way / Extra Places", "cash-adjustments": "Cash",
};
export type ExplorerRecord = Record<ExplorerDimension, string> & {
  id: string; profileId: string; profileLabel: string; label: string; date: string | null;
  realised: boolean; operational: boolean; value: number; cashType: string;
};
const missing = "Not recorded";
export function londonReportDay(value: string | Date): string | null {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}(?:$|T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$)/.test(value)) {
    const day=value.slice(0,10), date=new Date(day+"T12:00:00Z");
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10)===day ? day : null;
  }
  if (!value) return null;
  const date=value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
export function explorerRange(preset: string, now: Date, start: string, end: string) {
  const today=londonReportDay(now)!;
  if (preset==="Custom") return { start: londonReportDay(start), end: londonReportDay(end) };
  if (preset==="Today") return { start: today, end: today };
  const day=new Date(today+"T12:00:00Z");
  if (preset==="This Week") {
    day.setUTCDate(day.getUTCDate()-(day.getUTCDay()+6)%7);
    const first=day.toISOString().slice(0,10);day.setUTCDate(day.getUTCDate()+6);
    return { start:first,end:day.toISOString().slice(0,10) };
  }
  return { start:today.slice(0,7)+"-01",end:new Date(Date.UTC(day.getUTCFullYear(),day.getUTCMonth()+1,0,12)).toISOString().slice(0,10) };
}
export function buildExplorerRecords(scopes: ExplorerScope[]): ExplorerRecord[] {
  const rows: ExplorerRecord[]=[];
  for (const scope of scopes) {
    const add=(row: Omit<ExplorerRecord,"profileId"|"profileLabel">) => rows.push({...row,profileId:scope.profileId,profileLabel:scope.label});
    for (const [module, records] of [["sportsbook-bets",scope.dataset.sportsbookBets],["free-bets",scope.dataset.freeBets]] as const) {
      for (const r of records) add({id:"sportsbook_bet_id" in r ? r.sportsbook_bet_id : r.free_bet_id,
        module,provider:r.bookmaker||missing,betType:r.bet_type||missing,offerType:r.offer_type||missing,
        fixtureType:r.fixture_type||missing,status:r.status,result:r.result,label:r.event_name||module,
        date:londonReportDay(r.date_settled),realised:r.status==="Settled"||r.status==="Void",
        operational:["Placed","Settled"].includes(r.status)&&!r.result.startsWith("Void"),
        value:r.calculation_state==="review_required" ? NaN : readSummaryMoney(r.final_net_pnl),cashType:""});
    }
    for (const r of scope.dataset.casinoOffers) add({id:r.casino_offer_id,module:"casino-offers",provider:r.bookmaker||missing,
      betType:missing,offerType:r.offer_type||missing,fixtureType:missing,status:r.status,result:r.result,label:r.offer_name,
      date:londonReportDay(r.date_settling),realised:r.status==="Settled",
      operational:["Started","In Progress","Settled"].includes(r.status)&&r.result!=="Void",
      value:readSummaryMoney(r.resolved_net_pnl),cashType:""});
    for (const r of scope.dataset.eachWayExtraPlaces??[]) add({id:r.each_way_extra_place_id,module:"each-way-extra-places",
      provider:r.bookmaker||missing,betType:r.mode,offerType:missing,fixtureType:missing,status:r.status,result:r.result,
      label:r.runner||r.race,date:londonReportDay(r.placed_at),realised:["Settled","Void"].includes(r.status),
      operational:["Placed","Settled"].includes(r.status)&&!r.result.startsWith("Void"),value:readSummaryMoney(r.final_value),cashType:""});
    for (const r of scope.dataset.cashAdjustments) add({id:r.cash_adjustment_id,module:"cash-adjustments",provider:r.linked_account||missing,
      betType:missing,offerType:missing,fixtureType:missing,status:"Recorded",result:missing,label:r.description||r.adjustment_type,
      date:londonReportDay(r.adjustment_date),realised:false,operational:true,value:readSummaryMoney(r.signed_amount),cashType:r.adjustment_type});
  }
  return [...new Map(rows.map(r=>[`${r.profileId}:${r.module}:${r.id}`,r])).values()];
}
export function exploreRecords(rows: ExplorerRecord[], metric: ExplorerMetric, range: {start:string|null;end:string|null}, filters: Partial<Record<ExplorerDimension,string>>, group: ExplorerDimension) {
  const valid=Boolean(range.start&&range.end&&range.start<=range.end);
  const eligible=rows.filter(r=>(metric==="count" ? r.operational : metric==="pnl" ? r.realised : metric==="withdrawals" ? r.cashType==="Withdrawal" : ["Deduction","Subscription","Costs"].includes(r.cashType))
    &&Object.entries(filters).every(([key,value])=>!value||r[key as ExplorerDimension]===value));
  const undated=eligible.filter(r=>!r.date);
  const selected=valid ? eligible.filter(r=>r.date&&r.date>=range.start!&&r.date<=range.end!) : [];
  const aggregate=(records: ExplorerRecord[])=>({ count:records.length,
    known: metric==="count" ? records.length : records.reduce((sum,r)=>Number.isFinite(r.value)?sum+Math.round(r.value*100):sum,0)/100,
    unknown:metric==="count" ? 0 : records.filter(r=>!Number.isFinite(r.value)).length });
  const groups=[...new Set(selected.map(r=>r[group]))].sort().map(key=>({key,records:selected.filter(r=>r[group]===key),...aggregate(selected.filter(r=>r[group]===key))}));
  return { valid,records:selected,undated,groups,...aggregate(selected) };
}
