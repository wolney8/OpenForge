import { apiBaseUrl } from "./api";
import { invalidateCachedJson } from "./client-json-cache";

export const TRACKER_DATA_UPDATED_EVENT = "plum-duff-tracker-data-updated";

export type TrackerDataUpdatedDetail = {
  ledger?: string;
  profileId?: string;
};

const trackerLedgerPaths = [
  "sportsbook-bets",
  "free-bets",
  "casino-offers",
  "cash-adjustments",
] as const;

function invalidateTrackerSummarySources(detail: TrackerDataUpdatedDetail): void {
  if (!detail.profileId) return;

  if (detail.ledger) {
    invalidateCachedJson(`${apiBaseUrl}/profiles/${detail.profileId}/${detail.ledger}`);
    return;
  }

  for (const ledger of trackerLedgerPaths) {
    invalidateCachedJson(`${apiBaseUrl}/profiles/${detail.profileId}/${ledger}`);
  }
}

export function dispatchTrackerDataUpdated(detail: TrackerDataUpdatedDetail): void {
  invalidateTrackerSummarySources(detail);
  window.dispatchEvent(
    new CustomEvent<TrackerDataUpdatedDetail>(TRACKER_DATA_UPDATED_EVENT, {
      detail,
    })
  );
}
