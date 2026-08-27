"use client";

import { useEffect, useState, type KeyboardEvent } from "react";

import { CommonBetComboSettings } from "@/components/common-bet-combo-settings";
import { DatabaseBackupSettings } from "@/components/database-backup-settings";
import { FundManagerAuthoritySettings } from "@/components/fund-manager-authority-settings";
import { FundManagerNotificationSettings } from "@/components/fund-manager-notification-settings";
import { MasterAccountCatalogueSettings } from "@/components/master-account-catalogue-settings";

const sections = [
  { id: "catalogue", label: "Account Catalogue", component: <MasterAccountCatalogueSettings /> },
  { id: "lists", label: "Lists", component: <FundManagerAuthoritySettings /> },
  { id: "quick-actions", label: "Quick Actions", component: <CommonBetComboSettings /> },
  { id: "notifications", label: "Notifications", component: <FundManagerNotificationSettings /> },
  { id: "database", label: "Database", component: <DatabaseBackupSettings /> },
] as const;

type SectionId = (typeof sections)[number]["id"];

function isSection(value: string): value is SectionId {
  return sections.some((section) => section.id === value);
}

export function FundManagerSettingsShell() {
  const [activeSection, setActiveSection] = useState<SectionId>("catalogue");

  useEffect(() => {
    const syncFromHash = () => {
      const value = window.location.hash.slice(1);
      if (isSection(value)) setActiveSection(value);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  function selectSection(section: SectionId) {
    setActiveSection(section);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${section}`);
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, section: SectionId) {
    const current = sections.findIndex((item) => item.id === section);
    const next = event.key === "ArrowRight" ? (current + 1) % sections.length : event.key === "ArrowLeft" ? (current - 1 + sections.length) % sections.length : event.key === "Home" ? 0 : event.key === "End" ? sections.length - 1 : current;
    if (next === current) return;
    event.preventDefault();
    const nextSection = sections[next].id;
    selectSection(nextSection);
    document.getElementById(`fund-manager-settings-tab-${nextSection}`)?.focus();
  }

  return (
    <main className="page-shell stack" data-pd-id="fund-manager-settings.page">
      <section className="hero-panel stack"><span className="eyebrow">Fund Manager</span><h1>Settings</h1></section>
      <div aria-label="Fund Manager settings sections" className="analytics-tab-list profile-settings-tab-list" data-pd-id="fund-manager-settings.tabs" role="tablist">
        {sections.map((section) => <button aria-controls={`fund-manager-settings-panel-${section.id}`} aria-selected={activeSection === section.id} className={`analytics-tab${activeSection === section.id ? " is-active" : ""}`} id={`fund-manager-settings-tab-${section.id}`} key={section.id} onClick={() => selectSection(section.id)} onKeyDown={(event) => onTabKeyDown(event, section.id)} role="tab" tabIndex={activeSection === section.id ? 0 : -1} type="button">{section.label}</button>)}
      </div>
      {sections.map((section) => <section aria-labelledby={`fund-manager-settings-tab-${section.id}`} className="analytics-tab-panel" hidden={activeSection !== section.id} id={`fund-manager-settings-panel-${section.id}`} key={section.id} role="tabpanel">{section.component}</section>)}
    </main>
  );
}
