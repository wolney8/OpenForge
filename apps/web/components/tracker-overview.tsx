"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DesignPageHead } from "@/components/design-ledger-screen";
import { apiBaseUrl } from "@/lib/api";
import { shellDestinations } from "@/lib/fund-manager-destinations";
import styles from "@/components/design-lab-connected.module.css";

type Profile = { profile_id: string; status?: string };

export function TrackerOverview() {
  const scope = useSearchParams().get("scope");
  const [scopeStatus, setScopeStatus] = useState<{ scope: string; available: boolean } | null>(null);
  const loading = Boolean(scope && scopeStatus?.scope !== scope);
  const available = !scope || (scopeStatus?.scope === scope && scopeStatus.available);
  useEffect(() => {
    if (!scope) return;
    let active = true;
    const run = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/profiles`, { cache: "no-store", credentials: "include" });
        if (!response.ok) throw new Error("Authorised Profiles could not be loaded.");
        const profiles = await response.json() as Profile[];
        if (active) setScopeStatus({ scope, available: profiles.some(profile => profile.profile_id === scope && (profile.status ?? "active").toLowerCase() !== "archived") });
      } catch { if (active) setScopeStatus({ scope, available: false }); }
    };
    void run();
    return () => { active = false; };
  }, [scope]);
  return <main className="page-shell" data-pd-id="tracker.overview">
    <DesignPageHead><div><h1>Tracker</h1></div></DesignPageHead>
    <section className={styles.surface} data-pd-id="tracker.ledger-selection">
      <h2>Tracker</h2>
      <p>Choose a ledger. Profile and range remain selected as you move between work.</p>
      {loading ? <p role="status">Checking Profile access…</p> : !available ? <p role="alert">This Profile is unavailable or access has changed.</p> : <div className={styles.toolLinks}>{shellDestinations.filter(item => item.group === "tracker").map(item => {
        const href = item.href(scope);
        return href ? <Link className={styles.quickLink} data-pd-id={`tracker.open.${item.id}`} href={href} key={item.id}><span aria-hidden="true" className="material-symbols-outlined">{item.icon}</span><span>{item.label}</span><span aria-hidden="true" className="material-symbols-outlined">arrow_forward</span></Link> : null;
      })}</div>}
    </section>
  </main>;
}
