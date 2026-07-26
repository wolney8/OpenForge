import { describe, expect, it } from "vitest";

import { getSportsbookGuidedEntry } from "./guided-entry-focus";

describe("getSportsbookGuidedEntry", () => {
  it("GUIDE-001 marks Offer as the next field for an empty sportsbook draft", () => {
    const guidance = getSportsbookGuidedEntry({ ledger: "sportsbook" });

    expect(guidance.nextRequiredField).toBe("offer");
    expect(guidance.autoFocus).toBe(false);
    expect(guidance.textCuePresent).toBe(true);
  });

  it("GUIDE-002 hides lay fields for no-lay rows without making hidden fields required", () => {
    const guidance = getSportsbookGuidedEntry({
      ledger: "sportsbook",
      strategy: "No Lay",
      offer: "Demo Offer",
      bookmaker: "Bookmaker A",
      betType: "Single",
      offerType: "Mug Bet",
      fixtureType: "Football",
      eventName: "Demo Event",
      backStake: "10",
      backOdds: "2.00",
    });

    expect(guidance.hiddenFields).toEqual(["exchange", "lay_odds_1", "lay_actual"]);
    expect(guidance.nextRequiredField).toBeNull();
    expect(guidance.state).toBe("complete");
  });

  it("GUIDE-003 requires the multi-lay outcome group and hides the single lay odds field", () => {
    const guidance = getSportsbookGuidedEntry({
      ledger: "sportsbook",
      strategy: "Multilay",
      offer: "Demo Offer",
      bookmaker: "Bookmaker A",
      betType: "First Goalscorer",
      offerType: "Price Boost",
      fixtureType: "Football",
      eventName: "Demo Event",
      backStake: "10",
      backOdds: "5.00",
      exchange: "Exchange A",
      multiLayOutcomes: [{ label: "Player A", layOdds: "6.00" }],
    });

    expect(guidance.requiredGroup).toBe("multi_lay_outcomes");
    expect(guidance.nextRequiredField).toBe("multi_lay_outcomes");
    expect(guidance.hiddenFields).toContain("lay_odds_1");
  });

  it("GUIDE-004 reports the first invalid field on save without relying on colour only", () => {
    const guidance = getSportsbookGuidedEntry({
      ledger: "sportsbook",
      action: "save",
      requiredFields: ["offer", "bookmaker"],
      completedFields: ["offer"],
    });

    expect(guidance.firstInvalidField).toBe("bookmaker");
    expect(guidance.message).toContain("bookmaker");
    expect(guidance.textCuePresent).toBe(true);
  });

  it("GUIDE-005 never steals focus while the user is typing", () => {
    const guidance = getSportsbookGuidedEntry({
      ledger: "sportsbook",
      activeField: "back_odds",
      interaction: "typing",
      offer: "Demo Offer",
      bookmaker: "Bookmaker A",
      betType: "Single",
      offerType: "Bet & Get",
      fixtureType: "Football",
      eventName: "Demo Event",
      backStake: "10",
      backOdds: "2.00",
      strategy: "Standard",
      exchange: "Exchange A",
    });

    expect(guidance.nextRequiredField).toBe("lay_odds_1");
    expect(guidance.autoFocus).toBe(false);
  });

  it("GUIDE-006 flags an incompatible mug bet and multi-lay strategy for review", () => {
    const guidance = getSportsbookGuidedEntry({
      ledger: "sportsbook",
      offerType: "Mug Bet",
      strategy: "Multilay",
    });

    expect(guidance.state).toBe("review_required");
    expect(guidance.message).toContain("Review required");
  });

  it("GUIDE-007 keeps guidance non-pulsing for reduced motion", () => {
    const guidance = getSportsbookGuidedEntry({
      ledger: "sportsbook",
      prefersReducedMotion: true,
      offer: "Demo Offer",
      bookmaker: "Bookmaker A",
      betType: "Single",
      offerType: "Bet & Get",
      fixtureType: "Football",
      eventName: "Demo Event",
    });

    expect(guidance.nextRequiredField).toBe("back_stake");
    expect(guidance.pulsingAnimation).toBe(false);
    expect(guidance.textCuePresent).toBe(true);
  });
});
