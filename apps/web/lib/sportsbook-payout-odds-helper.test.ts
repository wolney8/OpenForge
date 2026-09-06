import { describe, expect, it } from "vitest";

import fixture from "../../../tests/fixtures/sportsbook-payout-odds-helper-fixtures.json";

import {
  getPayoutReturnInputError,
  getPayoutStakeInputError,
  PAYOUT_AMOUNT_FORMAT_MESSAGE,
} from "./sportsbook-payout-odds-helper";

describe("Sportsbook payout odds helper inputs", () => {
  it.each(fixture.resolved)("accepts exact fixture amounts %#", ({ stake, total_return }) => {
    expect(getPayoutStakeInputError(stake)).toBeNull();
    expect(getPayoutReturnInputError(total_return, stake)).toBeNull();
  });

  it.each(fixture.invalid_format)("preserves and rejects malformed amount %s", (value) => {
    expect(getPayoutStakeInputError(value)).toBe(PAYOUT_AMOUNT_FORMAT_MESSAGE);
    expect(getPayoutReturnInputError(value, "10")).toBe(PAYOUT_AMOUNT_FORMAT_MESSAGE);
  });

  it("keeps positive and return-at-least-stake rules field specific", () => {
    expect(getPayoutStakeInputError("0")).toContain("stake greater than zero");
    expect(getPayoutReturnInputError("0", "10")).toContain("return greater than zero");
    expect(getPayoutReturnInputError("9.999", "10")).toContain("at least the cash back stake");
    expect(getPayoutReturnInputError("10.000", "10")).toBeNull();
  });
});
