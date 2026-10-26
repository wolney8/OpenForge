import { describe, expect, it } from "vitest";
import { formatOdds, parseOdds } from "./odds-format";

describe("Bet Summary odds formats", () => {
  it.each([
    ["2", "1/1"], ["3.5", "5/2"], ["26", "25/1"], ["3.75", "11/4"],
  ])("formats %s as exact fractional %s", (canonical, expected) => {
    expect(formatOdds(canonical, "Fractional")).toBe(expected);
  });

  it.each([
    ["2", "+100"], ["3", "+200"], ["1.5", "-200"], ["1.6", "-166.67"],
  ])("formats %s as Moneyline %s", (canonical, expected) => {
    expect(formatOdds(canonical, "Moneyline")).toBe(expected);
  });

  it("parses supported formats back to canonical decimal odds", () => {
    expect(parseOdds("5/2", "Fractional")).toEqual({ canonicalDecimal: "3.5", error: null });
    expect(parseOdds("+250", "Moneyline")).toEqual({ canonicalDecimal: "3.5", error: null });
    expect(parseOdds("-140", "Moneyline")).toEqual({ canonicalDecimal: "1.714285714286", error: null });
    expect(parseOdds("3.50", "Decimal")).toEqual({ canonicalDecimal: "3.5", error: null });
  });

  it("rejects blanks, malformed fractions and unsupported Moneyline values", () => {
    expect(parseOdds("", "Decimal").canonicalDecimal).toBeNull();
    expect(parseOdds("5/0", "Fractional").canonicalDecimal).toBeNull();
    expect(parseOdds("1//2", "Fractional").canonicalDecimal).toBeNull();
    expect(parseOdds("+99", "Moneyline").canonicalDecimal).toBeNull();
    expect(parseOdds("-99", "Moneyline").canonicalDecimal).toBeNull();
  });

  it("does not drift when presentation formats change repeatedly", () => {
    const canonical = "3.5";
    expect(formatOdds(canonical, "Decimal")).toBe("3.50");
    expect(formatOdds(canonical, "Fractional")).toBe("5/2");
    expect(formatOdds(canonical, "Moneyline")).toBe("+250");
    expect(formatOdds(canonical, "Decimal")).toBe("3.50");
  });
});
