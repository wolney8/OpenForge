import { describe, expect, it } from "vitest";

import {
  blackjackConversionEligible,
  blackjackCommittedStake,
  buildBlackjackSessionSourceSnapshot,
  moneyInputError,
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
    expect(snapshot.table_type).toBeNull();
    expect(snapshot.monetary).toEqual({
      ending_balance: null, free_credit_value: null, recorded_hand_net: null,
      session_result: null, starting_balance: null, withdrawable_result: null,
    });
  });

  it("separates free credit from withdrawable cash", async () => {
    const snapshot = await buildBlackjackSessionSourceSnapshot({
      endedAt: "2026-09-09T11:00:00.000Z", endingBalance: "", freeCreditValue: "10.00",
      hands: [], mode: "free_play", recordedHandNet: null, soft17Rule: "hits",
      startedAt: "2026-09-09T10:00:00.000Z", startingBalance: "", surrenderAllowed: true,
      tableType: "digital_rng", withdrawableResult: "4.25",
    });
    expect(snapshot.conversion_eligible).toBe(true);
    expect(snapshot.monetary.free_credit_value).toBe("10.00");
    expect(snapshot.monetary.withdrawable_result).toBe("4.25");
    expect(snapshot.monetary.session_result).toBeNull();
  });

  it("derives exact live balance movement and stable provenance", async () => {
    const input = {
      endedAt: "2026-09-09T11:00:00.000Z", endingBalance: "84.01", freeCreditValue: "",
      hands: [{ dealer_card: "10", hand_number: 1, hands: [{ actual_actions: ["Double"], actual_return: "24.01", cards: ["6", "5", "10"], classification: "hard", committed_stake: "20.00", label: "Player", outcome: "Win", recommendation_sequence: ["Double"], starting_stake: "10.00", total: 21 }] }],
      mode: "live_play" as const, recordedHandNet: "4.01", soft17Rule: "stands" as const,
      startedAt: "2026-09-09T10:00:00.000Z", startingBalance: "100.00",
      surrenderAllowed: false, tableType: "live_dealer" as const, withdrawableResult: "",
    };
    const first = await buildBlackjackSessionSourceSnapshot(input);
    const second = await buildBlackjackSessionSourceSnapshot(input);
    expect(first.monetary.session_result).toBe("-15.99");
    expect(first.source_checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(second).toEqual(first);
    input.hands[0].hands[0].cards.push("A");
    expect(first.hands[0].hands[0].cards).toEqual(["6", "5", "10"]);
  });

  it("uses exact cents for committed stake and validation", () => {
    expect(multiplyMoney("5.25", 2)).toBe("10.50");
    expect(subtractMoney("12.40", "10.25")).toBe("2.15");
    expect(subtractSignedMoney("-5.00", "2.50")).toBe("-7.50");
    expect(moneyInputError("£5", "Stake")).not.toBeNull();
    expect(moneyInputError("5.001", "Stake")).not.toBeNull();
    expect(moneyInputError("0", "Stake")).toBeNull();
    expect(blackjackCommittedStake("5.00", [])).toBe("5.00");
    expect(blackjackCommittedStake("5.00", ["Double"])).toBe("10.00");
    expect(blackjackCommittedStake("5.00", ["Split"])).toBe("5.00");
  });
});
