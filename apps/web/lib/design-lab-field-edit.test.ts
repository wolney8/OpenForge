import { describe, expect, it } from "vitest";
import { labRecords, labRecordInputs } from "./design-lab-connected-data";
import { displayLabLocalDate, evaluateLabFieldEdit, labCellChoices, labCellControl, nextLabReviewTracking, validLabDateInput } from "./design-lab-field-edit";

const record = (id: string) => {
  const found = labRecords.find(item => item.id === id);
  if (!found) throw new Error(`Missing fixture ${id}`);
  return found;
};
const edit = (id: string, field: string, value: string) => evaluateLabFieldEdit({
  record: record(id), changes: [{field,value}], originals: labRecordInputs[id], intent: "inline",
  eligibleAccounts: ["Bookmaker A", "Bookmaker C", "Exchange A"],
});

describe("Design Lab shared field-edit authority", () => {
  it("permits the same settled descriptive change without inventing a financial correction", () => {
    expect(edit("LAB-SB-001","event_name","Reviewed synthetic event")).toMatchObject({outcome:"APPLIED",reviewFields:[]});
  });
  it("rejects malformed odds and keeps placed financial changes in governed review", () => {
    expect(edit("LAB-SB-PROSPECT-B","back_odds","8,5").outcome).toBe("VALIDATION_FAILED");
    expect(edit("LAB-SB-001","back_odds","8.5").outcome).toBe("GOVERNED_CORRECTION_REQUIRED");
  });
  it("marks dependent results for review without computing a new outcome", () => {
    expect(edit("LAB-SB-PROSPECT-B","match_strategy","Underlay")).toMatchObject({outcome:"APPLIED",reviewFields:["lay_status","displayed_value"]});
  });
  it("clears only the dependency cause reverted to its original input", () => {
    const original={match_strategy:"Standard",back_odds:"2.00"};
    const first=nextLabReviewTracking(undefined,"sportsbook",[{field:"match_strategy",value:"Underlay"}],original);
    const second=nextLabReviewTracking(first,"sportsbook",[{field:"back_odds",value:"2.10"}],original);
    const reverted=nextLabReviewTracking(second,"sportsbook",[{field:"match_strategy",value:"Standard"}],original);
    expect(reverted.causes.match_strategy).toBeUndefined();
    expect(reverted.causes.back_odds).toContain("displayed_value");
  });
  it("routes status selection through the lifecycle review", () => {
    expect(edit("LAB-SB-PROSPECT-B","status","Placed").outcome).toBe("REVIEW_REQUIRED");
  });
  it("preserves historical choices while restricting a changed bookmaker to eligible Accounts", () => {
    expect(labCellChoices("sportsbook","bookmaker",["Bookmaker C"],"Bookmaker A")).toEqual(["Bookmaker A","Bookmaker C"]);
    expect(edit("LAB-SB-PROSPECT-B","bookmaker","Bookmaker B").outcome).toBe("UNCHANGED");
    expect(edit("LAB-SB-PROSPECT-B","bookmaker","Bookmaker Z").outcome).toBe("VALIDATION_FAILED");
  });
  it("keeps actual matched stake distinct from requested and unknown historical evidence", () => {
    expect(record("LAB-SB-PARTIAL").execution).toMatchObject({requestedLayStake:"10.00",actualMatchedLayStake:"4.00",backConfirmed:true,layConfirmed:true});
    expect(record("LAB-SB-001").execution).toBeUndefined();
  });
  it("maps visible ledger fields to the right control without treating derived values as selectors", () => {
    expect(labCellControl("sportsbook","bookmaker")).toBe("account");
    expect(labCellControl("sportsbook","status")).toBe("lifecycle");
    expect(labCellControl("freeBets","match_strategy")).toBe("select");
    expect(labCellControl("casino","offer_type")).toBe("select");
    expect(labCellControl("extraPlace","terms")).toBe("select");
    expect(labCellControl("extraPlace","stake")).toBe("money");
    expect(labCellControl("cash","direction")).toBe("select");
    expect(labCellControl("cash","signed_amount")).toBe("read-only");
  });
  it("retains date precision and validates actual local dates without inventing a time", () => {
    expect(labCellControl("freeBets","expiry_datetime","2026-11-10")).toBe("date");
    expect(labCellControl("extraPlace","date","2026-11-07T14:30")).toBe("datetime-local");
    expect(displayLabLocalDate("2026-11-10")).toBe("10 Nov 2026");
    expect(displayLabLocalDate("2026-11-07T14:30")).toBe("7 Nov 2026 · 14:30");
    expect(validLabDateInput("2026-11-31")).toBe(false);
  });
  it("uses workbook option authorities and preserves recorded historical choices", () => {
    expect(labCellChoices("freeBets","status")).toContain("Not Yet Awarded");
    expect(labCellChoices("casino","offer_type")).toContain("Deposit And Bonus Wagering");
    expect(labCellChoices("cash","adjustment_type",[],"Capital movement")[0]).toBe("Capital movement");
    expect(labCellChoices("extraPlace","terms")).toEqual(["1/4","1/5","1/6"]);
  });
});
