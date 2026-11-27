import { describe, expect, it } from "vitest";
import { presentLedgerCell } from "./combined-ledger-source";
import { ledgerColumnContracts, ledgerHideableColumns } from "./ledger-column-contracts";
import { safeCombinedLedgerReturn } from "./profile-scope";
import { ledgerWarningTarget } from "./ledger-warning-target";
import { combinedIssueLabels } from "./combined-ledger-filters";

describe("combined ledger native contracts", () => {
  it("routes source warnings to their owning native stage and recorded field", () => {
    expect(ledgerWarningTarget("accounts", "Current Balance needs review")).toMatchObject({ stage: "balance", field: "Current balance" });
    expect(ledgerWarningTarget("sportsbook-bets", "Back Unplaced")).toMatchObject({ stage: "placement", field: "Back placement" });
    expect(ledgerWarningTarget("sportsbook-bets", "No Settle Date")).toMatchObject({ stage: "settlement", field: "Settles" });
    expect(ledgerWarningTarget("free-bets", "Back Unplaced")).toMatchObject({ stage: "settlement", field: "Status" });
    expect(ledgerWarningTarget("free-bets", "No Expiry")).toMatchObject({ stage: "settlement", field: "Expiry" });
    expect(ledgerWarningTarget("free-bets", "No Settle Date")).toMatchObject({ stage: "settlement", field: "Settles" });
    expect(ledgerWarningTarget("casino-offers", "Outcome Needed")).toMatchObject({ stage: "settlement", field: "Result" });
    expect(ledgerWarningTarget("casino-offers", "Offer Unplaced")).toMatchObject({ stage: "settlement", field: "Status" });
    expect(ledgerWarningTarget("casino-offers", "No Settle Date")).toMatchObject({ stage: "settlement", field: "Status", instruction: expect.stringContaining("no separate Settles input") });
    expect(ledgerWarningTarget("casino-offers", "Final Value Needed")).toMatchObject({ stage: "settlement", field: "Net Result" });
    expect(ledgerWarningTarget("each-way-extra-places", "Historical P&L needed")).toMatchObject({ stage: "settlement", field: "Imported realised P&L" });
    expect(ledgerWarningTarget("each-way-extra-places", "Result Needed")).toMatchObject({ stage: "settlement", field: "Result" });
    expect(ledgerWarningTarget("each-way-extra-places", "Placement not confirmed")).toMatchObject({ stage: "settlement", field: "Status" });
    expect(ledgerWarningTarget("accounts", "Pending withdrawal needs review")).toMatchObject({ stage: "balance", field: "Pending withdrawal" });
    expect(ledgerWarningTarget("accounts", "Not signed up")).toMatchObject({ stage: "details", field: "Signup / lifecycle" });
    expect(ledgerWarningTarget("accounts", "Account restrictions recorded")).toMatchObject({ stage: "restrictions", field: "Account restrictions" });
    expect(ledgerWarningTarget("cash-adjustments", "No Scope")).toMatchObject({ stage: "scope", field: "Affects investment" });
    expect(ledgerWarningTarget("cash-adjustments", "No Account")).toMatchObject({ stage: "scope", field: "Linked account" });
  });
  it("shows the same time-based Extra Place result warning in combined scope", () => {
    const now = Date.parse("2026-11-27T12:00:00Z");
    const row = { profile_id: "profile-demo-001", calculation_state: "resolved", status: "Placed", result: "Pending",
      calculation_provenance: "calculated", runner: "Synthetic runner", race: "Synthetic race",
      placed_at: "2026-11-27T11:40:00Z", bookmaker: "Bookmaker A", each_way_stake: "10.00",
      back_odds: "5.00", win_exchange: "Exchange A", win_lay_odds: "5.10",
      place_exchange: "Exchange A", place_lay_odds: "2.10" };
    expect(combinedIssueLabels("each-way-extra-places", row, now)).toContain("Result Needed");
  });
  it("keeps every Profile-owned column and locks financial/action anchors", () => {
    for (const [module, columns] of Object.entries(ledgerColumnContracts)) {
      expect(columns.at(-1)?.key, module).toBe("actions");
      expect(columns.length, module).toBeGreaterThan(9);
      expect(ledgerHideableColumns[module as keyof typeof ledgerHideableColumns].has("actions"), module).toBe(false);
    }
    expect(ledgerColumnContracts.accounts.map(column => column.key)).toContain("pending_withdrawal_amount");
    expect(ledgerColumnContracts["cash-adjustments"].map(column => column.key)).toContain("signed_amount");
    expect(ledgerColumnContracts["each-way-extra-places"].map(column => column.key)).toContain("winLiability");
  });

  it("uses actual current/final source values and leaves unknown money unavailable", () => {
    const source = { profile_id: "profile-demo-001", reporting_value: "12.40", projected_current_pnl: "10.00", final_net_pnl: null };
    expect(presentLedgerCell("sportsbook-bets", source, "displayed_value")).toMatchObject({ money: 12.4, valueLabel: "Current value" });
    expect(presentLedgerCell("free-bets", { ...source, final_net_pnl: "7.10" }, "displayed_value")).toMatchObject({ money: 12.4, valueLabel: "Final value" });
    expect(presentLedgerCell("casino-offers", { profile_id: source.profile_id, calc_net_pnl: "3.20" }, "displayed_value")).toMatchObject({ money: 3.2, valueLabel: "Reference net value" });
    expect(presentLedgerCell("accounts", { profile_id: source.profile_id }, "pending_withdrawal_amount")).toMatchObject({ money: null, text: "£ -" });
    expect(presentLedgerCell("each-way-extra-places", { profile_id: source.profile_id, extra_place_profit: null, mode: "Extra Place" }, "epProfit")).toMatchObject({ money: null, text: "£ -" });
  });

  it("does not infer Back confirmation from a Placed combined Sportsbook row", () => {
    const row = { profile_id: "profile-demo-001", status: "Placed", result: "Pending", back_placement_confirmed: null };
    expect(presentLedgerCell("sportsbook-bets", row, "back_bet_status").text).toBe("Not recorded");
    expect(presentLedgerCell("sportsbook-bets", { ...row, back_placement_confirmed: true }, "back_bet_status").text).toBe("Back Placed");
  });

  it("allows only bounded same-ledger return paths", () => {
    expect(safeCombinedLedgerReturn("accounts", "/tracker/accounts?profile=profile-demo-001&q=Bookmaker+A&page=2&size=16")).toBe("/tracker/accounts?profile=profile-demo-001&q=Bookmaker+A&page=2&size=16");
    expect(safeCombinedLedgerReturn("sportsbook-bets", "/tracker/sportsbook-bets?f_status=Placed&f_bookmaker=Bookmaker+A")).toBe("/tracker/sportsbook-bets?f_status=Placed&f_bookmaker=Bookmaker+A");
    expect(safeCombinedLedgerReturn("sportsbook-bets", "/tracker/sportsbook-bets?warning=profile-demo-001%3A%3ASB-001&sy=480&sx=120")).toBe("/tracker/sportsbook-bets?warning=profile-demo-001%3A%3ASB-001&sy=480&sx=120");
    expect(safeCombinedLedgerReturn("sportsbook-bets", "/tracker/sportsbook-bets?warning=%2Fadmin&sy=-1")).toBeUndefined();
    expect(safeCombinedLedgerReturn("accounts", "/tracker/accounts?f_bookmaker=Bookmaker+A")).toBeUndefined();
    expect(safeCombinedLedgerReturn("accounts", "//evil.invalid/tracker/accounts")).toBeUndefined();
    expect(safeCombinedLedgerReturn("accounts", "/tracker/accounts?returnTo=%2Fadmin")).toBeUndefined();
    expect(safeCombinedLedgerReturn("accounts", "/tracker/sportsbook-bets")).toBeUndefined();
  });
});
