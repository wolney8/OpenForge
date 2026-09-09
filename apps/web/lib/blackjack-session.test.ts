import { describe, expect, it } from "vitest";

import {
  blackjackConversionEligible,
  blackjackCommittedStake,
  blackjackPlayLimitStatus,
  blackjackRunningFinancials,
  buildBlackjackSessionSourceSnapshot,
  moneyInputError,
  moneyToCents,
  multiplyMoney,
  subtractMoney,
  subtractSignedMoney,
} from "./blackjack-session";

describe("Blackjack session source contract", () => {
  it("keeps simulation non-financial and non-convertible", async () => {
    expect(blackjackConversionEligible("simulation")).toBe(false);
    const snapshot = await buildBlackjackSessionSourceSnapshot({
      endedAt: "2026-09-09T11:00:00.000Z", endingBalance: "110.00", freeCreditValue: "5.00",
      hands: [], mode: "simulation", recordedHandNet: "10.00", soft17Rule: "stands",
      startedAt: "2026-09-09T10:00:00.000Z", startingBalance: "100.00",
      surrenderAllowed: false, tableType: "live_dealer", withdrawableResult: "3.00",
    });
    expect(snapshot.conversion_eligible).toBe(false);
    expect(snapshot.activity_source).toBeNull();
    expect(snapshot.table_type).toBeNull();
    expect(snapshot.monetary).toEqual({
      ending_balance: null, free_credit_value: null, recorded_hand_net: null,
      session_result: null, starting_balance: null, withdrawable_result: null,
      gross_staked: "0.00", gross_returned: null,
    });
    expect(snapshot.play_limit).toEqual({ mode: "fixed_stake_cap", remaining_loss_buffer: null, returns_complete: true, value: null });
  });

  it("separates free credit from withdrawable cash", async () => {
    const snapshot = await buildBlackjackSessionSourceSnapshot({
      activitySource: "free_credit",
      endedAt: "2026-09-09T11:00:00.000Z", endingBalance: "", freeCreditValue: "10.00",
      hands: [], mode: "free_play", recordedHandNet: null, soft17Rule: "hits",
      startedAt: "2026-09-09T10:00:00.000Z", startingBalance: "", surrenderAllowed: true,
      tableType: "digital_rng", withdrawableResult: "4.25",
    });
    expect(snapshot.conversion_eligible).toBe(true);
    expect(snapshot.activity_source).toBe("free_credit");
    expect(snapshot.monetary.free_credit_value).toBe("10.00");
    expect(snapshot.monetary.withdrawable_result).toBe("4.25");
    expect(snapshot.monetary.session_result).toBeNull();
  });

  it("derives exact live balance movement and stable provenance", async () => {
    const input = {
      activitySource: "own_cash" as const,
      endedAt: "2026-09-09T11:00:00.000Z", endingBalance: "84.01", freeCreditValue: "",
      hands: [{ dealer_card: "10", hand_number: 1, hands: [{ actual_actions: ["Double"], actual_return: "24.01", cards: ["6", "5", "10"], classification: "hard", committed_stake: "20.00", label: "Player", outcome: "Win", recommendation_sequence: ["Double"], starting_stake: "10.00", total: 21 }] }],
      mode: "live_play" as const, recordedHandNet: "4.01", soft17Rule: "stands" as const,
      startedAt: "2026-09-09T10:00:00.000Z", startingBalance: "100.00",
      surrenderAllowed: false, tableType: "live_dealer" as const, withdrawableResult: "",
      playLimitMode: "use_winnings" as const, playLimitValue: "10.00",
    };
    const first = await buildBlackjackSessionSourceSnapshot(input);
    const second = await buildBlackjackSessionSourceSnapshot(input);
    expect(first.monetary.session_result).toBe("-15.99");
    expect(first.activity_source).toBe("own_cash");
    expect(first.table_type).toBe("live_dealer");
    expect(first.monetary.gross_staked).toBe("20.00");
    expect(first.monetary.gross_returned).toBe("24.01");
    expect(first.play_limit.remaining_loss_buffer).toBe("14.01");
    expect(first.source_checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(second).toEqual(first);
    input.hands[0].hands[0].cards.push("A");
    expect(first.hands[0].hands[0].cards).toEqual(["6", "5", "10"]);
  });

  it("keeps funding source distinct from delivery provenance and supports legacy callers", async () => {
    const base = {
      endedAt: "2026-09-09T11:00:00.000Z", endingBalance: "", freeCreditValue: ".5",
      hands: [], mode: "free_play" as const, recordedHandNet: null, soft17Rule: "stands" as const,
      startedAt: "2026-09-09T10:00:00.000Z", startingBalance: "", surrenderAllowed: false,
      withdrawableResult: ".50",
    };
    const digital = await buildBlackjackSessionSourceSnapshot({ ...base, activitySource: "promotion", tableType: "digital_rng" });
    const liveDealer = await buildBlackjackSessionSourceSnapshot({ ...base, activitySource: "promotion", tableType: "live_dealer" });
    const legacy = await buildBlackjackSessionSourceSnapshot({ ...base, tableType: "digital_rng" });
    expect(digital.activity_source).toBe("promotion");
    expect(liveDealer.activity_source).toBe("promotion");
    expect(digital.table_type).toBe("digital_rng");
    expect(liveDealer.table_type).toBe("live_dealer");
    expect(digital.monetary.free_credit_value).toBe("0.50");
    expect(legacy.activity_source).toBeNull();
  });

  it("uses exact cents for committed stake and validation", () => {
    expect(multiplyMoney("5.25", 2)).toBe("10.50");
    expect(subtractMoney("12.40", "10.25")).toBe("2.15");
    expect(subtractSignedMoney("-5.00", "2.50")).toBe("-7.50");
    expect(moneyInputError("£5", "Stake")).not.toBeNull();
    expect(moneyInputError(".5", "Stake")).toBeNull();
    expect(moneyToCents(".5")).toBe(BigInt(50));
    expect(moneyInputError("5.001", "Stake")).not.toBeNull();
    expect(moneyInputError("0", "Stake")).toBeNull();
    expect(blackjackCommittedStake("5.00", [])).toBe("5.00");
    expect(blackjackCommittedStake("5.00", ["Double"])).toBe("10.00");
    expect(blackjackCommittedStake("5.00", ["Split"])).toBe("5.00");
  });

  it("does not claim a running return or net while a completed return is missing", () => {
    const complete = { actual_actions: [], actual_return: "9.00", cards: [], classification: null, committed_stake: "5.00", label: "Player", outcome: "Win", recommendation_sequence: [], starting_stake: "5.00", total: 20 };
    expect(blackjackRunningFinancials([complete])).toEqual({ grossReturned: "9.00", grossStaked: "5.00", net: "4.00", returnsComplete: true });
    expect(blackjackRunningFinancials([complete, { ...complete, actual_return: null, committed_stake: "3.00" }])).toEqual({ grossReturned: null, grossStaked: "8.00", net: null, returnsComplete: false });
  });

  it("distinguishes fixed stake caps from use-winnings loss buffers", () => {
    expect(blackjackPlayLimitStatus({ grossStaked: "8.00", limit: "10.00", mode: "fixed_stake_cap", net: "5.00", nextStake: "3.00", returnsComplete: true }).warning).toBe(true);
    expect(blackjackPlayLimitStatus({ grossStaked: "20.00", limit: "10.00", mode: "use_winnings", net: "5.00", nextStake: "15.00", returnsComplete: true })).toEqual({ prerequisiteMissing: false, remainingLossBuffer: "15.00", warning: false });
    expect(blackjackPlayLimitStatus({ grossStaked: "20.00", limit: "10.00", mode: "use_winnings", net: "-7.00", nextStake: "4.00", returnsComplete: true })).toEqual({ prerequisiteMissing: false, remainingLossBuffer: "3.00", warning: true });
    expect(blackjackPlayLimitStatus({ grossStaked: "5.00", limit: "10.00", mode: "use_winnings", net: null, nextStake: "2.00", returnsComplete: false }).prerequisiteMissing).toBe(true);
  });
});
