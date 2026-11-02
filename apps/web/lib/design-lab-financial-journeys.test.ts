import { describe, expect, it } from "vitest";
import { casinoSuggestion, confirmCasinoSettlement, cp116FreeFixture, cp116LabRecords, freeBetReference, initialCasinoJourney, initialFreeBetJourney, issueFreeBetAward, placeFreeBet, previewFreeBetAward, settleFreeBet } from "./design-lab-financial-journeys";

describe("CP-116 synthetic financial fixture boundary",()=>{
  it("issues one reviewed award group, preserves source and blocks duplicate retry",()=>{
    const split={...initialFreeBetJourney,sourceId:cp116FreeFixture.split_source_id,awardGroupId:cp116FreeFixture.split_award_group_id,prospectSaved:true};
    expect(previewFreeBetAward(split,["3.00","2.00"]).allowed).toBe(true);
    const issued=issueFreeBetAward(split,["3.00","2.00"]);
    expect(issued.children.map(child=>child.faceValue)).toEqual(["3.00","2.00"]);
    expect(issued.sourceStatus).toBe("Free Bet Awarded");
    expect(issueFreeBetAward(issued,["3.00","2.00"])).toEqual(issued);
    expect(previewFreeBetAward(initialFreeBetJourney,["3.00","1.00"]).allowed).toBe(false);
  });
  it("keeps planned and actual Lay distinct, blocks partial settlement and uses the fixed engine receipt",()=>{
    const awarded=issueFreeBetAward({...initialFreeBetJourney,prospectSaved:true},["5.00"]);
    const child=awarded.children[0];
    expect(freeBetReference(child).stake).toBe(cp116FreeFixture.planned_lay_stake);
    expect(placeFreeBet(awarded,child.id,"4.05","4.05",false,true).error).toMatch(/Confirm/);
    const partial=placeFreeBet(awarded,child.id,"4.05","2.00",true,true).journey;
    expect(partial.children[0].matchedLayStake).toBe("2.00");
    expect(settleFreeBet(partial,child.id,"Back Won").error).toMatch(/partial/);
    const full=placeFreeBet(awarded,child.id,"4.05","4.05",true,true).journey;
    const settled=settleFreeBet(full,child.id,"Back Won").journey;
    expect(settled.children[0].finalPnl).toBe("3.94");
    expect(cp116LabRecords(settled,initialCasinoJourney).find(row=>row.id===child.id)?.cells[9]).toBe("£ 3.94");
    expect(cp116LabRecords(settled,initialCasinoJourney).find(row=>row.id===awarded.sourceId)?.cells[8]).toBe("Current · unavailable");
  });
  it("keeps Casino suggested and confirmed results distinct",()=>{
    expect(casinoSuggestion({...initialCasinoJourney,ownCashCommitted:"5.00"}).state).toBe("empty");
    const draft={...initialCasinoJourney,offerType:"Wager To Earn Reward",status:"In Progress" as const,ownCashCommitted:"5.00",cashReturned:"4.90",confirmedNetResult:"-0.10",completedAt:"2026-07-26"};
    expect(casinoSuggestion(draft).value).toBe(-0.1);
    expect(confirmCasinoSettlement({...draft,confirmedNetResult:""}).error).toMatch(/Confirm/);
    expect(confirmCasinoSettlement(draft).journey.status).toBe("Settled");
    expect(confirmCasinoSettlement({...draft,cashReturned:"4,90"}).error).toMatch(/fixture/);
    expect(confirmCasinoSettlement({...draft,completedAt:"2026-02-30"}).error).toMatch(/date/);
  });
});
