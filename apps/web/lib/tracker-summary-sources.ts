"use client";

import type { FeePeriodApiRecord } from "./fee-period-summary";
import { apiBaseUrl } from "./api";
import { fetchJsonAndCache, JsonRequestError, writeCachedJson } from "./client-json-cache";
import type {
  AccountSummaryRecord,
  BalanceSnapshotSummaryRecord,
  CashAdjustmentSummaryRecord,
  CasinoSummaryRecord,
  EachWayExtraPlaceSummaryRecord,
  DatePreset,
  FreeBetSummaryRecord,
  SportsbookSummaryRecord,
  TrackerSummaryDataset,
} from "./tracker-summary";

export type TrackerSummarySettingsRecord = {
  active_date_preset: DatePreset;
  custom_start_date: string;
  custom_end_date: string;
  range_back_days: number;
  range_forward_days: number;
  mug_bet_frequency_days?: number;
  free_bet_expiry_alert_window_days?: number;
  use_global_date_range_toggle?: boolean;
};

export type TrackerSummarySources = TrackerSummaryDataset & {
  feePeriods: FeePeriodApiRecord[];
  trackerSettings: TrackerSummarySettingsRecord;
};

type ApiTrackerSummarySources = {
  accounts: AccountSummaryRecord[];
  sportsbook_bets: SportsbookSummaryRecord[];
  free_bets: FreeBetSummaryRecord[];
  casino_offers: CasinoSummaryRecord[];
  cash_adjustments: CashAdjustmentSummaryRecord[];
  each_way_extra_places: EachWayExtraPlaceSummaryRecord[];
  balance_snapshots: BalanceSnapshotSummaryRecord[];
  fee_periods: FeePeriodApiRecord[];
  tracker_settings: TrackerSummarySettingsRecord;
};

export type CombinedTrackerSummaryScope = "active" | "inactive" | "all" | "custom";

type ApiCombinedTrackerSummarySources = {
  scope: CombinedTrackerSummaryScope;
  profile_ids: string[];
  sources: Record<string, ApiTrackerSummarySources>;
};

function mapTrackerSummarySources(
  profileId: string,
  response: ApiTrackerSummarySources,
): TrackerSummarySources {
  const base = `${apiBaseUrl}/profiles/${profileId}`;
  const sources: TrackerSummarySources = {
    accounts: response.accounts,
    sportsbookBets: response.sportsbook_bets,
    freeBets: response.free_bets,
    casinoOffers: response.casino_offers,
    cashAdjustments: response.cash_adjustments,
    eachWayExtraPlaces: response.each_way_extra_places,
    balanceSnapshots: response.balance_snapshots,
    feePeriods: response.fee_periods,
    trackerSettings: response.tracker_settings,
  };

  writeCachedJson(`${base}/accounts`, sources.accounts);
  writeCachedJson(`${base}/sportsbook-bets`, sources.sportsbookBets);
  writeCachedJson(`${base}/free-bets`, sources.freeBets);
  writeCachedJson(`${base}/casino-offers`, sources.casinoOffers);
  writeCachedJson(`${base}/cash-adjustments`, sources.cashAdjustments);
  writeCachedJson(`${base}/each-way-extra-places`, sources.eachWayExtraPlaces);
  writeCachedJson(`${base}/balance-snapshots`, sources.balanceSnapshots);
  writeCachedJson(`${base}/fee-periods`, sources.feePeriods);
  writeCachedJson(`${base}/tracker-settings`, sources.trackerSettings);
  return sources;
}

export async function fetchTrackerSummarySources(
  profileId: string,
  options: { signal?: AbortSignal } = {}
): Promise<TrackerSummarySources> {
  const base = `${apiBaseUrl}/profiles/${profileId}`;
  const response = await fetchJsonAndCache<ApiTrackerSummarySources>(
    `${base}/tracker-summary-sources`,
    options
  );
  return mapTrackerSummarySources(profileId, response);
}

export async function fetchCombinedTrackerSummarySources(
  scope: CombinedTrackerSummaryScope,
  profileIds: string[],
  options: { signal?: AbortSignal } = {},
): Promise<Map<string, TrackerSummarySources>> {
  const response = await fetch(`${apiBaseUrl}/reports/combined-summary-sources`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope, profile_ids: profileIds }),
    signal: options.signal,
  });
  if (!response.ok) throw new JsonRequestError(response.status);
  const payload = (await response.json()) as ApiCombinedTrackerSummarySources;
  return new Map(
    payload.profile_ids.map((profileId) => {
      const source = payload.sources[profileId];
      if (!source) throw new Error(`Combined Reports source omitted ${profileId}`);
      return [profileId, mapTrackerSummarySources(profileId, source)] as const;
    }),
  );
}
