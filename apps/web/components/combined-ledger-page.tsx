"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { DesignLabSelect } from "@/components/design-lab-select";
import { DesignLedgerSearch } from "@/components/design-ledger-search";
import { DesignLedgerMobileRows, DesignLedgerNarrowToggle, DesignLedgerScreen, DesignLedgerToolbar, DesignLedgerToolbarAction, DesignLedgerPrimaryAction, DesignPageHead, designLedgerClasses, type DesignLedgerDetailRow } from "@/components/design-ledger-screen";
import { CombinedLedgerCell } from "@/components/combined-ledger-cell";
import { LedgerPagination } from "@/components/ledger-pagination";
import { LedgerTableScroll } from "@/components/ledger-table-scroll";
import { apiBaseUrl } from "@/lib/api";
import { presentLedgerCell, type LedgerSourceRecord } from "@/lib/combined-ledger-source";
import { combinedLedgerFilters, combinedFilterOptions, combinedFilterValue, combinedIssueLabels, matchesCombinedLedgerFilters } from "@/lib/combined-ledger-filters";
import type { MasterAccountCatalogue, MasterAccountCatalogueRecord } from "@/lib/bookmaker-catalogue";
import { ledgerColumnContracts, ledgerColumnWidths, ledgerHideableColumns, ledgerSortableColumns } from "@/lib/ledger-column-contracts";
import type { CombinedLedgerModule } from "@/lib/profile-scope";
import { trackerModuleDefinitions } from "@/lib/tracker-modules";

type Profile = { profile_id: string; display_name: string; status?: string };
type OwnedRecord = { profileId: string; profileName: string; recordId: string; data: LedgerSourceRecord };
type OwnedOpportunity = { profileId: string; profileName: string; opportunityKey: string; label: string; bookmaker: string; alreadyCreated: boolean; riskWarnings: string[] };
const recordKeys: Record<CombinedLedgerModule, string> = {
  accounts: "account_id", "sportsbook-bets": "sportsbook_bet_id", "free-bets": "free_bet_id", "casino-offers": "casino_offer_id",
  "each-way-extra-places": "each_way_extra_place_id", "cash-adjustments": "cash_adjustment_id",
};
const addLabels: Record<CombinedLedgerModule, string> = {
  accounts: "Add Account", "sportsbook-bets": "Add Sportsbook Bet", "free-bets": "Add Free Bet",
  "casino-offers": "Add Casino Offer", "each-way-extra-places": "Add Extra Place", "cash-adjustments": "Add Cash Adjustment",
};

async function readProfilesInBatches<T>(profiles: Profile[], read: (profile: Profile) => Promise<T>): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  for (let index = 0; index < profiles.length; index += 4) {
    results.push(...await Promise.allSettled(profiles.slice(index, index + 4).map(read)));
  }
  return results;
}

const identity = (row: OwnedRecord) => `${encodeURIComponent(row.profileId)}::${encodeURIComponent(row.recordId)}`;

export function CombinedLedgerPage({ module }: { module: CombinedLedgerModule }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const localProfile = searchParams.get("profile") ?? "all";
  const selectedFilters = useMemo(() => Object.fromEntries(combinedLedgerFilters[module].map(filter => [filter.key, searchParams.get(`f_${filter.key}`) ?? ""])), [module, searchParams]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [rows, setRows] = useState<OwnedRecord[]>([]);
  const [catalogue, setCatalogue] = useState<MasterAccountCatalogueRecord[]>([]);
  const [failedProfiles, setFailedProfiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterReset, setFilterReset] = useState(false);
  const [filterNotice, setFilterNotice] = useState("");
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [sortKey, setSortKey] = useState(searchParams.get("sort") ?? "profile_name");
  const [sortDescending, setSortDescending] = useState(searchParams.get("desc") === "1");
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get("page")) || 1));
  const [pageSize, setPageSize] = useState([8, 16, 32].includes(Number(searchParams.get("size"))) ? Number(searchParams.get("size")) : 8);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(() => new Set(ledgerColumnContracts[module].map(column => column.key)));
  const [columnControlsOpen, setColumnControlsOpen] = useState(false);
  const [mobileDetail, setMobileDetail] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newOwner, setNewOwner] = useState("");
  const [opportunities, setOpportunities] = useState<OwnedOpportunity[]>([]);
  const [opportunityFailures, setOpportunityFailures] = useState<string[]>([]);
  const [showOpportunities, setShowOpportunities] = useState(false);
  const readId = useRef(0);
  const opportunityReadId = useRef(0);
  const previousModule = useRef(module);
  const [refreshKey, setRefreshKey] = useState(0);
  const localProfileValid = localProfile === "all" || profiles.some(profile => profile.profile_id === localProfile);

  useEffect(() => {
    if (previousModule.current === module) return;
    previousModule.current = module;
    setVisibleColumnKeys(new Set(ledgerColumnContracts[module].map(column => column.key)));
    setSortKey("profile_name");
    setSortDescending(false);
    setPage(1);
    setCreating(false);
    setColumnControlsOpen(false);
  }, [module]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchParams.get("q") ?? "");
      setSortKey(searchParams.get("sort") ?? "profile_name");
      setSortDescending(searchParams.get("desc") === "1");
      setPage(Math.max(1, Number(searchParams.get("page")) || 1));
      setPageSize([8, 16, 32].includes(Number(searchParams.get("size"))) ? Number(searchParams.get("size")) : 8);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    void fetch(`${apiBaseUrl}/account-catalogue/source`, { cache: "no-store", credentials: "include" }).then(async response => {
      if (!response.ok) return;
      const source = await response.json() as MasterAccountCatalogue;
      if (active && Array.isArray(source.records)) setCatalogue(source.records);
    }).catch(() => { /* A failed brand read retains names without inventing catalogue identities. */ });
    return () => { active = false; };
  }, []);

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
          const records = await response.json() as LedgerSourceRecord[];
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

  const nativeColumns = ledgerColumnContracts[module];
  const tableColumns = nativeColumns.filter(column => visibleColumnKeys.has(column.key));
  const toggleSort = (key: string) => { if (sortKey === key) setSortDescending(value => !value); else { setSortKey(key); setSortDescending(false); } setPage(1); };
  const visible = useMemo(() => rows.filter(row => (!localProfileValid || localProfile === "all" || row.profileId === localProfile) && matchesCombinedLedgerFilters(module, row.data, selectedFilters) && (!search || [row.profileName, row.recordId, ...ledgerColumnContracts[module].filter(column => column.key !== "actions").map(column => presentLedgerCell(module, row.data, column.key).text)].some(value => value.toLocaleLowerCase().includes(search.toLocaleLowerCase())))).sort((a, b) => {
    const leftCell = sortKey === "profile_name" ? null : presentLedgerCell(module, a.data, sortKey);
    const rightCell = sortKey === "profile_name" ? null : presentLedgerCell(module, b.data, sortKey);
    const left = leftCell?.text ?? a.profileName;
    const right = rightCell?.text ?? b.profileName;
    const comparison = leftCell?.money != null && rightCell?.money != null
      ? leftCell.money - rightCell.money
      : left.localeCompare(right, undefined, { numeric: true });
    return (sortDescending ? -comparison : comparison) || a.profileId.localeCompare(b.profileId) || a.recordId.localeCompare(b.recordId);
  }), [rows, localProfile, localProfileValid, search, module, sortKey, sortDescending, selectedFilters]);
  const count = Math.max(1, Math.ceil(visible.length / pageSize));
  const current = Math.min(page, count);
  const paginated = visible.slice((current - 1) * pageSize, current * pageSize);
  const returnQuery = new URLSearchParams();
  if (localProfile !== "all") returnQuery.set("profile", localProfile);
  if (search) returnQuery.set("q", search);
  if (sortKey !== "profile_name") returnQuery.set("sort", sortKey);
  if (sortDescending) returnQuery.set("desc", "1");
  if (current > 1) returnQuery.set("page", String(current));
  if (pageSize !== 8) returnQuery.set("size", String(pageSize));
  for (const filter of combinedLedgerFilters[module]) if (selectedFilters[filter.key]) returnQuery.set(`f_${filter.key}`, selectedFilters[filter.key]);
  const returnPath = `/tracker/${module}${returnQuery.size ? `?${returnQuery.toString()}` : ""}`;
  const rowHref = (row: OwnedRecord) => `/profiles/${encodeURIComponent(row.profileId)}/tracker/${module}?record=${encodeURIComponent(row.recordId)}&returnTo=${encodeURIComponent(returnPath)}`;
  const detailRows: DesignLedgerDetailRow[] = paginated.map(row => ({
    id: identity(row), title: presentLedgerCell(module, row.data, nativeColumns[1]?.key ?? recordKeys[module]).text, subtitle: `${row.profileName} · ${row.recordId}`,
    status: presentLedgerCell(module, row.data, "status").text, fields: nativeColumns.filter(column => column.key !== "actions").map(column => ({ key: column.key, label: column.label, value: presentLedgerCell(module, row.data, column.key).text })),
    onOpen: () => router.push(rowHref(row)),
  }));
  const setLocalProfile = (value: string) => {
    setPage(1);
    const query = new URLSearchParams(returnQuery);
    query.delete("page");
    if (value === "all") query.delete("profile"); else query.set("profile", value);
    const reset: string[] = [];
    for (const filter of combinedLedgerFilters[module]) {
      const selected = query.get(`f_${filter.key}`);
      if (selected && !rows.some(row => (value === "all" || row.profileId === value) && (filter.key === "issue_type" ? (selected === "All issues" ? (combinedIssueLabels(module, row.data)?.length ?? 0) > 0 : combinedIssueLabels(module, row.data)?.includes(selected)) : combinedFilterValue(module, row.data, filter.key) === selected))) {
        query.delete(`f_${filter.key}`);
        reset.push(filter.label);
      }
    }
    setFilterNotice(reset.length ? `Filters unavailable in this Profile were reset: ${reset.join(", ")}.` : "");
    router.push(`/tracker/${module}${query.size ? `?${query.toString()}` : ""}`);
  };
  const setFilter = (key: string, value: string) => { const query = new URLSearchParams(returnQuery); query.delete("page"); if (value) query.set(`f_${key}`, value); else query.delete(`f_${key}`); router.push(`/tracker/${module}${query.size ? `?${query.toString()}` : ""}`); setPage(1); };
  const clearFilters = () => { const query = new URLSearchParams(returnQuery); for (const filter of combinedLedgerFilters[module]) query.delete(`f_${filter.key}`); query.delete("q"); query.delete("page"); setSearch(""); setPage(1); router.push(`/tracker/${module}${query.size ? `?${query.toString()}` : ""}`); };
  const profileOptions = [{ value: "all", label: "All Profiles" }, ...profiles.map(profile => ({ value: profile.profile_id, label: profile.display_name }))];
  const label = trackerModuleDefinitions[module].title;

  return <main className="page-shell stack sportsbook-page-shell ledger-v2-page" data-pd-id={`combined.${module}.page`}>
    <DesignPageHead><div><h1>{label}</h1></div></DesignPageHead>
    {module === "accounts" && showOpportunities ? <DesignLedgerScreen dataPdId="combined.opportunities" description="Profile-owned opportunities. Availability and actions remain specific to each Profile." title="Opportunities">
      {opportunityFailures.length ? <p role="alert">Partial read: opportunities for {opportunityFailures.join(", ")} could not be loaded.</p> : null}
      <div className="stack">{opportunities.filter(item => localProfile === "all" || item.profileId === localProfile).map(item => <article className="content-subpanel" key={`${item.profileId}:${item.opportunityKey}`}><strong>{item.label}</strong><p>{item.profileName} · {item.bookmaker} · {item.alreadyCreated ? "Already created" : "Available for review"}</p>{item.riskWarnings.length ? <p>{item.riskWarnings.join(" · ")}</p> : null}<Link href={`/profiles/${encodeURIComponent(item.profileId)}/tracker/accounts#profile-opportunities`}>Open Profile opportunity</Link></article>)}</div>
    </DesignLedgerScreen> : null}
    <DesignLedgerScreen dataPdId={`combined.${module}.design-screen`} description={<>Authorised records across {profiles.length} Profiles. Each action opens its owning Profile.</>} title={label} actions={<div className={designLedgerClasses.actionRow}><DesignLedgerToolbarAction dataPdId={`combined.${module}.refresh`} onClick={() => setRefreshKey(value => value + 1)}>Refresh</DesignLedgerToolbarAction><DesignLedgerPrimaryAction dataPdId={`combined.${module}.add`} onClick={() => { setCreating(value => !value); setNewOwner(localProfile !== "all" && localProfileValid ? localProfile : ""); }}>{addLabels[module]}</DesignLedgerPrimaryAction></div>}>
      <DesignLedgerToolbar ariaLabel={`${label} controls`} dataPdId={`combined.${module}.toolbar`}>
        <DesignLedgerSearch dataPdId={`combined.${module}.search`} label={`Search ${label}`} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search This Ledger" value={search} />
        <DesignLabSelect compact dataPdId={`combined.${module}.profile-filter`} label="Filter ledger by Profile" onChange={setLocalProfile} options={profileOptions} value={profileOptions.some(option => option.value === localProfile) ? localProfile : "all"} />
        <DesignLabSelect compact dataPdId={`combined.${module}.sort`} label="Sort ledger" onChange={value => { setSortKey(value); setPage(1); }} options={[{ value: "profile_name", label: "Profile" }, ...nativeColumns.filter(column => column.key !== "actions").map(column => ({ value: column.key, label: column.label }))]} value={sortKey} />
        <button aria-label={sortDescending ? "Sort ascending" : "Sort descending"} className="button-link" data-pd-id={`combined.${module}.sort-direction`} onClick={() => setSortDescending(value => !value)} type="button"><span aria-hidden="true" className="material-symbols-outlined">{sortDescending ? "arrow_downward" : "arrow_upward"}</span></button>
        <DesignLedgerToolbarAction ariaExpanded={columnControlsOpen} dataPdId={`combined.${module}.columns`} onClick={() => setColumnControlsOpen(value => !value)}>Filters &amp; Columns</DesignLedgerToolbarAction>
      </DesignLedgerToolbar>
      {columnControlsOpen ? <section aria-label={`${label} filters and column controls`} className="content-subpanel stack"><fieldset><legend>Filter records</legend><div className="form-grid">{combinedLedgerFilters[module].map(filter => <DesignLabSelect compact dataPdId={`combined.${module}.filter.${filter.key}`} key={filter.key} label={filter.label} onChange={value => setFilter(filter.key, value)} options={[{ value: "", label: `All ${filter.label.toLowerCase()}` }, ...combinedFilterOptions(module, rows.filter(row => localProfile === "all" || row.profileId === localProfile).map(row => row.data), filter.key).map(value => ({ value, label: value }))]} value={selectedFilters[filter.key]} />)}</div></fieldset><fieldset><legend>Visible columns</legend>{nativeColumns.filter(column => ledgerHideableColumns[module].has(column.key)).map(column => <label key={column.key}><input checked={visibleColumnKeys.has(column.key)} onChange={event => setVisibleColumnKeys(previous => { const next = new Set(previous); if (event.target.checked) next.add(column.key); else next.delete(column.key); return next; })} type="checkbox" /> {column.label}</label>)}</fieldset><div className={designLedgerClasses.actionRow}><DesignLedgerToolbarAction dataPdId={`combined.${module}.clear-filters`} onClick={clearFilters}>Clear Filters</DesignLedgerToolbarAction><DesignLedgerToolbarAction dataPdId={`combined.${module}.restore-columns`} onClick={() => setVisibleColumnKeys(new Set(nativeColumns.map(column => column.key)))}>Restore Default Columns</DesignLedgerToolbarAction></div></section> : null}
      {creating ? <section aria-label={`Add ${label}`} className="content-subpanel stack"><h3>Choose the owning Profile</h3><p>New records use that Profile’s existing Add workflow and financial rules.</p><DesignLabSelect dataPdId={`combined.${module}.new-owner`} label="Owning Profile" onChange={setNewOwner} options={[{ value: "", label: "Choose Profile" }, ...profiles.map(profile => ({ value: profile.profile_id, label: profile.display_name }))]} value={newOwner} /><div><button className="button-link" data-pd-id={`combined.${module}.continue-add`} disabled={!newOwner || !profiles.some(profile => profile.profile_id === newOwner)} onClick={() => router.push(`/profiles/${encodeURIComponent(newOwner)}/tracker/${module}?create=1&returnTo=${encodeURIComponent(returnPath)}`)} type="button">Continue to Add workflow</button><button className="button-link" data-pd-id={`combined.${module}.cancel-add`} onClick={() => setCreating(false)} type="button">Cancel</button></div></section> : null}
      {error ? <p role="alert">{error}</p> : null}
      {filterReset ? <p role="status">The ledger Profile filter was reset because that Profile is no longer available.</p> : null}
      {filterNotice ? <p role="status">{filterNotice}</p> : null}
      {failedProfiles.length ? <p role="alert">Partial read: {failedProfiles.join(", ")} unavailable. Counts below cover loaded Profiles only.</p> : null}
      {selectedFilters.issue_type && rows.some(row => (localProfile === "all" || row.profileId === localProfile) && combinedIssueLabels(module, row.data) === null) ? <p role="alert">Some loaded records lack the source fields needed for the issue filter. The filtered count excludes those unclassified records.</p> : null}
      {loading ? <p role="status">Loading authorised records…</p> : <>
        <p aria-live="polite">{visible.length} records{localProfile !== "all" ? ` in ${profiles.find(profile => profile.profile_id === localProfile)?.display_name ?? "selected Profile"}` : " across loaded Profiles"}</p>
        <DesignLedgerNarrowToggle expanded={mobileDetail} onToggle={() => setMobileDetail(value => !value)} />
        <DesignLedgerMobileRows dataPdId={`combined.${module}.details`} expanded={mobileDetail} rows={detailRows} />
        <LedgerPagination ariaLabel={`${label} combined`} currentPage={current} onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1); }} pageCount={count} pageSize={pageSize} position="top" totalRows={visible.length} />
        <LedgerTableScroll cellNavigation={{ label, onActivate: (rowId, column) => { const row = paginated.find(item => identity(item) === rowId); if (row && column !== "profile_name") router.push(rowHref(row)); } }} dataPdId={`combined.${module}.table-scroll`} narrowDetail={mobileDetail} visualV2>
          <table className={`data-table ${module === "accounts" ? "accounts-data-table" : module === "each-way-extra-places" ? "extra-place-data-table" : "sportsbook-data-table"}`}><colgroup><col style={{ width: "160px" }} />{tableColumns.map(column => <col key={column.key} style={{ width: `${ledgerColumnWidths[module][column.key]}px` }} />)}</colgroup><thead><tr><th aria-sort={sortKey === "profile_name" ? sortDescending ? "descending" : "ascending" : "none"} scope="col"><div className="table-header-cell"><button className={`table-sort-button${sortKey === "profile_name" ? " is-active" : ""}`} onClick={() => toggleSort("profile_name")} type="button"><span>Profile</span><span aria-hidden="true">{sortKey === "profile_name" ? sortDescending ? "▼" : "▲" : "↕"}</span></button></div></th>{tableColumns.map(column => { const sortable = ledgerSortableColumns[module].has(column.key); const active = sortKey === column.key; return <th aria-sort={sortable ? active ? sortDescending ? "descending" : "ascending" : "none" : undefined} className={column.align === "end" ? "align-end" : undefined} key={column.key} scope="col"><div className="table-header-cell">{sortable ? <button className={`table-sort-button${active ? " is-active" : ""}`} onClick={() => toggleSort(column.key)} type="button"><span>{column.label}</span><span aria-hidden="true">{active ? sortDescending ? "▼" : "▲" : "↕"}</span></button> : <span className="table-header-label">{column.label}</span>}</div></th>; })}</tr></thead><tbody>
            {paginated.map(row => <tr key={identity(row)}><td data-ledger-column="profile_name" data-ledger-row={identity(row)}>{row.profileName}</td>{tableColumns.map(column => { const cell = presentLedgerCell(module, row.data, column.key); return <td data-ledger-column={column.key} data-ledger-row={identity(row)} key={column.key} style={{ textAlign: column.align === "end" ? "right" : undefined }}>{column.key === "actions" ? <div className="table-action-row"><Link aria-label={`Open ${row.recordId} in ${row.profileName}`} className="icon-button" href={rowHref(row)} title="Open native editor"><span aria-hidden="true" className="material-symbols-outlined">edit</span></Link></div> : <CombinedLedgerCell catalogue={catalogue} cell={cell} column={column.key} module={module} row={row.data} />}</td>; })}</tr>)}
          </tbody></table>
        </LedgerTableScroll>
        <LedgerPagination ariaLabel={`${label} combined`} currentPage={current} onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1); }} pageCount={count} pageSize={pageSize} position="bottom" totalRows={visible.length} />
      </>}
    </DesignLedgerScreen>
  </main>;
}
