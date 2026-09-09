import { describe, expect, it } from "vitest";

import { blackjackRecommendationsMatch } from "./blackjack-rule-comparison";

describe("unknown Blackjack Soft 17 rule comparison", () => {
  it("accepts a common recommendation without guessing a table rule", () => {
    expect(blackjackRecommendationsMatch(
      { action: "Stand", fallback_action: null },
      { action: "Stand", fallback_action: null },
    )).toBe(true);
  });

  it("retains both recommendations when either primary or fallback action differs", () => {
    expect(blackjackRecommendationsMatch(
      { action: "Hit", fallback_action: null },
      { action: "Double", fallback_action: "Hit" },
    )).toBe(false);
  });
});
