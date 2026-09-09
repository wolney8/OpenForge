import { describe, expect, it } from "vitest";

import { BLACKJACK_RANKS, isBlackjackCard } from "./blackjack-ranks";

describe("Blackjack rank picker compatibility contract", () => {
  it("exposes exactly the thirteen existing rank-only engine values", () => {
    expect(BLACKJACK_RANKS).toEqual(["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]);
    expect(new Set(BLACKJACK_RANKS).size).toBe(13);
    expect(isBlackjackCard("Q")).toBe(true);
    expect(isBlackjackCard("Q♥")).toBe(false);
  });
});
