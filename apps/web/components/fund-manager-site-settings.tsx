"use client";

import { useEffect, useState } from "react";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { apiBaseUrl } from "@/lib/api";

type PersistenceStatus = {
  database: string;
  connected: boolean;
  environment: string;
  runtime_adapter: string;
  durable_across_redeploy: boolean;
  domains: { domain: string; source: string; storage_kind: string; table: string; available: boolean }[];
};

export function FundManagerSiteSettings() {
  const [status, setStatus] = useState<PersistenceStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch(`${apiBaseUrl}/fund-manager/database/persistence-status`, { cache: "no-store", credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Persistence status is unavailable.");
        return response.json() as Promise<PersistenceStatus>;
      })
      .then((value) => { if (active) setStatus(value); })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "Persistence status is unavailable."); });
    return () => { active = false; };
  }, []);

  return (
    <section className="content-panel stack" data-pd-id="fund-manager-site-settings.section">
      <div>
        <span className="eyebrow">Fund Manager only</span>
        <h2>Site Settings</h2>
      </div>
      {!status && !error ? <LedgerLoadingIndicator label="Loading persistence status" /> : null}
      {error ? <p className="error-text" role="alert">{error}</p> : null}
      {status ? <>
        <section aria-label="Production persistence status" className="stat-strip settings-stat-strip">
          <article className="stat-card"><span className="eyebrow">Database</span><strong>{status.database}</strong><span>{status.connected ? "Connected" : "Unavailable"}</span></article>
          <article className="stat-card"><span className="eyebrow">Environment</span><strong>{status.environment}</strong><span>{status.runtime_adapter}</span></article>
          <article className="stat-card"><span className="eyebrow">Persistence</span><strong>{status.durable_across_redeploy ? "Durable" : "Local only"}</strong><span>Across deployment restarts</span></article>
        </section>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th scope="col">Domain</th><th scope="col">Production source</th><th scope="col">Storage</th><th scope="col">Status</th></tr></thead>
            <tbody>{status.domains.map((domain) => <tr key={domain.domain}><td>{domain.domain}</td><td>{domain.source}</td><td>{domain.storage_kind}</td><td><span className={`table-chip ${domain.available ? "table-chip-success" : "table-chip-danger"}`}>{domain.available ? "Available" : "Missing"}</span></td></tr>)}</tbody>
          </table>
        </div>
      </> : null}
      <div className="settings-card-grid">
        <article className="content-subpanel stack"><h3>Access and identity</h3><p className="field-hint">Fund Manager credentials, Google OAuth, roles and session policy.</p></article>
        <article className="content-subpanel stack"><h3>Profile administration</h3><p className="field-hint">Profile restrictions, deletion safeguards and onboarding rules.</p></article>
        <article className="content-subpanel stack"><h3>Platform integrations</h3><p className="field-hint">Stripe, email delivery, object storage and operational connections.</p></article>
        <article className="content-subpanel stack"><h3>Communications</h3><p className="field-hint">Announcements, mailshots and recipient-safe notification templates.</p></article>
      </div>
    </section>
  );
}
