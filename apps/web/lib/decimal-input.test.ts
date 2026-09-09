import { describe, expect, it } from "vitest";

import {
  decimalRateToPercentageInput,
  formatDecimalInput,
  isExplicitZero,
  normalizeMoneyInput,
  percentageInputToDecimalRate,
  sanitizeDecimalInput,
} from "./decimal-input";

describe("decimal input", () => {
  it("normalizes shorthand money input without adding currency text", () => {
    expect(sanitizeDecimalInput("25")).toBe("25");
    expect(sanitizeDecimalInput("25.5")).toBe("25.5");
    expect(sanitizeDecimalInput(".5")).toBe("0.5");
    expect(sanitizeDecimalInput("-£.30")).toBe("-0.30");
    expect(formatDecimalInput("25.5")).toBe("25.50");
  });

  it("normalizes only complete, unambiguous money values", () => {
    expect(normalizeMoneyInput(".50")).toBe("0.50");
    expect(normalizeMoneyInput(".5")).toBe("0.50");
    expect(normalizeMoneyInput("0.5")).toBe("0.50");
    expect(normalizeMoneyInput("1,00")).toBeNull();
    expect(normalizeMoneyInput("£.50")).toBeNull();
    expect(normalizeMoneyInput(".5abc")).toBeNull();
    expect(normalizeMoneyInput("1.")).toBeNull();
  });

  it("distinguishes a blank value from an explicit zero", () => {
    expect(isExplicitZero("")).toBe(false);
    expect(isExplicitZero("0.00")).toBe(true);
    expect(formatDecimalInput("", { emptyValue: "" })).toBe("");
  });

  it("converts percentage entry to the canonical decimal commission rate", () => {
    expect(percentageInputToDecimalRate("2")).toBe("0.02");
    expect(percentageInputToDecimalRate("2.5")).toBe("0.025");
    expect(percentageInputToDecimalRate("0")).toBe("0.00");
    expect(percentageInputToDecimalRate("")).toBe("");
    expect(decimalRateToPercentageInput("0.02")).toBe("2.00");
  });
});
