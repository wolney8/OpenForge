"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiBaseUrl } from "@/lib/api";
import { normalizeBonusRetentionPercentForUi } from "@/lib/tracker-settings";
import {
  formatDisplayDate,
  getDatePresetOptions,
  resolveDateRange,
  type DatePreset,
} from "@/lib/tracker-summary";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";

type TrackerSettingsRecord = {
  profile_id: string;
  active_date_preset: DatePreset;
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
  default_exchange_name: string;
  created_at: string;
  updated_at: string;
};

type Props = {
  profileId: string;
};

export function TrackerDateSettings({ profileId }: Props) {
  const [settings, setSettings] = useState<TrackerSettingsRecord | null>(null);
  const [pristineSettings, setPristineSettings] = useState<TrackerSettingsRecord | null>(null);
  const [statusMessage, setStatusMessage] = useState("Loading tracker date settings...");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [exchangeOptions, setExchangeOptions] = useState<string[]>([]);
  const isDirty = useMemo(() => {
    if (!settings || !pristineSettings) {
      return false;
    }
    return (
      JSON.stringify({
        active_date_preset: settings.active_date_preset,
        custom_start_date: settings.custom_start_date,
        custom_end_date: settings.custom_end_date,
        range_back_days: settings.range_back_days,
        range_forward_days: settings.range_forward_days,
        mug_bet_frequency_days: settings.mug_bet_frequency_days,
        free_bet_expiry_alert_window_days: settings.free_bet_expiry_alert_window_days,
        use_global_date_range_toggle: settings.use_global_date_range_toggle,
        this_month_mode: settings.this_month_mode,
        default_free_bet_underlay_factor: settings.default_free_bet_underlay_factor,
        default_free_bet_overlay_factor: settings.default_free_bet_overlay_factor,
        default_bonus_retention_percent: settings.default_bonus_retention_percent,
        default_exchange_name: settings.default_exchange_name,
      }) !==
      JSON.stringify({
        active_date_preset: pristineSettings.active_date_preset,
        custom_start_date: pristineSettings.custom_start_date,
        custom_end_date: pristineSettings.custom_end_date,
        range_back_days: pristineSettings.range_back_days,
        range_forward_days: pristineSettings.range_forward_days,
        mug_bet_frequency_days: pristineSettings.mug_bet_frequency_days,
        free_bet_expiry_alert_window_days: pristineSettings.free_bet_expiry_alert_window_days,
        use_global_date_range_toggle: pristineSettings.use_global_date_range_toggle,
        this_month_mode: pristineSettings.this_month_mode,
        default_free_bet_underlay_factor: pristineSettings.default_free_bet_underlay_factor,
        default_free_bet_overlay_factor: pristineSettings.default_free_bet_overlay_factor,
        default_bonus_retention_percent: pristineSettings.default_bonus_retention_percent,
        default_exchange_name: pristineSettings.default_exchange_name,
      })
    );
  }, [pristineSettings, settings]);
  useUnsavedChangesGuard(isDirty);
  const resolvedRange = useMemo(() => {
    if (!settings) {
      return resolveDateRange({ preset: "Week (Mon-Sun)" });
    }

    return resolveDateRange({
      preset: settings.active_date_preset,
      customStart: settings.custom_start_date,
      customEnd: settings.custom_end_date,
      rangeBackDays: settings.range_back_days,
      rangeForwardDays: settings.range_forward_days,
    });
  }, [settings]);

  const loadSettings = useCallback(async () => {
    const [response, accountsResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/profiles/${profileId}/tracker-settings`, { cache: "no-store" }),
      fetch(`${apiBaseUrl}/profiles/${profileId}/accounts`, { cache: "no-store" }),
    ]);
    if (!response.ok || !accountsResponse.ok) {
      throw new Error("Unable to load tracker date settings.");
    }

    const data = normalizeTrackerSettingsRecord((await response.json()) as TrackerSettingsRecord);
    const accounts = (await accountsResponse.json()) as {
      account: string;
      type: string;
      status: string;
    }[];
    setExchangeOptions(
      accounts
        .filter((account) => account.type === "Exchange" && account.status === "Active")
        .map((account) => account.account)
        .sort((left, right) => left.localeCompare(right))
    );
    setSettings(data);
    setPristineSettings(data);
    setStatusMessage("Loaded profile-scoped dashboard/profit/report date controls.");
  }, [profileId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSettings().catch((error: Error) => {
        setErrorMessage(error.message);
        setStatusMessage("Tracker date settings could not be loaded.");
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadSettings]);

  function applyPresetDefaults(
    current: TrackerSettingsRecord,
    nextPreset: DatePreset
  ): TrackerSettingsRecord {
    if (nextPreset === "Custom") {
      return {
        ...current,
        active_date_preset: nextPreset,
        custom_start_date: current.custom_start_date || new Date().toISOString().slice(0, 10),
        custom_end_date: current.custom_end_date || new Date().toISOString().slice(0, 10),
      };
    }

    return {
      ...current,
      active_date_preset: nextPreset,
    };
  }

  async function persistSettings(
    nextSettings: TrackerSettingsRecord,
    options?: { autosaveLabel?: string }
  ) {
    if (!nextSettings) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/tracker-settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        active_date_preset: nextSettings.active_date_preset,
        custom_start_date: nextSettings.custom_start_date,
        custom_end_date: nextSettings.custom_end_date,
        range_back_days: nextSettings.range_back_days,
        range_forward_days: nextSettings.range_forward_days,
        mug_bet_frequency_days: nextSettings.mug_bet_frequency_days,
        free_bet_expiry_alert_window_days: nextSettings.free_bet_expiry_alert_window_days,
        use_global_date_range_toggle: nextSettings.use_global_date_range_toggle,
        this_month_mode: nextSettings.this_month_mode,
        default_free_bet_underlay_factor: nextSettings.default_free_bet_underlay_factor,
        default_free_bet_overlay_factor: nextSettings.default_free_bet_overlay_factor,
        default_bonus_retention_percent: nextSettings.default_bonus_retention_percent,
        default_exchange_name: nextSettings.default_exchange_name,
      }),
    });

    if (!response.ok) {
      setErrorMessage(await response.text());
      setIsSaving(false);
      return;
    }

    const saved = normalizeTrackerSettingsRecord((await response.json()) as TrackerSettingsRecord);
    setSettings(saved);
    setPristineSettings(saved);
    setStatusMessage(
      options?.autosaveLabel
        ? `${options.autosaveLabel} autosaved for this profile tracker.`
        : "Saved profile-scoped tracker date settings."
    );
    setIsSaving(false);
  }

  async function saveSettings() {
    if (!settings) {
      return;
    }

    await persistSettings(settings);
  }

  async function applyDropdownChange(
    updater: (current: TrackerSettingsRecord) => TrackerSettingsRecord,
    autosaveLabel: string
  ) {
    if (!settings) {
      return;
    }

    const nextSettings = updater(settings);
    setSettings(nextSettings);
    await persistSettings(nextSettings, { autosaveLabel });
  }

  async function applyFieldChange(
    updater: (current: TrackerSettingsRecord) => TrackerSettingsRecord,
    autosaveLabel: string
  ) {
    if (!settings) {
      return;
    }

    const nextSettings = updater(settings);
    setSettings(nextSettings);
    if (nextSettings.active_date_preset === "Custom") {
      await persistSettings(nextSettings, { autosaveLabel });
    }
  }

  return (
    <section className="content-subpanel stack" aria-label="Tracker date settings">
      <div className="stack">
        <span className="eyebrow">Tracker date settings</span>
        <p className="lede">
          Workbook parity: dashboard, profit tracker, and reports should read one
          profile-scoped date-range setting rather than hosting separate controls.
        </p>
      </div>
      {settings ? (
        <section className="stat-strip" aria-label="Tracker date setting summary">
          <article className="stat-card">
            <span className="eyebrow">Active preset</span>
            <strong>{settings.active_date_preset}</strong>
            <p className="lede">
              Resolved: {formatDisplayDate(resolvedRange.start.toISOString())} to{" "}
              {formatDisplayDate(resolvedRange.end.toISOString())}
            </p>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Range offsets</span>
            <strong>
              Back {settings.range_back_days} / Forward {settings.range_forward_days}
            </strong>
            <p className="lede">These offsets expand the selected workbook summary window.</p>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Mug cadence</span>
            <strong>{settings.mug_bet_frequency_days} days</strong>
            <p className="lede">
              Profit Tracker account-health cues use this profile-scoped cadence.
            </p>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Expiry alert + global toggle</span>
            <strong>{settings.free_bet_expiry_alert_window_days} days</strong>
            <p className="lede">
              Global range: {settings.use_global_date_range_toggle ? "Enabled" : "Disabled"}
            </p>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Free-bet defaults</span>
            <strong>
              Underlay {settings.default_free_bet_underlay_factor} / Overlay {settings.default_free_bet_overlay_factor}
            </strong>
            <p className="lede">Bonus retention {settings.default_bonus_retention_percent}%</p>
          </article>
        </section>
      ) : null}
      <div className="table-status" aria-live="polite">
        {statusMessage}
      </div>
      {errorMessage ? (
        <p className="error-text" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {settings ? (
        <div className="form-grid">
          <label className="field-control">
            <span>Active date preset</span>
            <select
              value={settings.active_date_preset}
              onChange={(event) =>
                void applyDropdownChange(
                  (current) =>
                    applyPresetDefaults(current, event.target.value as DatePreset),
                  "Date preset change"
                )
              }
            >
              {getDatePresetOptions().map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="field-control">
            <span>Custom start date</span>
            <input
              type="date"
              value={settings.custom_start_date}
              disabled={settings.active_date_preset !== "Custom"}
              onChange={(event) =>
                void applyFieldChange(
                  (current) => ({ ...current, custom_start_date: event.target.value }),
                  "Custom start date change"
                )
              }
            />
          </label>
          <label className="field-control">
            <span>Custom end date</span>
            <input
              type="date"
              value={settings.custom_end_date}
              disabled={settings.active_date_preset !== "Custom"}
              onChange={(event) =>
                void applyFieldChange(
                  (current) => ({ ...current, custom_end_date: event.target.value }),
                  "Custom end date change"
                )
              }
            />
          </label>
          <label className="field-control">
            <span>Range back days</span>
            <input
              type="number"
              min="0"
              value={settings.range_back_days}
              onChange={(event) =>
                void applyFieldChange(
                  (current) => ({
                    ...current,
                    range_back_days: Number(event.target.value || "0"),
                  }),
                  "Range back days change"
                )
              }
            />
          </label>
          <label className="field-control">
            <span>Range forward days</span>
            <input
              type="number"
              min="0"
              value={settings.range_forward_days}
              onChange={(event) =>
                void applyFieldChange(
                  (current) => ({
                    ...current,
                    range_forward_days: Number(event.target.value || "0"),
                  }),
                  "Range forward days change"
                )
              }
            />
          </label>
          <label className="field-control">
            <span>Mug-bet cadence days</span>
            <input
              type="number"
              min="1"
              max="365"
              value={settings.mug_bet_frequency_days}
              onChange={(event) =>
                void applyFieldChange(
                  (current) => ({
                    ...current,
                    mug_bet_frequency_days: Number(event.target.value || "14"),
                  }),
                  "Mug-bet cadence change"
                )
              }
            />
          </label>
          <label className="field-control">
            <span>Free-bet expiry alert window days</span>
            <input
              type="number"
              min="0"
              max="365"
              value={settings.free_bet_expiry_alert_window_days}
              onChange={(event) =>
                void applyFieldChange(
                  (current) => ({
                    ...current,
                    free_bet_expiry_alert_window_days: Number(event.target.value || "0"),
                  }),
                  "Expiry alert window change"
                )
              }
            />
          </label>
          <label className="field-control" style={{ justifyContent: "center" }}>
            <span>Use global date-range toggle</span>
            <input
              type="checkbox"
              checked={settings.use_global_date_range_toggle}
              onChange={(event) =>
                void applyDropdownChange(
                  (current) => ({
                    ...current,
                    use_global_date_range_toggle: event.target.checked,
                  }),
                  "Global range toggle change"
                )
              }
            />
          </label>
          <label className="field-control">
            <span>This-month mode</span>
            <input
              type="text"
              value={settings.this_month_mode}
              onChange={(event) =>
                void applyFieldChange(
                  (current) => ({
                    ...current,
                    this_month_mode: event.target.value,
                  }),
                  "This-month mode change"
                )
              }
            />
          </label>
          <label className="field-control">
            <span>Default exchange</span>
            <select
              onChange={(event) =>
                void applyDropdownChange(
                  (current) => ({ ...current, default_exchange_name: event.target.value }),
                  "Default exchange change"
                )
              }
              value={settings.default_exchange_name}
            >
              <option value="">Most used active exchange</option>
              {exchangeOptions.map((exchange) => (
                <option key={exchange} value={exchange}>{exchange}</option>
              ))}
            </select>
          </label>
          <label className="field-control">
            <span>Default free-bet underlay factor</span>
            <input
              type="text"
              inputMode="decimal"
              value={settings.default_free_bet_underlay_factor}
              onChange={(event) =>
                void applyFieldChange(
                  (current) => ({
                    ...current,
                    default_free_bet_underlay_factor: event.target.value,
                  }),
                  "Underlay default change"
                )
              }
            />
          </label>
          <label className="field-control">
            <span>Default free-bet overlay factor</span>
            <input
              type="text"
              inputMode="decimal"
              value={settings.default_free_bet_overlay_factor}
              onChange={(event) =>
                void applyFieldChange(
                  (current) => ({
                    ...current,
                    default_free_bet_overlay_factor: event.target.value,
                  }),
                  "Overlay default change"
                )
              }
            />
          </label>
          <label className="field-control">
            <span>Default bonus retention percent</span>
            <input
              type="text"
              inputMode="decimal"
              value={settings.default_bonus_retention_percent}
              onChange={(event) =>
                void applyFieldChange(
                  (current) => ({
                    ...current,
                    default_bonus_retention_percent: event.target.value,
                  }),
                  "Bonus retention default change"
                )
              }
            />
          </label>
          <div className="content-subpanel stack field-span-2">
            <span className="eyebrow">Workbook control note</span>
            <p className="lede">
              Dashboard, Profit Tracker, and Reports should all inherit this setting. Later,
              the same control may surface in top navigation, but Settings remains the source
              authority.
            </p>
            <p className="lede">
              Custom dates autosave immediately when the active preset is <strong>Custom</strong>.
            </p>
          </div>
          <div className="tracker-nav field-span-2">
            <button className="button-link" disabled={isSaving} onClick={() => void saveSettings()} type="button">
              Save tracker date settings
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function normalizeTrackerSettingsRecord(record: TrackerSettingsRecord): TrackerSettingsRecord {
  return {
    ...record,
    default_exchange_name: record.default_exchange_name ?? "",
    default_bonus_retention_percent: normalizeBonusRetentionPercentForUi(
      record.default_bonus_retention_percent
    ),
  };
}
