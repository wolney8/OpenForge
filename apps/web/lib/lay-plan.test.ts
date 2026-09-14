import {describe,expect,it} from "vitest";
import {readLayPlan} from "./lay-plan";
describe("versioned planner read boundary",()=>{
  const valid={schema_version:"lay-plan-v1",backing_basis:"SNR",calculation_contract_version:"snr-outcome-target-v1",commission_units:"ratio",selected_strategy:"Underlay"};
  it("reads a supported plan without changing its reference identity",()=>expect(readLayPlan(JSON.stringify(valid))).toEqual(valid));
  it.each([{schema_version:"lay-plan-v9"},{calculation_contract_version:"unknown"},{commission_units:"percent"},{backing_basis:"SR"},{selected_strategy:"Partial Lay"}])("does not silently replan unsupported metadata %j",extra=>expect(readLayPlan(JSON.stringify({...valid,...extra}))).toBeNull());
  it("keeps null and malformed raw records outside the editable planner",()=>{expect(readLayPlan(null)).toBeNull();expect(readLayPlan("not-json")).toBeNull();});
});
