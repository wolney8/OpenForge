import { describe, expect, it } from "vitest";
import cashFixtures from "../../../tests/fixtures/cash-adjustment-fixtures.json";
import { labLedgerColumnIds, labLedgerColumnSpecs, labLedgerColumns, labRecordInputs, labRecords, type LabLedgerKey } from "./design-lab-connected-data";

describe("Design Lab display-column authority", () => {
  const ledgers = Object.keys(labLedgerColumns) as LabLedgerKey[];
  for (const key of ledgers) {
    it(`${key} keeps stable IDs, exact labels and an Actions boundary`, () => {
      const columns = labLedgerColumnSpecs(key);
      expect(columns.map(item => item.id)).toEqual(labLedgerColumnIds[key]);
      expect(columns.map(item => item.label)).toEqual(labLedgerColumns[key]);
      expect(columns.map(item => item.position)).toEqual(columns.map((_, index) => index));
      expect(new Set(columns.map(item => item.id)).size).toBe(columns.length);
      expect(columns.at(-1)).toMatchObject({id:"actions", required:true, sortable:false, edit:"actions"});
      expect(columns.every(item => item.defaultVisible && item.responsive === "table-and-labelled-detail")).toBe(true);
    });
  }
  it("follows the signed-off Extra Place no-duplicate-Status display", () => {
    expect(labLedgerColumnSpecs("extraPlace").map(item => item.id)).not.toContain("status");
  });
  it("keeps financial display and source fields distinct", () => {
    expect(labLedgerColumnSpecs("sportsbook").find(item => item.id === "displayed_value")?.relatedFields)
      .toEqual(["projected_current_pnl","final_net_pnl","reporting_value"]);
    expect(labLedgerColumnSpecs("accounts").find(item => item.id === "current_balance")?.edit)
      .toBe("balance-observation");
  });
  it("uses field authority rather than a lifecycle-wide edit lock", () => {
    const pick=(ledger:LabLedgerKey,id:string)=>labLedgerColumnSpecs(ledger).find(item=>item.id===id)?.edit;
    expect(pick("sportsbook","event_name")).toBe("descriptive");
    expect(pick("sportsbook","lay_status")).toBe("financial-input");
    expect(pick("sportsbook","displayed_value")).toBe("derived");
    expect(pick("accounts","account_id")).toBe("immutable");
    expect(pick("accounts","current_balance")).toBe("balance-observation");
    expect(pick("freeBets","offer_details")).toBe("descriptive");
    expect(pick("casino","offer_type")).toBe("planning-choice");
    expect(pick("extraPlace","stake")).toBe("financial-input");
    expect(pick("extraPlace","winLiability")).toBe("derived");
    expect(pick("cash","description")).toBe("descriptive");
    expect(pick("cash","signed_amount")).toBe("derived");
  });
  it("prefills only explicit synthetic source inputs", () => {
    expect(labRecordInputs["LAB-SB-001"].event_name).toBe("Demo FC v Sample United");
    expect(labRecordInputs["LAB-SB-001"].back_stake).toBeUndefined();
    expect(labRecordInputs["LAB-EP-001"].stake).toBe("5.00");
    expect(labRecordInputs["LAB-EP-001"].winLiability).toBeUndefined();
  });
  it("uses the governed cash withdrawal fixture for the second synthetic row", () => {
    const fixture = cashFixtures.find(item => item.name === "outgoing_withdrawal");
    const row = labRecords.find(item => item.id === "LAB-CA-002");
    expect(fixture?.expected.signed_amount).toBe("-50.00");
    expect(row?.cells[5]).toBe(`£ (${Math.abs(Number(fixture?.expected.signed_amount)).toFixed(2)})`);
    expect(row?.cells[10]).toBe(fixture?.expected.week_label);
  });
});
