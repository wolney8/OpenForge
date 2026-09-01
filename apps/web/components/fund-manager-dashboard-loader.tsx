"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CrossProfileAnalytics,
  type AnalyticsTab,
  type ProfileDescriptor,
} from "@/components/cross-profile-analytics";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { fetchJsonAndCache } from "@/lib/client-json-cache";
import { beginShellLoading, endShellLoading } from "@/lib/shell-loading";

type ApiProfile = {
  profile_id: string;
  display_name: string;
  profile_code: string;
  status: string;
  tracking_start_date: string;
  management_fee_percent: string;
  investment_fee_percent: string;
};

function mapProfile(profile: ApiProfile): ProfileDescriptor {
  return {
    profileId: profile.profile_id,
    displayName: profile.display_name,
    profileCode: profile.profile_code,
    status: profile.status,
    trackingStartDate: profile.tracking_start_date,
    managementFeePercent: profile.management_fee_percent,
    investmentFeePercent: profile.investment_fee_percent,
  };
}

export function FundManagerDashboardLoader({
  initialTab,
  initialDetailProfileId,
  initialFeeReviewMonth,
  initialOpportunityId,
  pageKind = "dashboard",
}: {
  initialTab: AnalyticsTab;
  initialDetailProfileId?: string;
  initialFeeReviewMonth?: string;
  initialOpportunityId?: string;
  pageKind?: "dashboard" | "profiles" | "reports";
}) {
  const [profiles, setProfiles] = useState<ProfileDescriptor[] | null>(null);
  const [error, setError] = useState("");
  const pageTitle = pageKind === "profiles" ? "Profiles" : pageKind === "reports" ? "Reports" : "Dashboard";

  useEffect(() => {
    let active = true;
    beginShellLoading();
    void fetchJsonAndCache<ApiProfile[]>("/api/profiles").then((records) => {
      if (active) setProfiles(records.map(mapProfile));
    }).catch((reason: unknown) => {
      if (active) {
        setError(reason instanceof Error ? reason.message : "Dashboard data is temporarily unavailable.");
      }
    }).finally(() => {
      if (active) endShellLoading();
    });
    return () => {
      active = false;
      endShellLoading();
    };
  }, []);

  if (error) {
    return (
      <main className="page-shell stack">
        <section className="content-panel stack" role="alert">
          <h1>Unable to load {pageTitle}</h1>
          <p>{error}</p>
          <button className="modal-primary-button" onClick={() => window.location.reload()} type="button">
            Try again
          </button>
        </section>
      </main>
    );
  }

  if (profiles === null) {
    return (
      <main aria-busy="true" aria-label={`Loading ${pageTitle}`} className="page-shell stack">
        <section className="hero-panel split-hero">
          <div className="stack">
            <h1>{pageTitle}</h1>
          </div>
          <aside className="shell-note stack profile-dashboard-hero-summary" aria-label="Profile dashboard summary">
            <span className="eyebrow">Active profiles</span>
            <strong aria-hidden="true">—</strong>
          </aside>
        </section>
        <section className="content-panel stack tracker-summary-shell sportsbook-page-shell">
          <LedgerLoadingIndicator
            dataPdId="fund-manager-dashboard.loading"
            label={`Loading ${pageTitle}`}
          />
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell stack">
      <section className="hero-panel split-hero">
        <div className="stack">
          <h1>{pageTitle}</h1>
        </div>
        <aside className="shell-note stack profile-dashboard-hero-summary" aria-label="Profile dashboard summary">
          <span className="eyebrow">Active profiles</span>
          <strong>{profiles.filter((profile) => profile.status.toLowerCase() === "active").length} / {profiles.length}</strong>
        </aside>
      </section>
      {profiles.length === 0 ? (
        <section className="content-panel stack">
          <h2>{pageKind === "profiles" ? "No Profiles yet" : "Create the first Profile"}</h2>
          <p>Set up a Profile before adding accounts or tracker records.</p>
          <Link className="modal-primary-button button-link" href="/profiles/new">Create Profile</Link>
        </section>
      ) : (
        <CrossProfileAnalytics
          initialTab={initialTab}
          initialDetailProfileId={initialDetailProfileId}
          initialFeeReviewMonth={initialFeeReviewMonth}
          initialOpportunityId={initialOpportunityId}
          key={initialTab}
          profiles={profiles}
        />
      )}
    </main>
  );
}
