import { describe, expect, it } from "vitest";
import type { AccountAuthorityRecord } from "./account-authorities";
import { resolveCasinoBookmakerCoverage } from "./casino-offer-knowledge";

function account(name: string, status: string): AccountAuthorityRecord {
  return {
    account_id: `ACC-${name}`,
    profile_id: "PROFILE-001",
    account: name,
    type: "Bookie",
    counts_in_cash_total: true,
    channel: "Web",
    status,
    lifecycle_status: status,
    restrictions_json: "[]",
    current_balance: "0.00",
    pending_withdrawal_amount: "0.00",
    last_balance_update: "",
    group_name: "Demo Group",
    platform: "Demo Platform",
    created_at: "2026-07-21T00:00:00Z",
    updated_at: "2026-07-21T00:00:00Z",
  };
}

describe("resolveCasinoBookmakerCoverage", () => {
  it("allows active and casino-only accounts, warns for restricted accounts and blocks sportsbook-only accounts", () => {
    const result = resolveCasinoBookmakerCoverage({
      knownBookmakers: ["Bookmaker A", "Bookmaker B", "Bookmaker C", "Bookmaker D"],
      accountAuthorities: [
        account("Bookmaker A", "Active"),
        account("Bookmaker B", "Casino Only"),
        account("Bookmaker C", "Bonus Restricted"),
        account("Bookmaker D", "Sportsbook Only"),
      ],
    });

    expect(result.map(({ state, selectable }) => ({ state, selectable }))).toEqual([
      { state: "available", selectable: true },
      { state: "available", selectable: true },
      { state: "warning", selectable: true },
      { state: "blocked", selectable: false },
    ]);
  });
});
