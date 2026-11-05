import { describe, expect, it } from "vitest";
import { combinedFilterOptions, combinedFilterValue, combinedIssueLabels, combinedLedgerFilters, matchesCombinedLedgerFilters } from "./combined-ledger-filters";
import type { CombinedLedgerModule } from "./profile-scope";

describe("combined source-field filters", () => {
  it("offers source-backed filters in all six ledgers", () => {
    const modules: CombinedLedgerModule[] = ["accounts", "sportsbook-bets", "free-bets", "casino-offers", "each-way-extra-places", "cash-adjustments"];
    for (const ledger of modules) expect(combinedLedgerFilters[ledger].length).toBeGreaterThan(0);
  });

  it("uses the native back-bet status label and exact stored status", () => {
    const row = { profile_id: "profile-a", status: "Prospecting", result: "Pending", bookmaker: "Bookmaker A" };
    expect(combinedFilterValue("sportsbook-bets", row, "back_bet_status")).toBe("Not Placed");
    expect(matchesCombinedLedgerFilters("sportsbook-bets", row, { status: "Prospecting", back_bet_status: "Not Placed" })).toBe(true);
    expect(matchesCombinedLedgerFilters("sportsbook-bets", row, { status: "Settled" })).toBe(false);
  });

  it("keeps false distinct from unavailable and never offers an unknown as No", () => {
    const rows = [{ profile_id: "profile-a", affects_investment: false }, { profile_id: "profile-b", affects_investment: true }, { profile_id: "profile-c" }];
    expect(combinedFilterOptions("cash-adjustments", rows, "affects_investment")).toEqual(["No", "Yes"]);
    expect(matchesCombinedLedgerFilters("cash-adjustments", rows[2], { affects_investment: "No" })).toBe(false);
  });

  it("uses native issue reasons and excludes unclassified rows without claiming they are clear", () => {
    const pending = { profile_id: "profile-a", status: "Placed", result: "Pending", date_settled: "2026-11-01", is_overdue: true, partial_lay_reminder_state: "Not Set", partial_lay_reminder_due_at: null };
    const missing = { profile_id: "profile-b", status: "Placed", result: "Pending" };
    expect(combinedIssueLabels("sportsbook-bets", pending)).toContain("Outcome Needed");
    expect(combinedFilterOptions("sportsbook-bets", [pending, missing], "issue_type")).toContain("Outcome Needed");
    expect(matchesCombinedLedgerFilters("sportsbook-bets", pending, { issue_type: "Outcome Needed" })).toBe(true);
    expect(combinedIssueLabels("sportsbook-bets", missing)).toBeNull();
    expect(matchesCombinedLedgerFilters("sportsbook-bets", missing, { issue_type: "All issues" })).toBe(false);
  });
});
