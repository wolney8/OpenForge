import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  calculateCasinoCampaignEV,
  calculateCasinoSettlementNetResult,
  calculateExpectedLoss,
  calculateExpectedReturn,
  calculateRewardWagerTarget,
  calculateRtpExpectation,
  calculateSpinsRequired,
  calculateWageringProgress,
  calculateWagerTarget,
  parseCasinoNumericInput,
} from "./casino-calculations";

function findFixturePath(): string {
  let current = process.cwd();
  for (let index = 0; index < 6; index += 1) {
    const candidate = join(current, "tests/fixtures/casino-offer-realistic-smoke-rows.json");
    if (existsSync(candidate)) {
      return candidate;
    }
    current = dirname(current);
  }
  throw new Error("Unable to locate casino-offer-realistic-smoke-rows.json");
}

type SmokeCasinoRow = {
  casino_offer_id: string;
  offer_type: string;
  cash_stake: string;
  bonus_amount: string;
  wager_multiplier: string;
  wager_target: string;
  spin_stake: string;
  free_spins_value: string;
};

function readSmokeRows(): SmokeCasinoRow[] {
  const parsed = JSON.parse(readFileSync(findFixturePath(), "utf8")) as {
    rows: SmokeCasinoRow[];
  };
  return parsed.rows;
}

describe("casino calculation helpers", () => {
  it("calculates multiplier-based wagering targets", () => {
    expect(
      calculateWagerTarget({
        base: "bonus",
        bonusAmount: "10",
        multiplier: "20",
      })
    ).toMatchObject({
      state: "calculable",
      value: 200,
      formulaLabel: "Bonus x 20x",
    });
  });

  it("calculates deposit plus bonus bases explicitly", () => {
    expect(
      calculateWagerTarget({
        base: "deposit_plus_bonus",
        depositAmount: "10",
        bonusAmount: "10",
        multiplier: "20",
      }).value
    ).toBe(400);
  });

  it("accepts fixed wagering targets without a multiplier", () => {
    expect(
      calculateWagerTarget({
        base: "fixed_amount",
        fixedAmount: "125",
      })
    ).toMatchObject({
      state: "calculable",
      value: 125,
      formulaLabel: "Fixed target",
    });
  });

  it("handles zero and invalid target inputs safely", () => {
    expect(calculateWagerTarget({ base: "bonus", bonusAmount: "10", multiplier: "0" })).toMatchObject({
      state: "incomplete_wagering_details",
      value: null,
    });
    expect(calculateSpinsRequired({ wagerTarget: "200", spinStake: "0" })).toMatchObject({
      state: "incomplete_wagering_details",
      actionableSpins: null,
    });
  });

  it("calculates actionable spin counts by rounding upward", () => {
    expect(calculateSpinsRequired({ wagerTarget: "200", spinStake: "0.20" })).toMatchObject({
      state: "calculable",
      exactSpins: 1000,
      actionableSpins: 1000,
    });
    expect(calculateSpinsRequired({ wagerTarget: "10", spinStake: "0.30" })).toMatchObject({
      state: "calculable",
      actionableSpins: 34,
    });
  });

  it("calculates RTP expectations as planning values", () => {
    expect(calculateRtpExpectation({ wagerTarget: "200", rtpPercent: "96" })).toMatchObject({
      state: "calculable",
      expectedReturn: 192,
      expectedLoss: 8,
      rtpDecimal: 0.96,
    });
    expect(calculateExpectedReturn({ wagerTarget: "200", rtpPercent: "96" }).value).toBe(192);
    expect(calculateExpectedLoss({ wagerTarget: "200", rtpPercent: "96" }).value).toBe(8);
  });

  it("keeps missing RTP as an explicit unknown state", () => {
    expect(calculateRtpExpectation({ wagerTarget: "200", rtpPercent: "" })).toMatchObject({
      state: "unknown_rtp",
      expectedReturn: null,
      expectedLoss: null,
    });
  });

  it("calculates reward wagering independently from qualifying wagering", () => {
    const target = calculateRewardWagerTarget({ rewardAmount: "8.40", multiplier: "10" });
    expect(target).toMatchObject({
      state: "calculable",
      value: 84,
      formulaLabel: "Converted reward x 10x",
    });
    expect(calculateSpinsRequired({ wagerTarget: target.value, spinStake: "0.20" })).toMatchObject({
      actionableSpins: 420,
    });
  });

  it("changes reward spins needed when the reward wagering multiplier changes", () => {
    const fiveTimesTarget = calculateRewardWagerTarget({ rewardAmount: "3.50", multiplier: "5" });
    const tenTimesTarget = calculateRewardWagerTarget({ rewardAmount: "3.50", multiplier: "10" });

    expect(calculateSpinsRequired({ wagerTarget: fiveTimesTarget.value, spinStake: "0.10" })).toMatchObject({
      actionableSpins: 175,
    });
    expect(calculateSpinsRequired({ wagerTarget: tenTimesTarget.value, spinStake: "0.10" })).toMatchObject({
      actionableSpins: 350,
    });
  });

  it("calculates remaining wagering and remaining spins", () => {
    expect(
      calculateWageringProgress({
        wagerTarget: "200",
        completedWager: "75",
        spinStake: "0.20",
      })
    ).toMatchObject({
      state: "calculable",
      remainingWager: 125,
      remainingSpins: 625,
    });
  });

  it("calculates campaign EV only when reward value is known", () => {
    expect(
      calculateCasinoCampaignEV({
        expectedRewardCashValue: "10",
        qualifyingExpectedLoss: "8",
        rewardExpectedLoss: "3.36",
      })
    ).toMatchObject({
      state: "calculable",
      expectedValue: -1.36,
    });
    expect(
      calculateCasinoCampaignEV({
        expectedRewardCashValue: "",
        qualifyingExpectedLoss: "8",
      })
    ).toMatchObject({
      state: "unknown_reward_value",
      expectedValue: null,
    });
  });

  it("suggests actual settlement net result from committed cash and returned rewards", () => {
    expect(
      calculateCasinoSettlementNetResult({
        ownCashCommitted: "10",
        cashReturned: "7",
        rewardConverted: "1",
      })
    ).toMatchObject({
      state: "calculable",
      value: -2,
      formulaLabel: "Returned + reward - committed - costs",
    });

    expect(
      calculateCasinoSettlementNetResult({
        ownCashCommitted: "10",
        cashReturned: "10",
        rewardConverted: "1",
        otherCosts: "0.50",
      }).value
    ).toBe(0.5);
  });

  it("keeps actual settlement suggestion empty or invalid explicitly", () => {
    expect(calculateCasinoSettlementNetResult({})).toMatchObject({
      state: "empty",
      value: null,
    });
    expect(calculateCasinoSettlementNetResult({ ownCashCommitted: "not money" })).toMatchObject({
      state: "invalid",
      value: null,
    });
  });

  it("parses display-like numeric input without creating negative zero", () => {
    expect(parseCasinoNumericInput("£ 1,000.12")).toBe(1000.12);
    expect(parseCasinoNumericInput("£ (1,000.12)")).toBe(-1000.12);
    expect(parseCasinoNumericInput("-0")).toBe(0);
    expect(parseCasinoNumericInput("not money")).toBeNull();
  });

  it("keeps realistic casino smoke rows aligned with the wagering helpers", () => {
    const rowsById = new Map(readSmokeRows().map((row) => [row.casino_offer_id, row]));

    const depositBonus = rowsById.get("SMOKE-CO-DEPOSITBONUS-001");
    expect(depositBonus).toBeDefined();
    expect(
      calculateWagerTarget({
        base: "deposit_plus_bonus",
        depositAmount: depositBonus?.cash_stake,
        bonusAmount: depositBonus?.bonus_amount,
        multiplier: depositBonus?.wager_multiplier,
      })
    ).toMatchObject({
      state: "calculable",
      value: 400,
      formulaLabel: "Deposit + bonus x 20x",
    });

    const noDepositBonus = rowsById.get("SMOKE-CO-NODEPOSIT-001");
    expect(noDepositBonus).toBeDefined();
    expect(
      calculateWagerTarget({
        base: "bonus",
        bonusAmount: noDepositBonus?.bonus_amount,
        multiplier: noDepositBonus?.wager_multiplier,
      })
    ).toMatchObject({
      state: "calculable",
      value: 20,
    });
    expect(
      calculateSpinsRequired({
        wagerTarget: noDepositBonus?.wager_target,
        spinStake: noDepositBonus?.spin_stake,
      })
    ).toMatchObject({
      state: "calculable",
      actionableSpins: 200,
    });

    const freeSpins = rowsById.get("SMOKE-CO-FREESPINS-001");
    expect(freeSpins).toBeDefined();
    expect(
      calculateRewardWagerTarget({
        rewardAmount: freeSpins?.free_spins_value,
        multiplier: freeSpins?.wager_multiplier,
      })
    ).toMatchObject({
      state: "calculable",
      value: 1.8,
    });
    expect(
      calculateSpinsRequired({
        wagerTarget: freeSpins?.wager_target,
        spinStake: freeSpins?.spin_stake,
      })
    ).toMatchObject({
      state: "calculable",
      actionableSpins: 18,
    });

    const turnoverChallenge = rowsById.get("SMOKE-CO-TURNOVER-001");
    expect(turnoverChallenge).toBeDefined();
    expect(
      calculateWagerTarget({
        base: "fixed_amount",
        fixedAmount: turnoverChallenge?.wager_target,
      })
    ).toMatchObject({
      state: "calculable",
      value: 25,
    });
    expect(
      calculateSpinsRequired({
        wagerTarget: turnoverChallenge?.wager_target,
        spinStake: turnoverChallenge?.spin_stake,
      })
    ).toMatchObject({
      state: "calculable",
      actionableSpins: 50,
    });
  });
});
