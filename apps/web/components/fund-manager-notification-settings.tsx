"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fundManagerNotificationTypes,
  loadFundManagerNotificationPreferences,
  loadPersistedNotificationPreferences,
  persistNotificationPreferences,
  saveFundManagerNotificationPreferences,
  type FundManagerNotificationPreferences,
  type FundManagerNotificationTypeId,
} from "@/lib/notifications";

function copyPreferences(
  preferences: FundManagerNotificationPreferences
): FundManagerNotificationPreferences {
  return { ...preferences };
}

export function FundManagerNotificationSettings() {
  const [preferences, setPreferences] = useState<FundManagerNotificationPreferences>(
    loadFundManagerNotificationPreferences
  );
  const [pristinePreferences, setPristinePreferences] =
    useState<FundManagerNotificationPreferences>(loadFundManagerNotificationPreferences);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Notification preferences loaded.");

  const isDirty = useMemo(
    () => JSON.stringify(preferences) !== JSON.stringify(pristinePreferences),
    [preferences, pristinePreferences]
  );

  useEffect(() => {
    let active = true;
    void loadPersistedNotificationPreferences().then((persisted) => {
      if (!active || !persisted) return;
      setPreferences(copyPreferences(persisted));
      setPristinePreferences(copyPreferences(persisted));
      saveFundManagerNotificationPreferences(persisted);
      setStatusMessage("Notification preferences loaded.");
    });
    return () => {
      active = false;
    };
  }, []);

  function updatePreference(notificationType: FundManagerNotificationTypeId, enabled: boolean) {
    setPreferences((current) => ({ ...current, [notificationType]: enabled }));
    setStatusMessage("Unsaved notification preference changes.");
  }

  async function savePreferences() {
    setIsSaving(true);
    const saved = await persistNotificationPreferences(preferences);
    if (saved) {
      saveFundManagerNotificationPreferences(preferences);
      setPristinePreferences(copyPreferences(preferences));
      setStatusMessage("Notification preferences saved.");
    } else {
      setStatusMessage("Unable to save notification preferences.");
    }
    setIsSaving(false);
  }

  return (
    <section
      aria-labelledby="fund-manager-notifications-heading"
      className="hero-panel stack fund-manager-notification-settings"
      data-pd-id="fund-manager-notifications.settings"
    >
      <div className="settings-section-header">
        <div>
          <span className="eyebrow">Fund Manager Alerts</span>
          <h2 id="fund-manager-notifications-heading">Notifications</h2>
        </div>
        <span
          className={`table-chip ${isDirty ? "table-chip-warning" : "table-chip-settled"}`}
          role="status"
        >
          {isSaving ? "Saving" : isDirty ? "Unsaved Changes" : "Saved"}
        </span>
      </div>

      <div className="notification-preference-grid">
        {fundManagerNotificationTypes.map((notificationType) => {
          const enabled = preferences[notificationType.id];
          return (
            <label
              className={`notification-preference-card${enabled ? " is-enabled" : ""}`}
              data-pd-id={`fund-manager-notifications.preference.${notificationType.id}`}
              key={notificationType.id}
            >
              <input
                aria-describedby={`fund-manager-notifications-${notificationType.id}-description`}
                checked={enabled}
                onChange={(event) =>
                  updatePreference(notificationType.id, event.target.checked)
                }
                type="checkbox"
              />
              <span className="notification-preference-card-main">
                <span className="notification-preference-card-title">
                  {notificationType.label}
                </span>
                <span
                  className="notification-preference-card-description"
                  id={`fund-manager-notifications-${notificationType.id}-description`}
                >
                  {notificationType.description}
                </span>
                <span className="notification-preference-card-description">
                  {notificationType.timing} Fund Manager only.
                </span>
              </span>
              <span
                aria-hidden="true"
                className={`material-switch${enabled ? " is-selected" : ""}`}
              >
                <span className="material-switch-track" />
                <span className="material-switch-thumb" />
              </span>
            </label>
          );
        })}
      </div>

      <footer className="settings-action-row">
        <p className="field-support-text" role="status">
          {statusMessage}
        </p>
        <button
          className="modal-primary-button"
          data-pd-id="fund-manager-notifications.save"
          disabled={!isDirty || isSaving}
          onClick={() => void savePreferences()}
          type="button"
        >
          {isSaving ? <span aria-hidden="true" className="button-spinner" /> : null}
          <span>Save</span>
        </button>
      </footer>
    </section>
  );
}
