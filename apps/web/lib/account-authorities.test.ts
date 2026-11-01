import { describe, expect, it } from "vitest";
import {
  accountAllowsNewSportsbookActivity,
  getNewSportsbookActivityAccountNamesByType,
  type AccountAuthorityRecord,
} from "./account-authorities";

function account(
  name: string,
  type: "Bookie" | "Exchange",
  overrides: Partial<AccountAuthorityRecord> = {}
): AccountAuthorityRecord {
  return {
    account_id: `account-${name}`,
    profile_id: "profile-demo-001",
    account: name,
    type,
    counts_in_cash_total: true,
    channel: "Online",
    status: "Active",
    lifecycle_status: "Active",
    restrictions: [],
    stake_access: "Normal",
    promo_access: "Full",
    catalogue_lifecycle: "ACTIVE",
    catalogue_eligible_for_new_activity: true,
    current_balance: "0.00",
    pending_withdrawal_amount: "0.00",
    last_balance_update: "",
    group_name: "Synthetic",
    platform: "Synthetic",
    created_at: "2026-10-30T00:00:00Z",
    updated_at: "2026-10-30T00:00:00Z",
    ...overrides,
  };
}

describe("Sportsbook new-activity Account options", () => {
  it("keeps eligible Profile Accounts and excludes blocked, gubbed, closed, and retired providers", () => {
    const rows = [
      account("Bookmaker A", "Bookie"),
      account("Blocked Bookmaker", "Bookie", { stake_access: "Blocked" }),
      account("Gubbed Bookmaker", "Bookie", { status: "Gubbed" }),
      account("Closed Bookmaker", "Bookie", { lifecycle_status: "Closed" }),
      account("BETDAQ", "Exchange", { catalogue_eligible_for_new_activity: false }),
      account("Matchbook", "Exchange"),
    ];

    expect(getNewSportsbookActivityAccountNamesByType(rows, "Bookie")).toEqual([
      "Bookmaker A",
    ]);
    expect(getNewSportsbookActivityAccountNamesByType(rows, "Exchange")).toEqual([
      "Matchbook",
    ]);
    expect(accountAllowsNewSportsbookActivity(rows[2])).toBe(false);
    expect(accountAllowsNewSportsbookActivity(rows[4])).toBe(false);
  });

  it("does not hide an eligible Exchange for unknown, zero, or cash-excluded balance state", () => {
    const rows = [
      account("Unknown Balance Exchange", "Exchange", { current_balance: "" }),
      account("Zero Balance Exchange", "Exchange", { current_balance: "0.00" }),
      account("Cash Excluded Exchange", "Exchange", { counts_in_cash_total: false }),
    ];
    expect(getNewSportsbookActivityAccountNamesByType(rows, "Exchange")).toEqual([
      "Unknown Balance Exchange", "Zero Balance Exchange", "Cash Excluded Exchange",
    ]);
  });
});
