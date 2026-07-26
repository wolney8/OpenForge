import { describe, expect, it } from "vitest";
import { formatFinancialValue, moneyTone } from "./financial-display";

describe("financial display", () => {
  it("formats GBP money values without changing calculation inputs", () => {
    expect(formatFinancialValue(10)).toBe("£10.00");
    expect(formatFinancialValue(10, { showPositiveSign: true })).toBe("+£10.00");
    expect(formatFinancialValue(-1.29, { showPositiveSign: true })).toBe("-£1.29");
    expect(formatFinancialValue(0, { showPositiveSign: true })).toBe("£0.00");
  });

  it("classifies financial tone for accessible colour semantics", () => {
    expect(moneyTone(10)).toBe("positive");
    expect(moneyTone(-0.01)).toBe("negative");
    expect(moneyTone(0)).toBe("neutral");
  });
});

