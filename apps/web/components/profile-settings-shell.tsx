"use client";

import Link from "next/link";
import { KeyboardEvent, useEffect, useState } from "react";

import { ExchangeCommissionSettings } from "@/components/exchange-commission-settings";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { LookupValueSettings } from "@/components/lookup-value-settings";
import { ProfileGeneralSettings } from "@/components/profile-demographics-settings";
import { ProfileSecuritySettings, ProfileSubscriberSettings } from "@/components/profile-future-access-settings";
import { ProfileSpreadsheetTransfer } from "@/components/profile-spreadsheet-transfer";
import { ProfileQuickAddLoadoutSettings } from "@/components/profile-quick-add-loadout-settings";
import { TrackerDateSettings } from "@/components/tracker-date-settings";
import { apiBaseUrl } from "@/lib/api";

const settingsSections = [
  { id: "general", label: "General" },
  { id: "defaults", label: "Defaults" },
  { id: "preferences", label: "Preferences" },
  { id: "import-export", label: "Import/Export" },
  { id: "security", label: "Security" },
  { id: "subscriber", label: "Subscriber" },
] as const;

type SettingsSection = (typeof settingsSections)[number]["id"];

function isSettingsSection(value: string): value is SettingsSection {
  return settingsSections.some((section) => section.id === value);
}

export function ProfileSettingsShell({ profileId }: { profileId: string }) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");
  const [profileName, setProfileName] = useState(profileId);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [canManageProfile, setCanManageProfile] = useState(false);

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
      })
      .finally(() => {
        if (isActive) setIsProfileLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [profileId]);

  useEffect(() => {
    let isActive = true;
    void fetch("/api/auth/session", {
      cache: "no-store",
      credentials: "include",
    })
      .then((response) => response.ok ? response.json() as Promise<{ role?: string }> : null)
      .then((session) => {
        if (isActive) setCanManageProfile(session?.role === "fund_manager");
      })
      .catch(() => {
        if (isActive) setCanManageProfile(false);
      });
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const syncFromHash = () => {
      const rawHashSection = window.location.hash.slice(1);
      if (rawHashSection === "accounts") {
        window.location.replace(`/profiles/${profileId}/tracker/accounts`);
        return;
      }
      const legacyHashMap: Record<string, SettingsSection> = {
        demographics: "general",
        "spreadsheet-transfer": "import-export",
        "offer-lists": "preferences",
        commission: "defaults",
        "quick-add": "preferences",
        "quick-actions": "preferences",
      };
      const hashSection = legacyHashMap[rawHashSection] ?? rawHashSection;
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
      <section
        aria-busy={isProfileLoading}
        className="content-panel stack sportsbook-page-shell"
      >
        <div className="sportsbook-page-header">
          <h1 className="sportsbook-page-title">Settings for {profileName} Profile</h1>
          {canManageProfile ? (
            <Link
              className="modal-primary-button button-link icon-text-action"
              data-pd-id="profile-settings.manage-profile"
              href={`/profiles/${profileId}/manage`}
            >
              <span aria-hidden="true" className="material-symbols-outlined">manage_accounts</span>
              <span>Manage Profile</span>
            </Link>
          ) : null}
        </div>
        {isProfileLoading ? (
          <LedgerLoadingIndicator
            dataPdId="profile-settings.loading"
            label="Loading Profile Settings"
          />
        ) : null}
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
          aria-labelledby="profile-settings-tab-general"
          className="analytics-tab-panel"
          hidden={activeSection !== "general"}
          id="profile-settings-panel-general"
          role="tabpanel"
        >
          <ProfileGeneralSettings />
        </section>
        <section
          aria-labelledby="profile-settings-tab-defaults"
          className="analytics-tab-panel"
          hidden={activeSection !== "defaults"}
          id="profile-settings-panel-defaults"
          role="tabpanel"
        >
          <TrackerDateSettings profileId={profileId} />
          <ExchangeCommissionSettings profileId={profileId} />
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
          aria-labelledby="profile-settings-tab-preferences"
          className="analytics-tab-panel"
          hidden={activeSection !== "preferences"}
          id="profile-settings-panel-preferences"
          role="tabpanel"
        >
          <LookupValueSettings profileId={profileId} />
          <ProfileQuickAddLoadoutSettings profileId={profileId} />
        </section>
        <section aria-labelledby="profile-settings-tab-security" className="analytics-tab-panel" hidden={activeSection !== "security"} id="profile-settings-panel-security" role="tabpanel">
          <ProfileSecuritySettings />
        </section>
        <section aria-labelledby="profile-settings-tab-subscriber" className="analytics-tab-panel" hidden={activeSection !== "subscriber"} id="profile-settings-panel-subscriber" role="tabpanel">
          <ProfileSubscriberSettings />
        </section>
      </section>
    </section>
  );
}
