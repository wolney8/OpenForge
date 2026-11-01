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
  commission_origin: "profile-account" | "commission-offer" | "oddsmatcher-default" | "unavailable";
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
  data_source: "live" | "replay";
  replay_snapshot_id: string | null;
  replay_captured_at: string | null;
  competitions: string[];
  event_count: number;
  bookmaker_count: number;
  exchange_count: number;
  provider_credits_used: number | null;
  provider_credits_remaining: number | null;
  provider_last_refresh_cost: number | null;
  provider_quota_exhausted: boolean;
  opportunities: OddsMatcherOpportunity[];
  excluded: { competition: string; event_id: string; provider_key: string; market_key: string; reason: string }[];
};

export type OddsMatcherSavedSnapshot = {
  snapshot_id: string;
  captured_at: string;
  provider: string;
  competitions: string[];
  event_count: number;
  bookmaker_count: number;
  exchange_count: number;
};

export type OddsMatcherFilters = {
  search: string;
  sports: string[];
  competitions: string[];
  eventName: string;
  markets: string[];
  selections: Array<"HOME" | "DRAW" | "AWAY">;
  excludeDraws: boolean;
  startTime: "ALL" | "30M" | "1H" | "2H" | "4H" | "8H" | "12H" | "24H" | "TODAY" | "TOMORROW" | "3D" | "CUSTOM";
  customStart: string;
  customEnd: string;
  backProviders: string[];
  minBackOdds: string;
  maxBackOdds: string;
  layProviders: string[];
  minLayOdds: string;
  maxLayOdds: string;
  minLiquidity: string;
  minRating: string;
  maxRating: string;
  showArbs: boolean;
};

export const emptyOddsMatcherFilters: OddsMatcherFilters = {
  search: "",
  sports: [],
  competitions: [],
  eventName: "",
  markets: [],
  selections: [],
  excludeDraws: false,
  startTime: "ALL",
  customStart: "",
  customEnd: "",
  backProviders: [],
  minBackOdds: "",
  maxBackOdds: "",
  layProviders: [],
  minLayOdds: "",
  maxLayOdds: "",
  minLiquidity: "",
  minRating: "",
  maxRating: "",
  showArbs: false,
};

export type OddsMatcherSavedFilter = {
  id: string;
  name: string;
  description?: string;
  filters: OddsMatcherFilters;
};

export type OddsMatcherPreferences = {
  version: 1;
  default_back_stake: string;
  exchange_commission_overrides: Record<string, string>;
  excluded_bookmaker_identities: string[];
  excluded_exchange_identities: string[];
  show_arbs_default: boolean;
  default_advanced: boolean;
  data_source: "live" | "replay";
  saved_snapshot_id: string;
  auto_update_back_odds: boolean;
  auto_update_lay_odds: boolean;
  saved_filters: OddsMatcherSavedFilter[];
};

export const defaultOddsMatcherPreferences: OddsMatcherPreferences = {
  version: 1,
  default_back_stake: "10.00",
  exchange_commission_overrides: {},
  excluded_bookmaker_identities: [],
  excluded_exchange_identities: [],
  show_arbs_default: false,
  default_advanced: false,
  data_source: "live",
  saved_snapshot_id: "",
  auto_update_back_odds: false,
  auto_update_lay_odds: false,
  saved_filters: [],
};

export type OddsMatcherFilterCounts = {
  selection: number;
  startTime: number;
  back: number;
  lay: number;
  rating: number;
};

export function oddsMatcherFilterCounts(
  filters: OddsMatcherFilters,
  showArbsDefault: boolean,
): OddsMatcherFilterCounts {
  return {
    selection:
      filters.sports.length +
      filters.competitions.length +
      Number(Boolean(filters.eventName)) +
      filters.markets.length +
      filters.selections.length +
      Number(filters.excludeDraws),
    startTime: Number(filters.startTime !== "ALL"),
    back:
      filters.backProviders.length +
      Number(Boolean(filters.minBackOdds)) +
      Number(Boolean(filters.maxBackOdds)),
    lay:
      filters.layProviders.length +
      Number(Boolean(filters.minLayOdds)) +
      Number(Boolean(filters.maxLayOdds)) +
      Number(Boolean(filters.minLiquidity)),
    rating:
      Number(Boolean(filters.minRating)) +
      Number(Boolean(filters.maxRating)) +
      Number(filters.showArbs !== showArbsDefault),
  };
}

export function oddsMatcherOptionMatches(value: string, query: string): boolean {
  const normalize = (source: string) => source
    .normalize("NFKD")
    .replace(/[\p{P}\p{S}\s]+/gu, "")
    .toLocaleLowerCase("en-GB");
  return normalize(value).includes(normalize(query));
}

export type OpportunitySort = {
  key: "rating" | "start" | "event";
  direction: "asc" | "desc";
};

export function oddsMatcherRatingTone(value: string): "arb" | "strong" | "positive" | "caution" | "low" {
  const rating = Number(value);
  if (rating > 100) return "arb";
  if (rating >= 97) return "strong";
  if (rating >= 94) return "positive";
  if (rating >= 90) return "caution";
  return "low";
}

export function filterAndSortOpportunities(
  rows: OddsMatcherOpportunity[],
  filters: OddsMatcherFilters,
  sort: OpportunitySort,
  now = new Date(),
): OddsMatcherOpportunity[] {
  const needle = filters.search.trim().toLocaleLowerCase("en-GB");
  const durationMs: Partial<Record<OddsMatcherFilters["startTime"], number>> = {
    "30M": 30 * 60_000, "1H": 3_600_000, "2H": 2 * 3_600_000,
    "4H": 4 * 3_600_000, "8H": 8 * 3_600_000, "12H": 12 * 3_600_000,
    "24H": 24 * 3_600_000, "3D": 3 * 24 * 3_600_000,
  };
  const dateKey = (value: Date) => {
    const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(value);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
    return `${part("year")}-${part("month")}-${part("day")}`;
  };
  const parseLondonLocal = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return Number.NaN;
    const [datePart, timePart] = value.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute] = timePart.split(":").map(Number);
    const tentative = Date.UTC(year, month - 1, day, hour, minute);
    const zone = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London", timeZoneName: "shortOffset", hour: "2-digit",
    }).formatToParts(new Date(tentative)).find((item) => item.type === "timeZoneName")?.value ?? "GMT";
    const match = zone.match(/GMT(?:([+-])(\d{1,2})(?::(\d{2}))?)?/);
    const sign = match?.[1] === "-" ? -1 : 1;
    const offset = match?.[2] ? sign * (Number(match[2]) * 60 + Number(match[3] ?? 0)) * 60_000 : 0;
    return tentative - offset;
  };
  const today = dateKey(now);
  const tomorrow = dateKey(new Date(now.getTime() + 24 * 3_600_000));
  const numeric = (value: string) => value.trim() ? Number(value) : null;
  const minBack = numeric(filters.minBackOdds);
  const maxBack = numeric(filters.maxBackOdds);
  const minLay = numeric(filters.minLayOdds);
  const maxLay = numeric(filters.maxLayOdds);
  const minimum = numeric(filters.minRating);
  const maximum = numeric(filters.maxRating);
  const filtered = rows.filter((row) => {
    const starts = Date.parse(row.starts_at);
    if (needle && ![
      row.event_name,
      row.selection,
      row.competition,
      row.market,
      row.back.account_name,
      row.lay.account_name,
    ].some((value) => value.toLocaleLowerCase("en-GB").includes(needle))) return false;
    if (filters.sports.length && !filters.sports.includes("football")) return false;
    if (filters.competitions.length && !filters.competitions.includes(row.competition_key)) return false;
    if (filters.eventName.trim() && !row.event_name.toLocaleLowerCase("en-GB").includes(filters.eventName.trim().toLocaleLowerCase("en-GB"))) return false;
    if (filters.markets.length && !filters.markets.includes(row.market_key)) return false;
    if (filters.selections.length && !filters.selections.includes(row.selection_key)) return false;
    if (filters.excludeDraws && row.selection_key === "DRAW") return false;
    if (filters.startTime !== "ALL") {
      if (!Number.isFinite(starts)) return false;
      const duration = durationMs[filters.startTime];
      if (duration != null && (starts < now.getTime() || starts > now.getTime() + duration)) return false;
      const startsKey = dateKey(new Date(starts));
      if (filters.startTime === "TODAY" && startsKey !== today) return false;
      if (filters.startTime === "TOMORROW" && startsKey !== tomorrow) return false;
      if (filters.startTime === "CUSTOM") {
        const start = parseLondonLocal(filters.customStart);
        const end = parseLondonLocal(filters.customEnd);
        if (!Number.isFinite(start) || !Number.isFinite(end) || starts < start || starts > end) return false;
      }
    }
    if (filters.backProviders.length && !filters.backProviders.includes(row.back.provider_key)) return false;
    if (filters.layProviders.length && !filters.layProviders.includes(row.lay.provider_key)) return false;
    const backOdds = Number(row.back.odds);
    const layOdds = Number(row.lay.odds);
    if (minBack !== null && Number.isFinite(minBack) && backOdds < minBack) return false;
    if (maxBack !== null && Number.isFinite(maxBack) && backOdds > maxBack) return false;
    if (minLay !== null && Number.isFinite(minLay) && layOdds < minLay) return false;
    if (maxLay !== null && Number.isFinite(maxLay) && layOdds > maxLay) return false;
    if (filters.minLiquidity.trim()) return false;
    if (minimum !== null && Number.isFinite(minimum) && Number(row.display_rating) < minimum) return false;
    if (maximum !== null && Number.isFinite(maximum) && Number(row.display_rating) > maximum) return false;
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
