import { describe, expect, it } from "vitest";
import { labRecords, labRecordInputs } from "./design-lab-connected-data";
import { evaluateLabFieldEdit, labCellChoices, nextLabReviewTracking } from "./design-lab-field-edit";

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
});
