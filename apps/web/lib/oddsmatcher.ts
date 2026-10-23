export type OddsMatcherEligibility = {
  state: "eligible" | "warning" | "unavailable";
  reason: string;
  account_id: string | null;
};

export type OddsMatcherQuote = {
  provider_key: string;
  provider_name: string;
  account_name: string;
  odds: string;
  observed_at: string;
  link: string | null;
};

export type OddsMatcherOpportunity = {
  opportunity_id: string;
  provider: string;
  competition_key: string;
  competition: string;
  event_id: string;
  event_name: string;
  starts_at: string;
  selection_key: "HOME" | "DRAW" | "AWAY";
  selection: string;
  market_key: string;
  market: string;
  back: OddsMatcherQuote;
  lay: OddsMatcherQuote;
  display_rating: string;
  commission_aware_rating: string | null;
  exchange_commission: string | null;
  standard_lay_stake: string | null;
  liability: string | null;
  pnl_if_back_wins: string | null;
  pnl_if_lay_wins: string | null;
  conservative_result: string | null;
  liquidity_state: "UNKNOWN";
  freshness: "fresh" | "stale";
  age_seconds: number;
  back_eligibility: OddsMatcherEligibility;
  lay_eligibility: OddsMatcherEligibility;
  can_create_prospecting_draft: boolean;
};

export type OddsMatcherFeed = {
  provider: string;
  fetched_at: string | null;
  state: "empty" | "fresh" | "stale";
  warning: string | null;
  manual_refresh_only: boolean;
  competitions: string[];
  event_count: number;
  bookmaker_count: number;
  exchange_count: number;
  credits_used_today: number;
  provider_credits_used: number | null;
  provider_credits_remaining: number | null;
  daily_credit_ceiling: number;
  opportunities: OddsMatcherOpportunity[];
  excluded: { competition: string; event_id: string; provider_key: string; market_key: string; reason: string }[];
};

export type OddsMatcherFilters = {
  search: string;
  selection: "ALL" | "HOME" | "DRAW" | "AWAY";
  startTime: "ALL" | "6H" | "24H" | "48H";
  backProvider: string;
  layProvider: string;
  minimumRating: string;
  showArbs: boolean;
};

export const emptyOddsMatcherFilters: OddsMatcherFilters = {
  search: "",
  selection: "ALL",
  startTime: "ALL",
  backProvider: "",
  layProvider: "",
  minimumRating: "",
  showArbs: false,
};

export type OpportunitySort = {
  key: "rating" | "start" | "event";
  direction: "asc" | "desc";
};

export function filterAndSortOpportunities(
  rows: OddsMatcherOpportunity[],
  filters: OddsMatcherFilters,
  sort: OpportunitySort,
  now = new Date(),
): OddsMatcherOpportunity[] {
  const needle = filters.search.trim().toLocaleLowerCase("en-GB");
  const hours = filters.startTime === "ALL" ? null : Number(filters.startTime.slice(0, -1));
  const cutoff = hours === null ? null : now.getTime() + hours * 3_600_000;
  const minimum = filters.minimumRating.trim() ? Number(filters.minimumRating) : null;
  const filtered = rows.filter((row) => {
    const starts = Date.parse(row.starts_at);
    if (needle && ![
      row.event_name,
      row.selection,
      row.competition,
      row.back.account_name,
      row.lay.account_name,
    ].some((value) => value.toLocaleLowerCase("en-GB").includes(needle))) return false;
    if (filters.selection !== "ALL" && row.selection_key !== filters.selection) return false;
    if (cutoff !== null && (!Number.isFinite(starts) || starts < now.getTime() || starts > cutoff)) return false;
    if (filters.backProvider && row.back.account_name !== filters.backProvider) return false;
    if (filters.layProvider && row.lay.account_name !== filters.layProvider) return false;
    if (minimum !== null && Number.isFinite(minimum) && Number(row.display_rating) < minimum) return false;
    if (!filters.showArbs && Number(row.display_rating) > 100) return false;
    return true;
  });
  const direction = sort.direction === "asc" ? 1 : -1;
  return filtered.sort((left, right) => {
    const primary = sort.key === "rating"
      ? Number(left.display_rating) - Number(right.display_rating)
      : sort.key === "start"
        ? Date.parse(left.starts_at) - Date.parse(right.starts_at)
        : left.event_name.localeCompare(right.event_name, "en-GB");
    return primary * direction || left.opportunity_id.localeCompare(right.opportunity_id, "en-GB");
  });
}

export function isManualQuote(
  opportunity: OddsMatcherOpportunity,
  backOdds: string,
  layOdds: string,
): boolean {
  return backOdds !== opportunity.back.odds || layOdds !== opportunity.lay.odds;
}

export function opportunityCopyText(row: OddsMatcherOpportunity): string {
  return [
    `${row.event_name} — ${row.selection}`,
    `${row.back.account_name} back ${row.back.odds}`,
    `${row.lay.account_name} lay ${row.lay.odds}`,
    `Rating ${row.display_rating}%`,
    "Liquidity unknown — confirm exchange depth before placing.",
  ].join("\n");
}
