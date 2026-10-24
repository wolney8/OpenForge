"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
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
type ProfileOption = {
  profile_id: string;
  display_name: string;
  status?: string;
};
type FilterPanel =
  "all" | "selection" | "startTime" | "back" | "lay" | "rating";

async function responseError(response: Response, fallback: string) {
  try {
    const value = (await response.json()) as { detail?: unknown };
    if (typeof value.detail === "string") return value.detail;
  } catch {
    /* safe fallback */
  }
  return fallback;
}
function formatObserved(seconds: number) {
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}
function eligibilityClass(state: "eligible" | "warning" | "unavailable") {
  return state === "unavailable"
    ? "field-validation-text"
    : state === "warning"
      ? "field-warning-text"
      : "field-hint";
}
function QuoteLink({ href, label }: { href: string | null; label: string }) {
  return href ? (
    <a
      className="table-action-button"
      href={href}
      rel="noreferrer"
      target="_blank"
      title={`Open ${label}`}
      aria-label={`Open ${label}`}
    >
      <span aria-hidden="true" className="material-symbols-outlined">
        open_in_new
      </span>
    </a>
  ) : null;
}

export function OddsMatcherShell({
  initialProfileId = null,
  profileId: legacyProfileId,
}: {
  initialProfileId?: string | null;
  profileId?: string;
}) {
  const [profileId, setProfileId] = useState<string | null>(initialProfileId ?? legacyProfileId ?? null);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [feed, setFeed] = useState<OddsMatcherFeed | null>(null);
  const [readState, setReadState] = useState<ReadState>("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<OddsMatcherFilters>(
    emptyOddsMatcherFilters,
  );
  const [sort, setSort] = useState<OpportunitySort>({
    key: "rating",
    direction: "desc",
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(16);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [filterPanel, setFilterPanel] = useState<FilterPanel | null>(null);
  const [defaultStake, setDefaultStake] = useState("10");
  const [selected, setSelected] = useState<OddsMatcherOpportunity | null>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const inspectButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    void fetch(`${apiBaseUrl}/profiles`, { credentials: "include" })
      .then(async (response) =>
        response.ok ? (response.json() as Promise<ProfileOption[]>) : [],
      )
      .then((value) =>
        setProfiles(
          value.filter(
            (profile) =>
              (profile.status ?? "active").toLowerCase() !== "archived",
          ),
        ),
      )
      .catch(() => setProfiles([]));
  }, []);
  const profileQuery = profileId ? `?profile_id=${encodeURIComponent(profileId)}` : "";
  const load = useCallback(
    async (refresh: boolean) => {
      if (refresh) setRefreshing(true);
      else setReadState("loading");
      setError("");
      try {
        const response = await fetch(
          `${apiBaseUrl}/oddsmatcher${refresh ? "/refresh" : ""}${profileQuery}`,
          { credentials: "include", method: refresh ? "POST" : "GET" },
        );
        if (!response.ok)
          throw new Error(
            await responseError(
              response,
              "Oddsmatcher data could not be loaded.",
            ),
          );
        setFeed((await response.json()) as OddsMatcherFeed);
        setReadState("ready");
        setPage(1);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Oddsmatcher data could not be loaded.",
        );
        setReadState((current) =>
          refresh && current === "ready" ? "ready" : "error",
        );
      } finally {
        setRefreshing(false);
      }
    },
    [profileQuery],
  );
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) void load(false); });
    return () => { active = false; };
  }, [load]);

  const visible = useMemo(
    () => filterAndSortOpportunities(feed?.opportunities ?? [], filters, sort),
    [feed, filters, sort],
  );
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const rows = visible.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const backProviders = useMemo(
    () =>
      [
        ...new Set(
          (feed?.opportunities ?? []).map((row) => row.back.account_name),
        ),
      ].sort(),
    [feed],
  );
  const layProviders = useMemo(
    () =>
      [
        ...new Set(
          (feed?.opportunities ?? []).map((row) => row.lay.account_name),
        ),
      ].sort(),
    [feed],
  );
  const activeFilterCount = [
    filters.selection !== "ALL",
    filters.startTime !== "ALL",
    Boolean(filters.backProvider),
    Boolean(filters.layProvider),
    Boolean(filters.minimumRating),
    filters.showArbs,
  ].filter(Boolean).length;
  const setFilter = <K extends keyof OddsMatcherFilters>(
    key: K,
    value: OddsMatcherFilters[K],
  ) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
    setSelected(null);
  };
  const changeSort = (key: OpportunitySort["key"]) => {
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
    setPage(1);
  };
  const openFilter = (panel: FilterPanel, trigger: HTMLButtonElement) => {
    filterButtonRef.current = trigger;
    setFilterPanel(panel);
  };
  const clearFilters = () => {
    setFilters(emptyOddsMatcherFilters);
    setPage(1);
    setSelected(null);
  };
  const profileName = profiles.find(
    (profile) => profile.profile_id === profileId,
  )?.display_name;

  const opportunityRow = (row: OddsMatcherOpportunity, mobile = false) => (
    <article
      className={`oddsmatcher-opportunity-card${row.freshness === "stale" ? " is-muted" : ""}`}
      data-pd-id={`oddsmatcher.opportunity.${row.opportunity_id}`}
      key={`${mobile ? "card" : "row"}:${row.opportunity_id}`}
    >
      <div className="oddsmatcher-card-status">
        <span
          className={`table-chip${row.freshness === "stale" ? " table-chip-warning" : ""}`}
        >
          {row.freshness === "stale"
            ? `Stale · ${formatObserved(row.age_seconds)}`
            : `${Number(row.display_rating).toFixed(2)}%`}
        </span>
        <time dateTime={row.starts_at}>
          {new Date(row.starts_at).toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
      </div>
      <div className="table-cell-stack">
        <strong>{row.event_name}</strong>
        <span>{row.competition}</span>
      </div>
      <div className="table-cell-stack">
        <strong>{row.selection}</strong>
        <span>{row.market}</span>
      </div>
      <div className="oddsmatcher-card-quotes">
        <QuoteBlock
          label="Back"
          name={row.back.account_name}
          odds={row.back.odds}
          reason={profileId ? row.back_eligibility.reason : undefined}
        />
        <QuoteBlock
          label="Lay"
          name={row.lay.account_name}
          odds={row.lay.odds}
          reason="Liquidity unknown"
        />
      </div>
      <OpportunityActions
        onInspect={(trigger) => {
          inspectButtonRef.current = trigger;
          setSelected(row);
        }}
        row={row}
      />
    </article>
  );

  return (
    <main className="page-shell stack">
      <section
        className="content-panel stack oddsmatcher-shell"
        data-pd-id="oddsmatcher.shell"
      >
        <header className="calculator-panel-heading">
          <div className="stack-tight">
            <span className="eyebrow">Tools · Football Match Odds</span>
            <h1>Oddsmatcher</h1>
            <p className="lede">
              Compare real bookmaker back and exchange lay quotes, inspect
              qualifying maths and add an unplaced Prospecting draft.
            </p>
          </div>
        </header>
        <div className="oddsmatcher-profile-context">
          <label className="field-control">
            <span>Profile context</span>
            <select
              aria-label="Oddsmatcher Profile context"
              data-pd-id="oddsmatcher.profile-context"
              onChange={(event) => {
                const next = event.target.value || null;
                const url = new URL(window.location.href);
                if (next) url.searchParams.set("profileId", next);
                else url.searchParams.delete("profileId");
                window.history.replaceState(window.history.state, "", url);
                setProfileId(next);
                setSelected(null);
                setPage(1);
              }}
              value={profileId ?? ""}
            >
              <option value="">No Profile / All opportunities</option>
              {profiles.map((profile) => (
                <option key={profile.profile_id} value={profile.profile_id}>
                  {profile.display_name}
                </option>
              ))}
            </select>
          </label>
          <p>
            {profileId
              ? `${profileName ?? profileId} Account eligibility and exchange commission apply.`
              : "Choose a Profile to check Account eligibility and add to Tracker."}
          </p>
        </div>
        <div className="oddsmatcher-primary-toolbar">
          <div className="oddsmatcher-mode-control" aria-label="Bet mode">
            <span>Bet mode</span>
            <strong>Normal / Qualifying</strong>
          </div>
          <label className="field-control table-search-field oddsmatcher-search">
            <span className="visually-hidden">Search opportunities</span>
            <span aria-hidden="true" className="material-symbols-outlined">
              search
            </span>
            <input
              aria-label="Search Oddsmatcher events"
              onChange={(event) => setFilter("search", event.target.value)}
              placeholder="Search events, teams or providers"
              type="search"
              value={filters.search}
            />
          </label>
          <button
            aria-haspopup="dialog"
            className="button-link icon-text-action"
            data-pd-id="oddsmatcher.settings.open"
            onClick={() => setSettingsOpen(true)}
            ref={settingsButtonRef}
            type="button"
          >
            <span aria-hidden="true" className="material-symbols-outlined">
              settings
            </span>
            <span>Settings</span>
          </button>
        </div>
        <div
          className="oddsmatcher-filter-toolbar"
          data-pd-id="oddsmatcher.filters"
        >
          <div className="oddsmatcher-desktop-filters">
            {(
              [
                ["selection", "Selection", filters.selection !== "ALL" ? 1 : 0],
                [
                  "startTime",
                  "Start time",
                  filters.startTime !== "ALL" ? 1 : 0,
                ],
                ["back", "Back", filters.backProvider ? 1 : 0],
                ["lay", "Lay", filters.layProvider ? 1 : 0],
                [
                  "rating",
                  "Rating",
                  filters.minimumRating || filters.showArbs ? 1 : 0,
                ],
              ] as const
            ).map(([id, label, count]) => (
              <button
                aria-haspopup="dialog"
                className={`filter-chip${count ? " is-active" : ""}`}
                key={id}
                onClick={(event) => openFilter(id, event.currentTarget)}
                type="button"
              >
                <span>{label}</span>
                {count ? (
                  <span className="table-filter-badge">{count}</span>
                ) : null}
                <span aria-hidden="true" className="material-symbols-outlined">
                  expand_more
                </span>
              </button>
            ))}
          </div>
          <button
            aria-haspopup="dialog"
            className={`filter-chip oddsmatcher-mobile-filter${activeFilterCount ? " is-active" : ""}`}
            onClick={(event) => openFilter("all", event.currentTarget)}
            type="button"
          >
            Filters{activeFilterCount ? ` ${activeFilterCount}` : ""}
            <span aria-hidden="true" className="material-symbols-outlined">
              tune
            </span>
          </button>
          <div className="oddsmatcher-filter-utilities">
            <button
              className="button-link"
              disabled={!activeFilterCount && !filters.search}
              onClick={clearFilters}
              type="button"
            >
              Clear
            </button>
            <button
              aria-busy={refreshing}
              className="modal-primary-button icon-text-action"
              data-pd-id="oddsmatcher.refresh"
              disabled={refreshing}
              onClick={() => void load(true)}
              type="button"
            >
              <span aria-hidden="true" className="material-symbols-outlined">
                refresh
              </span>
              <span>{refreshing ? "Refreshing…" : "Refresh"}</span>
            </button>
            <button
              className="button-link icon-text-action"
              disabled
              title="Saved filters are planned after the Alpha"
              type="button"
            >
              <span aria-hidden="true" className="material-symbols-outlined">
                bookmark
              </span>
              <span>My Filters</span>
            </button>
          </div>
        </div>
        <div
          className="oddsmatcher-coverage"
          aria-label="Current odds coverage"
        >
          <span>
            {feed?.competitions.join(" · ") ?? "Three approved competitions"}
          </span>
          {feed ? (
            <span>
              {feed.event_count} events · {feed.bookmaker_count} bookmakers ·{" "}
              {feed.exchange_count} exchanges
            </span>
          ) : null}
          {feed?.fetched_at ? (
            <span>
              Snapshot {new Date(feed.fetched_at).toLocaleString("en-GB")}
            </span>
          ) : (
            <span>Manual refresh required</span>
          )}
          {feed?.provider_credits_remaining != null ? (
            <span>
              {feed.provider_credits_remaining} provider credits remaining
            </span>
          ) : null}
        </div>
        <div className="oddsmatcher-boundary-note" role="note">
          <strong>Prospecting only · liquidity unknown.</strong>
          <span>
            Provider lay prices do not prove available depth. No placed-bet or
            exchange-placement action is available.
          </span>
        </div>
        {readState === "loading" ? (
          <LedgerLoadingIndicator label="Loading saved Oddsmatcher snapshot" />
        ) : null}
        {error ? (
          <p className="error-text" role="alert">
            {error}
          </p>
        ) : null}
        {feed?.warning ? (
          <p className="field-warning-text" role="status">
            {feed.warning}
          </p>
        ) : null}
        {feed?.state === "stale" ? (
          <p className="field-warning-text">
            These prices are stale. Refresh before relying on them.
          </p>
        ) : null}
        {readState === "ready" && feed?.state === "empty" ? (
          <div className="empty-state stack-tight">
            <strong>No odds snapshot is loaded.</strong>
            <span>
              Use Refresh once to make one bounded provider request across the
              approved competitions.
            </span>
          </div>
        ) : null}
        {readState === "ready" && feed && feed.state !== "empty" ? (
          <>
            <LedgerPagination
              ariaLabel="Oddsmatcher results"
              currentPage={currentPage}
              onPageChange={setPage}
              onPageSizeChange={(value) => {
                setPageSize(value);
                setPage(1);
              }}
              pageCount={pageCount}
              pageSize={pageSize}
              position="top"
              totalRows={visible.length}
            />
            <div className="table-scroll oddsmatcher-desktop-results">
              <table className="data-table oddsmatcher-table">
                <thead>
                  <tr>
                    <th>
                      <button
                        className="table-sort-button"
                        onClick={() => changeSort("start")}
                        type="button"
                      >
                        Date
                      </button>
                    </th>
                    <th>
                      <button
                        className="table-sort-button"
                        onClick={() => changeSort("event")}
                        type="button"
                      >
                        Event
                      </button>
                    </th>
                    <th>Bet</th>
                    <th>Back Odds</th>
                    <th>Lay Odds</th>
                    <th>
                      <button
                        className="table-sort-button"
                        onClick={() => changeSort("rating")}
                        type="button"
                      >
                        Rating
                      </button>
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.opportunity_id}>
                      <td>
                        <span className="table-cell-stack">
                          <time dateTime={row.starts_at}>
                            {new Date(row.starts_at).toLocaleDateString(
                              "en-GB",
                              { day: "2-digit", month: "short" },
                            )}
                          </time>
                          <strong>
                            {new Date(row.starts_at).toLocaleTimeString(
                              "en-GB",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </strong>
                        </span>
                      </td>
                      <td>
                        <span className="table-cell-stack">
                          <strong>{row.event_name}</strong>
                          <span>{row.competition}</span>
                        </span>
                      </td>
                      <td>
                        <span className="table-cell-stack">
                          <strong>{row.selection}</strong>
                          <span>{row.market}</span>
                        </span>
                      </td>
                      <td>
                        <QuoteBlock
                          label="Back"
                          name={row.back.account_name}
                          odds={row.back.odds}
                          reason={
                            profileId ? row.back_eligibility.reason : undefined
                          }
                        />
                      </td>
                      <td>
                        <QuoteBlock
                          label="Lay"
                          name={row.lay.account_name}
                          odds={row.lay.odds}
                          reason="Liquidity unknown"
                        />
                      </td>
                      <td>
                        <span className="table-cell-stack">
                          <strong>
                            {Number(row.display_rating).toFixed(2)}%
                          </strong>
                          <span>
                            {row.commission_aware_rating
                              ? `${Number(row.commission_aware_rating).toFixed(2)}% after commission`
                              : profileId
                                ? "Commission unavailable"
                                : "Choose Profile for commission"}
                          </span>
                        </span>
                      </td>
                      <td>
                        <OpportunityActions
                          onInspect={(trigger) => {
                            inspectButtonRef.current = trigger;
                            setSelected(row);
                          }}
                          row={row}
                        />
                      </td>
                    </tr>
                  ))}
                  {!rows.length ? (
                    <tr>
                      <td colSpan={7}>
                        No opportunities match the current filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="oddsmatcher-mobile-results">
              {rows.map((row) => opportunityRow(row, true))}
              {!rows.length ? (
                <p>No opportunities match the current filters.</p>
              ) : null}
            </div>
            <LedgerPagination
              ariaLabel="Oddsmatcher results"
              currentPage={currentPage}
              onPageChange={setPage}
              onPageSizeChange={(value) => {
                setPageSize(value);
                setPage(1);
              }}
              pageCount={pageCount}
              pageSize={pageSize}
              position="bottom"
              totalRows={visible.length}
            />
          </>
        ) : null}
        {filterPanel ? (
          <FilterDialog
            backProviders={backProviders}
            filters={filters}
            layProviders={layProviders}
            onChange={setFilter}
            onClose={() => setFilterPanel(null)}
            panel={filterPanel}
            returnFocusRef={filterButtonRef}
          />
        ) : null}
        {settingsOpen ? (
          <SettingsDialog
            defaultStake={defaultStake}
            filters={filters}
            onChangeDefaultStake={setDefaultStake}
            onChangeShowArbs={(value) => setFilter("showArbs", value)}
            onClose={() => setSettingsOpen(false)}
            returnFocusRef={settingsButtonRef}
          />
        ) : null}
        {selected ? (
          <BetSummaryDialog
            defaultStake={defaultStake}
            onClose={() => setSelected(null)}
            opportunity={selected}
            profileId={profileId}
            returnFocusRef={inspectButtonRef}
          />
        ) : null}
      </section>
    </main>
  );
}

function QuoteBlock({
  label,
  name,
  odds,
  reason,
}: {
  label: string;
  name: string;
  odds: string;
  reason?: string;
}) {
  return (
    <span className="oddsmatcher-quote-block">
      <small>{label}</small>
      <strong>{name}</strong>
      <b>{Number(odds).toFixed(2)}</b>
      {reason ? <span>{reason}</span> : null}
    </span>
  );
}
function OpportunityActions({
  row,
  onInspect,
}: {
  row: OddsMatcherOpportunity;
  onInspect: (trigger: HTMLButtonElement) => void;
}) {
  return (
    <div className="table-action-row">
      <QuoteLink
        href={row.back.link}
        label={`${row.back.account_name} quote`}
      />
      <QuoteLink href={row.lay.link} label={`${row.lay.account_name} quote`} />
      <button
        aria-label={`Copy ${row.event_name} ${row.selection} opportunity`}
        className="table-action-button"
        onClick={() =>
          void navigator.clipboard.writeText(opportunityCopyText(row))
        }
        title="Copy opportunity"
        type="button"
      >
        <span aria-hidden="true" className="material-symbols-outlined">
          content_copy
        </span>
      </button>
      <button
        aria-label={`Open Bet Summary for ${row.event_name} ${row.selection}`}
        className="table-action-button"
        onClick={(event) => onInspect(event.currentTarget)}
        title="Bet Summary"
        type="button"
      >
        <span aria-hidden="true" className="material-symbols-outlined">
          calculate
        </span>
        <span className="visually-hidden">Bet Summary</span>
      </button>
    </div>
  );
}

function FilterDialog({
  backProviders,
  filters,
  layProviders,
  onChange,
  onClose,
  panel,
  returnFocusRef,
}: {
  backProviders: string[];
  filters: OddsMatcherFilters;
  layProviders: string[];
  onChange: <K extends keyof OddsMatcherFilters>(
    key: K,
    value: OddsMatcherFilters[K],
  ) => void;
  onClose: () => void;
  panel: FilterPanel;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}) {
  const show = (name: Exclude<FilterPanel, "all">) =>
    panel === "all" || panel === name;
  return (
    <ModalBoundary onDismiss={onClose} returnFocusRef={returnFocusRef}>
      <div className="modal-backdrop" onClick={onClose}>
        <section
          aria-label="Oddsmatcher filters"
          aria-modal="true"
          className="modal-panel oddsmatcher-filter-dialog stack"
          data-pd-id="oddsmatcher.filter-drawer"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
        >
          <header className="calculator-panel-heading-row">
            <div>
              <span className="eyebrow">Opportunity controls</span>
              <h2>Filters</h2>
            </div>
            <button
              aria-label="Close filters"
              className="modal-close-button"
              onClick={onClose}
              type="button"
            >
              <span aria-hidden="true" className="material-symbols-outlined">
                close
              </span>
            </button>
          </header>
          <div className="form-grid oddsmatcher-filter-fields">
            {show("selection") ? (
              <label className="field-control">
                <span>Selection</span>
                <select
                  onChange={(event) =>
                    onChange(
                      "selection",
                      event.target.value as OddsMatcherFilters["selection"],
                    )
                  }
                  value={filters.selection}
                >
                  <option value="ALL">All selections</option>
                  <option value="HOME">Home</option>
                  <option value="DRAW">Draw</option>
                  <option value="AWAY">Away</option>
                </select>
              </label>
            ) : null}
            {show("startTime") ? (
              <label className="field-control">
                <span>Start time</span>
                <select
                  onChange={(event) =>
                    onChange(
                      "startTime",
                      event.target.value as OddsMatcherFilters["startTime"],
                    )
                  }
                  value={filters.startTime}
                >
                  <option value="ALL">Any start time</option>
                  <option value="6H">Next 6 hours</option>
                  <option value="24H">Next 24 hours</option>
                  <option value="48H">Next 48 hours</option>
                </select>
              </label>
            ) : null}
            {show("back") ? (
              <label className="field-control">
                <span>Back bookmaker</span>
                <select
                  onChange={(event) =>
                    onChange("backProvider", event.target.value)
                  }
                  value={filters.backProvider}
                >
                  <option value="">All bookmakers</option>
                  {backProviders.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
            ) : null}
            {show("lay") ? (
              <label className="field-control">
                <span>Lay exchange</span>
                <select
                  onChange={(event) =>
                    onChange("layProvider", event.target.value)
                  }
                  value={filters.layProvider}
                >
                  <option value="">All exchanges</option>
                  {layProviders.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
            ) : null}
            {show("rating") ? (
              <>
                <label className="field-control">
                  <span>Minimum rating</span>
                  <select
                    onChange={(event) =>
                      onChange("minimumRating", event.target.value)
                    }
                    value={filters.minimumRating}
                  >
                    <option value="">Any rating</option>
                    <option value="95">95%+</option>
                    <option value="97">97%+</option>
                    <option value="99">99%+</option>
                  </select>
                </label>
                <label className="toggle-row">
                  <input
                    checked={filters.showArbs}
                    onChange={(event) =>
                      onChange("showArbs", event.target.checked)
                    }
                    type="checkbox"
                  />
                  <span>
                    <strong>Show arbs</strong>
                    <small>Ratings above 100% are hidden by default.</small>
                  </span>
                </label>
              </>
            ) : null}
          </div>
          <footer className="modal-sticky-footer">
            <button
              className="modal-primary-button"
              onClick={onClose}
              type="button"
            >
              Apply filters
            </button>
          </footer>
        </section>
      </div>
    </ModalBoundary>
  );
}

function SettingsDialog({
  defaultStake,
  filters,
  onChangeDefaultStake,
  onChangeShowArbs,
  onClose,
  returnFocusRef,
}: {
  defaultStake: string;
  filters: OddsMatcherFilters;
  onChangeDefaultStake: (value: string) => void;
  onChangeShowArbs: (value: boolean) => void;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <ModalBoundary onDismiss={onClose} returnFocusRef={returnFocusRef}>
      <div className="modal-backdrop" onClick={onClose}>
        <section
          aria-label="Oddsmatcher settings"
          aria-modal="true"
          className="modal-panel stack"
          data-pd-id="oddsmatcher.settings"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
        >
          <header className="calculator-panel-heading-row">
            <div>
              <span className="eyebrow">Session settings</span>
              <h2>Oddsmatcher Settings</h2>
            </div>
            <button
              aria-label="Close Oddsmatcher settings"
              className="modal-close-button"
              onClick={onClose}
              type="button"
            >
              <span aria-hidden="true" className="material-symbols-outlined">
                close
              </span>
            </button>
          </header>
          <label className="field-control">
            <span>Default back stake</span>
            <input
              inputMode="decimal"
              onChange={(event) => onChangeDefaultStake(event.target.value)}
              value={defaultStake}
            />
          </label>
          <label className="toggle-row">
            <input
              checked={filters.showArbs}
              onChange={(event) => onChangeShowArbs(event.target.checked)}
              type="checkbox"
            />
            <span>
              <strong>Show arbs</strong>
              <small>Ratings over 100% are hidden by default.</small>
            </span>
          </label>
          <p className="field-hint">
            Manual refresh is the only refresh mode. Saved filters and automatic
            polling are outside this Alpha.
          </p>
          <footer className="modal-sticky-footer">
            <button
              className="modal-primary-button"
              onClick={onClose}
              type="button"
            >
              Done
            </button>
          </footer>
        </section>
      </div>
    </ModalBoundary>
  );
}

function BetSummaryDialog({
  defaultStake,
  onClose,
  opportunity,
  profileId,
  returnFocusRef,
}: {
  defaultStake: string;
  onClose: () => void;
  opportunity: OddsMatcherOpportunity;
  profileId: string | null;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}) {
  const [stake, setStake] = useState(defaultStake);
  const [backOdds, setBackOdds] = useState(opportunity.back.odds);
  const [layOdds, setLayOdds] = useState(opportunity.lay.odds);
  const [commission, setCommission] = useState(
    opportunity.exchange_commission ?? "",
  );
  const [strategy, setStrategy] = useState<Strategy>("Standard");
  const [advanced, setAdvanced] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewState, setPreviewState] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [draftState, setDraftState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
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
      setPreviewState("loading");
      setPreview(null);
      try {
        const response = await fetch(
          `${apiBaseUrl}/fund-manager/calculators/matched-betting/preview`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              bet_type: "qualifying",
              free_bet_mode: "SNR",
              promotion_mode: "standard",
              strategy,
              back_stake: stake,
              back_odds: backOdds,
              lay_odds: layOdds,
              exchange_commission: commission,
              manual_lay_stake: "",
              promotion_value: "",
              bonus_trigger: "Lay Wins",
              bonus_backing_bet: "Normal",
              retention_percent: "70",
              underlay_factor: "0.928",
              overlay_factor: "1.300",
            }),
          },
        );
        if (!response.ok) throw new Error();
        const value = (await response.json()) as Preview;
        if (current === version.current) {
          setPreview(value);
          setPreviewState("ready");
        }
      } catch (caught) {
        if (
          current === version.current &&
          !(caught instanceof DOMException && caught.name === "AbortError")
        )
          setPreviewState("error");
      }
    });
    return () => controller.abort();
  }, [backOdds, commission, layOdds, stake, strategy]);

  const createDraft = async () => {
    if (!profileId) {
      setDraftError("Choose a Profile to add this opportunity to Tracker.");
      return;
    }
    setDraftState("saving");
    setDraftError("");
    try {
      const response = await fetch(
        `${apiBaseUrl}/profiles/${profileId}/oddsmatcher/prospecting-drafts`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            opportunity_id: opportunity.opportunity_id,
            retry_token: retryToken.current,
            back_stake: stake,
            back_odds: backOdds,
            lay_odds: layOdds,
            exchange_commission: commission,
            strategy,
          }),
        },
      );
      if (!response.ok)
        throw new Error(
          await responseError(
            response,
            "Prospecting draft could not be created.",
          ),
        );
      const value = (await response.json()) as {
        sportsbook_bet: { sportsbook_bet_id: string };
      };
      setDraftId(value.sportsbook_bet.sportsbook_bet_id);
      setDraftState("saved");
    } catch (caught) {
      setDraftError(
        caught instanceof Error
          ? caught.message
          : "Prospecting draft could not be created.",
      );
      setDraftState("error");
    }
  };

  return (
    <ModalBoundary onDismiss={onClose} returnFocusRef={returnFocusRef}>
      <div className="modal-backdrop modal-backdrop-elevated" onClick={onClose}>
        <section
          aria-label="Oddsmatcher Bet Summary"
          aria-modal="true"
          className="modal-panel oddsmatcher-summary-dialog"
          data-pd-id="oddsmatcher.bet-summary"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
        >
          <header className="modal-sticky-header workflow-panel-header">
            <div className="stack-tight">
              <span className="eyebrow">Bet Summary · Normal / Qualifying</span>
              <h2>{opportunity.event_name}</h2>
              <p>
                {opportunity.selection} · {opportunity.market} ·{" "}
                {opportunity.competition}
              </p>
            </div>
            <button
              aria-label="Close Bet Summary"
              className="modal-close-button"
              onClick={onClose}
              type="button"
            >
              <span aria-hidden="true" className="material-symbols-outlined">
                close
              </span>
            </button>
          </header>
          <div className="oddsmatcher-summary-body stack">
            <div className="oddsmatcher-quote-context">
              <span>
                {opportunity.back.account_name} back ·{" "}
                <time dateTime={opportunity.back.observed_at}>
                  {formatObserved(opportunity.age_seconds)}
                </time>
              </span>
              <span>
                {opportunity.lay.account_name} lay ·{" "}
                <time dateTime={opportunity.lay.observed_at}>
                  {formatObserved(opportunity.age_seconds)}
                </time>
              </span>
              <strong>
                {Number(opportunity.display_rating).toFixed(2)}% rating
              </strong>
            </div>
            <div className="oddsmatcher-boundary-note" role="note">
              <strong>Liquidity unknown</strong>
              <span>
                The provider supplies a lay price without available depth. The
                required lay stake is a calculation, not proof it can be
                matched.
              </span>
            </div>
            <div className="form-grid oddsmatcher-calculator-fields">
              <label className="field-control">
                <span>Back stake</span>
                <input
                  inputMode="decimal"
                  onChange={(event) => setStake(event.target.value)}
                  value={stake}
                />
              </label>
              <label className="field-control">
                <span>Back odds</span>
                <input
                  inputMode="decimal"
                  onChange={(event) => setBackOdds(event.target.value)}
                  value={backOdds}
                />
              </label>
              <label className="field-control">
                <span>Lay odds</span>
                <input
                  inputMode="decimal"
                  onChange={(event) => setLayOdds(event.target.value)}
                  value={layOdds}
                />
              </label>
              <label className="field-control">
                <span>Exchange commission</span>
                <input
                  inputMode="decimal"
                  onChange={(event) => setCommission(event.target.value)}
                  value={commission}
                />
              </label>
            </div>
            {manual ? (
              <div className="status-message">
                <span>
                  Manual price entered. Provider refreshes will not overwrite
                  this summary.
                </span>
                <button
                  className="button-link"
                  onClick={() => {
                    setBackOdds(opportunity.back.odds);
                    setLayOdds(opportunity.lay.odds);
                  }}
                  type="button"
                >
                  Reset to latest quotes
                </button>
              </div>
            ) : null}
            <label className="toggle-row">
              <input
                checked={advanced}
                onChange={(event) => {
                  setAdvanced(event.target.checked);
                  if (!event.target.checked) setStrategy("Standard");
                }}
                type="checkbox"
              />
              <span>
                <strong>Advanced</strong>
                <small>
                  Compare the existing Underlay, Standard and Overlay
                  authorities.
                </small>
              </span>
            </label>
            {advanced ? (
              <CalculatorSegmentedControl
                ariaLabel="Lay strategy"
                dataPdId="oddsmatcher.strategy"
                onChange={setStrategy}
                options={[
                  { label: "Underlay", value: "Underlay" },
                  { label: "Standard", value: "Standard" },
                  { label: "Overlay", value: "Overlay" },
                ]}
                value={strategy}
              />
            ) : null}
            {previewState === "loading" ? (
              <LedgerLoadingIndicator label="Updating Bet Summary" />
            ) : null}
            {previewState === "error" ? (
              <p className="field-validation-text" role="alert">
                Enter complete valid stake, odds and commission values.
              </p>
            ) : null}
            {preview ? (
              <>
                <div className="stat-strip oddsmatcher-summary-values">
                  <article className="stat-card">
                    <span className="eyebrow">Required lay stake</span>
                    <strong>
                      <CopyableFinancialValue
                        label="Required lay stake"
                        value={preview.selected_lay_stake}
                      />
                    </strong>
                  </article>
                  <article className="stat-card">
                    <span className="eyebrow">Liability</span>
                    <strong>
                      <FinancialValue value={preview.liability} />
                    </strong>
                  </article>
                  <article className="stat-card">
                    <span className="eyebrow">Worst case</span>
                    <strong>
                      <FinancialValue value={preview.matched_result} />
                    </strong>
                  </article>
                </div>
                <CalculatorOutcomes
                  columns={["Bookmaker and exchange"]}
                  inspectionId="oddsmatcher.outcomes"
                  rows={[
                    {
                      key: "back-wins",
                      label: "Back wins",
                      components: [[preview.pnl_if_back_wins]],
                      total: preview.pnl_if_back_wins,
                    },
                    {
                      key: "lay-wins",
                      label: "Lay wins",
                      components: [[preview.pnl_if_lay_wins]],
                      total: preview.pnl_if_lay_wins,
                    },
                  ]}
                />
              </>
            ) : null}
            <div className="stat-strip">
              <article className="stat-card">
                <span className="eyebrow">Bookmaker Account</span>
                <strong>{opportunity.back.account_name}</strong>
                <p
                  className={eligibilityClass(
                    opportunity.back_eligibility.state,
                  )}
                >
                  {opportunity.back_eligibility.reason}
                </p>
              </article>
              <article className="stat-card">
                <span className="eyebrow">Exchange Account</span>
                <strong>{opportunity.lay.account_name}</strong>
                <p
                  className={eligibilityClass(
                    opportunity.lay_eligibility.state,
                  )}
                >
                  {opportunity.lay_eligibility.reason}
                </p>
              </article>
            </div>
            {draftError ? (
              <p className="field-validation-text" role="alert">
                {draftError}
              </p>
            ) : null}
            {draftState === "saved" && profileId ? (
              <p className="status-message" role="status">
                Prospecting draft saved. No balance or placed-bet state changed.{" "}
                <Link
                  href={`/profiles/${profileId}/tracker/sportsbook-bets?record=${encodeURIComponent(draftId)}`}
                >
                  Open Sportsbook draft
                </Link>
              </p>
            ) : null}
            {!profileId ? (
              <p className="field-hint">
                Choose a Profile to add this opportunity to Tracker.
              </p>
            ) : null}
          </div>
          <footer className="modal-sticky-footer">
            <div className="tracker-nav">
              <QuoteLink
                href={opportunity.back.link}
                label={`${opportunity.back.account_name} quote`}
              />
              <QuoteLink
                href={opportunity.lay.link}
                label={`${opportunity.lay.account_name} quote`}
              />
              <button
                className="button-link"
                onClick={() =>
                  void navigator.clipboard.writeText(
                    opportunityCopyText(opportunity),
                  )
                }
                type="button"
              >
                Copy opportunity
              </button>
            </div>
            <button
              className="modal-primary-button"
              disabled={
                !profileId ||
                !opportunity.can_create_prospecting_draft ||
                previewState !== "ready" ||
                draftState === "saving" ||
                draftState === "saved"
              }
              onClick={() => void createDraft()}
              type="button"
            >
              {draftState === "saving"
                ? "Adding draft…"
                : draftState === "saved"
                  ? "Draft added"
                  : "Add Prospecting Draft"}
            </button>
          </footer>
        </section>
      </div>
    </ModalBoundary>
  );
}
