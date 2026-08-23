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

  it("GUIDE-003 keeps multi-lay rows guided until every branch placement is confirmed", () => {
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
      multiLayOutcomes: [
        {
          label: "Player A",
          layOdds: "6.00",
          placedMatchedStake: "4.20",
          placementState: "placed",
        },
        {
          label: "Player B",
          layOdds: "7.00",
          placedMatchedStake: "",
          placementState: "pending",
        },
      ],
    });

    expect(guidance.requiredGroup).toBe("multi_lay_placements");
    expect(guidance.nextRequiredField).toBe("multi_lay_placements");
    expect(guidance.message).toContain("Branch Placement");
  });

  it("GUIDE-003 completes multi-lay rows when all named branches are placed", () => {
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
      multiLayOutcomes: [
        {
          label: "Player A",
          layOdds: "6.00",
          placedMatchedStake: "4.20",
          placementState: "placed",
        },
        {
          label: "Player B",
          layOdds: "7.00",
          placedMatchedStake: "5.30",
          placementState: "placed",
        },
      ],
    });

    expect(guidance.state).toBe("complete");
    expect(guidance.nextRequiredField).toBeNull();
    expect(guidance.hiddenFields).toEqual(["lay_odds_1"]);
  });

  it("GUIDE-004 reports the first invalid field on save without relying on colour only", () => {
    const guidance = getSportsbookGuidedEntry({
      ledger: "sportsbook",
      action: "save",
      requiredFields: ["offer", "bookmaker"],
      completedFields: ["offer"],
    });

    expect(guidance.firstInvalidField).toBe("bookmaker");
    expect(guidance.message).toContain("Bookmaker");
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

  it("GUIDE-011 directs a standard lay to lay odds before a stake can be placed", () => {
    const guidance = getSportsbookGuidedEntry({
      ledger: "sportsbook",
      strategy: "Standard",
      offer: "Demo Offer",
      bookmaker: "Bookmaker A",
      betType: "Single",
      offerType: "Bet & Get",
      fixtureType: "Football",
      eventName: "Demo Event",
      backStake: "10.00",
      backOdds: "2.00",
      exchange: "Exchange A",
    });

    expect(guidance.nextRequiredField).toBe("lay_odds_1");
    expect(guidance.hiddenFields).toEqual([]);
  });

  it("GUIDE-012 directs an underlay to the actual matched stake after lay odds", () => {
    const guidance = getSportsbookGuidedEntry({
      ledger: "sportsbook",
      strategy: "Underlay",
      offer: "Demo Offer",
      bookmaker: "Bookmaker A",
      betType: "Single",
      offerType: "Bet & Get",
      fixtureType: "Football",
      eventName: "Demo Event",
      backStake: "10.00",
      backOdds: "2.00",
      exchange: "Exchange A",
      layOdds1: "2.10",
    });

    expect(guidance.nextRequiredField).toBe("lay_actual");
    expect(guidance.hiddenFields).toEqual([]);
  });

  it("GUIDE-008 requires actual lay stake for partial-lay placement review", () => {
    const guidance = getSportsbookGuidedEntry({
      ledger: "sportsbook",
      offer: "Demo Offer",
      bookmaker: "Bookmaker A",
      betType: "Single",
      offerType: "Bet & Get",
      fixtureType: "Football",
      eventName: "Demo Event",
      backStake: "10",
      backOdds: "2.00",
      exchange: "Exchange A",
      layOdds1: "2.10",
      strategy: "Partial Lay",
    });

    expect(guidance.nextRequiredField).toBe("lay_actual");
    expect(guidance.message).toContain("Lay Actual");
  });

  it("GUIDE-009 requires settlement details for settled rows", () => {
    const guidance = getSportsbookGuidedEntry({
      ledger: "sportsbook",
      offer: "Demo Offer",
      bookmaker: "Bookmaker A",
      betType: "Single",
      offerType: "Bet & Get",
      fixtureType: "Football",
      eventName: "Demo Event",
      backStake: "10",
      backOdds: "2.00",
      exchange: "Exchange A",
      layOdds1: "2.10",
      strategy: "Standard",
      status: "Settled",
      result: "Back Won",
    });

    expect(guidance.nextRequiredField).toBe("settlement");
    expect(guidance.message).toContain("Settlement Date");
  });

  it("GUIDE-009 requires an outcome when status is settled but result is still pending", () => {
    const guidance = getSportsbookGuidedEntry({
      ledger: "sportsbook",
      offer: "Demo Offer",
      bookmaker: "Bookmaker A",
      betType: "Single",
      offerType: "Bet & Get",
      fixtureType: "Football",
      eventName: "Demo Event",
      backStake: "10",
      backOdds: "2.00",
      exchange: "Exchange A",
      layOdds1: "2.10",
      strategy: "Standard",
      status: "Settled",
      result: "Pending",
      settlementDate: "2026-07-20T18:00",
    });

    expect(guidance.nextRequiredField).toBe("settlement");
    expect(guidance.message).toContain("Settlement Date");
  });

  it("GUIDE-009 keeps no-lay settled rows incomplete until settlement details are present", () => {
    const guidance = getSportsbookGuidedEntry({
      ledger: "sportsbook",
      offer: "Demo Offer",
      bookmaker: "Bookmaker A",
      betType: "Single",
      offerType: "Mug Bet",
      fixtureType: "Football",
      eventName: "Demo Event",
      backStake: "10",
      backOdds: "2.00",
      strategy: "No Lay",
      status: "Settled",
      result: "Pending",
    });

    expect(guidance.nextRequiredField).toBe("settlement");
    expect(guidance.hiddenFields).toEqual(["exchange", "lay_odds_1", "lay_actual"]);
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

  it("GUIDE-010 routes eligible completed rows to the free-bet bridge", () => {
    const guidance = getSportsbookGuidedEntry({
      ledger: "sportsbook",
      offer: "Demo Bet 10 Get 5",
      bookmaker: "Bookmaker A",
      betType: "Single",
      offerType: "Bet & Get",
      fixtureType: "Football",
      eventName: "Demo Event",
      backStake: "10",
      backOdds: "2.00",
      exchange: "Exchange A",
      layOdds1: "2.10",
      layActual: "9.52",
      strategy: "Standard",
      status: "Settled",
      result: "Lay Won",
      settlementDate: "2026-07-20T18:00",
      canCreateFreeBet: true,
      freeBetCreated: false,
    });

    expect(guidance.state).toBe("ready");
    expect(guidance.nextRequiredField).toBe("free_bet_bridge");
    expect(guidance.message).toContain("Free Bet");
  });
});
