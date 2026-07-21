import { describe, expect, it } from "vitest";
import type { AccountAuthorityRecord } from "./account-authorities";
import {
  getSpecialOfferBookmakerSuggestion,
  resolveKnownBookmakerCoverage,
} from "./sportsbook-offer-knowledge";

function account(name: string, status: string, restrictions: string[] = []): AccountAuthorityRecord {
  return {
    account_id: `AC-${name}`,
    profile_id: "PROFILE-1",
    account: name,
    type: "Bookie",
    counts_in_cash_total: true,
    channel: "Online",
    status,
    lifecycle_status: status,
    restrictions_json: JSON.stringify(restrictions),
    current_balance: "0",
    pending_withdrawal_amount: "0",
    last_balance_update: "",
    group_name: "",
    platform: "",
    created_at: "",
    updated_at: "",
  };
}

describe("resolveKnownBookmakerCoverage", () => {
  it("resolves universal associations against profile account states", () => {
    const result = resolveKnownBookmakerCoverage({
      knownBookmakers: ["Bookmaker A", "Bookmaker B", "Bookmaker C", "Bookmaker D"],
      offerType: "Bet & Get",
      accountAuthorities: [
        account("Bookmaker A", "Active"),
        account("Bookmaker B", "Active", ["Soft Limited"]),
        account("Bookmaker C", "Gubbed"),
      ],
    });
    expect(result.map(({ bookmaker, state, selectable }) => ({ bookmaker, state, selectable }))).toEqual([
      { bookmaker: "Bookmaker A", state: "available", selectable: true },
      { bookmaker: "Bookmaker B", state: "warning", selectable: true },
      { bookmaker: "Bookmaker C", state: "blocked", selectable: false },
      { bookmaker: "Bookmaker D", state: "not_signed_up", selectable: false },
    ]);
  });

  it("blocks bonus-restricted promotions but permits mug bets", () => {
    const profileAccounts = [account("Bookmaker A", "Active", ["Bonus Restricted"])];
    expect(resolveKnownBookmakerCoverage({ knownBookmakers: ["Bookmaker A"], accountAuthorities: profileAccounts, offerType: "Bet & Get" })[0]).toMatchObject({ state: "warning", selectable: false });
    expect(resolveKnownBookmakerCoverage({ knownBookmakers: ["Bookmaker A"], accountAuthorities: profileAccounts, offerType: "Mug Bet" })[0]).toMatchObject({ state: "available", selectable: true });
  });
});

describe("getSpecialOfferBookmakerSuggestion", () => {
  it("uses Common Combo knowledge rather than hard-coded bookmaker claims", () => {
    const result = getSpecialOfferBookmakerSuggestion({
      offerType: "Double Delight / Hat-trick Heaven",
      knowledgeLabel: "Demo DDHH combo",
      knownBookmakers: ["Bookmaker A", "Bookmaker B"],
      bookmaker: "Bookmaker B",
      accountAuthorities: [account("Bookmaker A", "Active"), account("Bookmaker B", "Gubbed")],
    });
    expect(result).toMatchObject({
      resolvedOfferKey: "Demo DDHH combo",
      availableBookmakers: ["Bookmaker A"],
      unavailableBookmakers: ["Bookmaker B"],
      selectedBookmakerState: "blocked",
    });
  });

  it("returns null when no universal bookmaker associations exist", () => {
    expect(getSpecialOfferBookmakerSuggestion({ offerType: "Bet & Get", knownBookmakers: [], accountAuthorities: [] })).toBeNull();
  });
});
