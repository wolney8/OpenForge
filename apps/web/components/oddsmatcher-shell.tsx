"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { CalculatorOutcomes } from "@/components/calculator-outcomes";
import { CalculatorSegmentedControl } from "@/components/calculator-segmented-control";
import { CopyableFinancialValue } from "@/components/copyable-financial-value";
import { FinancialValue } from "@/components/financial-value";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { LedgerPagination } from "@/components/ledger-pagination";
import { ModalBoundary } from "@/components/modal-boundary";
import { apiBaseUrl } from "@/lib/api";
import {
  emptyOddsMatcherFilters,
  filterAndSortOpportunities,
  isManualQuote,
  opportunityCopyText,
  type OddsMatcherFeed,
  type OddsMatcherFilters,
  type OddsMatcherOpportunity,
  type OpportunitySort,
} from "@/lib/oddsmatcher";

type Preview = {
  selected_lay_stake: string;
  liability: string;
  pnl_if_back_wins: string;
  pnl_if_lay_wins: string;
  matched_result: string;
};

type Strategy = "Underlay" | "Standard" | "Overlay";
type ReadState = "loading" | "ready" | "error";

async function responseError(response: Response, fallback: string) {
  try {
    const value = await response.json() as { detail?: unknown };
    if (typeof value.detail === "string") return value.detail;
  } catch {
    // The owner-facing fallback remains safe when a proxy returns non-JSON.
  }
  return fallback;
}

function formatObserved(seconds: number) {
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function eligibilityClass(state: "eligible" | "warning" | "unavailable") {
  return state === "unavailable" ? "field-validation-text" : state === "warning" ? "field-warning-text" : "field-hint";
}

function QuoteLink({ href, label }: { href: string | null; label: string }) {
  return href ? <a className="table-action-button" href={href} rel="noreferrer" target="_blank" title={`Open ${label}`} aria-label={`Open ${label}`}><span aria-hidden="true" className="material-symbols-outlined">open_in_new</span></a> : null;
}

export function OddsMatcherShell({ profileId }: { profileId: string }) {
  const [feed, setFeed] = useState<OddsMatcherFeed | null>(null);
  const [readState, setReadState] = useState<ReadState>("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<OddsMatcherFilters>(emptyOddsMatcherFilters);
  const [sort, setSort] = useState<OpportunitySort>({ key: "rating", direction: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(16);
  const [excludedPage, setExcludedPage] = useState(1);
  const [excludedPageSize, setExcludedPageSize] = useState(16);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [defaultStake, setDefaultStake] = useState("10");
  const [selected, setSelected] = useState<OddsMatcherOpportunity | null>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const inspectButtonRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async (refresh: boolean) => {
    if (refresh) setRefreshing(true); else setReadState("loading");
    setError("");
    try {
      const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/oddsmatcher${refresh ? "/refresh" : ""}`, {
        credentials: "include", method: refresh ? "POST" : "GET",
      });
      if (!response.ok) throw new Error(await responseError(response, "Oddsmatcher data could not be loaded."));
      const value = await response.json() as OddsMatcherFeed;
      setFeed(value); setReadState("ready"); setPage(1); setExcludedPage(1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Oddsmatcher data could not be loaded.");
      setReadState(current => refresh && current === "ready" ? "ready" : "error");
    } finally {
      setRefreshing(false);
    }
  }, [profileId]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) void load(false);
    });
    return () => { active = false; };
  }, [load]);

  const visible = useMemo(() => filterAndSortOpportunities(feed?.opportunities ?? [], filters, sort), [feed, filters, sort]);
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const rows = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const excludedPageCount = Math.max(1, Math.ceil((feed?.excluded.length ?? 0) / excludedPageSize));
  const currentExcludedPage = Math.min(excludedPage, excludedPageCount);
  const excludedRows = feed?.excluded.slice((currentExcludedPage - 1) * excludedPageSize, currentExcludedPage * excludedPageSize) ?? [];
  const backProviders = useMemo(() => [...new Set((feed?.opportunities ?? []).map(row => row.back.account_name))].sort(), [feed]);
  const layProviders = useMemo(() => [...new Set((feed?.opportunities ?? []).map(row => row.lay.account_name))].sort(), [feed]);
  const setFilter = <K extends keyof OddsMatcherFilters>(key: K, value: OddsMatcherFilters[K]) => {
    setFilters(current => ({ ...current, [key]: value })); setPage(1); setSelected(null);
  };
  const changeSort = (key: OpportunitySort["key"]) => {
    setSort(current => ({ key, direction: current.key === key && current.direction === "desc" ? "asc" : "desc" })); setPage(1);
  };

  return <section className="content-panel stack oddsmatcher-shell" data-pd-id="oddsmatcher.shell">
    <header className="calculator-panel-heading">
      <div className="calculator-panel-heading-row">
        <div className="stack-tight"><span className="eyebrow">Football Match Odds · Profile scoped</span><h1>Oddsmatcher</h1><p className="lede">Rank real bookmaker back and exchange lay quotes, inspect governed qualifying maths, then add an unplaced Prospecting draft.</p></div>
        <div className="tracker-nav oddsmatcher-header-actions">
          <button className="button-link icon-text-action" data-pd-id="oddsmatcher.filters.clear" onClick={() => { setFilters(emptyOddsMatcherFilters); setPage(1); setSelected(null); }} type="button"><span aria-hidden="true" className="material-symbols-outlined">filter_alt_off</span><span>Clear</span></button>
          <button aria-haspopup="dialog" className="button-link icon-text-action" data-pd-id="oddsmatcher.settings.open" onClick={() => setSettingsOpen(true)} ref={settingsButtonRef} type="button"><span aria-hidden="true" className="material-symbols-outlined">settings</span><span>Settings</span></button>
          <button className="button-link icon-text-action" disabled title="Saved filters are outside this Alpha" type="button"><span aria-hidden="true" className="material-symbols-outlined">bookmark</span><span>My Filters · Later</span></button>
          <button aria-busy={refreshing} className="modal-primary-button icon-text-action" data-pd-id="oddsmatcher.refresh" disabled={refreshing} onClick={() => void load(true)} type="button"><span aria-hidden="true" className="material-symbols-outlined">refresh</span><span>{refreshing ? "Refreshing…" : "Refresh odds"}</span></button>
        </div>
      </div>
    </header>
    <div className="oddsmatcher-boundary-note" role="note"><strong>Prospecting only.</strong><span>Exchange prices do not include liquidity. Confirm available depth and current prices before placing any bet.</span></div>
    <div className="oddsmatcher-coverage" aria-label="Current odds coverage">
      <span className="table-chip">Normal / Qualifying</span>
      <span>{feed?.competitions.join(" · ") ?? "Premier League · Championship · UEFA Champions League"}</span>
      {feed ? <span>{feed.event_count} events · {feed.bookmaker_count} bookmakers · {feed.exchange_count} exchanges</span> : null}
      {feed?.fetched_at ? <span>Snapshot {new Date(feed.fetched_at).toLocaleString("en-GB")}</span> : <span>Manual refresh required</span>}
      {feed?.provider_credits_remaining !== null && feed?.provider_credits_remaining !== undefined ? <span>{feed.provider_credits_remaining} provider credits remaining</span> : null}
    </div>
    <div className="tracker-toolbar oddsmatcher-toolbar" data-pd-id="oddsmatcher.filters">
      <label className="table-search-field"><span>Search</span><input aria-label="Search Oddsmatcher events" onChange={event => setFilter("search", event.target.value)} type="search" value={filters.search} /></label>
      <label className="table-filter-field"><span>Selection</span><select aria-label="Filter by selection" onChange={event => setFilter("selection", event.target.value as OddsMatcherFilters["selection"])} value={filters.selection}><option value="ALL">All</option><option value="HOME">Home</option><option value="DRAW">Draw</option><option value="AWAY">Away</option></select></label>
      <label className="table-filter-field"><span>Start Time</span><select aria-label="Filter by start time" onChange={event => setFilter("startTime", event.target.value as OddsMatcherFilters["startTime"])} value={filters.startTime}><option value="ALL">All</option><option value="6H">Next 6 hours</option><option value="24H">Next 24 hours</option><option value="48H">Next 48 hours</option></select></label>
      <label className="table-filter-field"><span>Back</span><select aria-label="Filter by bookmaker" onChange={event => setFilter("backProvider", event.target.value)} value={filters.backProvider}><option value="">All bookmakers</option>{backProviders.map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="table-filter-field"><span>Lay</span><select aria-label="Filter by exchange" onChange={event => setFilter("layProvider", event.target.value)} value={filters.layProvider}><option value="">All exchanges</option>{layProviders.map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="table-filter-field"><span>Rating</span><select aria-label="Filter by minimum rating" onChange={event => setFilter("minimumRating", event.target.value)} value={filters.minimumRating}><option value="">Any rating</option><option value="95">95%+</option><option value="97">97%+</option><option value="99">99%+</option></select></label>
    </div>
    {readState === "loading" ? <LedgerLoadingIndicator label="Loading saved Oddsmatcher snapshot" /> : null}
    {error ? <p className="error-text" role="alert">{error}</p> : null}
    {feed?.warning ? <p className="field-warning-text" role="status">{feed.warning}</p> : null}
    {feed?.state === "stale" ? <p className="field-warning-text">These prices are stale. Refresh before relying on them.</p> : null}
    {readState === "ready" && feed?.state === "empty" ? <div className="empty-state stack-tight"><strong>No odds snapshot is loaded.</strong><span>Use Refresh odds to make one bounded provider request across the three Alpha competitions.</span></div> : null}
    {readState === "ready" && feed && feed.state !== "empty" ? <>
      <LedgerPagination ariaLabel="Oddsmatcher results" currentPage={currentPage} onPageChange={setPage} onPageSizeChange={value => { setPageSize(value); setPage(1); }} pageCount={pageCount} pageSize={pageSize} position="top" totalRows={visible.length} />
      <div className="table-scroll" data-pd-id="oddsmatcher.results-scroll"><table className="data-table oddsmatcher-table"><thead><tr><th><button className="table-sort-button" onClick={() => changeSort("start")} type="button">Date / Start</button></th><th><button className="table-sort-button" onClick={() => changeSort("event")} type="button">Event</button></th><th>Selection</th><th>Back Odds</th><th>Lay Odds</th><th>Liquidity</th><th><button className="table-sort-button" onClick={() => changeSort("rating")} type="button">Rating</button></th><th>Actions</th></tr></thead><tbody>
        {rows.map(row => <tr className={row.freshness === "stale" || !row.can_create_prospecting_draft ? "is-muted" : undefined} key={row.opportunity_id}><td><span className="table-cell-stack"><time dateTime={row.starts_at}>{new Date(row.starts_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</time><strong>{new Date(row.starts_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</strong></span></td><td><span className="table-cell-stack"><strong>{row.event_name}</strong><span>{row.competition}</span></span></td><td>{row.selection}</td><td><span className="table-cell-stack"><strong>{Number(row.back.odds).toFixed(2)}</strong><span>{row.back.account_name}</span></span></td><td><span className="table-cell-stack"><strong>{Number(row.lay.odds).toFixed(2)}</strong><span>{row.lay.account_name}</span></span></td><td><span className="table-cell-stack"><span className="table-chip table-chip-warning">Liquidity unknown</span><span className={`table-chip${row.freshness === "stale" || !row.can_create_prospecting_draft ? " table-chip-warning" : ""}`}>{row.freshness === "stale" ? `Stale · ${formatObserved(row.age_seconds)}` : !row.can_create_prospecting_draft ? "Account unavailable" : "Fresh"}</span></span></td><td><span className="table-cell-stack"><strong>{Number(row.display_rating).toFixed(2)}%</strong><span>{row.commission_aware_rating ? `${Number(row.commission_aware_rating).toFixed(2)}% after commission` : "Commission unavailable"}</span></span></td><td><div className="table-action-row"><QuoteLink href={row.back.link} label={`${row.back.account_name} quote`} /><QuoteLink href={row.lay.link} label={`${row.lay.account_name} quote`} /><button aria-label={`Copy ${row.event_name} ${row.selection} opportunity`} className="table-action-button" onClick={() => void navigator.clipboard.writeText(opportunityCopyText(row))} title="Copy opportunity" type="button"><span aria-hidden="true" className="material-symbols-outlined">content_copy</span></button><button className="button-link" onClick={event => { inspectButtonRef.current = event.currentTarget; setSelected(row); }} type="button">Bet Summary</button></div></td></tr>)}
        {!rows.length ? <tr><td colSpan={8}>No opportunities match the current filters.</td></tr> : null}
      </tbody></table></div>
      <LedgerPagination ariaLabel="Oddsmatcher results" currentPage={currentPage} onPageChange={setPage} onPageSizeChange={value => { setPageSize(value); setPage(1); }} pageCount={pageCount} pageSize={pageSize} position="bottom" totalRows={visible.length} />
      {feed.excluded.length ? <details className="content-subpanel"><summary>{feed.excluded.length} excluded quote mapping{feed.excluded.length === 1 ? "" : "s"}</summary><ul>{excludedRows.map((item, index) => <li key={`${item.event_id}:${item.provider_key}:${item.market_key}:${index}`}>{item.competition} · {item.provider_key}: {item.reason}</li>)}</ul><LedgerPagination ariaLabel="Excluded quote mappings" currentPage={currentExcludedPage} onPageChange={setExcludedPage} onPageSizeChange={value => { setExcludedPageSize(value); setExcludedPage(1); }} pageCount={excludedPageCount} pageSize={excludedPageSize} position="bottom" totalRows={feed.excluded.length} /></details> : null}
    </> : null}
    {settingsOpen ? <SettingsDialog defaultStake={defaultStake} filters={filters} onChangeDefaultStake={setDefaultStake} onChangeShowArbs={value => setFilter("showArbs", value)} onClose={() => setSettingsOpen(false)} returnFocusRef={settingsButtonRef} /> : null}
    {selected ? <BetSummaryDialog defaultStake={defaultStake} onClose={() => setSelected(null)} opportunity={selected} profileId={profileId} returnFocusRef={inspectButtonRef} /> : null}
  </section>;
}

function SettingsDialog({ defaultStake, filters, onChangeDefaultStake, onChangeShowArbs, onClose, returnFocusRef }: { defaultStake: string; filters: OddsMatcherFilters; onChangeDefaultStake: (value: string) => void; onChangeShowArbs: (value: boolean) => void; onClose: () => void; returnFocusRef: RefObject<HTMLButtonElement | null> }) {
  return <ModalBoundary onDismiss={onClose} returnFocusRef={returnFocusRef}><div className="modal-backdrop" onClick={onClose}><section aria-label="Oddsmatcher settings" aria-modal="true" className="modal-panel stack" data-pd-id="oddsmatcher.settings" onClick={event => event.stopPropagation()} role="dialog"><header className="calculator-panel-heading-row"><div><span className="eyebrow">Session settings</span><h2>Oddsmatcher Settings</h2></div><button aria-label="Close Oddsmatcher settings" className="modal-close-button" onClick={onClose} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button></header><label className="field-control"><span>Default back stake</span><input inputMode="decimal" onChange={event => onChangeDefaultStake(event.target.value)} value={defaultStake} /></label><label className="toggle-row"><input checked={filters.showArbs} onChange={event => onChangeShowArbs(event.target.checked)} type="checkbox" /><span><strong>Show arbs</strong><small>Ratings over 100% are hidden by default.</small></span></label><p className="field-hint">Manual refresh is the only refresh mode. Saved filters and automatic polling are outside this Alpha.</p><footer className="modal-sticky-footer"><button className="modal-primary-button" onClick={onClose} type="button">Done</button></footer></section></div></ModalBoundary>;
}

function BetSummaryDialog({ defaultStake, onClose, opportunity, profileId, returnFocusRef }: { defaultStake: string; onClose: () => void; opportunity: OddsMatcherOpportunity; profileId: string; returnFocusRef: RefObject<HTMLButtonElement | null> }) {
  const [stake, setStake] = useState(defaultStake);
  const [backOdds, setBackOdds] = useState(opportunity.back.odds);
  const [layOdds, setLayOdds] = useState(opportunity.lay.odds);
  const [commission, setCommission] = useState(opportunity.exchange_commission ?? "");
  const [strategy, setStrategy] = useState<Strategy>("Standard");
  const [advanced, setAdvanced] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewState, setPreviewState] = useState<"loading" | "ready" | "error">("loading");
  const [draftState, setDraftState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [draftError, setDraftError] = useState("");
  const [draftId, setDraftId] = useState("");
  const retryToken = useRef(crypto.randomUUID());
  const version = useRef(0);
  const manual = isManualQuote(opportunity, backOdds, layOdds);

  useEffect(() => {
    const current = ++version.current;
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setPreviewState("loading"); setPreview(null);
      try {
        const response = await fetch(`${apiBaseUrl}/fund-manager/calculators/matched-betting/preview`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ bet_type: "qualifying", free_bet_mode: "SNR", promotion_mode: "standard", strategy, back_stake: stake, back_odds: backOdds, lay_odds: layOdds, exchange_commission: commission, manual_lay_stake: "", promotion_value: "", bonus_trigger: "Lay Wins", bonus_backing_bet: "Normal", retention_percent: "70", underlay_factor: "0.928", overlay_factor: "1.300" }) });
        if (!response.ok) throw new Error();
        const value = await response.json() as Preview;
        if (current === version.current) { setPreview(value); setPreviewState("ready"); }
      } catch (caught) {
        if (current === version.current && !(caught instanceof DOMException && caught.name === "AbortError")) setPreviewState("error");
      }
    });
    return () => controller.abort();
  }, [backOdds, commission, layOdds, stake, strategy]);

  const createDraft = async () => {
    setDraftState("saving"); setDraftError("");
    try {
      const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/oddsmatcher/prospecting-drafts`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ opportunity_id: opportunity.opportunity_id, retry_token: retryToken.current, back_stake: stake, back_odds: backOdds, lay_odds: layOdds, exchange_commission: commission, strategy }) });
      if (!response.ok) throw new Error(await responseError(response, "Prospecting draft could not be created."));
      const value = await response.json() as { sportsbook_bet: { sportsbook_bet_id: string } };
      setDraftId(value.sportsbook_bet.sportsbook_bet_id); setDraftState("saved");
    } catch (caught) {
      setDraftError(caught instanceof Error ? caught.message : "Prospecting draft could not be created."); setDraftState("error");
    }
  };

  return <ModalBoundary onDismiss={onClose} returnFocusRef={returnFocusRef}><div className="modal-backdrop modal-backdrop-elevated" onClick={onClose}><section aria-label="Oddsmatcher Bet Summary" aria-modal="true" className="modal-panel oddsmatcher-summary-dialog" data-pd-id="oddsmatcher.bet-summary" onClick={event => event.stopPropagation()} role="dialog"><header className="modal-sticky-header workflow-panel-header"><div className="stack-tight"><span className="eyebrow">Bet Summary · Normal / Qualifying</span><h2>{opportunity.event_name}</h2><p>{opportunity.selection} · {opportunity.market} · {opportunity.competition}</p></div><button aria-label="Close Bet Summary" className="modal-close-button" onClick={onClose} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button></header><div className="oddsmatcher-summary-body stack">
    <div className="oddsmatcher-quote-context"><span>{opportunity.back.account_name} back · <time dateTime={opportunity.back.observed_at}>{formatObserved(opportunity.age_seconds)}</time></span><span>{opportunity.lay.account_name} lay · <time dateTime={opportunity.lay.observed_at}>{formatObserved(opportunity.age_seconds)}</time></span><strong>{Number(opportunity.display_rating).toFixed(2)}% rating</strong></div>
    <div className="oddsmatcher-boundary-note" role="note"><strong>Liquidity unknown</strong><span>The provider supplies a lay price without available depth. The required lay stake is a calculation, not proof it can be matched.</span></div>
    <div className="form-grid oddsmatcher-calculator-fields"><label className="field-control"><span>Back stake</span><input inputMode="decimal" onChange={event => setStake(event.target.value)} value={stake} /></label><label className="field-control"><span>Back odds</span><input inputMode="decimal" onChange={event => setBackOdds(event.target.value)} value={backOdds} /></label><label className="field-control"><span>Lay odds</span><input inputMode="decimal" onChange={event => setLayOdds(event.target.value)} value={layOdds} /></label><label className="field-control"><span>Exchange commission</span><input inputMode="decimal" onChange={event => setCommission(event.target.value)} value={commission} /></label></div>
    {manual ? <div className="status-message"><span>Manual price entered. Provider refreshes will not overwrite this summary.</span><button className="button-link" onClick={() => { setBackOdds(opportunity.back.odds); setLayOdds(opportunity.lay.odds); }} type="button">Reset to latest quotes</button></div> : null}
    <label className="toggle-row"><input checked={advanced} onChange={event => { setAdvanced(event.target.checked); if (!event.target.checked) setStrategy("Standard"); }} type="checkbox" /><span><strong>Advanced</strong><small>Compare the existing Underlay, Standard and Overlay authorities.</small></span></label>
    {advanced ? <CalculatorSegmentedControl ariaLabel="Lay strategy" dataPdId="oddsmatcher.strategy" onChange={setStrategy} options={[{ label: "Underlay", value: "Underlay" }, { label: "Standard", value: "Standard" }, { label: "Overlay", value: "Overlay" }]} value={strategy} /> : null}
    {previewState === "loading" ? <LedgerLoadingIndicator label="Updating Bet Summary" /> : null}
    {previewState === "error" ? <p className="field-validation-text" role="alert">Enter complete valid stake, odds and commission values.</p> : null}
    {preview ? <><div className="stat-strip oddsmatcher-summary-values"><article className="stat-card"><span className="eyebrow">Required lay stake</span><strong><CopyableFinancialValue label="Required lay stake" value={preview.selected_lay_stake} /></strong></article><article className="stat-card"><span className="eyebrow">Liability</span><strong><FinancialValue value={preview.liability} /></strong></article><article className="stat-card"><span className="eyebrow">Worst case</span><strong><FinancialValue value={preview.matched_result} /></strong></article></div><CalculatorOutcomes columns={["Bookmaker and exchange"]} inspectionId="oddsmatcher.outcomes" rows={[{ key: "back-wins", label: "Back wins", components: [[preview.pnl_if_back_wins]], total: preview.pnl_if_back_wins }, { key: "lay-wins", label: "Lay wins", components: [[preview.pnl_if_lay_wins]], total: preview.pnl_if_lay_wins }]} /></> : null}
    <div className="stat-strip"><article className="stat-card"><span className="eyebrow">Bookmaker Account</span><strong>{opportunity.back.account_name}</strong><p className={eligibilityClass(opportunity.back_eligibility.state)}>{opportunity.back_eligibility.reason}</p></article><article className="stat-card"><span className="eyebrow">Exchange Account</span><strong>{opportunity.lay.account_name}</strong><p className={eligibilityClass(opportunity.lay_eligibility.state)}>{opportunity.lay_eligibility.reason}</p></article></div>
    {draftError ? <p className="field-validation-text" role="alert">{draftError}</p> : null}
    {draftState === "saved" ? <p className="status-message" role="status">Prospecting draft saved. No balance or placed-bet state changed. <Link href={`/profiles/${profileId}/tracker/sportsbook-bets?record=${encodeURIComponent(draftId)}`}>Open Sportsbook draft</Link></p> : null}
  </div><footer className="modal-sticky-footer"><div className="tracker-nav"><QuoteLink href={opportunity.back.link} label={`${opportunity.back.account_name} quote`} /><QuoteLink href={opportunity.lay.link} label={`${opportunity.lay.account_name} quote`} /><button className="button-link" onClick={() => void navigator.clipboard.writeText(opportunityCopyText(opportunity))} type="button">Copy opportunity</button></div><button className="modal-primary-button" disabled={!opportunity.can_create_prospecting_draft || previewState !== "ready" || draftState === "saving" || draftState === "saved"} onClick={() => void createDraft()} type="button">{draftState === "saving" ? "Adding draft…" : draftState === "saved" ? "Draft added" : "Add Prospecting Draft"}</button></footer></section></div></ModalBoundary>;
}
