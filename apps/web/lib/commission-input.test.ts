import {describe, expect, it} from "vitest";
import {commissionRatioToPercentage, percentageToCommissionRatio} from "./commission-input";
describe("explicit percentage presentation, canonical ratio", () => {
  it.each([["0","0"],["2","0.02"],["5","0.05"],["0.02","0.0002"],["2.125","0.02125"],["100","1"]])("%s percent is %s ratio", (percent, ratio) => {
    expect(percentageToCommissionRatio(percent)).toBe(ratio);
    expect(commissionRatioToPercentage(ratio)).toBe(percent);
  });
  it.each(["", "2.", "NaN", "Infinity", "2,5", "not-money"])("retains incomplete/invalid draft %s", value => {
    expect(commissionRatioToPercentage(percentageToCommissionRatio(value))).toBe(value);
  });
});
