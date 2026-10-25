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
    expect(filterAndSortOpportunities(values, { ...emptyOddsMatcherFilters, selections: ["DRAW"] }, { key: "rating", direction: "desc" }, new Date("2026-10-23T12:00:00Z")).map(item => item.opportunity_id)).toEqual(["b"]);
  });

  it("combines search, provider, time and rating filters", () => {
    const values = [row(), row({ opportunity_id: "late", starts_at: "2026-10-26T15:00:00Z" })];
    const result = filterAndSortOpportunities(values, { ...emptyOddsMatcherFilters, search: "demo city", backProviders: ["bookmaker_a"], layProviders: ["smarkets"], startTime: "24H", minRating: "90" }, { key: "start", direction: "asc" }, new Date("2026-10-24T00:00:00Z"));
    expect(result.map(item => item.opportunity_id)).toEqual(["opp-1"]);
  });

  it("combines taxonomy and odds dimensions with OR within a dimension", () => {
    const values = [
      row(),
      row({ opportunity_id: "draw", selection_key: "DRAW", selection: "Draw", competition_key: "soccer_uefa_champs_league", competition: "UEFA Champions League" }),
    ];
    const result = filterAndSortOpportunities(values, {
      ...emptyOddsMatcherFilters,
      sports: ["football"],
      competitions: ["soccer_epl", "soccer_uefa_champs_league"],
      markets: ["h2h"],
      selections: ["HOME", "DRAW"],
      minBackOdds: "4",
      maxBackOdds: "5",
      minLayOdds: "4.5",
      maxLayOdds: "5",
      minRating: "90",
      maxRating: "99",
    }, { key: "rating", direction: "desc" }, new Date("2026-10-23T12:00:00Z"));
    expect(result.map(item => item.opportunity_id)).toEqual(["draw", "opp-1"]);
  });

  it("excludes unknown liquidity when a numeric minimum is requested", () => {
    expect(filterAndSortOpportunities([row()], { ...emptyOddsMatcherFilters, minLiquidity: "10" }, { key: "rating", direction: "desc" })).toEqual([]);
  });

  it("applies event and draw filters and can explicitly reveal arbs", () => {
    const values = [
      row({ opportunity_id: "home", event_name: "North FC v South FC" }),
      row({ opportunity_id: "draw", event_name: "North FC v South FC", selection_key: "DRAW", selection: "Draw" }),
      row({ opportunity_id: "arb", event_name: "North FC v South FC", display_rating: "101.20" }),
    ];
    expect(filterAndSortOpportunities(values, { ...emptyOddsMatcherFilters, eventName: "north", excludeDraws: true }, { key: "rating", direction: "desc" }).map(item => item.opportunity_id)).toEqual(["home"]);
    expect(filterAndSortOpportunities(values, { ...emptyOddsMatcherFilters, eventName: "north", excludeDraws: true, showArbs: true }, { key: "rating", direction: "desc" }).map(item => item.opportunity_id)).toEqual(["arb", "home"]);
  });

  it("supports London Today, Tomorrow and inclusive custom time boundaries", () => {
    const today = row({ starts_at: "2026-10-25T12:00:00Z" });
    const tomorrow = row({ opportunity_id: "tomorrow", starts_at: "2026-10-26T12:00:00Z" });
    const now = new Date("2026-10-25T00:30:00Z");
    expect(filterAndSortOpportunities([today, tomorrow], { ...emptyOddsMatcherFilters, startTime: "TODAY" }, { key: "start", direction: "asc" }, now)).toEqual([today]);
    expect(filterAndSortOpportunities([today, tomorrow], { ...emptyOddsMatcherFilters, startTime: "TOMORROW" }, { key: "start", direction: "asc" }, now)).toEqual([tomorrow]);
    expect(filterAndSortOpportunities([today], { ...emptyOddsMatcherFilters, startTime: "CUSTOM", customStart: "2026-10-25T12:00", customEnd: "2026-10-25T12:00" }, { key: "start", direction: "asc" }, now)).toEqual([today]);
  });

  it("identifies manual odds and copies the unknown-liquidity warning", () => {
    const value = row();
    expect(isManualQuote(value, "4.5", "4.7")).toBe(false);
    expect(isManualQuote(value, "4.6", "4.7")).toBe(true);
    expect(opportunityCopyText(value)).toContain("Liquidity unknown");
  });
});
