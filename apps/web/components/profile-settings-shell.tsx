"use client";

import { KeyboardEvent, useEffect, useState } from "react";

import { AccountAuthoritySettings } from "@/components/account-authority-settings";
import { ExchangeCommissionSettings } from "@/components/exchange-commission-settings";
import { LookupValueSettings } from "@/components/lookup-value-settings";
import { ProfileSpreadsheetTransfer } from "@/components/profile-spreadsheet-transfer";
import { TrackerDateSettings } from "@/components/tracker-date-settings";

const settingsSections = [
  { id: "defaults", label: "Tracker Defaults" },
  { id: "spreadsheet-transfer", label: "Spreadsheet Transfer" },
  { id: "offer-lists", label: "Offer Lists" },
  { id: "commission", label: "Exchange Commission" },
  { id: "account-authorities", label: "Account Authorities" },
] as const;

type SettingsSection = (typeof settingsSections)[number]["id"];

function isSettingsSection(value: string): value is SettingsSection {
  return settingsSections.some((section) => section.id === value);
}

export function ProfileSettingsShell({ profileId }: { profileId: string }) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("defaults");

  useEffect(() => {
    const syncFromHash = () => {
      const hashSection = window.location.hash.slice(1);
      if (isSettingsSection(hashSection)) setActiveSection(hashSection);
    };
    const timeoutId = window.setTimeout(syncFromHash, 0);
    window.addEventListener("hashchange", syncFromHash);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("hashchange", syncFromHash);
    };
  }, []);

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
          <h1 className="sportsbook-page-title">Settings</h1>
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
          aria-labelledby="profile-settings-tab-defaults"
          className="analytics-tab-panel"
          hidden={activeSection !== "defaults"}
          id="profile-settings-panel-defaults"
          role="tabpanel"
        >
          <TrackerDateSettings profileId={profileId} />
        </section>
        <section
          aria-labelledby="profile-settings-tab-spreadsheet-transfer"
          className="analytics-tab-panel"
          hidden={activeSection !== "spreadsheet-transfer"}
          id="profile-settings-panel-spreadsheet-transfer"
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
          aria-labelledby="profile-settings-tab-account-authorities"
          className="analytics-tab-panel"
          hidden={activeSection !== "account-authorities"}
          id="profile-settings-panel-account-authorities"
          role="tabpanel"
        >
          <AccountAuthoritySettings profileId={profileId} />
        </section>
      </section>
    </section>
  );
}
