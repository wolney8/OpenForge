import { afterEach, describe, expect, it, vi } from "vitest";

import {
  saveTrackerDatePreset,
  TRACKER_SETTINGS_UPDATED_EVENT,
  type TrackerSettingsClientRecord,
} from "./tracker-settings-client";

const currentSettings: TrackerSettingsClientRecord = {
  profile_id: "profile-synthetic-001",
  active_date_preset: "This Year",
  custom_start_date: "",
  custom_end_date: "",
  range_back_days: 0,
  range_forward_days: 0,
  mug_bet_frequency_days: 30,
  free_bet_expiry_alert_window_days: 7,
  use_global_date_range_toggle: true,
  this_month_mode: "Calendar Month",
  default_free_bet_underlay_factor: "0.80",
  default_free_bet_overlay_factor: "0.70",
  default_bonus_retention_percent: "75.00",
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("saveTrackerDatePreset", () => {
  it("persists one complete settings mutation and announces the committed range", async () => {
    const savedSettings = { ...currentSettings, active_date_preset: "This Month" };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(savedSettings), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    const eventListener = vi.fn();
    window.addEventListener(TRACKER_SETTINGS_UPDATED_EVENT, eventListener);

    await expect(
      saveTrackerDatePreset("profile-synthetic-001", currentSettings, "This Month")
    ).resolves.toEqual(savedSettings);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/profiles/profile-synthetic-001/tracker-settings"),
      expect.objectContaining({ method: "PUT" })
    );
    expect(JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)).toMatchObject({
      active_date_preset: "This Month",
      custom_start_date: "",
      custom_end_date: "",
    });
    expect(eventListener).toHaveBeenCalledTimes(1);
    window.removeEventListener(TRACKER_SETTINGS_UPDATED_EVENT, eventListener);
  });

  it("does not announce a failed settings mutation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Synthetic settings failure", { status: 500 }))
    );
    const eventListener = vi.fn();
    window.addEventListener(TRACKER_SETTINGS_UPDATED_EVENT, eventListener);

    await expect(
      saveTrackerDatePreset("profile-synthetic-001", currentSettings, "Week (Mon-Sun)")
    ).rejects.toThrow("Synthetic settings failure");
    expect(eventListener).not.toHaveBeenCalled();
    window.removeEventListener(TRACKER_SETTINGS_UPDATED_EVENT, eventListener);
  });
});
