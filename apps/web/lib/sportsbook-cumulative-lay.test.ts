import { describe, expect, it } from "vitest";
import { routineLayEligibility } from "@/lib/sportsbook-cumulative-lay";

const row = {
  status: "Placed", result: "Pending", match_strategy: "Standard",
  requested_lay_stake: "8.00", lay_matched_stake_1: "5.00", exchange_name: "Matchbook", lay_odds_1: "2.00",
  multi_lay_outcomes_json: JSON.stringify([{ id: "layleg1", exchangeName: "Matchbook", layOdds: "2.00", matchedStake: "5.00", isFinal: false }]),
};

describe("routine partial Lay evidence gate", () => {
  it("accepts only the recorded request and consistent same-odds partial fill", () => {
    expect(routineLayEligibility(row).value).toMatchObject({ requested: 8, matched: 5, remaining: 3 });
  });
  it("routes missing, mismatched and protected evidence to governed review", () => {
    expect(routineLayEligibility({ ...row, requested_lay_stake: null }).reason).toMatch(/Requested Lay Stake is not recorded/);
    expect(routineLayEligibility({ ...row, multi_lay_outcomes_json: "[]" }).reason).toMatch(/leg details are missing/);
    expect(routineLayEligibility({ ...row, lay_matched_stake_1: "4.00" }).reason).toMatch(/total and Lay legs differ/);
    expect(routineLayEligibility({ ...row, multi_lay_outcomes_json: JSON.stringify([{ id: "layleg1", exchangeName: "Exchange A", layOdds: "2.00", matchedStake: "5.00" }]) }).reason).toMatch(/differing exchange/);
    expect(routineLayEligibility({ ...row, result: "Back Won", status: "Settled" }).value).toBeNull();
    expect(routineLayEligibility({ ...row, match_strategy: "Multilay" }).value).toBeNull();
  });
});
