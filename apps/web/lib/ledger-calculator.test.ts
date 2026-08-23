import { describe, expect, it } from "vitest";
import {
  calculateFreeBetResultCardPreview,
  coerceStrategyForCalculatorMode,
  getCalculatorModeForLayWorkflowMode,
  getLayWorkflowModeForStrategy,
  getSingleLayResultModes,
  getStrategyForLayWorkflowMode,
  isDecimalCalculatorInput,
  sportsbookLayWorkflowModeOptions,
} from "./ledger-calculator";

describe("ledger calculator display helpers", () => {
  it("allows only blank values, digits, and one decimal point", () => {
    expect(isDecimalCalculatorInput("")).toBe(true);
    expect(isDecimalCalculatorInput("10")).toBe(true);
    expect(isDecimalCalculatorInput("10.25")).toBe(true);
    expect(isDecimalCalculatorInput(".25")).toBe(true);
    expect(isDecimalCalculatorInput("10,25")).toBe(false);
    expect(isDecimalCalculatorInput("10.2.5")).toBe(false);
    expect(isDecimalCalculatorInput("abc")).toBe(false);
  });

  it("forces Standard strategy in Simple mode", () => {
    expect(coerceStrategyForCalculatorMode("Simple", "Underlay")).toBe("Standard");
    expect(coerceStrategyForCalculatorMode("Simple", "Overlay")).toBe("Standard");
    expect(coerceStrategyForCalculatorMode("Advanced", "Underlay")).toBe("Underlay");
  });

  it("exposes only Standard in Simple mode and all result paths in Advanced mode", () => {
    expect(getSingleLayResultModes("Simple")).toEqual(["Standard"]);
    expect(getSingleLayResultModes("Advanced")).toEqual([
      "Underlay",
      "Standard",
      "Overlay",
      "Custom",
    ]);
  });

  it("maps persisted strategy values into the collapsed lay workflow modes", () => {
    expect(getLayWorkflowModeForStrategy("No Lay")).toBe("No Lay");
    expect(getLayWorkflowModeForStrategy("Standard")).toBe("Standard");
    expect(getLayWorkflowModeForStrategy("Underlay")).toBe("Advanced");
    expect(getLayWorkflowModeForStrategy("Overlay")).toBe("Advanced");
    expect(getLayWorkflowModeForStrategy("Custom")).toBe("Advanced");
    expect(getLayWorkflowModeForStrategy("Partial Lay")).toBe("Standard");
    expect(getLayWorkflowModeForStrategy("Multilay")).toBe("Multilay");
    expect(getLayWorkflowModeForStrategy("Multilay-Underlay")).toBe("Multilay");
  });

  it("does not expose Partial Lay as a visible lay workflow mode", () => {
    expect(sportsbookLayWorkflowModeOptions).toEqual([
      "No Lay",
      "Standard",
      "Advanced",
      "Multilay",
    ]);
    expect(sportsbookLayWorkflowModeOptions).not.toContain("Partial Lay");
  });

  it("keeps result-card strategies contract-compatible when a lay workflow mode is selected", () => {
    expect(getStrategyForLayWorkflowMode("Advanced", "Underlay")).toBe("Underlay");
    expect(getStrategyForLayWorkflowMode("Advanced", "No Lay")).toBe("Standard");
    expect(getStrategyForLayWorkflowMode("Multilay", "Multilay-Underlay")).toBe("Multilay-Underlay");
    expect(getStrategyForLayWorkflowMode("No Lay", "Overlay")).toBe("No Lay");
  });

  it("derives calculator mode from the collapsed lay workflow mode", () => {
    expect(getCalculatorModeForLayWorkflowMode("No Lay")).toBe("Simple");
    expect(getCalculatorModeForLayWorkflowMode("Standard")).toBe("Simple");
    expect(getCalculatorModeForLayWorkflowMode("Advanced")).toBe("Advanced");
    expect(getCalculatorModeForLayWorkflowMode("Multilay")).toBe("Advanced");
  });

  it("derives Free Bet result-card outcomes from each visible lay stake", () => {
    expect(
      calculateFreeBetResultCardPreview({
        retentionMode: "SNR",
        freeBetValue: "5",
        backOdds: "2.00",
        layOdds: "3.50",
        layCommission: "0",
        layStake: "1.43",
      })
    ).toEqual({
      layStake: 1.43,
      liability: 3.58,
      backWin: 1.42,
      layWin: 1.43,
    });

    expect(
      calculateFreeBetResultCardPreview({
        retentionMode: "SNR",
        freeBetValue: "5",
        backOdds: "2.00",
        layOdds: "3.50",
        layCommission: "0",
        layStake: "1.33",
      })
    ).toMatchObject({
      backWin: 1.67,
      layWin: 1.33,
    });
  });

  it("does not calculate Free Bet result-card outcomes for comma decimal inputs", () => {
    expect(
      calculateFreeBetResultCardPreview({
        retentionMode: "SNR",
        freeBetValue: "5",
        backOdds: "2,00",
        layOdds: "3.50",
        layCommission: "0",
        layStake: "1.43",
      })
    ).toBeNull();
  });
});
