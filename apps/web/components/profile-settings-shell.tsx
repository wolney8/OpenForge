"use client";

import { AccountAuthoritySettings } from "@/components/account-authority-settings";
import { BookmakerCatalogueSettings } from "@/components/bookmaker-catalogue-settings";
import { ExchangeCommissionSettings } from "@/components/exchange-commission-settings";
import { LookupValueSettings } from "@/components/lookup-value-settings";
import { TrackerDateSettings } from "@/components/tracker-date-settings";

export function ProfileSettingsShell({ profileId }: { profileId: string }) {
  return (
    <section className="stack">
      <section className="content-panel stack sportsbook-page-shell">
        <div className="sportsbook-page-header">
          <h1 className="sportsbook-page-title">Settings</h1>
        </div>
        <section className="stat-strip" aria-label="Settings authority summary">
          <article className="stat-card">
            <span className="eyebrow">Date authority</span>
            <strong>One shared range setting</strong>
            <p className="lede">
              Dashboard, Profit Tracker, and Reports all read the same profile-scoped date controls.
            </p>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Named ranges</span>
            <strong>Settings-owned lists</strong>
            <p className="lede">
              Bookmakers, exchanges, sportsbook offer names, casino offer names, groups, and platforms should be sourced here rather than typed ad hoc.
            </p>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Commission rule</span>
            <strong>Per exchange, per profile</strong>
            <p className="lede">
              Sportsbook and free-bet ledgers should look up exchange commission from Settings.
            </p>
          </article>
        </section>
        <TrackerDateSettings profileId={profileId} />
        <BookmakerCatalogueSettings profileId={profileId} />
        <LookupValueSettings profileId={profileId} />
        <ExchangeCommissionSettings profileId={profileId} />
        <AccountAuthoritySettings profileId={profileId} />
      </section>
    </section>
  );
}
