import { describe, expect, it } from "vitest";
import { aggregateFinancialValues, combineFinancialAggregates } from "./financial-aggregate";

describe("financial aggregate readiness", () => {
  it("keeps known money and unknown rows separate", () => {
    expect(aggregateFinancialValues([12.5, Number.NaN, -2.5, Number.NaN])).toEqual({
      knownValue: 10,
      knownCount: 2,
      unknownCount: 2,
      isComplete: false,
    });
  });

  it("distinguishes complete zero from no authoritative value", () => {
    expect(aggregateFinancialValues([0])).toEqual({ knownValue: 0, knownCount: 1, unknownCount: 0, isComplete: true });
    expect(aggregateFinancialValues([Number.NaN])).toEqual({ knownValue: 0, knownCount: 0, unknownCount: 1, isComplete: false });
  });

  it("combines Profile results without assigning zero to unknown records", () => {
    expect(combineFinancialAggregates([
      aggregateFinancialValues([4]),
      aggregateFinancialValues([6, Number.NaN]),
    ])).toEqual({ knownValue: 10, knownCount: 2, unknownCount: 1, isComplete: false });
  });
});
