"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DesignPageHead } from "@/components/design-ledger-screen";
import { DesignTodayTaskRow, designTodayTaskListClass } from "@/components/design-today-task-row";
import { DesignOpportunityOverview } from "@/components/design-opportunity-overview";
import { loadAuthorizedProfileOpportunities, type OwnedOpportunity } from "@/lib/profile-opportunities";
import styles from "@/components/design-lab-connected.module.css";

export function OpportunitiesPage() {
  const router = useRouter();
  const scope = useSearchParams().get("scope");
  const [rows, setRows] = useState<OwnedOpportunity[]>([]);
  const [failed, setFailed] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const trackerHref = (entry: "quick" | "prospecting") => {
    const query = new URLSearchParams();
    if (scope) { query.set("scope", scope); query.set("profile", scope); }
    if (entry === "quick") { query.set("create", "1"); query.set("entry", "quick"); }
    else query.set("f_status", "Prospecting");
    return `/tracker/sportsbook-bets?${query.toString()}`;
  };
  useEffect(() => {
    let active = true;
    const run = async () => {
      setRows([]); setFailed([]); setError(""); setLoading(true);
      try {
        const result = await loadAuthorizedProfileOpportunities(scope);
        if (active) { setRows(result.rows); setFailed(result.failed); }
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "Opportunities could not be loaded."); }
      finally { if (active) setLoading(false); }
    };
    void run();
    return () => { active = false; };
  }, [scope]);

  return <main className="page-shell" data-pd-id="opportunities.page">
    <DesignPageHead><div><h1>Opportunities</h1></div></DesignPageHead>
    <DesignOpportunityOverview intro="Capture source wording as an unsaved draft, or review existing Profile-owned Prospecting records. Advisory opportunities are not confirmed promotions." onCapture={() => router.push(trackerHref("quick"))} onReview={() => router.push(trackerHref("prospecting"))} title="Opportunities" />
    <section className={styles.surface} data-pd-id="opportunities.source-list">
      <h2>Profile opportunities</h2>
      <p>Review offers from authorised Profile Accounts. Availability and actions belong to each Profile.</p>
      {loading ? <p role="status">Loading authorised opportunities…</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {failed.length ? <p role="alert">Partial read: {failed.join(", ")} unavailable. Only loaded Profiles are shown.</p> : null}
      {!loading && !error && !rows.length ? <p>No recorded opportunities are available for this scope.</p> : null}
      <div className={designTodayTaskListClass} role="list">{rows.map(item => <div key={`${item.profileId}:${item.opportunity_key}`} role="listitem">
        <DesignTodayTaskRow accessibleName={`Inspect ${item.label} · ${item.profileName}`} active={false} context={<>{item.bookmaker} · {item.profileName} · Advisory; current availability unverified{item.already_created ? " · Prospect exists" : ""}</>} dataPdId={`opportunities.item.${item.profileId}.${item.opportunity_key}`} icon="lightbulb" onClick={() => router.push(`/profiles/${encodeURIComponent(item.profileId)}/tracker/accounts#profile-opportunities`)} selectionMode="expanded" title={item.label} />
        {item.risk_warnings?.length ? <details><summary>{item.risk_warnings.length} recorded restrictions</summary><ul>{item.risk_warnings.map(warning => <li key={warning}>{warning}</li>)}</ul></details> : null}
      </div>)}</div>
    </section>
  </main>;
}
