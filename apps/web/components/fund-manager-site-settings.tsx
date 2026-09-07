"use client";

import { useEffect, useState } from "react";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { useFinancialMotionPreference } from "@/components/financial-motion-preference";
import { PersistedToggle } from "@/components/persisted-toggle";
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
  const [motionMessage, setMotionMessage] = useState<{ error: boolean; text: string } | null>(null);
  const financialMotion = useFinancialMotionPreference();

  async function saveMotion(update: Parameters<typeof financialMotion.save>[0]) {
    setMotionMessage(null);
    const saved = await financialMotion.save(update);
    setMotionMessage(saved
      ? { error: false, text: "Financial motion settings saved." }
      : { error: true, text: "Financial motion settings could not be saved." });
    return saved;
  }

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
      <section aria-labelledby="financial-motion-heading" className="content-subpanel stack financial-motion-settings" data-pd-id="fund-manager-site-settings.financial-motion-section">
        <div className="section-heading-row">
          <div>
            <span className="eyebrow">Display</span>
            <h3 id="financial-motion-heading">Financial motion</h3>
          </div>
          <div className="tracker-nav">
            <PersistedToggle
              checked={financialMotion.enabled}
              dataPdId="fund-manager-site-settings.financial-motion"
              disabled={!financialMotion.ready || financialMotion.saving}
              label="Financial motion"
              onChange={(enabled) => saveMotion({ enabled })}
            />
          </div>
        </div>
        <p className="field-hint">Animate read-only financial values on load, change, hover and click.</p>
        <fieldset className="section-fieldset" disabled={!financialMotion.ready || financialMotion.saving}>
          <legend className="visually-hidden">Financial motion timing</legend>
          <div className="form-grid financial-motion-settings-grid">
            <label className="field-control">
              <span>Replay pause</span>
              <select
                aria-label="Financial motion replay pause"
                data-pd-id="fund-manager-site-settings.financial-motion-replay-delay"
                onChange={(event) => void saveMotion({ replayDelayMs: Number(event.target.value) })}
                value={financialMotion.replayDelayMs}
              >
                {[500, 1000, 1500, 2000, 2500, 3000].map((milliseconds) => (
                  <option key={milliseconds} value={milliseconds}>{milliseconds / 1000} seconds</option>
                ))}
              </select>
              <small>Minimum time before hover or click can replay a value.</small>
            </label>
            <label className="field-control">
              <span>Roll duration</span>
              <select
                aria-label="Financial motion roll duration"
                data-pd-id="fund-manager-site-settings.financial-motion-duration"
                onChange={(event) => void saveMotion({ durationMs: Number(event.target.value) })}
                value={financialMotion.durationMs}
              >
                <option value={360}>Quick · 0.36 seconds</option>
                <option value={520}>Standard · 0.52 seconds</option>
                <option value={700}>Relaxed · 0.70 seconds</option>
                <option value={900}>Slow · 0.90 seconds</option>
              </select>
              <small>Time each digit takes to reach its final position.</small>
            </label>
            <label className="field-control">
              <span>Digit cascade</span>
              <select
                aria-label="Financial motion digit cascade"
                data-pd-id="fund-manager-site-settings.financial-motion-stagger"
                onChange={(event) => void saveMotion({ staggerMs: Number(event.target.value) })}
                value={financialMotion.staggerMs}
              >
                <option value={40}>Tight · 40 ms</option>
                <option value={60}>Compact · 60 ms</option>
                <option value={80}>Standard · 80 ms</option>
                <option value={100}>Spacious · 100 ms</option>
              </select>
              <small>Delay between neighbouring digits.</small>
            </label>
          </div>
        </fieldset>
        {motionMessage ? (
          <p className={motionMessage.error ? "error-text" : "field-hint"} role={motionMessage.error ? "alert" : "status"}>
            {motionMessage.text}
          </p>
        ) : null}
      </section>
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
