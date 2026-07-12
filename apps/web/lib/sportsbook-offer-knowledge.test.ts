import { describe, expect, it } from "vitest";
import {
  getSpecialOfferBookmakerSuggestion,
  resolveSpecialOfferKnowledgeKey,
} from "./sportsbook-offer-knowledge";

describe("getSpecialOfferBookmakerSuggestion", () => {
  it("returns available profile bookmakers for a known special offer", () => {
    const result = getSpecialOfferBookmakerSuggestion({
      offerType: "Double Delight / Hat-trick Heaven",
      accountAuthorities: [
        {
          account_id: "AC-1",
          profile_id: "PROFILE-1",
          account: "Betfred",
          type: "Bookie",
          counts_in_cash_total: true,
          channel: "Online",
          status: "Active",
          current_balance: "0",
          pending_withdrawal_amount: "0",
          last_balance_update: "",
          group_name: "",
          platform: "",
          created_at: "",
          updated_at: "",
        },
        {
          account_id: "AC-2",
          profile_id: "PROFILE-1",
          account: "Midnite",
          type: "Bookie",
          counts_in_cash_total: true,
          channel: "Online",
          status: "Gubbed",
          current_balance: "0",
          pending_withdrawal_amount: "0",
          last_balance_update: "",
          group_name: "",
          platform: "",
          created_at: "",
          updated_at: "",
        },
      ],
    });

    expect(result).not.toBeNull();
    expect(result?.resolvedOfferKey).toBe("Double Delight / Hat-trick Heaven");
    expect(result?.resolutionSource).toBe("offer_type");
    expect(result?.availableBookmakers).toEqual(["Betfred"]);
    expect(result?.unavailableBookmakers).toEqual(["Midnite"]);
    expect(result?.missingKnownBookmakers).toEqual([]);
    expect(result?.allKnownBookmakersUnavailableOnProfile).toBe(false);
  });

  it("flags when all known profile bookmakers are unavailable", () => {
    const result = getSpecialOfferBookmakerSuggestion({
      offerType: "Double Delight / Hat-trick Heaven",
      accountAuthorities: [
        {
          account_id: "AC-1",
          profile_id: "PROFILE-1",
          account: "Betfred",
          type: "Bookie",
          counts_in_cash_total: true,
          channel: "Online",
          status: "Bonus Restricted",
          current_balance: "0",
          pending_withdrawal_amount: "0",
          last_balance_update: "",
          group_name: "",
          platform: "",
          created_at: "",
          updated_at: "",
        },
      ],
    });

    expect(result).not.toBeNull();
    expect(result?.availableBookmakers).toEqual([]);
    expect(result?.unavailableBookmakers).toEqual(["Betfred"]);
    expect(result?.missingKnownBookmakers).toEqual(["Midnite"]);
    expect(result?.allKnownBookmakersUnavailableOnProfile).toBe(true);
  });

  it("lists known bookmakers missing from the profile", () => {
    const result = getSpecialOfferBookmakerSuggestion({
      offerType: "Double Delight / Hat-trick Heaven",
      accountAuthorities: [],
    });

    expect(result).not.toBeNull();
    expect(result?.availableBookmakers).toEqual([]);
    expect(result?.unavailableBookmakers).toEqual([]);
    expect(result?.missingKnownBookmakers).toEqual(["Betfred", "Midnite"]);
    expect(result?.allKnownBookmakersUnavailableOnProfile).toBe(false);
  });

  it("returns null for non-special offer types", () => {
    expect(
      getSpecialOfferBookmakerSuggestion({
        offerType: "Bet & Get",
        accountAuthorities: [],
      })
    ).toBeNull();
  });

  it("resolves a special-offer key from offer name or offer text when offer type is generic", () => {
    expect(
      resolveSpecialOfferKnowledgeKey({
        offerType: "Bet & Get",
        offerName: "Friday Double Delight / Hat-trick Heaven",
      })
    ).toBe("Double Delight / Hat-trick Heaven");

    const result = getSpecialOfferBookmakerSuggestion({
      offerType: "Bet & Get",
      offerText: "Midweek price boost on selected football picks",
      accountAuthorities: [],
    });

    expect(result?.resolvedOfferKey).toBe("Price Boost");
    expect(result?.resolutionSource).toBe("offer");
    expect(result?.knownBookmakers).toContain("Betfred");
  });

  it("tracks selected bookmaker state against known coverage", () => {
    const result = getSpecialOfferBookmakerSuggestion({
      offerType: "Double Delight / Hat-trick Heaven",
      bookmaker: "Midnite",
      accountAuthorities: [
        {
          account_id: "AC-1",
          profile_id: "PROFILE-1",
          account: "Betfred",
          type: "Bookie",
          counts_in_cash_total: true,
          channel: "Online",
          status: "Active",
          current_balance: "0",
          pending_withdrawal_amount: "0",
          last_balance_update: "",
          group_name: "",
          platform: "",
          created_at: "",
          updated_at: "",
        },
        {
          account_id: "AC-2",
          profile_id: "PROFILE-1",
          account: "Midnite",
          type: "Bookie",
          counts_in_cash_total: true,
          channel: "Online",
          status: "Inactive",
          current_balance: "0",
          pending_withdrawal_amount: "0",
          last_balance_update: "",
          group_name: "",
          platform: "",
          created_at: "",
          updated_at: "",
        },
      ],
    });

    expect(result?.selectedBookmakerState).toBe("unavailable");
  });
});
