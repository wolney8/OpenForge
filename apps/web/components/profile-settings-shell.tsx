"use client";

import { KeyboardEvent, useEffect, useState } from "react";

import { ExchangeCommissionSettings } from "@/components/exchange-commission-settings";
import { LookupValueSettings } from "@/components/lookup-value-settings";
import { ProfileDemographicsSettings } from "@/components/profile-demographics-settings";
import { ProfileSpreadsheetTransfer } from "@/components/profile-spreadsheet-transfer";
import { ProfileQuickAddLoadoutSettings } from "@/components/profile-quick-add-loadout-settings";
import { TrackerDateSettings } from "@/components/tracker-date-settings";
import { apiBaseUrl } from "@/lib/api";

const settingsSections = [
  { id: "demographics", label: "Demographics" },
  { id: "defaults", label: "Defaults" },
  { id: "import-export", label: "Import/Export" },
  { id: "offer-lists", label: "Lists" },
  { id: "commission", label: "Commission" },
  { id: "quick-actions", label: "Quick Actions" },
] as const;

type SettingsSection = (typeof settingsSections)[number]["id"];

function isSettingsSection(value: string): value is SettingsSection {
  return settingsSections.some((section) => section.id === value);
}

export function ProfileSettingsShell({ profileId }: { profileId: string }) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("demographics");
  const [profileName, setProfileName] = useState(profileId);

  useEffect(() => {
    let isActive = true;
    void fetch(`${apiBaseUrl}/profiles/${profileId}`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load profile.");
        return response.json() as Promise<{ display_name?: string }>;
      })
      .then((profile) => {
        if (isActive) setProfileName(profile.display_name?.trim() || profileId);
      })
      .catch(() => {
        if (isActive) setProfileName(profileId);
      });

    return () => {
      isActive = false;
    };
  }, [profileId]);

  useEffect(() => {
    const syncFromHash = () => {
      const rawHashSection = window.location.hash.slice(1);
      if (rawHashSection === "accounts") {
        window.location.replace(`/profiles/${profileId}/tracker/accounts`);
        return;
      }
      const hashSection = rawHashSection === "spreadsheet-transfer"
        ? "import-export"
        : rawHashSection === "quick-add"
          ? "quick-actions"
          : rawHashSection;
      if (isSettingsSection(hashSection)) setActiveSection(hashSection);
    };
    const timeoutId = window.setTimeout(syncFromHash, 0);
    window.addEventListener("hashchange", syncFromHash);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("hashchange", syncFromHash);
    };
  }, [profileId]);

  function selectSection(section: SettingsSection) {
    setActiveSection(section);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${section}`);
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, section: SettingsSection) {
    const currentIndex = settingsSections.findIndex((item) => item.id === section);
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % settingsSections.length;
    if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + settingsSections.length) % settingsSections.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = settingsSections.length - 1;
    if (nextIndex === currentIndex) return;
    event.preventDefault();
    const nextSection = settingsSections[nextIndex].id;
    selectSection(nextSection);
    document.getElementById(`profile-settings-tab-${nextSection}`)?.focus();
  }

  return (
    <section className="stack profile-settings-shell">
      <section className="content-panel stack sportsbook-page-shell">
        <div className="sportsbook-page-header">
          <h1 className="sportsbook-page-title">Settings for {profileName} Profile</h1>
        </div>
        <div
          aria-label="Profile settings sections"
          className="analytics-tab-list profile-settings-tab-list"
          data-pd-id="profile-settings.navigation.tabs"
          role="tablist"
        >
          {settingsSections.map((section) => (
            <button
              aria-controls={`profile-settings-panel-${section.id}`}
              aria-selected={activeSection === section.id}
              className={`analytics-tab${activeSection === section.id ? " is-active" : ""}`}
              data-pd-id={`profile-settings.navigation.${section.id}`}
              id={`profile-settings-tab-${section.id}`}
              key={section.id}
              onClick={() => selectSection(section.id)}
              onKeyDown={(event) => handleTabKeyDown(event, section.id)}
              role="tab"
              tabIndex={activeSection === section.id ? 0 : -1}
              type="button"
            >
              {section.label}
            </button>
          ))}
        </div>

        <section
          aria-labelledby="profile-settings-tab-demographics"
          className="analytics-tab-panel"
          hidden={activeSection !== "demographics"}
          id="profile-settings-panel-demographics"
          role="tabpanel"
        >
          <ProfileDemographicsSettings />
        </section>
        <section
          aria-labelledby="profile-settings-tab-defaults"
          className="analytics-tab-panel"
          hidden={activeSection !== "defaults"}
          id="profile-settings-panel-defaults"
          role="tabpanel"
        >
          <TrackerDateSettings profileId={profileId} />
        </section>
        <section
          aria-labelledby="profile-settings-tab-import-export"
          className="analytics-tab-panel"
          hidden={activeSection !== "import-export"}
          id="profile-settings-panel-import-export"
          role="tabpanel"
        >
          <ProfileSpreadsheetTransfer profileId={profileId} />
        </section>
        <section
          aria-labelledby="profile-settings-tab-offer-lists"
          className="analytics-tab-panel"
          hidden={activeSection !== "offer-lists"}
          id="profile-settings-panel-offer-lists"
          role="tabpanel"
        >
          <LookupValueSettings profileId={profileId} />
        </section>
        <section
          aria-labelledby="profile-settings-tab-commission"
          className="analytics-tab-panel"
          hidden={activeSection !== "commission"}
          id="profile-settings-panel-commission"
          role="tabpanel"
        >
          <ExchangeCommissionSettings profileId={profileId} />
        </section>
        <section
          aria-labelledby="profile-settings-tab-quick-actions"
          className="analytics-tab-panel"
          hidden={activeSection !== "quick-actions"}
          id="profile-settings-panel-quick-actions"
          role="tabpanel"
        >
          <ProfileQuickAddLoadoutSettings profileId={profileId} />
        </section>
      </section>
    </section>
  );
}
