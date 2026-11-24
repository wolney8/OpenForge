import { describe, expect, it } from "vitest";
import { sportsbookPlanningFieldEditable } from "./sportsbook-inline-eligibility";

describe("Sportsbook planning-field gate", () => {
  it("allows an unplaced draft and protects any recorded execution evidence", () => {
    expect(sportsbookPlanningFieldEditable({ status: "Prospecting" })).toBe(true);
    expect(sportsbookPlanningFieldEditable({ status: "Not Placed" })).toBe(true);
    expect(sportsbookPlanningFieldEditable({ status: "Prospecting", actual_accepted_back_odds: "2.10" })).toBe(false);
    expect(sportsbookPlanningFieldEditable({ status: "Prospecting", back_placement_confirmed: true })).toBe(false);
    expect(sportsbookPlanningFieldEditable({ status: "Prospecting", lay_matched_stake_1: "5.00" })).toBe(false);
    expect(sportsbookPlanningFieldEditable({ status: "Prospecting", multi_lay_actual: { executions: [] } })).toBe(false);
    for (const status of ["Placed", "Settled", "Void", "Cancelled", "Free Bet Awarded"]) {
      expect(sportsbookPlanningFieldEditable({ status })).toBe(false);
    }
  });
});
