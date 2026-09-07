import { describe, expect, it } from "vitest";
import type { AccountAuthorityRecord } from "./account-authorities";
import {
  resolveExtraPlaceAccountOptions,
  resolveExtraPlacePreferredExchange,
} from "./extra-place-account-options";

function account(
  accountName: string,
  type: AccountAuthorityRecord["type"],
): AccountAuthorityRecord {
  return {
    account_id: `account-${accountName}`,
    profile_id: "profile-synthetic-001",
    account: accountName,
    type,
    counts_in_cash_total: true,
    channel: "Online",
    status: "Active",
    lifecycle_status: "Active",
    current_balance: "0.00",
    pending_withdrawal_amount: "0.00",
    last_balance_update: "",
    group_name: "Synthetic Group",
    platform: "Synthetic Platform",
    created_at: "2026-09-07T12:00:00Z",
    updated_at: "2026-09-07T12:00:00Z",
  };
}

describe("Extra Place account choices", () => {
  it("uses profile account authorities while retaining saved historical values", () => {
    const choices = resolveExtraPlaceAccountOptions({
      accounts: [
        account("Bookmaker A", "Bookie"),
        account("Exchange A", "Exchange"),
        account("Bank A", "Bank"),
      ],
      currentBookmaker: "Bookmaker C",
      currentPlaceExchange: "Exchange C",
      rows: [
        {
          bookmaker: "Bookmaker B",
          win_exchange: "Exchange B",
          place_exchange: "Exchange B",
        },
      ],
    });

    expect(choices.bookmakers).toEqual([
      "Bookmaker A",
      "Bookmaker B",
      "Bookmaker C",
    ]);
    expect(choices.exchanges).toEqual([
      "Exchange A",
      "Exchange B",
      "Exchange C",
    ]);
    expect(choices.bookmakers).not.toContain("Bank A");
  });

  it("uses the canonical option for a configured preferred exchange", () => {
    expect(
      resolveExtraPlacePreferredExchange(" exchange a ", [
        "Exchange A",
        "Exchange B",
      ]),
    ).toBe("Exchange A");
    expect(
      resolveExtraPlacePreferredExchange("Missing Exchange", ["Exchange A"]),
    ).toBe("");
  });
});
