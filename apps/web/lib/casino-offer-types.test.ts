import { describe, expect, it } from "vitest";
import {
  casinoOfferTypeUsesFieldGroup,
  casinoOfferTypeUsesTab,
  getCasinoOfferRequiredFields,
  getCasinoOfferResultOptions,
  getCasinoOfferTypeOptions,
  getCasinoOfferCapabilities,
  getCasinoOfferTypeDisplayLabel,
  getCasinoOfferTypeHelpText,
  normalizeCasinoOfferType,
} from "./casino-offer-types";

describe("casino offer type metadata", () => {
  it("maps legacy workbook offer types to canonical editor labels", () => {
    expect(normalizeCasinoOfferType("Wager")).toBe("Wager To Earn Reward");
    expect(normalizeCasinoOfferType("Deposit Bonus")).toBe("Deposit And Bonus Wagering");
    expect(normalizeCasinoOfferType("Free Play")).toBe("Fixed Spins Or Free Play");
    expect(normalizeCasinoOfferType("Risk Free")).toBe("Risk-Free / Refund");
    expect(normalizeCasinoOfferType("Cashback")).toBe("Cashback / Loss Back");
    expect(normalizeCasinoOfferType("Reload / Recurring Casino Bonus")).toBe("Daily / Recurring Casino Reward");
    expect(normalizeCasinoOfferType("Wager And Get Free Spins")).toBe("Wager To Earn Free Spins");
    expect(normalizeCasinoOfferType("None")).toBe("Other / Custom");
  });

  it("exposes only relevant tabs and field groups for reward-led offers", () => {
    expect(casinoOfferTypeUsesTab("Free Spins", "campaign")).toBe(false);
    expect(casinoOfferTypeUsesTab("Free Spins", "reward")).toBe(true);
    expect(casinoOfferTypeUsesFieldGroup("Free Spins", "cashStake")).toBe(false);
    expect(casinoOfferTypeUsesFieldGroup("Free Spins", "awardedSpins")).toBe(true);
    expect(getCasinoOfferRequiredFields("Free Spins")).toEqual([
      "spin_stake",
      "free_spins_awarded",
      "free_spins_value",
    ]);
    expect(casinoOfferTypeUsesTab("Deposit To Receive Free Spins", "campaign")).toBe(true);
    expect(casinoOfferTypeUsesFieldGroup("Deposit To Receive Free Spins", "cashStake")).toBe(true);
  });

  it("exposes wagering but not reward fields for cashback offers", () => {
    expect(casinoOfferTypeUsesTab("Cashback", "campaign")).toBe(true);
    expect(casinoOfferTypeUsesTab("Cashback", "reward")).toBe(false);
    expect(casinoOfferTypeUsesFieldGroup("Cashback", "cashStake")).toBe(true);
    expect(casinoOfferTypeUsesFieldGroup("Cashback", "creditAmount")).toBe(true);
    expect(getCasinoOfferRequiredFields("Cashback")).toEqual(["cash_stake", "credit_amount"]);
  });

  it("uses offer-specific settlement result options", () => {
    expect(getCasinoOfferResultOptions("Cashback")).toEqual(["Pending", "Win", "Lose", "Void"]);
    expect(getCasinoOfferResultOptions("Risk Free")).toEqual(["Pending", "Win", "Lose", "Mixed", "Void"]);
    expect(getCasinoOfferResultOptions("Other / Custom")).toContain("Mixed");
  });

  it("defines workflow capabilities separately from option labels", () => {
    expect(getCasinoOfferCapabilities("Deposit And Bonus Wagering")).toMatchObject({
      hasDeposit: true,
      hasRewardWagering: true,
      supportsRtpCalculation: true,
    });
    expect(getCasinoOfferCapabilities("Prize / Mystery Reward")).toMatchObject({
      allowsUnknownReward: true,
      rewardValueKnownAtSetup: false,
      rewardType: "mystery",
    });
  });

  it("covers practical casino archetypes from the workflow contract", () => {
    expect(getCasinoOfferTypeOptions()).toEqual(
      expect.arrayContaining([
        "Free Spins",
        "Fixed Spins Or Free Play",
        "Wager To Earn Reward",
        "Deposit And Bonus Wagering",
        "No-Deposit Bonus / Bonus Credit",
        "Cashback / Loss Back",
        "Risk-Free / Refund",
        "Wager To Earn Free Spins",
        "Deposit To Receive Free Spins",
        "Wagering / Turnover Challenge",
        "Daily / Recurring Casino Reward",
        "Prize / Mystery Reward",
        "Other / Custom",
      ])
    );
  });

  it("keeps custom current values readable without duplicating blank options", () => {
    expect(getCasinoOfferTypeOptions("")).not.toContain("");
    expect(getCasinoOfferTypeOptions("Legacy Special")).toContain("Legacy Special");
  });

  it("keeps canonical labels stable while exposing clearer display labels", () => {
    expect(normalizeCasinoOfferType("Wager And Get Free Spins")).toBe("Wager To Earn Free Spins");
    expect(getCasinoOfferTypeDisplayLabel("Wager To Earn Free Spins")).toBe("Wager & Get Free Spins");
    expect(getCasinoOfferTypeDisplayLabel("Deposit And Bonus Wagering")).toBe(
      "Deposit Bonus Wagering"
    );
    expect(getCasinoOfferTypeDisplayLabel("Legacy Special")).toBe("Legacy Special");
  });

  it("provides concise offer-type help text for the editor", () => {
    expect(getCasinoOfferTypeHelpText("Deposit To Receive Free Spins")).toContain(
      "Deposit to unlock free spins"
    );
    expect(getCasinoOfferTypeHelpText("Unknown Type")).toContain("custom casino workflow");
  });

  it("requires spin stake for wagering-led helpers that calculate spins needed", () => {
    expect(getCasinoOfferRequiredFields("Deposit And Bonus Wagering")).toEqual(
      expect.arrayContaining(["wager_multiplier", "wager_target", "spin_stake"])
    );
    expect(getCasinoOfferRequiredFields("No-Deposit Bonus / Bonus Credit")).toEqual(
      expect.arrayContaining(["wager_multiplier", "wager_target", "spin_stake"])
    );
    expect(getCasinoOfferRequiredFields("Daily / Recurring Casino Reward")).toEqual(
      expect.arrayContaining(["wager_multiplier", "wager_target", "spin_stake"])
    );
    expect(getCasinoOfferRequiredFields("Fixed Wagering Requirement")).toEqual(
      expect.arrayContaining(["wager_target", "spin_stake"])
    );
    expect(getCasinoOfferRequiredFields("Wagering / Turnover Challenge")).toEqual(
      expect.arrayContaining(["wager_target", "spin_stake"])
    );
  });
});
