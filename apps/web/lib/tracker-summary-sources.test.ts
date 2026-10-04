import { afterEach, expect, it, vi } from "vitest";

import { fetchCombinedTrackerSummarySources } from "./tracker-summary-sources";

const emptySource = {
  accounts: [],
  sportsbook_bets: [],
  free_bets: [],
  casino_offers: [],
  cash_adjustments: [],
  each_way_extra_places: [],
  balance_snapshots: [],
  fee_periods: [],
  tracker_settings: {
    active_date_preset: "Week (Mon-Sun)",
    custom_start_date: "",
    custom_end_date: "",
    range_back_days: 0,
    range_forward_days: 0,
  },
};

afterEach(() => vi.unstubAllGlobals());

it("loads a 64-Profile Reports scope through one combined request", async () => {
  const profileIds = Array.from({ length: 64 }, (_, index) => `PROFILE-${index}`);
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
    scope: "custom",
    profile_ids: profileIds,
    sources: Object.fromEntries(profileIds.map((profileId) => [profileId, emptySource])),
  }), { status: 200, headers: { "Content-Type": "application/json" } }));
  vi.stubGlobal("fetch", fetchMock);

  const result = await fetchCombinedTrackerSummarySources("custom", profileIds);

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledWith("/api/reports/combined-summary-sources", expect.objectContaining({
    method: "POST",
    body: JSON.stringify({ scope: "custom", profile_ids: profileIds }),
  }));
  expect(result.size).toBe(64);
  expect(result.get("PROFILE-63")?.trackerSettings.active_date_preset).toBe("Week (Mon-Sun)");
});
