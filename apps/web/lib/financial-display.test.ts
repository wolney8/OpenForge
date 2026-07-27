import { describe, expect, it } from "vitest";
import { financialMotionDirection, formatFinancialValue, moneyTone } from "./financial-display";

describe("financial display", () => {
  it("formats GBP money values without changing calculation inputs", () => {
    expect(formatFinancialValue(10)).toBe("£ 10.00");
    expect(formatFinancialValue(10, { showPositiveSign: true })).toBe("+£ 10.00");
    expect(formatFinancialValue(-1.29, { showPositiveSign: true })).toBe("( £ 1.29 )");
    expect(formatFinancialValue(0, { showPositiveSign: true })).toBe("£ 0.00");
  });

  it("classifies financial tone for accessible colour semantics", () => {
    expect(moneyTone(10)).toBe("positive");
    expect(moneyTone(-0.01)).toBe("negative");
    expect(moneyTone(0)).toBe("positive");
    expect(moneyTone(0, { zeroTone: "neutral" })).toBe("neutral");
  });

  it("derives restrained motion direction without implying profit semantics", () => {
    expect(financialMotionDirection(null, 10)).toBe("none");
    expect(financialMotionDirection(8, 10)).toBe("up");
    expect(financialMotionDirection(10, 8)).toBe("down");
    expect(financialMotionDirection(-1, 2)).toBe("up");
    expect(financialMotionDirection(2, -1)).toBe("down");
    expect(financialMotionDirection(10, 10)).toBe("none");
    expect(financialMotionDirection(8, 10, true)).toBe("none");
  });
});
