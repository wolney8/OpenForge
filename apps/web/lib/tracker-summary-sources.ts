"use client";

import type { FeePeriodApiRecord } from "./fee-period-summary";
import { apiBaseUrl } from "./api";
import { fetchJsonAndCache, writeCachedJson } from "./client-json-cache";
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

export async function fetchTrackerSummarySources(
  profileId: string,
  options: { signal?: AbortSignal } = {}
): Promise<TrackerSummarySources> {
  const base = `${apiBaseUrl}/profiles/${profileId}`;
  const response = await fetchJsonAndCache<ApiTrackerSummarySources>(
    `${base}/tracker-summary-sources`,
    options
  );
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
