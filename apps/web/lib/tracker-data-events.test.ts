import { describe, expect, it, vi } from "vitest";
import { apiBaseUrl } from "./api";
import { readCachedJson, writeCachedJson } from "./client-json-cache";
import { dispatchTrackerDataUpdated, TRACKER_DATA_UPDATED_EVENT } from "./tracker-data-events";

describe("tracker-data-events", () => {
  it("invalidates the changed ledger cache before dispatching the update event", () => {
    const profileId = "profile-demo-001";
    const casinoUrl = `${apiBaseUrl}/profiles/${profileId}/casino-offers`;
    const freeBetUrl = `${apiBaseUrl}/profiles/${profileId}/free-bets`;
    const listener = vi.fn();

    writeCachedJson(casinoUrl, [{ id: "CASINO-1" }]);
    writeCachedJson(freeBetUrl, [{ id: "FREE-1" }]);
    window.addEventListener(TRACKER_DATA_UPDATED_EVENT, listener);

    dispatchTrackerDataUpdated({ ledger: "casino-offers", profileId });

    expect(readCachedJson(casinoUrl)).toBeNull();
    expect(readCachedJson(freeBetUrl)).toEqual([{ id: "FREE-1" }]);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]).toMatchObject({
      detail: { ledger: "casino-offers", profileId },
    });

    window.removeEventListener(TRACKER_DATA_UPDATED_EVENT, listener);
  });

  it("invalidates all profile ledger caches when the changed ledger is unspecified", () => {
    const profileId = "profile-demo-002";
    const sportsbookUrl = `${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`;
    const freeBetUrl = `${apiBaseUrl}/profiles/${profileId}/free-bets`;
    const otherProfileUrl = `${apiBaseUrl}/profiles/profile-demo-001/free-bets`;

    writeCachedJson(sportsbookUrl, [{ id: "SPORTSBOOK-1" }]);
    writeCachedJson(freeBetUrl, [{ id: "FREE-1" }]);
    writeCachedJson(otherProfileUrl, [{ id: "OTHER-FREE-1" }]);

    dispatchTrackerDataUpdated({ profileId });

    expect(readCachedJson(sportsbookUrl)).toBeNull();
    expect(readCachedJson(freeBetUrl)).toBeNull();
    expect(readCachedJson(otherProfileUrl)).toEqual([{ id: "OTHER-FREE-1" }]);
  });
});
