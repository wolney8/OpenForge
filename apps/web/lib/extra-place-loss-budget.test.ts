import { describe, expect, it } from "vitest";
import { getExtraPlaceLossBudgetState } from "./extra-place-loss-budget";

describe("getExtraPlaceLossBudgetState", () => {
  it("uses the default fifteen-pound weekly loss ceiling", () => {
    expect(getExtraPlaceLossBudgetState(undefined, -4.13)).toEqual({
      budget: 15,
      spent: 4.13,
      remaining: 10.87,
      reached: false,
    });
  });

  it("does not treat profit as loss spend and signals a reached budget", () => {
    expect(getExtraPlaceLossBudgetState("15", -15)).toMatchObject({
      spent: 15,
      remaining: 0,
      reached: true,
    });
    expect(getExtraPlaceLossBudgetState("20", 3)).toMatchObject({ spent: 0, remaining: 20 });
  });
});
