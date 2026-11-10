"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DesignPageHead } from "@/components/design-ledger-screen";
import { apiBaseUrl } from "@/lib/api";
import styles from "@/components/design-lab-connected.module.css";

type Profile = { profile_id: string; display_name: string; status?: string };
type SourceOpportunity = { opportunity_key: string; label: string; bookmaker: string; already_created: boolean; risk_warnings: string[] };
type OwnedOpportunity = SourceOpportunity & { profileId: string; profileName: string };

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
        const response = await fetch(`${apiBaseUrl}/profiles`, { cache: "no-store", credentials: "include" });
        if (!response.ok) throw new Error("Authorised Profiles could not be loaded.");
        const profiles = (await response.json() as Profile[]).filter(profile => (profile.status ?? "active").toLowerCase() !== "archived");
        if (scope && !profiles.some(profile => profile.profile_id === scope)) throw new Error("This Profile is unavailable or access has changed.");
        const selected = scope ? profiles.filter(profile => profile.profile_id === scope) : profiles;
        const loaded: OwnedOpportunity[] = [];
        const failures: string[] = [];
        for (let index = 0; index < selected.length; index += 4) {
          const batch = selected.slice(index, index + 4);
          const results = await Promise.allSettled(batch.map(async profile => {
            const source = await fetch(`${apiBaseUrl}/fund-manager/common-bet-combos/profile-opportunities/${encodeURIComponent(profile.profile_id)}`, { cache: "no-store", credentials: "include" });
            if (!source.ok) throw new Error(profile.display_name);
            const values = await source.json() as SourceOpportunity[];
            if (!Array.isArray(values)) throw new Error(profile.display_name);
            return values.map(value => ({ ...value, profileId: profile.profile_id, profileName: profile.display_name }));
          }));
          results.forEach((result, offset) => result.status === "fulfilled" ? loaded.push(...result.value) : failures.push(batch[offset].display_name));
        }
        if (active) { setRows(loaded); setFailed(failures); }
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
