import { describe, expect, it } from "vitest";
import { hasNewerFormEdits, reconcileSavedForm } from "./latest-edit";

describe("PD-QA-019 save acknowledgement", () => {
  const submitted = { exchange: "Exchange A", odds: "", actual: "", id: "" };
  const saved = { ...submitted, id: "synthetic-id" };
  it("retains rapid odds and actual edits made while an exchange save is pending", () => {
    const current = { ...submitted, odds: "5.20", actual: "3.50" };
    expect(reconcileSavedForm(submitted, saved, current)).toEqual({ ...current, id: "synthetic-id" });
    expect(hasNewerFormEdits(submitted, current)).toBe(true);
  });
  it("acknowledges server normalization of untouched fields", () => {
    expect(reconcileSavedForm(submitted, saved, submitted)).toEqual(saved);
    expect(hasNewerFormEdits(submitted, submitted)).toBe(false);
  });
  it("does not turn a later blank, zero or malformed draft into a saved value", () => {
    for (const actual of ["", "0", "not-money"]) {
      const original = { ...submitted, actual: "3.50" };
      const current = { ...original, actual };
      expect(reconcileSavedForm(original, { ...original, id: "synthetic-id" }, current).actual).toBe(actual);
    }
  });
  it("acknowledges a plan revision without restoring an older hedge or commission", () => {
    const plan = {schema_version:"lay-plan-v1", commission_units:"ratio", revision:0,backing_basis:"SNR",calculation_contract_version:"snr-outcome-target-v1",
      source_identity:"synthetic-source", exchange_account_id:"synthetic-exchange", selected_strategy:"Underlay", commission:"0.02"};
    const before = {lay_plan_json:JSON.stringify(plan)};
    const acknowledgement = {lay_plan_json:JSON.stringify({...plan,revision:1})};
    const current = {lay_plan_json:JSON.stringify({...plan,selected_strategy:"Custom",custom_lay_stake:"9.00",commission:"0.05"})};
    expect(JSON.parse(reconcileSavedForm(before,acknowledgement,current).lay_plan_json)).toEqual({...JSON.parse(current.lay_plan_json),revision:1});
  });
  it("never upgrades a cleared or different-source plan from an old acknowledgement", () => {
    const plan = {schema_version:"lay-plan-v1", commission_units:"ratio", revision:0,source_identity:"source-a",backing_basis:"SNR",calculation_contract_version:"snr-outcome-target-v1",selected_strategy:"Standard"};
    const before = {lay_plan_json:JSON.stringify(plan)};
    const saved = {lay_plan_json:JSON.stringify({...plan,revision:1})};
    expect(reconcileSavedForm(before,saved,{lay_plan_json:""}).lay_plan_json).toBe("");
    const different = {lay_plan_json:JSON.stringify({...plan,source_identity:"source-b"})};
    expect(reconcileSavedForm(before,saved,different)).toEqual(different);
  });
});
