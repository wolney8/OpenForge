"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  BookmakerIdentity,
  catalogueIdForBookmaker,
  useBookmakerCatalogue,
} from "@/components/bookmaker-identity";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { apiBaseUrl } from "@/lib/api";
import { dispatchTrackerDataUpdated } from "@/lib/tracker-data-events";

type Opportunity = {
  opportunity_key: string;
  source: "quick_action" | "signup_account";
  ledger_type: "Sportsbook" | "Free Bets";
  label: string;
  bookmaker: string;
  recurrence: "One Off" | "Weekly";
  kind: "Reload" | "Signup" | "Free Bet";
  period_key: string;
  already_created: boolean;
  target_record_id: string;
  risk_warnings: string[];
  defaults: Record<string, string>;
};

function targetHref(profileId: string, row: Opportunity): string {
  const ledger = row.ledger_type === "Free Bets" ? "free-bets" : "sportsbook-bets";
  return `/profiles/${profileId}/tracker/${ledger}?record=${row.target_record_id}`;
}

export function ProfileOpportunityQueue({ profileId }: { profileId: string }) {
  const [rows, setRows] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [message, setMessage] = useState("");
  const { catalogue, providerIdsByName } = useBookmakerCatalogue(profileId);

  const load = useCallback(async () => {
    const response = await fetch(
      `${apiBaseUrl}/fund-manager/common-bet-combos/profile-opportunities/${profileId}`,
      { cache: "no-store" },
    );
    if (!response.ok) throw new Error("Profile opportunities could not be loaded.");
    setRows((await response.json()) as Opportunity[]);
  }, [profileId]);

  useEffect(() => {
    let active = true;
    void fetch(
      `${apiBaseUrl}/fund-manager/common-bet-combos/profile-opportunities/${profileId}`,
      { cache: "no-store" },
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Profile opportunities could not be loaded.");
        }
        const opportunities = (await response.json()) as Opportunity[];
        if (active) setRows(opportunities);
      })
      .catch((error: Error) => {
        if (active) setMessage(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [profileId]);

  const weeklyAvailable = useMemo(
    () => rows.filter((row) => row.recurrence === "Weekly" && !row.already_created),
    [rows],
  );

  async function instantiate(row: Opportunity) {
    if (busyKey) return;
    setBusyKey(row.opportunity_key);
    setMessage("");
    try {
      const response = await fetch(
        `${apiBaseUrl}/fund-manager/common-bet-combos/profile-opportunities/${profileId}/${encodeURIComponent(row.opportunity_key)}/instantiate`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ allow_duplicate: false }) },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { detail?: string } | null;
        throw new Error(body?.detail || "The opportunity could not be added.");
      }
      dispatchTrackerDataUpdated({ profileId, ledger: row.ledger_type === "Free Bets" ? "free-bets" : "sportsbook-bets" });
      await load();
      setMessage(`${row.label} was added as a non-financial prospect.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The opportunity could not be added.");
    } finally {
      setBusyKey("");
    }
  }

  async function instantiateWeekly() {
    if (busyKey || !weeklyAvailable.length) return;
    setBusyKey("weekly");
    setMessage("");
    try {
      const response = await fetch(
        `${apiBaseUrl}/fund-manager/common-bet-combos/profile-opportunities/${profileId}/instantiate-weekly`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("This week's opportunities could not be created.");
      const created = (await response.json()) as Opportunity[];
      dispatchTrackerDataUpdated({ profileId });
      await load();
      setMessage(`${created.length} weekly ${created.length === 1 ? "opportunity" : "opportunities"} created.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "This week's opportunities could not be created.");
    } finally {
      setBusyKey("");
    }
  }

  return (
    <section className="content-subpanel stack" data-pd-id="profile-opportunities.queue" id="opportunities">
      <header className="quick-actions-ledger-header">
        <div><span className="eyebrow">Profile Opportunities</span><h2>Opportunity queue</h2></div>
        <button className="modal-primary-button icon-text-action" disabled={!weeklyAvailable.length || Boolean(busyKey)} onClick={() => void instantiateWeekly()} type="button">
          {busyKey === "weekly" ? <span aria-hidden="true" className="button-spinner" /> : <span aria-hidden="true" className="material-symbols-outlined">event_repeat</span>}
          <span>{busyKey === "weekly" ? "Creating" : "Create this week's opportunities"}</span>
        </button>
      </header>
      <p className="field-hint">Reusable Quick Actions and Account signup candidates create Prospecting rows only when selected.</p>
      {message ? <p aria-live="polite" className="field-hint">{message}</p> : null}
      {loading ? <LedgerLoadingIndicator dataPdId="profile-opportunities.loading" label="Loading Profile opportunities" /> : null}
      {!loading && rows.length === 0 ? <p className="field-hint">No recurring or signup opportunities are currently available.</p> : null}
      {!loading && rows.length ? (
        <div className="table-scroll" data-pd-id="profile-opportunities.table-scroll">
          <table className="data-table profile-opportunity-table">
            <colgroup><col className="opportunity-provider-column" /><col className="opportunity-copy-column" /><col className="opportunity-type-column" /><col className="opportunity-period-column" /><col className="opportunity-state-column" /><col className="opportunity-actions-column" /></colgroup>
            <thead><tr><th>Provider</th><th>Opportunity</th><th>Type</th><th>Period</th><th>State</th><th className="align-end">Actions</th></tr></thead>
            <tbody>{rows.map((row) => (
              <tr key={row.opportunity_key}>
                <td><BookmakerIdentity bookmaker={row.bookmaker} catalogueId={catalogueIdForBookmaker(providerIdsByName, row.bookmaker)} catalogue={catalogue} mode="Brand badge" /></td>
                <td><div className="opportunity-copy"><strong title={row.label}>{row.label}</strong>{row.defaults.opportunityExpiry ? <small>Expires {row.defaults.opportunityExpiry}</small> : null}{row.risk_warnings.map((warning) => <small className="opportunity-risk-copy" key={warning}><span aria-hidden="true" className="material-symbols-outlined">warning</span>{warning}</small>)}</div></td>
                <td><span className="table-chip table-chip-info">{row.kind}</span></td>
                <td>{row.recurrence === "Weekly" ? row.period_key : "One off"}</td>
                <td><span className={`table-chip ${row.already_created ? "table-chip-success" : "table-chip-warning"}`}>{row.already_created ? "Created" : "Available"}</span></td>
                <td className="align-end"><div className="table-action-group">
                  {row.already_created ? <Link className="button-link compact-action" href={targetHref(profileId, row)}>Open prospect</Link> : <button className="button-link compact-action" disabled={Boolean(busyKey)} onClick={() => void instantiate(row)} type="button">{busyKey === row.opportunity_key ? <span aria-hidden="true" className="button-spinner" /> : null}<span>{row.ledger_type === "Free Bets" ? "Add Free Bet prospect" : "Add to Sportsbook"}</span></button>}
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
