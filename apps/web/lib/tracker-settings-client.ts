import { apiBaseUrl } from "./api";
import { invalidateCachedJson } from "./client-json-cache";
import type { DatePreset } from "./tracker-summary";

export const TRACKER_SETTINGS_UPDATED_EVENT = "plum-duff-tracker-settings-updated";
export const TRACKER_SETTINGS_UPDATE_STARTED_EVENT = "plum-duff-tracker-settings-update-started";
export const TRACKER_SETTINGS_UPDATE_FAILED_EVENT = "plum-duff-tracker-settings-update-failed";

export type TrackerSettingsClientRecord = {
  profile_id: string;
  active_date_preset: DatePreset | string;
  custom_start_date: string;
  custom_end_date: string;
  range_back_days: number;
  range_forward_days: number;
  mug_bet_frequency_days: number;
  free_bet_expiry_alert_window_days: number;
  use_global_date_range_toggle: boolean;
  this_month_mode: string;
  default_free_bet_underlay_factor: string;
  default_free_bet_overlay_factor: string;
  default_bonus_retention_percent: string;
  default_exchange_name?: string;
  dashboard_view_mode?: string;
  weekly_profit_target?: string;
  monthly_profit_target?: string;
  annual_profit_target?: string;
  weekly_extra_place_loss_budget?: string;
};

export type FundManagerSelectedRange = {
  selected_range_preset: DatePreset | string;
  selected_range_custom_start: string | null;
  selected_range_custom_end: string | null;
};

export async function saveFundManagerSelectedRange(
  preset: DatePreset,
  customStart: string | null = null,
  customEnd: string | null = null
): Promise<FundManagerSelectedRange> {
  const selectedRangeUrl = `${apiBaseUrl}/fund-manager/preferences/selected-range`;
  window.dispatchEvent(new CustomEvent(TRACKER_SETTINGS_UPDATE_STARTED_EVENT, {
    detail: { preset },
  }));
  try {
    const response = await fetch(selectedRangeUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        selected_range_preset: preset,
        selected_range_custom_start: preset === "Custom" ? customStart : null,
        selected_range_custom_end: preset === "Custom" ? customEnd : null,
      }),
    });
    if (!response.ok) throw new Error(await response.text());
    const selectedRange = (await response.json()) as FundManagerSelectedRange;
    invalidateCachedJson(`${apiBaseUrl}/profiles/`);
    invalidateCachedJson(selectedRangeUrl);
    window.dispatchEvent(new CustomEvent(TRACKER_SETTINGS_UPDATED_EVENT, {
      detail: { selectedRange },
    }));
    return selectedRange;
  } catch (error) {
    window.dispatchEvent(new CustomEvent(TRACKER_SETTINGS_UPDATE_FAILED_EVENT));
    throw error;
  }
}

export async function saveTrackerDatePreset<TSettings extends TrackerSettingsClientRecord>(
  profileId: string,
  currentSettings: TSettings,
  nextPreset: DatePreset
): Promise<TSettings> {
  void profileId;
  const selectedRange = await saveFundManagerSelectedRange(
    nextPreset,
    currentSettings.custom_start_date || null,
    currentSettings.custom_end_date || null
  );

  return {
    ...currentSettings,
    active_date_preset: selectedRange.selected_range_preset,
    custom_start_date: selectedRange.selected_range_custom_start ?? "",
    custom_end_date: selectedRange.selected_range_custom_end ?? "",
  } as TSettings;
}
