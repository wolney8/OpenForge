import financialFixture from "../../../tests/fixtures/design-lab-cp116-financial-journeys.json";
import bridgeFixture from "../../../tests/fixtures/sportsbook-free-bet-award-bridge-fixtures.json";
import { calculateCasinoSettlementNetResult } from "./casino-calculations";
import { hasCompleteDecimalInputSyntax } from "./sportsbook-odds-input";
import type { LabProfileId } from "./design-lab-fixture";
import type { LabRecord } from "./design-lab-connected-data";

export type LabFreeBetChild = { id:string; faceValue:string; status:"Available"|"Placed"|"Settled"; result:"Pending"|"Back Won"|"Lay Won"|"Void"; retentionMode:"SNR"|"SR"; actualLayStake:string; matchedLayStake:string; backConfirmed:boolean; layConfirmed:boolean; finalPnl:string|null };
export type LabFreeBetJourney = { profileId:LabProfileId; sourceId:string; awardGroupId:string; sourceStatus:"Placed"|"Free Bet Awarded"; prospectSaved:boolean; awardIssued:boolean; awardSplits:string[]; children:LabFreeBetChild[]; history:string[]; failedSave:boolean };
export type LabCasinoJourney = { id:string; profileId:LabProfileId; offerType:string; status:"Prospecting"|"Started"|"In Progress"|"Settled"; ownCashCommitted:string; cashStake:string; bonusCredit:string; wagerMultiplier:string; spinStake:string; cashReturned:string; rewardConverted:string; otherCosts:string; confirmedNetResult:string; completedAt:string; history:string[]; failedSave:boolean };
export const cp116FreeFixture=financialFixture.free_bet;
export const cp116CasinoFixture=financialFixture.casino;
const sourceBridge=bridgeFixture.cases.find(item=>item.case_id===cp116FreeFixture.source_case);
if(!sourceBridge || sourceBridge.expected.created_free_bet_status!=="Available" || sourceBridge.expected_award_value!==cp116FreeFixture.expected_award) throw new Error("CP-116 award fixture mismatch");
const splitBridge=bridgeFixture.cases.find(item=>item.case_id===cp116FreeFixture.split_source_case);
if(!splitBridge || splitBridge.expected.created_free_bet_count!==2 || splitBridge.expected_award_value!==cp116FreeFixture.expected_award) throw new Error("CP-116 split award fixture mismatch");
export const initialFreeBetJourney:LabFreeBetJourney={profileId:"LAB-PROFILE-A",sourceId:cp116FreeFixture.source_id,awardGroupId:cp116FreeFixture.award_group_id,sourceStatus:"Placed",prospectSaved:false,awardIssued:false,awardSplits:[cp116FreeFixture.face_value],children:[],history:[],failedSave:false};
export const initialCasinoJourney:LabCasinoJourney={id:cp116CasinoFixture.record_id,profileId:"LAB-PROFILE-A",offerType:"Free Spins",status:"Prospecting",ownCashCommitted:"",cashStake:"",bonusCredit:"",wagerMultiplier:"",spinStake:"",cashReturned:"",rewardConverted:"",otherCosts:"",confirmedNetResult:"",completedAt:"",history:[],failedSave:false};
export function exactCents(raw:string):number|null {if(!hasCompleteDecimalInputSyntax(raw)||!/^[0-9]+(?:\.[0-9]{1,2})?$/.test(raw))return null;const value=Number(raw);return Number.isSafeInteger(Math.round(value*100))?Math.round(value*100):null;}
function validIsoDate(value:string):boolean {if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(`${value}T12:00:00Z`);return !Number.isNaN(date.valueOf())&&date.toISOString().slice(0,10)===value;}
export function previewFreeBetAward(journey:LabFreeBetJourney,splits:string[]):{allowed:boolean;reason:string;total:string|null} {
  const cents=splits.map(exactCents);if(!splits.length||cents.some(item=>item===null||item<=0))return {allowed:false,reason:"Enter a positive exact-cents value for every split.",total:null};
  const total=cents.reduce<number>((sum,value)=>sum+(value??0),0);const expected=exactCents(cp116FreeFixture.expected_award)!;
  if(journey.awardIssued)return {allowed:false,reason:"This award group was already issued. Retry cannot duplicate its children.",total:(total/100).toFixed(2)};
  const splitRows=splitBridge?.split_rows??[];
  const fixtureShape=splits.length===1&&journey.sourceId===cp116FreeFixture.source_id&&cents[0]===expected || splits.length===2&&journey.sourceId===cp116FreeFixture.split_source_id&&splits.every((value,index)=>Number(value).toFixed(2)===splitRows[index]?.free_bet_value);
  return {allowed:total===expected&&fixtureShape,reason:total!==expected?"The split total differs from the expected award; this fixture has no reviewed variance reason.":fixtureShape?"Reviewed award matches the source fixture.":"This source/split combination has no validated award fixture.",total:(total/100).toFixed(2)};
}
export function issueFreeBetAward(journey:LabFreeBetJourney,splits:string[]):LabFreeBetJourney {
  if(!journey.prospectSaved)return journey;
  const preview=previewFreeBetAward(journey,splits);if(!preview.allowed)return journey;
  const children=splits.map((faceValue,index):LabFreeBetChild=>({id:`LAB-FB-CP116-${index+1}`,faceValue:Number(faceValue).toFixed(2),status:"Available",result:"Pending",retentionMode:"SNR",actualLayStake:"",matchedLayStake:"",backConfirmed:false,layConfirmed:false,finalPnl:null}));
  return {...journey,awardIssued:true,awardSplits:splits,children,sourceStatus:"Free Bet Awarded",history:[...journey.history,`2026-07-25 · Synthetic fixture replay · Reviewed ${children.length} Free Bet award${children.length===1?"":"s"} for ${journey.sourceId}; group ${journey.awardGroupId}`]};
}
export function freeBetFixtureMatches(child:LabFreeBetChild):boolean {return child.faceValue===cp116FreeFixture.face_value&&child.id==="LAB-FB-CP116-1";}
export function freeBetReference(child:LabFreeBetChild){return child.retentionMode==="SNR"?{stake:cp116FreeFixture.planned_lay_stake,current:cp116FreeFixture.placed_projected_current_pnl,back:cp116FreeFixture.settled_back_won_final_pnl,lay:cp116FreeFixture.settled_lay_won_final_pnl}:{stake:cp116FreeFixture.sr_planned_lay_stake,current:cp116FreeFixture.sr_placed_projected_current_pnl,back:cp116FreeFixture.sr_settled_back_won_final_pnl,lay:cp116FreeFixture.sr_settled_lay_won_final_pnl};}
export function placeFreeBet(journey:LabFreeBetJourney,id:string,actualLayStake:string,matchedLayStake:string,backConfirmed:boolean,layConfirmed:boolean):{journey:LabFreeBetJourney;error?:string} {
  const child=journey.children.find(item=>item.id===id);if(!child||child.status!=="Available")return {journey,error:"Select an available Free Bet."};
  if(!backConfirmed||!layConfirmed)return {journey,error:"Confirm the actual external Back and Lay placements separately."};
  if(!freeBetFixtureMatches(child))return {journey,error:"This tuple has no validated placement fixture; retain the draft for review."};
  const actual=exactCents(actualLayStake),matched=exactCents(matchedLayStake),planned=exactCents(freeBetReference(child).stake);
  if(actual===null||matched===null||actual<=0||matched<0||matched>actual)return {journey,error:"Enter valid exact-cents actual and matched lay stakes; matched cannot exceed actual."};
  if(actual!==planned)return {journey,error:"The changed actual lay stake has no validated calculation fixture."};
  return {journey:{...journey,children:journey.children.map(item=>item.id===id?{...item,status:"Placed",backConfirmed:true,layConfirmed:true,actualLayStake:Number(actualLayStake).toFixed(2),matchedLayStake:Number(matchedLayStake).toFixed(2)}:item),history:[...journey.history,`2026-07-26 · Synthetic fixture replay · External Back and Lay confirmations recorded for ${id}; matched ${matchedLayStake} of ${actualLayStake}`]}};
}
export function settleFreeBet(journey:LabFreeBetJourney,id:string,result:LabFreeBetChild["result"]):{journey:LabFreeBetJourney;error?:string} {
  const child=journey.children.find(item=>item.id===id);if(!child||child.status!=="Placed")return {journey,error:"Place and confirm the Free Bet before settlement."};
  if(!freeBetFixtureMatches(child)||child.actualLayStake!==freeBetReference(child).stake||child.matchedLayStake!==child.actualLayStake)return {journey,error:"Full matched execution is required for this validated settlement fixture; partial execution needs review."};
  const reference=freeBetReference(child);
  const final=result==="Back Won"?reference.back:result==="Lay Won"?reference.lay:result==="Void"?cp116FreeFixture.settled_void_final_pnl:null;
  if(final===null)return {journey,error:"Select a supported final result."};
  return {journey:{...journey,children:journey.children.map(item=>item.id===id?{...item,status:"Settled",result,finalPnl:final}:item),history:[...journey.history,`2026-07-26 · Synthetic fixture replay · ${id} settled ${result}; fixture final £${final}`]}};
}
export function casinoSuggestion(journey:LabCasinoJourney){
  const amounts=[journey.ownCashCommitted,journey.cashReturned,journey.rewardConverted,journey.otherCosts];
  if(amounts.some(item=>item!==""&&exactCents(item)===null))return {state:"invalid" as const,value:null,reason:"Enter exact-cents amounts using a full stop."};
  if(journey.ownCashCommitted===""||journey.cashReturned==="")return {state:"empty" as const,value:null,reason:"Record own cash committed and cash returned before reviewing a suggested result."};
  return calculateCasinoSettlementNetResult({ownCashCommitted:journey.ownCashCommitted,cashReturned:journey.cashReturned,rewardConverted:journey.rewardConverted,otherCosts:journey.otherCosts});
}
export function confirmCasinoSettlement(journey:LabCasinoJourney):{journey:LabCasinoJourney;error?:string} {
  if(journey.status!=="Started"&&journey.status!=="In Progress")return {journey,error:"Start the offer before settlement."};
  if(journey.offerType!=="Wager To Earn Reward"||journey.ownCashCommitted!==cp116CasinoFixture.own_cash_committed||journey.cashReturned!==cp116CasinoFixture.cash_returned||journey.rewardConverted!==""||journey.otherCosts!=="")return {journey,error:"This edited financial tuple has no validated settlement fixture. Retain it for review."};
  const suggestion=casinoSuggestion(journey);
  if(suggestion.state!=="calculable"||suggestion.value?.toFixed(2)!==cp116CasinoFixture.confirmed_net_result)return {journey,error:"Suggested result does not match the validated fixture."};
  if(journey.confirmedNetResult!==cp116CasinoFixture.confirmed_net_result||!validIsoDate(journey.completedAt))return {journey,error:"Confirm the exact Net Result and a valid completion date before settlement."};
  return {journey:{...journey,status:"Settled",history:[...journey.history,`2026-11-02 · Lab Fund Manager · Confirmed Net Result £${journey.confirmedNetResult} for ${journey.id}`]}};
}

/** Display records only. The matching synthetic command state remains the source of authority. */
export function cp116LabRecords(free:LabFreeBetJourney,casino:LabCasinoJourney):LabRecord[] {
  const split=free.sourceId===cp116FreeFixture.split_source_id;
  const source:LabRecord={id:free.sourceId,profileId:free.profileId,section:"sportsbook",title:split?"Synthetic Team E v Synthetic Team F":"Synthetic Team C v Synthetic Team D",subtitle:`Bookmaker A · ${split?cp116FreeFixture.split_source_case:cp116FreeFixture.source_case} qualifying source`,status:free.sourceStatus,
    cells:[split?"25 Jul 2026":"24 Jul 2026","Bookmaker A",split?"Synthetic Team E v Synthetic Team F":"Synthetic Team C v Synthetic Team D",split?"Special Offer":"Daily Reload",split?"Synthetic Bet 10 Get 3 And 2":"Synthetic Bet 10 Get 5 On Placement","Standard","Not Recorded","Recorded Externally","Current · unavailable",free.sourceStatus,"Open"],
    relatedId:free.children[0]?.id,execution:{backConfirmed:true,layConfirmed:null,source:"synthetic-recorded"},previewOnly:true};
  const rows:LabRecord[]=[];
  if(free.prospectSaved&&!free.awardIssued)rows.push({id:"LAB-FB-CP116-PROSPECT",profileId:free.profileId,section:"freeBets",title:`${split?"Special Offer":"Daily Reload"} · Award Pending`,subtitle:`${free.sourceId} · expected £${cp116FreeFixture.expected_award}`,status:"Prospecting",cells:["—","27 Jul 2026","Bookmaker A",split?"Special Offer":"Daily Reload","—","Award under review","SNR","Not placed","Not placed","Unavailable","Prospecting","Open"],relatedId:free.sourceId,previewOnly:true});
  for(const child of free.children){
    const money=child.status==="Settled"&&child.finalPnl!==null?`£ ${child.finalPnl}`:child.status==="Placed"&&freeBetFixtureMatches(child)&&child.matchedLayStake===child.actualLayStake?`Current £ ${freeBetReference(child).current}`:"Unavailable";
    rows.push({id:child.id,profileId:free.profileId,section:"freeBets",title:`${split?"Special Offer":"Daily Reload"} · Split ${child.id.split("-").at(-1)}/${free.children.length}`,subtitle:`${free.sourceId} · group ${free.awardGroupId}`,status:child.status,
      cells:[child.status==="Settled"?"26 Jul 2026":"—","27 Jul 2026","Bookmaker A",split?"Special Offer":"Daily Reload","Synthetic selection","Reviewed award",child.retentionMode,child.layConfirmed?child.matchedLayStake===child.actualLayStake?"Fully Laid":"Part Laid":"Not Laid",child.backConfirmed?"Placed":"Not placed",money,child.status,"Open"],relatedId:free.sourceId,expiresAt:"2026-07-27",previewOnly:false,sourceInputs:{free_bet_value:child.faceValue,retention_mode:child.retentionMode,back_odds:cp116FreeFixture.back_odds,lay_odds_1:cp116FreeFixture.lay_odds,lay_commission_1:cp116FreeFixture.commission,planned_lay_stake:cp116FreeFixture.planned_lay_stake,lay_actual:child.actualLayStake,lay_matched_stake_1:child.matchedLayStake,source_award_group_id:free.awardGroupId}});
  }
  const casinoAmount=casino.status==="Settled"?`£ ${casino.confirmedNetResult}`:"Unavailable";
  rows.push({id:casino.id,profileId:casino.profileId,section:"casino",title:"Fixture-Backed Casino Offer",subtitle:"Bookmaker C · CASINO-WORKFLOW-001",status:casino.status,
    cells:[casino.completedAt||"—","15 Nov 2026","Bookmaker C","Fixture-Backed Casino Offer","Demo Game",casino.offerType,casino.status,casino.status==="Settled"?"Lose":"Pending",casinoAmount,"Open"],previewOnly:false,sourceInputs:{offer_name:"Fixture-Backed Casino Offer",bookmaker:"Bookmaker C",offer_type:casino.offerType,own_cash_committed:casino.ownCashCommitted,cash_returned:casino.cashReturned,confirmed_net_result:casino.confirmedNetResult}});
  return [source,...rows];
}
