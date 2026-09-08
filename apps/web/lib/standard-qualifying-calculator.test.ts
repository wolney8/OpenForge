import { describe, expect, it } from "vitest";

import { getStandardQualifyingErrors, hasStandardQualifyingErrors } from "./standard-qualifying-calculator";

const valid = {
  backStake: "10.00",
  backOdds: "2.00",
  layOdds: "2.10",
  exchangeCommission: "0.02",
};

describe("standard qualifying calculator input validation", () => {
  it("accepts complete decimal inputs including zero commission", () => {
    expect(hasStandardQualifyingErrors(getStandardQualifyingErrors(valid))).toBe(false);
    expect(getStandardQualifyingErrors({ ...valid, exchangeCommission: "0" }).exchangeCommission).toBeNull();
  });

  it.each(["1,000", "£8.5", "8.5abc", "NaN", "Infinity", "1e3", "+8.5", " 8.5"])(
    "rejects malformed odds %s without partial parsing",
    (layOdds) => expect(getStandardQualifyingErrors({ ...valid, layOdds }).layOdds).not.toBeNull()
  );

  it("keeps required, positive stake and commission range rules distinct", () => {
    expect(getStandardQualifyingErrors({ ...valid, backStake: "" }).backStake).toBe("Enter a back stake.");
    expect(getStandardQualifyingErrors({ ...valid, backStake: "0" }).backStake).toContain("greater than zero");
    expect(getStandardQualifyingErrors({ ...valid, exchangeCommission: "" }).exchangeCommission).toBe("Enter exchange commission.");
    expect(getStandardQualifyingErrors({ ...valid, exchangeCommission: "1.1" }).exchangeCommission).not.toBeNull();
  });
});
