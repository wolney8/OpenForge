import { describe, expect, it } from "vitest";

import {
  formatBlackjackStakePence,
  multiplyBlackjackStake,
  parseBlackjackStakePence,
  splitBlackjackStakeExactly,
} from "./blackjack-session";

describe("blackjack session stake accounting", () => {
  it("validates whole-penny non-negative stakes without coercion", () => {
    expect(parseBlackjackStakePence("0")).toBe(BigInt(0));
    expect(parseBlackjackStakePence("0.00")).toBe(BigInt(0));
    expect(parseBlackjackStakePence("5")).toBe(BigInt(500));
    expect(parseBlackjackStakePence("5.25")).toBe(BigInt(525));
    for (const invalid of ["", "-1", "£5", "5,00", "5.001", " 5", "1e2"]) {
      expect(parseBlackjackStakePence(invalid)).toBeNull();
    }
  });

  it("tracks doubled and split commitments exactly", () => {
    expect(multiplyBlackjackStake("5.00", 2)).toBe("10.00");
    expect(formatBlackjackStakePence(BigInt(12345))).toBe("123.45");
  });

  it("preserves an exact half-penny surrender amount without silent rounding", () => {
    expect(splitBlackjackStakeExactly("5.00")).toBe("2.50");
    expect(splitBlackjackStakeExactly("5.01")).toBe("2.505");
  });
});
