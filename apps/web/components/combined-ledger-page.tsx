"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { DesignLabSelect } from "@/components/design-lab-select";
import { DesignLedgerSearch } from "@/components/design-ledger-search";
import { DesignLedgerMobileRows, DesignLedgerNarrowToggle, DesignLedgerScreen, DesignLedgerToolbar, DesignPageHead, type DesignLedgerDetailRow } from "@/components/design-ledger-screen";
import { LedgerPagination } from "@/components/ledger-pagination";
import { LedgerTableScroll } from "@/components/ledger-table-scroll";
import { apiBaseUrl } from "@/lib/api";
import type { CombinedLedgerModule } from "@/lib/profile-scope";
import { trackerModuleDefinitions } from "@/lib/tracker-modules";

type Profile = { profile_id: string; display_name: string; status?: string };
type SourceRecord = Record<string, unknown>;
type OwnedRecord = { profileId: string; profileName: string; recordId: string; data: SourceRecord };
type OwnedOpportunity = { profileId: string; profileName: string; opportunityKey: string; label: string; bookmaker: string; alreadyCreated: boolean; riskWarnings: string[] };
type Column = { key: string; label: string; align?: "end" };

const columns: Record<CombinedLedgerModule, Column[]> = {
  accounts: [
    { key: "account_id", label: "Account ID" }, { key: "account", label: "Account" }, { key: "type", label: "Type" }, { key: "status", label: "Status" },
    { key: "counts_in_cash_total", label: "Counts in cash" }, { key: "current_balance", label: "Current balance", align: "end" }, { key: "pending_withdrawal_amount", label: "Pending withdrawal", align: "end" },
    { key: "last_balance_update", label: "Last balance update" }, { key: "channel", label: "Channel" }, { key: "group_name", label: "Group" }, { key: "platform", label: "Platform" },
  ],
  "sportsbook-bets": [
    { key: "date_settled", label: "Settles" }, { key: "bookmaker", label: "Bookmaker" }, { key: "event_name", label: "Event" }, { key: "offer_name", label: "Campaign Tag" },
    { key: "offer_type", label: "Offer Type" }, { key: "fixture_type", label: "Fixture Type" }, { key: "bet_type", label: "Bet Type" }, { key: "match_strategy", label: "Strategy" },
    { key: "lay_status", label: "Lay Bet" }, { key: "back_bet_status", label: "Back Bet" }, { key: "displayed_value", label: "Value", align: "end" }, { key: "status", label: "Status" },
  ],
  "free-bets": [
    { key: "date_settled", label: "Settles" }, { key: "expiry_datetime", label: "Expiry" }, { key: "bookmaker", label: "Bookmaker" }, { key: "offer_name", label: "Campaign Tag" },
    { key: "event_name", label: "Event" }, { key: "match_strategy", label: "Strategy" }, { key: "lay_status", label: "Lay Bet" }, { key: "back_bet_status", label: "Back Bet" },
    { key: "displayed_value", label: "Value", align: "end" }, { key: "status", label: "Status" },
  ],
  "casino-offers": [
    { key: "date_settling", label: "Settles" }, { key: "expiry_datetime", label: "Expiry" }, { key: "bookmaker", label: "Bookmaker" }, { key: "offer_name", label: "Offer Name" },
    { key: "game", label: "Game" }, { key: "offer_type", label: "Offer Type" }, { key: "status", label: "Status" }, { key: "result", label: "Result" }, { key: "displayed_value", label: "Value", align: "end" },
  ],
  "each-way-extra-places": [
    { key: "placed_at", label: "Date / time" }, { key: "runner", label: "Runner" }, { key: "race", label: "Race" }, { key: "bookmaker", label: "Bookmaker" },
    { key: "each_way_stake", label: "E/W Stake", align: "end" }, { key: "back_odds", label: "Back Odds", align: "end" }, { key: "place_term_numerator", label: "Place terms numerator" },
    { key: "place_term_denominator", label: "Place terms denominator" }, { key: "status", label: "Status" }, { key: "result", label: "Result" },
  ],
  "cash-adjustments": [
    { key: "cash_adjustment_id", label: "Adjustment ID" }, { key: "adjustment_date", label: "Date" }, { key: "direction", label: "Direction" }, { key: "adjustment_type", label: "Type" },
    { key: "amount", label: "Amount", align: "end" }, { key: "signed_amount", label: "Signed amount", align: "end" }, { key: "affects_investment", label: "Investment" },
    { key: "affects_cash_snapshot", label: "Cash snapshot" }, { key: "linked_account", label: "Linked account" }, { key: "description", label: "Description" },
    { key: "week_label", label: "Week label" }, { key: "calculation_state", label: "Calc state" },
  ],
};
const recordKeys: Record<CombinedLedgerModule, string> = {
  accounts: "account_id", "sportsbook-bets": "sportsbook_bet_id", "free-bets": "free_bet_id", "casino-offers": "casino_offer_id",
  "each-way-extra-places": "each_way_extra_place_id", "cash-adjustments": "cash_adjustment_id",
};

async function readProfilesInBatches<T>(profiles: Profile[], read: (profile: Profile) => Promise<T>): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  for (let index = 0; index < profiles.length; index += 4) {
    results.push(...await Promise.allSettled(profiles.slice(index, index + 4).map(read)));
  }
  return results;
}

function field(row: OwnedRecord, key: string): string {
  if (key === "displayed_value") {
    // Source-field precedence matches the native ledger; no value is calculated here.
    const value = "resolved_net_pnl" in row.data || "calc_net_pnl" in row.data
      ? row.data.resolved_net_pnl ?? row.data.final_net_pnl ?? row.data.calc_net_pnl
      : row.data.reporting_value ?? row.data.final_net_pnl ?? row.data.projected_current_pnl;
    return value === null || value === undefined || value === "" ? "Unavailable" : String(value);
  }
  const value = row.data[key];
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number" || typeof value === "string") return String(value);
  return "View in Profile";
}

export function CombinedLedgerPage({ module }: { module: CombinedLedgerModule }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const localProfile = searchParams.get("profile") ?? "all";
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [rows, setRows] = useState<OwnedRecord[]>([]);
  const [failedProfiles, setFailedProfiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterReset, setFilterReset] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("profile_name");
  const [sortDescending, setSortDescending] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [mobileDetail, setMobileDetail] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newOwner, setNewOwner] = useState("");
  const [opportunities, setOpportunities] = useState<OwnedOpportunity[]>([]);
  const [opportunityFailures, setOpportunityFailures] = useState<string[]>([]);
  const [showOpportunities, setShowOpportunities] = useState(false);
  const readId = useRef(0);
  const opportunityReadId = useRef(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const localProfileValid = localProfile === "all" || profiles.some(profile => profile.profile_id === localProfile);

  useEffect(() => {
    if (!loading && !localProfileValid) {
      const timer = window.setTimeout(() => {
        setFilterReset(true);
        router.replace(`/tracker/${module}`);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [loading, localProfileValid, module, router]);

  useEffect(() => {
    const sync = () => setShowOpportunities(window.location.hash === "#profile-opportunities");
    sync(); window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    const current = ++readId.current;
    const run = async () => {
      setLoading(true); setError(""); setRows([]); setFailedProfiles([]);
      try {
        const profileResponse = await fetch(`${apiBaseUrl}/profiles`, { cache: "no-store", credentials: "include" });
        if (!profileResponse.ok) throw new Error("Authorised Profiles could not be loaded.");
        const authorised = (await profileResponse.json() as Profile[]).filter(profile => (profile.status ?? "active").toLowerCase() !== "archived");
        if (current !== readId.current) return;
        setProfiles(authorised);
        const results = await readProfilesInBatches(authorised, async profile => {
          const response = await fetch(`${apiBaseUrl}/profiles/${encodeURIComponent(profile.profile_id)}/${module}`, { cache: "no-store", credentials: "include" });
          if (!response.ok) throw new Error(profile.display_name);
          const records = await response.json() as SourceRecord[];
          if (!Array.isArray(records)) throw new Error(profile.display_name);
          return records.map(data => {
            const id = data[recordKeys[module]];
            if (typeof id !== "string" || !id || data.profile_id !== profile.profile_id) throw new Error(profile.display_name);
            return { profileId: profile.profile_id, profileName: profile.display_name, recordId: id, data } satisfies OwnedRecord;
          });
        });
        if (current !== readId.current) return;
        setRows(results.flatMap(result => result.status === "fulfilled" ? result.value : []));
        setFailedProfiles(results.flatMap((result, index) => result.status === "rejected" ? [authorised[index].display_name] : []));
      } catch (cause) {
        if (current === readId.current) setError(cause instanceof Error ? cause.message : "Combined ledger could not be loaded.");
      } finally { if (current === readId.current) setLoading(false); }
    };
    void run();
    return () => { readId.current += 1; };
  }, [module, refreshKey]);

  useEffect(() => {
    if (module !== "accounts" || !profiles.length) return;
    const current = ++opportunityReadId.current;
    const run = async () => {
      const results = await readProfilesInBatches(profiles, async profile => {
        const response = await fetch(`${apiBaseUrl}/fund-manager/common-bet-combos/profile-opportunities/${encodeURIComponent(profile.profile_id)}`, { cache: "no-store", credentials: "include" });
        if (!response.ok) throw new Error(profile.display_name);
        const values = await response.json() as Array<{ opportunity_key: string; label: string; bookmaker: string; already_created: boolean; risk_warnings: string[] }>;
        if (!Array.isArray(values)) throw new Error(profile.display_name);
        return values.map(value => ({ profileId: profile.profile_id, profileName: profile.display_name, opportunityKey: value.opportunity_key, label: value.label, bookmaker: value.bookmaker, alreadyCreated: value.already_created, riskWarnings: value.risk_warnings ?? [] }));
      });
      if (current !== opportunityReadId.current) return;
      setOpportunities(results.flatMap(result => result.status === "fulfilled" ? result.value : []));
      setOpportunityFailures(results.flatMap((result, index) => result.status === "rejected" ? [profiles[index].display_name] : []));
    };
    void run();
    return () => { opportunityReadId.current += 1; };
  }, [module, profiles, refreshKey]);

  const visible = useMemo(() => rows.filter(row => (!localProfileValid || localProfile === "all" || row.profileId === localProfile) && (!search || [row.profileName, row.recordId, ...columns[module].map(column => field(row, column.key))].some(value => value.toLocaleLowerCase().includes(search.toLocaleLowerCase())))).sort((a, b) => {
    const left = sortKey === "profile_name" ? a.profileName : field(a, sortKey);
    const right = sortKey === "profile_name" ? b.profileName : field(b, sortKey);
    const comparison = left.localeCompare(right, undefined, { numeric: true });
    return (sortDescending ? -comparison : comparison) || a.profileId.localeCompare(b.profileId) || a.recordId.localeCompare(b.recordId);
  }), [rows, localProfile, localProfileValid, search, module, sortKey, sortDescending]);
  const count = Math.max(1, Math.ceil(visible.length / pageSize));
  const current = Math.min(page, count);
  const paginated = visible.slice((current - 1) * pageSize, current * pageSize);
  const returnPath = `/tracker/${module}${localProfile !== "all" ? `?profile=${encodeURIComponent(localProfile)}` : ""}`;
  const rowHref = (row: OwnedRecord) => `/profiles/${encodeURIComponent(row.profileId)}/tracker/${module}?record=${encodeURIComponent(row.recordId)}&returnTo=${encodeURIComponent(returnPath)}`;
  const detailRows: DesignLedgerDetailRow[] = paginated.map(row => ({
    id: `${row.profileId}:${row.recordId}`, title: field(row, columns[module][1]?.key ?? recordKeys[module]), subtitle: `${row.profileName} · ${row.recordId}`,
    status: field(row, "status"), fields: columns[module].map(column => ({ key: column.key, label: column.label, value: field(row, column.key) })),
    onOpen: () => router.push(rowHref(row)),
  }));
  const setLocalProfile = (value: string) => { setPage(1); router.push(value === "all" ? `/tracker/${module}` : `/tracker/${module}?profile=${encodeURIComponent(value)}`); };
  const profileOptions = [{ value: "all", label: "All Profiles" }, ...profiles.map(profile => ({ value: profile.profile_id, label: profile.display_name }))];
  const label = trackerModuleDefinitions[module].title;

  return <main className="page-shell stack" data-pd-id={`combined.${module}.page`}>
    <DesignPageHead><div><h1>{label}</h1></div></DesignPageHead>
    {module === "accounts" && showOpportunities ? <DesignLedgerScreen dataPdId="combined.opportunities" description="Profile-owned opportunities. Availability and actions remain specific to each Profile." title="Opportunities">
      {opportunityFailures.length ? <p role="alert">Partial read: opportunities for {opportunityFailures.join(", ")} could not be loaded.</p> : null}
      <div className="stack">{opportunities.filter(item => localProfile === "all" || item.profileId === localProfile).map(item => <article className="content-subpanel" key={`${item.profileId}:${item.opportunityKey}`}><strong>{item.label}</strong><p>{item.profileName} · {item.bookmaker} · {item.alreadyCreated ? "Already created" : "Available for review"}</p>{item.riskWarnings.length ? <p>{item.riskWarnings.join(" · ")}</p> : null}<Link href={`/profiles/${encodeURIComponent(item.profileId)}/tracker/accounts#profile-opportunities`}>Open Profile opportunity</Link></article>)}</div>
    </DesignLedgerScreen> : null}
    <DesignLedgerScreen dataPdId={`combined.${module}.design-screen`} description={<>Authorised records across {profiles.length} Profiles. Each action opens its owning Profile.</>} title={label} actions={<button className="button-link" data-pd-id={`combined.${module}.refresh`} onClick={() => setRefreshKey(value => value + 1)} type="button">Refresh</button>}>
      <DesignLedgerToolbar ariaLabel={`${label} controls`} dataPdId={`combined.${module}.toolbar`}>
        <DesignLedgerSearch dataPdId={`combined.${module}.search`} label={`Search ${label}`} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search This Ledger" value={search} />
        <DesignLabSelect compact dataPdId={`combined.${module}.profile-filter`} label="Filter ledger by Profile" onChange={setLocalProfile} options={profileOptions} value={profileOptions.some(option => option.value === localProfile) ? localProfile : "all"} />
        <DesignLabSelect compact dataPdId={`combined.${module}.sort`} label="Sort ledger" onChange={setSortKey} options={[{ value: "profile_name", label: "Profile" }, ...columns[module].map(column => ({ value: column.key, label: column.label }))]} value={sortKey} />
        <button aria-label={sortDescending ? "Sort ascending" : "Sort descending"} className="button-link" data-pd-id={`combined.${module}.sort-direction`} onClick={() => setSortDescending(value => !value)} type="button"><span aria-hidden="true" className="material-symbols-outlined">{sortDescending ? "arrow_downward" : "arrow_upward"}</span></button>
        <button className="button-link" data-pd-id={`combined.${module}.add`} onClick={() => { setCreating(value => !value); setNewOwner(""); }} type="button">Add {label === "Accounts" ? "Account" : "Record"}</button>
      </DesignLedgerToolbar>
      {creating ? <section aria-label={`Add ${label}`} className="content-subpanel stack"><h3>Choose the owning Profile</h3><p>New records use that Profile’s existing Add workflow and financial rules.</p><DesignLabSelect dataPdId={`combined.${module}.new-owner`} label="Owning Profile" onChange={setNewOwner} options={[{ value: "", label: "Choose Profile" }, ...profiles.map(profile => ({ value: profile.profile_id, label: profile.display_name }))]} value={newOwner} /><div><button className="button-link" data-pd-id={`combined.${module}.continue-add`} disabled={!newOwner} onClick={() => router.push(`/profiles/${encodeURIComponent(newOwner)}/tracker/${module}?returnTo=${encodeURIComponent(returnPath)}`)} type="button">Continue to Add workflow</button><button className="button-link" data-pd-id={`combined.${module}.cancel-add`} onClick={() => setCreating(false)} type="button">Cancel</button></div></section> : null}
      {error ? <p role="alert">{error}</p> : null}
      {filterReset ? <p role="status">The ledger Profile filter was reset because that Profile is no longer available.</p> : null}
      {failedProfiles.length ? <p role="alert">Partial read: {failedProfiles.join(", ")} unavailable. Counts below cover loaded Profiles only.</p> : null}
      {loading ? <p role="status">Loading authorised records…</p> : <>
        <p aria-live="polite">{visible.length} records{localProfile !== "all" ? ` in ${profiles.find(profile => profile.profile_id === localProfile)?.display_name ?? "selected Profile"}` : " across loaded Profiles"}</p>
        <DesignLedgerNarrowToggle expanded={mobileDetail} onToggle={() => setMobileDetail(value => !value)} />
        <DesignLedgerMobileRows dataPdId={`combined.${module}.details`} expanded={mobileDetail} rows={detailRows} />
        <LedgerPagination ariaLabel={`${label} combined`} currentPage={current} onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1); }} pageCount={count} pageSize={pageSize} position="top" totalRows={visible.length} />
        <LedgerTableScroll dataPdId={`combined.${module}.table-scroll`} narrowDetail={mobileDetail} visualV2>
          <table className="data-table"><thead><tr><th scope="col">Profile</th>{columns[module].map(column => <th key={column.key} scope="col">{column.label}</th>)}<th scope="col">Actions</th></tr></thead><tbody>
            {paginated.map(row => <tr key={`${row.profileId}:${row.recordId}`}><td>{row.profileName}</td>{columns[module].map(column => <td key={column.key} style={{ textAlign: column.align === "end" ? "right" : undefined }}>{field(row, column.key)}</td>)}<td><Link aria-label={`Open ${row.recordId} in ${row.profileName}`} href={rowHref(row)}>Open Record</Link></td></tr>)}
          </tbody></table>
        </LedgerTableScroll>
        <LedgerPagination ariaLabel={`${label} combined`} currentPage={current} onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1); }} pageCount={count} pageSize={pageSize} position="bottom" totalRows={visible.length} />
      </>}
    </DesignLedgerScreen>
  </main>;
}
