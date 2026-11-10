"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DesignPageHead } from "@/components/design-ledger-screen";
import { loadAuthorizedProfileOpportunities, type OwnedOpportunity } from "@/lib/profile-opportunities";
import styles from "@/components/design-lab-connected.module.css";

export function OpportunitiesPage() {
  const scope = useSearchParams().get("scope");
  const [rows, setRows] = useState<OwnedOpportunity[]>([]);
  const [failed, setFailed] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
    <section className={styles.surface} data-pd-id="opportunities.source-list">
      <h2>Profile opportunities</h2>
      <p>Review offers from authorised Profile Accounts. Availability and actions belong to each Profile.</p>
      {loading ? <p role="status">Loading authorised opportunities…</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {failed.length ? <p role="alert">Partial read: {failed.join(", ")} unavailable. Only loaded Profiles are shown.</p> : null}
      {!loading && !error && !rows.length ? <p>No recorded opportunities are available for this scope.</p> : null}
      {rows.map(item => <article className={styles.task} key={`${item.profileId}:${item.opportunity_key}`}>
        <div><strong>{item.label}</strong><p>{item.profileName} · {item.bookmaker} · {item.already_created ? "Already created" : "Available for review"}</p>{item.risk_warnings?.length ? <p>{item.risk_warnings.join(" · ")}</p> : null}</div>
        <Link className={styles.secondaryButton} href={`/profiles/${encodeURIComponent(item.profileId)}/tracker/accounts#profile-opportunities`}>Open Profile opportunity</Link>
      </article>)}
    </section>
  </main>;
}
