import { describe, expect, it } from "vitest";
import {
  emptyOddsMatcherFilters,
  filterAndSortOpportunities,
  isManualQuote,
  opportunityCopyText,
  type OddsMatcherOpportunity,
} from "./oddsmatcher";

function row(overrides: Partial<OddsMatcherOpportunity> = {}): OddsMatcherOpportunity {
  return {
    opportunity_id: "opp-1", provider: "The Odds API", competition_key: "soccer_epl",
    competition: "Premier League", event_id: "event-1", event_name: "Demo City v Demo United",
    starts_at: "2026-10-24T15:00:00Z", selection_key: "HOME", selection: "Demo City",
    market_key: "h2h", market: "Match Odds / 1X2",
    back: { provider_key: "bookmaker_a", provider_name: "Bookmaker A", account_name: "Bookmaker A", odds: "4.5", observed_at: "2026-10-23T12:00:00Z", link: null },
    lay: { provider_key: "smarkets", provider_name: "Smarkets", account_name: "Smarkets", odds: "4.7", observed_at: "2026-10-23T12:00:05Z", link: null },
    display_rating: "95.74", commission_aware_rating: "93.00", exchange_commission: "0.02",
    standard_lay_stake: "9.62", liability: "35.59", pnl_if_back_wins: "-1.09",
    pnl_if_lay_wins: "-0.57", conservative_result: "-1.09", liquidity_state: "UNKNOWN",
    freshness: "fresh", age_seconds: 30,
    back_eligibility: { state: "eligible", reason: "Eligible", account_id: "account-b" },
    lay_eligibility: { state: "eligible", reason: "Eligible", account_id: "account-l" },
    can_create_prospecting_draft: true, ...overrides,
  };
}

describe("Oddsmatcher filters", () => {
  it("filters the full set before stable rating ordering and hides arbs by default", () => {
    const values = [
      row({ opportunity_id: "b", display_rating: "97.00", selection_key: "DRAW", selection: "Draw" }),
      row({ opportunity_id: "a", display_rating: "97.00" }),
      row({ opportunity_id: "arb", display_rating: "101.00" }),
    ];
    expect(filterAndSortOpportunities(values, emptyOddsMatcherFilters, { key: "rating", direction: "desc" }, new Date("2026-10-23T12:00:00Z")).map(item => item.opportunity_id)).toEqual(["a", "b"]);
    expect(filterAndSortOpportunities(values, { ...emptyOddsMatcherFilters, selection: "DRAW" }, { key: "rating", direction: "desc" }, new Date("2026-10-23T12:00:00Z")).map(item => item.opportunity_id)).toEqual(["b"]);
  });

  it("combines search, provider, time and rating filters", () => {
    const values = [row(), row({ opportunity_id: "late", starts_at: "2026-10-26T15:00:00Z" })];
    const result = filterAndSortOpportunities(values, { ...emptyOddsMatcherFilters, search: "demo city", backProvider: "Bookmaker A", layProvider: "Smarkets", startTime: "24H", minimumRating: "90" }, { key: "start", direction: "asc" }, new Date("2026-10-24T00:00:00Z"));
    expect(result.map(item => item.opportunity_id)).toEqual(["opp-1"]);
  });

  it("identifies manual odds and copies the unknown-liquidity warning", () => {
    const value = row();
    expect(isManualQuote(value, "4.5", "4.7")).toBe(false);
    expect(isManualQuote(value, "4.6", "4.7")).toBe(true);
    expect(opportunityCopyText(value)).toContain("Liquidity unknown");
  });
});
