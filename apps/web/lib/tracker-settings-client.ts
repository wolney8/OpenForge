import { apiBaseUrl } from "@/lib/api";
import { invalidateCachedJson } from "@/lib/client-json-cache";
import type { DatePreset } from "@/lib/tracker-summary";

export const TRACKER_SETTINGS_UPDATED_EVENT = "plum-duff-tracker-settings-updated";

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

export async function saveTrackerDatePreset<TSettings extends TrackerSettingsClientRecord>(
  profileId: string,
  currentSettings: TSettings,
  nextPreset: DatePreset
): Promise<TSettings> {
  const settingsUrl = `${apiBaseUrl}/profiles/${profileId}/tracker-settings`;
  const response = await fetch(settingsUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      active_date_preset: nextPreset,
      custom_start_date: currentSettings.custom_start_date,
      custom_end_date: currentSettings.custom_end_date,
      range_back_days: currentSettings.range_back_days,
      range_forward_days: currentSettings.range_forward_days,
      mug_bet_frequency_days: currentSettings.mug_bet_frequency_days,
      free_bet_expiry_alert_window_days: currentSettings.free_bet_expiry_alert_window_days,
      use_global_date_range_toggle: currentSettings.use_global_date_range_toggle,
      this_month_mode: currentSettings.this_month_mode,
      default_free_bet_underlay_factor: currentSettings.default_free_bet_underlay_factor,
      default_free_bet_overlay_factor: currentSettings.default_free_bet_overlay_factor,
      default_bonus_retention_percent: currentSettings.default_bonus_retention_percent,
      default_exchange_name: currentSettings.default_exchange_name ?? "",
      dashboard_view_mode: currentSettings.dashboard_view_mode ?? "High-Density",
      weekly_profit_target: currentSettings.weekly_profit_target ?? "",
      monthly_profit_target: currentSettings.monthly_profit_target ?? "",
      annual_profit_target: currentSettings.annual_profit_target ?? "",
      weekly_extra_place_loss_budget:
        currentSettings.weekly_extra_place_loss_budget ?? "15",
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  invalidateCachedJson(settingsUrl);
  window.dispatchEvent(
    new CustomEvent(TRACKER_SETTINGS_UPDATED_EVENT, {
      detail: { profileId },
    })
  );

  return (await response.json()) as TSettings;
}
