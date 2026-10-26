"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { CalculatorSegmentedControl } from "@/components/calculator-segmented-control";
import { CommissionInput } from "@/components/commission-input";
import { CopyableFinancialValue } from "@/components/copyable-financial-value";
import { FinancialValue } from "@/components/financial-value";
import { FinancialTextInput } from "@/components/financial-text-input";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { LedgerPagination } from "@/components/ledger-pagination";
import { ModalBoundary } from "@/components/modal-boundary";
import { PercentageTextInput } from "@/components/percentage-text-input";
import { apiBaseUrl } from "@/lib/api";
import {
  findMasterAccountCatalogueEntry,
  type MasterAccountCatalogue,
  type MasterAccountCatalogueRecord,
} from "@/lib/bookmaker-catalogue";
import {
  emptyOddsMatcherFilters,
  defaultOddsMatcherPreferences,
  filterAndSortOpportunities,
  isManualQuote,
  oddsMatcherFilterCounts,
  oddsMatcherRatingTone,
  opportunityCopyText,
  type OddsMatcherFeed,
  type OddsMatcherFilters,
  type OddsMatcherOpportunity,
  type OddsMatcherPreferences,
  type OddsMatcherSavedFilter,
  type OpportunitySort,
} from "@/lib/oddsmatcher";
import {
  PresetSelect,
  SearchableCombobox,
  type OptionListMode,
  type SelectionOption,
} from "@/components/selection-controls";

type Preview = {
  selected_lay_stake: string;
  liability: string;
  pnl_if_back_wins: string;
  pnl_if_lay_wins: string;
  matched_result: string;
  outcomes: Array<{
    key: string;
    label: string;
    bookmaker_component: string;
    exchange_component: string;
    promotion_component?: string | null;
    total: string;
  }>;
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
type FilterOption = SelectionOption;

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
function CompactStatus({ icon = "block", label, explanation, tone = "neutral" }: {
  icon?: string;
  label: string;
  explanation: string;
  tone?: "neutral" | "warning" | "error";
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className={`compact-status compact-status-${tone}${open ? " is-open" : ""}`}>
      <button
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        aria-label={`${label}. ${explanation}`}
        className="compact-status-trigger"
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span aria-hidden="true" className="material-symbols-outlined">{icon}</span>
        <span>{label}</span>
      </button>
      <span className="compact-status-tooltip" id={id} role="tooltip">{explanation}</span>
    </span>
  );
}
function QuoteLink({ href, label, disabled = false }: { href: string | null; label: string; disabled?: boolean }) {
  return href && !disabled ? (
    <a
      className="oddsmatcher-quote-link"
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
  ) : (
    <button
      aria-label={`${label} unavailable`}
      className="oddsmatcher-quote-link"
      disabled
      title="Exchange link unavailable"
      type="button"
    >
      <span aria-hidden="true" className="material-symbols-outlined">open_in_new</span>
    </button>
  );
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
  const [accountCatalogue, setAccountCatalogue] = useState<MasterAccountCatalogueRecord[]>([]);
  const [feed, setFeed] = useState<OddsMatcherFeed | null>(null);
  const [readState, setReadState] = useState<ReadState>("loading");
  const [refreshing, setRefreshing] = useState(false);
  const refreshInFlight = useRef(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<OddsMatcherFilters>(
    emptyOddsMatcherFilters,
  );
  const [searchInput, setSearchInput] = useState("");
  const [preferences, setPreferences] = useState<OddsMatcherPreferences>(defaultOddsMatcherPreferences);
  const [preferencesState, setPreferencesState] = useState<ReadState>("loading");
  const [sort, setSort] = useState<OpportunitySort>({
    key: "rating",
    direction: "desc",
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(16);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savedFiltersOpen, setSavedFiltersOpen] = useState(false);
  const [activeSavedFilterId, setActiveSavedFilterId] = useState<string | null>(null);
  const [filterPanel, setFilterPanel] = useState<FilterPanel | null>(null);
  const [defaultStake, setDefaultStake] = useState("10");
  const [selected, setSelected] = useState<OddsMatcherOpportunity | null>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const savedFiltersButtonRef = useRef<HTMLButtonElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const inspectButtonRef = useRef<HTMLElement>(null);

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
  useEffect(() => {
    void fetch(`${apiBaseUrl}/fund-manager/preferences/oddsmatcher`, { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(await responseError(response, "Oddsmatcher settings could not be loaded."));
        return response.json() as Promise<OddsMatcherPreferences>;
      })
      .then((value) => {
        setPreferences(value);
        setDefaultStake(value.default_back_stake);
        setFilters((current) => ({ ...current, showArbs: value.show_arbs_default }));
        setPreferencesState("ready");
      })
      .catch(() => setPreferencesState("error"));
  }, []);
  useEffect(() => {
    if (filters.search === searchInput) return;
    const timer = window.setTimeout(() => {
      setFilters((current) => ({ ...current, search: searchInput }));
      setPage(1);
      setSelected(null);
    }, 180);
    return () => window.clearTimeout(timer);
  // The input value alone controls the debounce; filter changes must not restart it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);
  useEffect(() => {
    void fetch(`${apiBaseUrl}/account-catalogue/source`, { cache: "no-store", credentials: "include" })
      .then(async (response) => response.ok ? response.json() as Promise<MasterAccountCatalogue> : null)
      .then((value) => setAccountCatalogue(value?.records ?? []))
      .catch(() => setAccountCatalogue([]));
  }, []);
  const profileQuery = profileId ? `?profile_id=${encodeURIComponent(profileId)}` : "";
  const load = useCallback(
    async (refresh: boolean) => {
      if (refresh && refreshInFlight.current) return;
      if (refresh) refreshInFlight.current = true;
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
        if (refresh) refreshInFlight.current = false;
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

  const eligibleForPreferences = useMemo(() => (feed?.opportunities ?? []).filter((row) =>
    !preferences.excluded_bookmaker_identities.includes(row.back.provider_key) &&
    !preferences.excluded_exchange_identities.includes(row.lay.provider_key)), [feed, preferences]);
  const visible = useMemo(
    () => filterAndSortOpportunities(eligibleForPreferences, filters, sort),
    [eligibleForPreferences, filters, sort],
  );
  const hiddenArbCount = useMemo(() => filters.showArbs ? 0 : filterAndSortOpportunities(
    eligibleForPreferences,
    { ...filters, showArbs: true },
    sort,
  ).filter((row) => Number(row.display_rating) > 100).length, [eligibleForPreferences, filters, sort]);
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const rows = visible.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const providerOptions = useCallback((kind: "back" | "lay"): FilterOption[] => {
    const opportunities = feed?.opportunities ?? [];
    const mapped = new Map(opportunities.map((row) => {
      const quote = row[kind];
      return [quote.provider_key, quote.account_name] as const;
    }));
    return Array.from(mapped.entries()).map(([id, name]) => {
      const excluded = kind === "back"
        ? preferences.excluded_bookmaker_identities.includes(id)
        : preferences.excluded_exchange_identities.includes(id);
      const matching = opportunities.filter((row) => row[kind].provider_key === id);
      const unavailable = profileId && matching.length && matching.every(
        (row) => row[`${kind}_eligibility`].state === "unavailable",
      );
      const status = excluded
        ? "Hidden by Oddsmatcher settings"
        : unavailable
          ? matching[0][`${kind}_eligibility`].reason
          : undefined;
      return { id, name: kind === "lay" ? simpleExchangeName(name) : name, status };
    }).sort((a, b) => a.name.localeCompare(b.name, "en-GB"));
  }, [feed, preferences, profileId]);
  const backProviders = useMemo(() => providerOptions("back"), [providerOptions]);
  const layProviders = useMemo(() => providerOptions("lay"), [providerOptions]);
  const filterCounts = oddsMatcherFilterCounts(filters, preferences.show_arbs_default);
  const activeFilterCount = Object.values(filterCounts).reduce((total, count) => total + count, 0);
  const setFilter = <K extends keyof OddsMatcherFilters>(
    key: K,
    value: OddsMatcherFilters[K],
  ) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
    setSelected(null);
  };
  const setFilterPatch = (patch: Partial<OddsMatcherFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
    setSelected(null);
  };
  const resetFilterFamily = (panel: Exclude<FilterPanel, "all">) => {
    const resets: Record<Exclude<FilterPanel, "all">, Partial<OddsMatcherFilters>> = {
      selection: { sports: [], competitions: [], eventName: "", markets: [], selections: [], excludeDraws: false },
      startTime: { startTime: "ALL", customStart: "", customEnd: "" },
      back: { backProviders: [], minBackOdds: "", maxBackOdds: "" },
      lay: { layProviders: [], minLayOdds: "", maxLayOdds: "", minLiquidity: "" },
      rating: { minRating: "", maxRating: "", showArbs: preferences.show_arbs_default },
    };
    setFilterPatch(resets[panel]);
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
    setFilters({ ...emptyOddsMatcherFilters, showArbs: preferences.show_arbs_default });
    setSearchInput("");
    setActiveSavedFilterId(null);
    setPage(1);
    setSelected(null);
  };
  const savePreferences = async (next: OddsMatcherPreferences) => {
    const response = await fetch(`${apiBaseUrl}/fund-manager/preferences/oddsmatcher`, {
      method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!response.ok) throw new Error(await responseError(response, "Oddsmatcher settings could not be saved."));
    const saved = await response.json() as OddsMatcherPreferences;
    setFilters((current) => current.showArbs === preferences.show_arbs_default
      ? { ...current, showArbs: saved.show_arbs_default }
      : current);
    setPreferences(saved);
    setDefaultStake(saved.default_back_stake);
    return saved;
  };
  const profileName = profiles.find(
    (profile) => profile.profile_id === profileId,
  )?.display_name;

  const inspectOpportunity = (row: OddsMatcherOpportunity, trigger: HTMLElement) => {
    inspectButtonRef.current = trigger;
    setSelected(row);
  };
  const activateOpportunity = (
    event: ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>,
    row: OddsMatcherOpportunity,
  ) => {
    if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea, label")) return;
    if ("key" in event && event.key !== "Enter" && event.key !== " ") return;
    if ("key" in event) event.preventDefault();
    inspectOpportunity(row, event.currentTarget);
  };

  const opportunityRow = (row: OddsMatcherOpportunity, mobile = false) => (
    <article
      className={`oddsmatcher-opportunity-card${row.freshness === "stale" ? " is-muted" : ""}`}
      data-pd-id={`oddsmatcher.opportunity.${row.opportunity_id}`}
      key={`${mobile ? "card" : "row"}:${row.opportunity_id}`}
      onClick={(event) => activateOpportunity(event, row)}
      onKeyDown={(event) => activateOpportunity(event, row)}
      tabIndex={0}
    >
      <div className="oddsmatcher-card-topline">
        <div className="oddsmatcher-card-status">
          <span aria-hidden="true" className="material-symbols-outlined oddsmatcher-event-icon">sports_soccer</span>
          <span className={`oddsmatcher-rating-pill oddsmatcher-rating-${oddsMatcherRatingTone(row.display_rating)}`}>
            {Number(row.display_rating).toFixed(2)}%
          </span>
          {row.freshness === "stale" ? <span className="status-chip">Stale · {formatObserved(row.age_seconds)}</span> : null}
        </div>
        <OpportunityActions
          onInspect={(trigger) => inspectOpportunity(row, trigger)}
          row={row}
        />
      </div>
      <div className="oddsmatcher-card-eventline">
        <span className="table-cell-stack"><strong>{row.event_name}</strong><span>{row.competition}</span></span>
        <time dateTime={row.starts_at}>
          {new Date(row.starts_at).toLocaleString("en-GB", {
            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
          })}
        </time>
      </div>
      <div className="table-cell-stack">
        <strong>{row.selection}</strong>
        <span>{row.market}</span>
      </div>
      <div className="oddsmatcher-card-quotes">
        <div className="oddsmatcher-card-quote"><span className="eyebrow">Back</span><QuoteBlock
          kind="back" catalogue={accountCatalogue} href={row.back.link}
          name={row.back.account_name} odds={row.back.odds} />
          {profileId && row.back_eligibility.state !== "eligible" ? <small className={eligibilityClass(row.back_eligibility.state)}>{row.back_eligibility.reason}</small> : null}
        </div>
        <div className="oddsmatcher-card-quote"><span className="eyebrow">Lay</span><QuoteBlock
          kind="lay" catalogue={accountCatalogue} href={row.lay.link}
          name={row.lay.account_name} odds={row.lay.odds} reason="Liquidity unknown" /></div>
      </div>
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
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search events, teams or providers"
              type="search"
              value={searchInput}
            />
          </label>
          <button
            aria-haspopup="dialog"
            className="button-link icon-text-action"
            data-pd-id="oddsmatcher.settings.open"
            disabled={preferencesState !== "ready"}
            onClick={() => setSettingsOpen(true)}
            ref={settingsButtonRef}
            title={preferencesState === "error" ? "Settings are unavailable because stored preferences require review" : "Oddsmatcher settings"}
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
                ["selection", "Selection", filterCounts.selection],
                ["startTime", "Start time", filterCounts.startTime],
                ["back", "Back", filterCounts.back],
                ["lay", "Lay", filterCounts.lay],
                ["rating", "Rating", filterCounts.rating],
              ] as const
            ).map(([id, label, count]) => (
              <button
                aria-expanded={filterPanel === id}
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
              aria-label={refreshing ? "Refreshing odds" : "Refresh odds"}
              className="icon-button compact-action"
              data-pd-id="oddsmatcher.refresh"
              disabled={refreshing}
              onClick={() => void load(true)}
              type="button"
            >
              {refreshing ? <span aria-hidden="true" className="button-spinner" /> : <span aria-hidden="true" className="material-symbols-outlined">refresh</span>}
            </button>
            <button
              className="button-link icon-text-action"
              aria-expanded={savedFiltersOpen}
              aria-haspopup="menu"
              disabled={preferencesState !== "ready"}
              onClick={() => setSavedFiltersOpen(true)}
              ref={savedFiltersButtonRef}
              title={preferencesState === "error" ? "Saved filters are unavailable because preferences could not be loaded" : "Save or load filter presets"}
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
            {hiddenArbCount ? (
              <div className="oddsmatcher-hidden-arbs" role="status">
                <span>{hiddenArbCount} result{hiddenArbCount === 1 ? "" : "s"} over 100% {hiddenArbCount === 1 ? "is" : "are"} hidden.</span>
                <button className="button-link" onClick={() => setFilter("showArbs", true)} type="button">Show hidden results</button>
              </div>
            ) : null}
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
                    <tr
                      aria-label={`Open Bet Summary for ${row.event_name} ${row.selection}`}
                      className="oddsmatcher-clickable-row"
                      key={row.opportunity_id}
                      onClick={(event) => activateOpportunity(event, row)}
                      onKeyDown={(event) => activateOpportunity(event, row)}
                      tabIndex={0}
                    >
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
                        <span className="oddsmatcher-event-cell">
                          <span aria-hidden="true" className="material-symbols-outlined oddsmatcher-event-icon">sports_soccer</span>
                          <span className="table-cell-stack">
                          <strong>{row.event_name}</strong>
                          <span>{row.competition}</span>
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className="table-cell-stack">
                          <strong>{row.selection}</strong>
                          <span>{row.market}</span>
                        </span>
                      </td>
                      <td>
                        <span className="table-cell-stack">
                          <QuoteBlock
                            kind="back"
                            catalogue={accountCatalogue}
                            href={row.back.link}
                            name={row.back.account_name}
                            odds={row.back.odds}
                          />
                          {profileId && row.back_eligibility.state !== "eligible" ? <small className={eligibilityClass(row.back_eligibility.state)}>{row.back_eligibility.reason}</small> : null}
                        </span>
                      </td>
                      <td>
                        <QuoteBlock
                          kind="lay"
                          catalogue={accountCatalogue}
                          href={row.lay.link}
                          name={row.lay.account_name}
                          odds={row.lay.odds}
                          reason="Liquidity unknown"
                        />
                      </td>
                      <td>
                        <span className="table-cell-stack oddsmatcher-rating-cell">
                          <strong className={`oddsmatcher-rating-pill oddsmatcher-rating-${oddsMatcherRatingTone(row.display_rating)}`}>
                            {Number(row.display_rating).toFixed(2)}%
                          </strong>
                          <span>
                            {row.commission_aware_rating
                              ? `After commission · ${Number(row.commission_aware_rating).toFixed(2)}%`
                              : profileId
                                ? "Commission unavailable"
                                : "Choose Profile for commission"}
                          </span>
                        </span>
                      </td>
                      <td>
                        <OpportunityActions
                          onInspect={(trigger) => inspectOpportunity(row, trigger)}
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
            onPatch={setFilterPatch}
            onReset={resetFilterFamily}
            opportunities={feed?.opportunities ?? []}
            panel={filterPanel}
            returnFocusRef={filterButtonRef}
          />
        ) : null}
        {settingsOpen ? (
          <SettingsDialog
            backProviders={backProviders}
            layProviders={layProviders}
            onClose={() => setSettingsOpen(false)}
            onSave={async (next) => {
              const saved = await savePreferences(next);
              setFilter("showArbs", saved.show_arbs_default);
            }}
            preferences={preferences}
            returnFocusRef={settingsButtonRef}
          />
        ) : null}
        {savedFiltersOpen ? (
          <SavedFiltersDialog
            activeId={activeSavedFilterId}
            filters={filters}
            onClose={() => setSavedFiltersOpen(false)}
            onLoad={(saved) => {
              setFilters(saved.filters);
              setSearchInput(saved.filters.search);
              setActiveSavedFilterId(saved.id);
              setPage(1);
              setSelected(null);
            }}
            onSave={savePreferences}
            onSetActive={setActiveSavedFilterId}
            preferences={preferences}
            returnFocusRef={savedFiltersButtonRef}
          />
        ) : null}
        {selected ? (
          <BetSummaryDialog
            defaultStake={defaultStake}
            defaultAdvanced={preferences.default_advanced}
            defaultCommission={preferences.exchange_commission_overrides[selected.lay.provider_key] ?? ""}
            onClose={() => setSelected(null)}
            onOpenSettings={() => { setSelected(null); setSettingsOpen(true); }}
            opportunity={selected}
            profileId={profileId}
            returnFocusRef={inspectButtonRef}
          />
        ) : null}
      </section>
    </main>
  );
}

function simpleExchangeName(name: string) {
  return name.replace(/\s+Exchange$/i, "");
}

function QuoteBlock({
  kind,
  catalogue,
  href,
  name,
  odds,
  reason,
}: {
  kind: "back" | "lay";
  catalogue: MasterAccountCatalogueRecord[];
  href: string | null;
  name: string;
  odds: string;
  reason?: string;
}) {
  const provider = findMasterAccountCatalogueEntry(catalogue, { accountName: name });
  const displayName = kind === "lay"
    ? simpleExchangeName(provider?.brand_name || provider?.short_display_name || name)
    : provider?.brand_name || name;
  return (
    <span className={`oddsmatcher-quote-block oddsmatcher-quote-block-${kind}`}>
      <span className="oddsmatcher-quote-provider" style={provider ? {
        backgroundColor: provider.background_colour,
        color: provider.foreground_colour,
      } : undefined}>
        <strong>{displayName}</strong>
        <QuoteLink disabled={kind === "lay"} href={kind === "back" ? href : null} label={`${displayName} quote`} />
      </span>
      <span className="oddsmatcher-quote-price">
        <b>{Number.isFinite(Number(odds)) ? Number(odds).toFixed(2) : "—"}</b>
        {reason ? <CompactStatus
          explanation="This provider supplies the lay price but not available exchange depth. Confirm liquidity before placing a bet."
          label="Unavailable"
        /> : null}
      </span>
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
      <button
        aria-label={`Copy ${row.event_name} ${row.selection} opportunity`}
        className="table-action-button"
        onClick={() =>
          void navigator.clipboard.writeText(opportunityCopyText(row)).catch(() => undefined)
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

function AnchoredSurface({ children, className = "", label, onClose, returnFocusRef }: {
  children: ReactNode;
  className?: string;
  label: string;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const surfaceRef = useRef<HTMLElement>(null);
  const [position, setPosition] = useState({ left: 12, top: 12, width: 420, maxHeight: 600 });
  useLayoutEffect(() => {
    const trigger = returnFocusRef.current;
    const surface = surfaceRef.current;
    if (!trigger || !surface) return;
    const place = () => {
      const rect = trigger.getBoundingClientRect();
      const margin = 12;
      const width = Math.min(440, window.innerWidth - margin * 2);
      const measuredHeight = Math.min(surface.scrollHeight, window.innerHeight - margin * 2);
      const roomBelow = window.innerHeight - rect.bottom - margin;
      const top = roomBelow >= Math.min(measuredHeight, 320)
        ? rect.bottom + 6
        : Math.max(margin, rect.top - measuredHeight - 6);
      setPosition({
        left: Math.min(Math.max(margin, rect.left), window.innerWidth - width - margin),
        top,
        width,
        maxHeight: Math.max(180, window.innerHeight - top - margin),
      });
    };
    place();
    const first = surface.querySelector<HTMLElement>('input:not(:disabled), button:not(:disabled), [tabindex="0"]');
    first?.focus({ preventScroll: true });
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      if (trigger.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [returnFocusRef]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="oddsmatcher-anchored-layer" onPointerDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        aria-label={label}
        className={`oddsmatcher-anchored-surface ${className}`}
        onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); onClose(); } }}
        ref={surfaceRef}
        role="dialog"
        style={position}
      >
        {children}
      </section>
    </div>,
    document.body,
  );
}

const startTimeGroups: Array<{ label: string | null; options: Array<[OddsMatcherFilters["startTime"], string]> }> = [
  { label: null, options: [["ALL", "Any time"]] },
  { label: "Starting soon", options: [["30M", "Within 30 mins"], ["1H", "Within 1 hour"], ["2H", "Within 2 hours"], ["4H", "Within 4 hours"], ["8H", "Within 8 hours"], ["12H", "Within 12 hours"], ["24H", "Within 24 hours"]] },
  { label: "By day", options: [["TODAY", "Today"], ["TOMORROW", "Tomorrow"], ["3D", "Next 3 days"]] },
  { label: "Custom", options: [["CUSTOM", "Custom range"]] },
];

function FilterDialog({
  backProviders,
  filters,
  layProviders,
  onChange,
  onClose,
  onPatch,
  onReset,
  opportunities,
  panel,
  returnFocusRef,
}: {
  backProviders: FilterOption[];
  filters: OddsMatcherFilters;
  layProviders: FilterOption[];
  onChange: <K extends keyof OddsMatcherFilters>(key: K, value: OddsMatcherFilters[K]) => void;
  onClose: () => void;
  onPatch: (patch: Partial<OddsMatcherFilters>) => void;
  onReset: (panel: Exclude<FilterPanel, "all">) => void;
  opportunities: OddsMatcherOpportunity[];
  panel: FilterPanel;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const [openCombobox, setOpenCombobox] = useState<{ id: string; mode: OptionListMode } | null>(null);
  const modeFor = (id: string): OptionListMode => openCombobox?.id === id ? openCombobox.mode : "CLOSED";
  const setModeFor = (id: string) => (mode: OptionListMode) => setOpenCombobox(mode === "CLOSED" ? null : { id, mode });
  const show = (name: Exclude<FilterPanel, "all">) => panel === "all" || panel === name;
  const rowsFor = (candidate: OddsMatcherFilters) => opportunities.filter((row) =>
    (!candidate.sports.length || candidate.sports.includes("football")) &&
    (!candidate.competitions.length || candidate.competitions.includes(row.competition_key)) &&
    (!candidate.eventName || candidate.eventName === row.event_name));
  const applySelectionPatch = (patch: Partial<OddsMatcherFilters>) => {
    const candidate = { ...filters, ...patch };
    const validRows = rowsFor(candidate);
    const eventNames = new Set(validRows.map((row) => row.event_name));
    if (candidate.eventName && !eventNames.has(candidate.eventName)) candidate.eventName = "";
    const rowsAfterEvent = rowsFor(candidate);
    const markets = new Set(rowsAfterEvent.map((row) => row.market_key));
    candidate.markets = candidate.markets.filter((value) => markets.has(value));
    const rowsAfterMarket = rowsAfterEvent.filter((row) => !candidate.markets.length || candidate.markets.includes(row.market_key));
    const selections = new Set(rowsAfterMarket.map((row) => row.selection_key));
    candidate.selections = candidate.selections.filter((value) => selections.has(value));
    onPatch({ sports: candidate.sports, competitions: candidate.competitions, eventName: candidate.eventName, markets: candidate.markets, selections: candidate.selections, excludeDraws: candidate.excludeDraws });
  };
  const sportOptions: FilterOption[] = opportunities.length ? [{ id: "football", name: "Football" }] : [];
  const competitionRows = opportunities.filter(() => !filters.sports.length || filters.sports.includes("football"));
  const competitionOptions = Array.from(new Map(competitionRows.map((row) => [row.competition_key, row.competition])).entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "en-GB"));
  const dependentRows = rowsFor(filters);
  const eventOptions = Array.from(new Set(dependentRows.map((row) => row.event_name))).map((name) => ({ id: name, name })).sort((a, b) => a.name.localeCompare(b.name, "en-GB"));
  const marketOptions = Array.from(new Map(dependentRows.map((row) => [row.market_key, row.market])).entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "en-GB"));
  const selectionRows = dependentRows.filter((row) => !filters.markets.length || filters.markets.includes(row.market_key));
  const selectionNames: Record<OddsMatcherOpportunity["selection_key"], string> = { HOME: "Home", DRAW: "Draw", AWAY: "Away" };
  const selectionOptions = Array.from(new Set(selectionRows.map((row) => row.selection_key))).map((id) => ({ id, name: selectionNames[id] }));
  const groupHeading = (name: string) => panel === "all" ? <legend>{name}</legend> : null;
  const reset = (family: Exclude<FilterPanel, "all">) => <div className="oddsmatcher-filter-reset"><button className="button-link" onClick={() => onReset(family)} type="button">Reset</button></div>;
  const fields = <div className="oddsmatcher-filter-sections">
    {show("selection") ? <fieldset aria-label="Selection filter fields" className="oddsmatcher-filter-group oddsmatcher-selection-filter">
      {groupHeading("Selection")}
      <div className="oddsmatcher-selection-columns">
        <div className="stack-tight">
          <SearchableCombobox dataPdId="oddsmatcher.filter.sport" id="oddsmatcher-sport" label="Sport" mode={modeFor("sport")} onChange={(values) => applySelectionPatch({ sports: values })} onModeChange={setModeFor("sport")} options={sportOptions} values={filters.sports} />
          <SearchableCombobox dataPdId="oddsmatcher.filter.competition" id="oddsmatcher-competition" label="Competition" mode={modeFor("competition")} onChange={(values) => applySelectionPatch({ competitions: values })} onModeChange={setModeFor("competition")} options={competitionOptions} values={filters.competitions} />
          <SearchableCombobox dataPdId="oddsmatcher.filter.event" id="oddsmatcher-event" label="Event" mode={modeFor("event")} multiple={false} onChange={(values) => applySelectionPatch({ eventName: values[0] ?? "" })} onModeChange={setModeFor("event")} options={eventOptions} values={filters.eventName ? [filters.eventName] : []} />
        </div>
        <div className="stack-tight">
          <SearchableCombobox dataPdId="oddsmatcher.filter.market" id="oddsmatcher-market" label="Market" mode={modeFor("market")} onChange={(values) => applySelectionPatch({ markets: values })} onModeChange={setModeFor("market")} options={marketOptions} values={filters.markets} />
          <SearchableCombobox dataPdId="oddsmatcher.filter.selection" id="oddsmatcher-selection" label="Selection" mode={modeFor("selection")} onChange={(values) => applySelectionPatch({ selections: values as OddsMatcherFilters["selections"] })} onModeChange={setModeFor("selection")} options={selectionOptions} values={filters.selections} />
          <label className="toggle-row"><input checked={filters.excludeDraws} onChange={(event) => applySelectionPatch({ excludeDraws: event.target.checked })} type="checkbox" /><span><strong>Exclude draws</strong></span></label>
        </div>
      </div>
      {reset("selection")}
    </fieldset> : null}
    {show("startTime") ? <fieldset aria-label="Start time filter fields" className="oddsmatcher-filter-group">
      {groupHeading("Start time")}
      <PresetSelect dataPdId="oddsmatcher.filter.start-time-select" groups={startTimeGroups} id="oddsmatcher-start-time" label="Event start time" onChange={(value) => onPatch({ startTime: value, ...(value === "CUSTOM" ? {} : { customStart: "", customEnd: "" }) })} onOpenChange={(open) => setOpenCombobox(open ? { id: "startTimePreset", mode: "SHOW_ALL" } : null)} open={openCombobox?.id === "startTimePreset"} value={filters.startTime} />
      {filters.startTime === "CUSTOM" ? <div className="form-grid oddsmatcher-filter-fields"><label className="field-control"><span>From</span><input onChange={(event) => onChange("customStart", event.target.value)} type="datetime-local" value={filters.customStart} /></label><label className="field-control"><span>To</span><input onChange={(event) => onChange("customEnd", event.target.value)} type="datetime-local" value={filters.customEnd} /></label></div> : null}
      <p className="field-hint">Times are interpreted and displayed in Europe/London.</p>
      {reset("startTime")}
    </fieldset> : null}
    {show("back") ? <fieldset aria-label="Back filter fields" className="oddsmatcher-filter-group">
      {groupHeading("Back")}
      <SearchableCombobox dataPdId="oddsmatcher.filter.bookmakers" id="oddsmatcher-bookmakers" label="Bookmakers" mode={modeFor("bookmakers")} onChange={(values) => onChange("backProviders", values)} onModeChange={setModeFor("bookmakers")} options={backProviders} values={filters.backProviders} />
      <div className="form-grid oddsmatcher-filter-fields"><label className="field-control"><span>Min. back odds</span><input inputMode="decimal" onChange={(event) => onChange("minBackOdds", event.target.value)} placeholder="Any" value={filters.minBackOdds} /></label><label className="field-control"><span>Max. back odds</span><input inputMode="decimal" onChange={(event) => onChange("maxBackOdds", event.target.value)} placeholder="Any" value={filters.maxBackOdds} /></label></div>
      {reset("back")}
    </fieldset> : null}
    {show("lay") ? <fieldset aria-label="Lay filter fields" className="oddsmatcher-filter-group">
      {groupHeading("Lay")}
      <SearchableCombobox dataPdId="oddsmatcher.filter.exchanges" id="oddsmatcher-exchanges" label="Exchanges" mode={modeFor("exchanges")} onChange={(values) => onChange("layProviders", values)} onModeChange={setModeFor("exchanges")} options={layProviders} values={filters.layProviders} />
      <div className="form-grid oddsmatcher-filter-fields"><label className="field-control"><span>Min. lay odds</span><input inputMode="decimal" onChange={(event) => onChange("minLayOdds", event.target.value)} placeholder="Any" value={filters.minLayOdds} /></label><label className="field-control"><span>Max. lay odds</span><input inputMode="decimal" onChange={(event) => onChange("maxLayOdds", event.target.value)} placeholder="Any" value={filters.maxLayOdds} /></label></div>
      <label className="field-control"><span>Min. lay liquidity</span><input inputMode="decimal" onChange={(event) => onChange("minLiquidity", event.target.value)} placeholder="Any" value={filters.minLiquidity} /><small>Unknown-liquidity rows are excluded when this is set.</small></label>
      {reset("lay")}
    </fieldset> : null}
    {show("rating") ? <fieldset aria-label="Rating filter fields" className="oddsmatcher-filter-group">
      {groupHeading("Rating")}
      <div className="form-grid oddsmatcher-filter-fields oddsmatcher-rating-fields"><label className="field-control"><span>Min. rating</span><input inputMode="decimal" onChange={(event) => onChange("minRating", event.target.value)} placeholder="Any" value={filters.minRating} /></label><label className="field-control"><span>Max. rating</span><input inputMode="decimal" onChange={(event) => onChange("maxRating", event.target.value)} placeholder="Any" value={filters.maxRating} /></label></div>
      <label className="toggle-row"><input checked={filters.showArbs} onChange={(event) => onChange("showArbs", event.target.checked)} type="checkbox" /><span><strong>Show arbs</strong><small>Ratings above 100% are hidden by default.</small></span></label>
      {reset("rating")}
    </fieldset> : null}
  </div>;
  if (panel === "all") return (
    <ModalBoundary onDismiss={onClose} returnFocusRef={returnFocusRef}>
      <div className="modal-backdrop" onClick={onClose}>
        <section aria-label="Oddsmatcher filters" aria-modal="true" className="modal-panel oddsmatcher-filter-dialog stack" data-pd-id="oddsmatcher.filter-drawer" onClick={(event) => event.stopPropagation()} role="dialog">
          <header className="calculator-panel-heading-row"><div><span className="eyebrow">Opportunity controls</span><h2>Filters</h2></div><button aria-label="Close filters" className="modal-close-button" onClick={onClose} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button></header>
          {fields}
          <footer className="modal-sticky-footer"><button className="modal-primary-button" onClick={onClose} type="button">Apply filters</button></footer>
        </section>
      </div>
    </ModalBoundary>
  );
  return <AnchoredSurface className="oddsmatcher-filter-popover" label={`${panel === "startTime" ? "Start time" : `${panel[0].toUpperCase()}${panel.slice(1)}`} filter`} onClose={onClose} returnFocusRef={returnFocusRef}>
    {fields}
  </AnchoredSurface>;
}

function SettingsDialog({
  backProviders,
  layProviders,
  onClose,
  onSave,
  preferences,
  returnFocusRef,
}: {
  backProviders: Array<{ id: string; name: string }>;
  layProviders: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSave: (value: OddsMatcherPreferences) => Promise<void>;
  preferences: OddsMatcherPreferences;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}) {
  const [draft, setDraft] = useState(preferences);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const toggle = (values: string[], value: string) => values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
  const updateCommission = (id: string, value: string) => {
    const next = { ...draft.exchange_commission_overrides };
    if (value.trim()) next[id] = value;
    else delete next[id];
    setDraft({ ...draft, exchange_commission_overrides: next });
  };
  const save = async () => {
    setSaveState("saving");
    try { await onSave(draft); onClose(); } catch { setSaveState("error"); }
  };
  return (
    <ModalBoundary onDismiss={onClose} returnFocusRef={returnFocusRef}>
      <div className="modal-backdrop" onClick={onClose}>
        <section aria-label="Oddsmatcher settings" aria-modal="true" className="modal-panel oddsmatcher-settings-dialog stack" data-pd-id="oddsmatcher.settings" onClick={(event) => event.stopPropagation()} role="dialog">
          <header className="calculator-panel-heading-row"><div><span className="eyebrow">Fund Manager preferences</span><h2>Oddsmatcher Settings</h2></div><button aria-label="Close Oddsmatcher settings" className="modal-close-button" onClick={onClose} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button></header>
          <div className="oddsmatcher-settings-body stack">
            <label className="field-control"><span>Default back stake</span><input inputMode="decimal" onChange={(event) => setDraft({...draft, default_back_stake:event.target.value})} value={draft.default_back_stake} /></label>
            <fieldset className="oddsmatcher-filter-group"><legend>Exchange commission defaults</legend><p className="field-hint">Used only when a selected Profile does not provide an authoritative Account commission.</p>{layProviders.map((provider) => <label className="field-control" key={provider.id}><span>{simpleExchangeName(provider.name)} commission (%)</span><CommissionInput onRatioChange={(value) => updateCommission(provider.id, value)} value={draft.exchange_commission_overrides[provider.id] ?? ""} /></label>)}</fieldset>
            <fieldset className="oddsmatcher-filter-group"><legend>Excluded bookmakers</legend><div className="filter-option-grid">{backProviders.map((provider) => <label className="choice-chip" key={provider.id}><input checked={draft.excluded_bookmaker_identities.includes(provider.id)} onChange={() => setDraft({...draft,excluded_bookmaker_identities:toggle(draft.excluded_bookmaker_identities,provider.id)})} type="checkbox" /><span>{provider.name}</span></label>)}</div></fieldset>
            <fieldset className="oddsmatcher-filter-group"><legend>Excluded exchanges</legend><div className="filter-option-grid">{layProviders.map((provider) => <label className="choice-chip" key={provider.id}><input checked={draft.excluded_exchange_identities.includes(provider.id)} onChange={() => setDraft({...draft,excluded_exchange_identities:toggle(draft.excluded_exchange_identities,provider.id)})} type="checkbox" /><span>{simpleExchangeName(provider.name)}</span></label>)}</div></fieldset>
            <label className="toggle-row"><input checked={draft.show_arbs_default} onChange={(event) => setDraft({...draft,show_arbs_default:event.target.checked})} type="checkbox" /><span><strong>Show arbs by default</strong><small>Ratings above 100% remain hidden unless enabled.</small></span></label>
            <label className="toggle-row"><input checked={draft.default_advanced} onChange={(event) => setDraft({...draft,default_advanced:event.target.checked})} type="checkbox" /><span><strong>Open Advanced by default</strong><small>Applies to Bet Summary without changing its calculations.</small></span></label>
            <p className="field-hint">Profile Account restrictions and commissions remain authoritative when a Profile is selected. Manual refresh remains the only refresh mode.</p>
            {saveState === "error" ? <p className="error-text" role="alert">Settings could not be saved. Existing settings remain unchanged.</p> : null}
          </div>
          <footer className="modal-sticky-footer"><button className="button-link" onClick={onClose} type="button">Cancel</button><button aria-busy={saveState === "saving"} className="modal-primary-button" disabled={saveState === "saving"} onClick={() => void save()} type="button">{saveState === "saving" ? "Saving…" : "Save settings"}</button></footer>
        </section>
      </div>
    </ModalBoundary>
  );
}

function SavedFilterEditorDialog({ initial, onClose, onSave, returnFocusRef }: {
  initial: OddsMatcherSavedFilter | null;
  onClose: () => void;
  onSave: (name: string, description: string) => Promise<boolean>;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const save = async () => {
    if (!name.trim()) { setState("error"); return; }
    setState("saving");
    if (await onSave(name.trim(), description.trim())) onClose();
    else setState("error");
  };
  return <AnchoredSurface className="oddsmatcher-filter-editor-dialog" label={initial ? `Edit ${initial.name}` : "Save filter preset"} onClose={onClose} returnFocusRef={returnFocusRef}>
    <header className="oddsmatcher-popover-heading"><div><span className="eyebrow">Reusable opportunity filter</span><strong>{initial ? "Edit saved filter" : "Save as…"}</strong></div><button aria-label="Close saved filter editor" className="icon-button compact-action" onClick={onClose} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button></header>
    <label className="field-control"><span>Name</span><input maxLength={80} onChange={(event) => setName(event.target.value)} value={name} /></label>
    <label className="field-control"><span>Description <small>(optional)</small></span><textarea maxLength={240} onChange={(event) => setDescription(event.target.value)} rows={3} value={description} /></label>
    {state === "error" ? <p className="error-text" role="alert">Use a unique name. The existing saved filters were not changed.</p> : null}
    <footer className="oddsmatcher-popover-footer"><button className="button-link" onClick={onClose} type="button">Cancel</button><button aria-busy={state === "saving"} className="modal-primary-button" disabled={state === "saving"} onClick={() => void save()} type="button">{state === "saving" ? "Saving…" : initial ? "Save changes" : "Save preset"}</button></footer>
  </AnchoredSurface>;
}

function SavedFiltersDialog({ activeId, filters, onClose, onLoad, onSave, onSetActive, preferences, returnFocusRef }: {
  activeId: string | null;
  filters: OddsMatcherFilters;
  onClose: () => void;
  onLoad: (value: OddsMatcherSavedFilter) => void;
  onSave: (value: OddsMatcherPreferences) => Promise<OddsMatcherPreferences>;
  onSetActive: (value: string | null) => void;
  preferences: OddsMatcherPreferences;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}) {
  const [editing, setEditing] = useState<OddsMatcherSavedFilter | "new" | null>(null);
  const [error, setError] = useState("");
  const editorTriggerRef = useRef<HTMLElement>(null);
  const active = preferences.saved_filters.find((item) => item.id === activeId) ?? null;
  const activeModified = Boolean(active && JSON.stringify(active.filters) !== JSON.stringify(filters));
  const persist = async (savedFilters: OddsMatcherSavedFilter[]) => {
    setError("");
    try { return await onSave({...preferences,saved_filters:savedFilters}); }
    catch { setError("Saved filters could not be updated. Existing presets remain unchanged."); return null; }
  };
  const saveCurrent = async () => {
    if (!activeId) return;
    await persist(preferences.saved_filters.map((item) => item.id === activeId ? {...item,filters} : item));
  };
  const deleteFilter = async (id: string) => {
    const saved = await persist(preferences.saved_filters.filter((item) => item.id !== id));
    if (saved && activeId === id) onSetActive(null);
  };
  const saveEditor = async (name: string, description: string) => {
    if (editing === "new") {
      const created: OddsMatcherSavedFilter = { id:`filter-${crypto.randomUUID()}`, name, description, filters };
      const saved = await persist([...preferences.saved_filters, created]);
      if (!saved) return false;
      onSetActive(created.id);
      return true;
    }
    if (editing) return Boolean(await persist(preferences.saved_filters.map((item) => item.id === editing.id ? {...item,name,description} : item)));
    return false;
  };
  return <>
    <AnchoredSurface className="oddsmatcher-saved-filters-menu" label="My Filters" onClose={onClose} returnFocusRef={returnFocusRef}>
      <header className="oddsmatcher-popover-heading"><div><span className="eyebrow">Reusable opportunity filters</span><strong>My Filters</strong></div><button aria-label="Close My Filters" className="icon-button compact-action" onClick={onClose} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button></header>
      <div className="oddsmatcher-saved-filter-actions">
        <button className="modal-primary-button" onClick={(event) => { editorTriggerRef.current = event.currentTarget; setEditing("new"); }} type="button">Save as…</button>
        <button className="button-link" disabled={!activeId || !activeModified} onClick={() => void saveCurrent()} type="button">Save</button>
      </div>
      {preferences.saved_filters.length ? <ul className="oddsmatcher-saved-filter-list">{preferences.saved_filters.map((item) => <li className={item.id === activeId ? "is-active" : ""} key={item.id}>
        <span className="table-cell-stack"><strong>{item.name}</strong>{item.description ? <span>{item.description}</span> : null}{item.id === activeId ? <span>{activeModified ? "Active preset · modified" : "Active preset"}</span> : null}</span>
        <div className="table-action-row"><button className="button-link" onClick={() => { onLoad(item); onClose(); }} type="button">Load</button><button aria-label={`Edit ${item.name}`} className="table-action-button" onClick={(event) => { editorTriggerRef.current = event.currentTarget; setEditing(item); }} title="Edit saved filter" type="button"><span aria-hidden="true" className="material-symbols-outlined">edit</span></button><button aria-label={`Delete ${item.name}`} className="table-action-button destructive-action" onClick={() => void deleteFilter(item.id)} title="Delete saved filter" type="button"><span aria-hidden="true" className="material-symbols-outlined">delete</span></button></div>
      </li>)}</ul> : <div className="empty-state"><strong>No saved filters</strong><span>Save the current transient filters with a unique name.</span></div>}
      {error ? <p className="error-text" role="alert">{error}</p> : null}
    </AnchoredSurface>
    {editing ? <SavedFilterEditorDialog initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSave={saveEditor} returnFocusRef={editorTriggerRef} /> : null}
  </>;
}

function BetSummaryDialog({
  defaultAdvanced,
  defaultCommission,
  defaultStake,
  onClose,
  onOpenSettings,
  opportunity,
  profileId,
  returnFocusRef,
}: {
  defaultAdvanced: boolean;
  defaultCommission: string;
  defaultStake: string;
  onClose: () => void;
  onOpenSettings: () => void;
  opportunity: OddsMatcherOpportunity;
  profileId: string | null;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const [stake, setStake] = useState(defaultStake);
  const [backOdds, setBackOdds] = useState(opportunity.back.odds);
  const [layOdds, setLayOdds] = useState(opportunity.lay.odds);
  const [commission, setCommission] = useState(opportunity.exchange_commission ?? defaultCommission);
  const [strategy, setStrategy] = useState<Strategy>("Standard");
  const [advanced, setAdvanced] = useState(defaultAdvanced);
  const [autoBack, setAutoBack] = useState(true);
  const [autoLay, setAutoLay] = useState(true);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewState, setPreviewState] = useState<"loading" | "ready" | "error">("loading");
  const [draftState, setDraftState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [draftError, setDraftError] = useState("");
  const [draftId, setDraftId] = useState("");
  const retryToken = useRef(crypto.randomUUID());
  const version = useRef(0);
  const commissionSource = opportunity.exchange_commission ? "Profile Account" : defaultCommission ? "Oddsmatcher default" : null;
  const manual = !autoBack || !autoLay || isManualQuote(opportunity, backOdds, layOdds);

  useEffect(() => {
    const current = ++version.current;
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setPreviewState("loading");
      try {
        const response = await fetch(`${apiBaseUrl}/fund-manager/calculators/matched-betting/preview`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            bet_type: "qualifying", free_bet_mode: "SNR", promotion_mode: "standard", strategy,
            back_stake: stake, back_odds: backOdds, lay_odds: layOdds, exchange_commission: commission,
            manual_lay_stake: "", promotion_value: "", bonus_trigger: "Lay Wins",
            bonus_backing_bet: "Normal", retention_percent: "70", underlay_factor: "0.928", overlay_factor: "1.300",
          }),
        });
        if (!response.ok) throw new Error();
        const value = (await response.json()) as Preview;
        if (current === version.current) { setPreview(value); setPreviewState("ready"); }
      } catch (caught) {
        if (current === version.current && !(caught instanceof DOMException && caught.name === "AbortError")) setPreviewState("error");
      }
    });
    return () => controller.abort();
  }, [backOdds, commission, layOdds, stake, strategy]);

  const createDraft = async () => {
    if (!profileId) { setDraftError("Choose a Profile to add this opportunity to Tracker."); return; }
    setDraftState("saving"); setDraftError("");
    try {
      const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/oddsmatcher/prospecting-drafts`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunity_id: opportunity.opportunity_id, retry_token: retryToken.current,
          back_stake: stake, back_odds: backOdds, lay_odds: layOdds, exchange_commission: commission, strategy }),
      });
      if (!response.ok) throw new Error(await responseError(response, "Prospecting draft could not be created."));
      const value = (await response.json()) as { sportsbook_bet: { sportsbook_bet_id: string } };
      setDraftId(value.sportsbook_bet.sportsbook_bet_id); setDraftState("saved");
    } catch (caught) {
      setDraftError(caught instanceof Error ? caught.message : "Prospecting draft could not be created.");
      setDraftState("error");
    }
  };

  const profileStatus = !profileId
    ? <CompactStatus icon="person_off" label="Profile required" explanation="Choose a Profile to apply Account eligibility and Profile exchange commission and to enable Add Prospecting Draft." />
    : null;
  const commissionStatus = !commissionSource
    ? <CompactStatus icon="percent" label="Commission unavailable" tone="warning" explanation="No Profile Account commission or Oddsmatcher default is recorded. Add a governed exchange commission in Profile Accounts or Oddsmatcher Settings." />
    : <span className="oddsmatcher-summary-source">{commissionSource}</span>;

  return (
    <ModalBoundary onDismiss={onClose} returnFocusRef={returnFocusRef}>
      <div className="modal-backdrop modal-backdrop-elevated" onClick={onClose}>
        <section aria-label="Oddsmatcher Bet Summary" aria-modal="true" className="modal-panel oddsmatcher-summary-dialog" data-pd-id="oddsmatcher.bet-summary" onClick={(event) => event.stopPropagation()} role="dialog">
          <header className="modal-sticky-header oddsmatcher-summary-header">
            <h2 id="oddsmatcher-summary-title">Bet Summary</h2>
            <button aria-label="Close Bet Summary" className="modal-close-button" onClick={onClose} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button>
          </header>
          <div className="oddsmatcher-summary-body">
            <div className="oddsmatcher-summary-controls">
              <div className="oddsmatcher-mode-control"><span>Bet Type</span><strong>Normal / Qualifying Bet</strong></div>
              <button aria-checked={advanced} className={`material-switch${advanced ? " is-selected" : ""}`} data-pd-id="oddsmatcher.advanced" onClick={() => { setAdvanced((value) => !value); if (advanced) setStrategy("Standard"); }} role="switch" type="button"><span aria-hidden="true" className="material-switch-track"><span className="material-switch-thumb" /></span><span>Advanced</span></button>
              <button aria-label="Open Oddsmatcher settings" className="icon-button compact-action" onClick={onOpenSettings} title="Oddsmatcher settings" type="button"><span aria-hidden="true" className="material-symbols-outlined">settings</span></button>
            </div>
            <div className="oddsmatcher-summary-layout">
              <div className="oddsmatcher-summary-left">
                <section className="oddsmatcher-bet-card oddsmatcher-bet-card-back">
                  <header><h3>Back Bet</h3>{opportunity.back.link ? <a className="button-link icon-text-action" href={opportunity.back.link} rel="noreferrer" target="_blank">Go to {opportunity.back.account_name}<span aria-hidden="true" className="material-symbols-outlined">open_in_new</span></a> : null}</header>
                  <div className="oddsmatcher-card-account"><strong>{opportunity.back.account_name}</strong>{profileStatus ?? <span className={eligibilityClass(opportunity.back_eligibility.state)}>{opportunity.back_eligibility.reason}</span>}</div>
                  <label className="field-control" htmlFor="oddsmatcher-back-stake"><span>Back Stake</span><FinancialTextInput allowNegative={false} ariaLabel="Back Stake" dataPdId="oddsmatcher.back-stake" id="oddsmatcher-back-stake" onBlur={() => undefined} onChange={setStake} value={stake} /></label>
                  <div className="oddsmatcher-summary-input-row">
                    <label className="field-control"><span>Back Odds</span><input aria-label="Back Odds" inputMode="decimal" onChange={(event) => { setBackOdds(event.target.value); setAutoBack(false); }} value={backOdds} /></label>
                    <label className="field-control"><span>Back Commission</span><input aria-label="Back commission not applied" disabled value="Not applied" /></label>
                  </div>
                  <button aria-checked={autoBack} className={`material-switch oddsmatcher-auto-switch${autoBack ? " is-selected" : ""}`} onClick={() => { const next = !autoBack; setAutoBack(next); if (next) setBackOdds(opportunity.back.odds); }} role="switch" type="button"><span aria-hidden="true" className="material-switch-track"><span className="material-switch-thumb" /></span><span>Auto update back odds</span></button>
                </section>

                <section className="oddsmatcher-bet-card oddsmatcher-bet-card-lay">
                  <header><h3>Lay Bet</h3><button aria-label={`${simpleExchangeName(opportunity.lay.account_name)} link unavailable`} className="button-link icon-text-action" disabled title="Exchange link unavailable" type="button">Go to {simpleExchangeName(opportunity.lay.account_name)}<span aria-hidden="true" className="material-symbols-outlined">open_in_new</span></button></header>
                  <div className="oddsmatcher-card-account"><strong>{simpleExchangeName(opportunity.lay.account_name)}</strong>{profileStatus ?? <span className={eligibilityClass(opportunity.lay_eligibility.state)}>{opportunity.lay_eligibility.reason}</span>}{commissionStatus}</div>
                  <div className="oddsmatcher-summary-input-row">
                    <label className="field-control"><span>Lay Odds</span><input aria-label="Lay Odds" inputMode="decimal" onChange={(event) => { setLayOdds(event.target.value); setAutoLay(false); }} value={layOdds} /></label>
                    <label className="field-control" htmlFor="oddsmatcher-lay-commission"><span>Lay Commission</span><PercentageTextInput ariaLabel="Lay Commission (%)" dataPdId="oddsmatcher.lay-commission" id="oddsmatcher-lay-commission" onChange={setCommission} value={commission} /></label>
                  </div>
                  <CompactStatus label="Liquidity unavailable" explanation="This provider supplies the lay price but not available exchange depth. Confirm liquidity before placing a bet." />
                  <button aria-checked={autoLay} className={`material-switch oddsmatcher-auto-switch${autoLay ? " is-selected" : ""}`} onClick={() => { const next = !autoLay; setAutoLay(next); if (next) setLayOdds(opportunity.lay.odds); }} role="switch" type="button"><span aria-hidden="true" className="material-switch-track"><span className="material-switch-thumb" /></span><span>Auto update lay odds</span></button>
                  <div className="oddsmatcher-lay-stake-block">
                    <span className="eyebrow">Lay Stake</span>
                    <strong>{preview ? <CopyableFinancialValue label="Lay stake" value={preview.selected_lay_stake} /> : "—"}</strong>
                    <span>Liability: {preview ? <FinancialValue value={preview.liability} /> : "—"}</span>
                  </div>
                  {advanced ? <div className="oddsmatcher-advanced-controls">
                    <CalculatorSegmentedControl ariaLabel="Lay strategy" dataPdId="oddsmatcher.strategy" onChange={setStrategy} options={[{label:"Underlay",value:"Underlay"},{label:"Standard",value:"Standard"},{label:"Overlay",value:"Overlay"}]} value={strategy} />
                    <input aria-label="Lay strategy range" max="2" min="0" onChange={(event) => setStrategy((["Underlay","Standard","Overlay"] as Strategy[])[Number(event.target.value)])} step="1" type="range" value={({Underlay:0,Standard:1,Overlay:2} as const)[strategy]} />
                    <div className="oddsmatcher-advanced-range"><span>Range Min<br/><strong>Underlay</strong></span><span>Current Lay Stake<br/><strong>{preview ? <FinancialValue value={preview.selected_lay_stake} /> : "—"}</strong></span><span>Range Max<br/><strong>Overlay</strong></span></div>
                  </div> : null}
                  {manual ? <button className="button-link" onClick={() => { setBackOdds(opportunity.back.odds); setLayOdds(opportunity.lay.odds); setAutoBack(true); setAutoLay(true); }} type="button">Reset to latest quotes</button> : null}
                  {previewState === "error" ? <p className="field-validation-text" role="alert">Enter complete valid stake, odds and commission values.</p> : null}
                </section>
              </div>

              <div className="oddsmatcher-summary-right">
                <section className="oddsmatcher-event-summary">
                  <span aria-hidden="true" className="material-symbols-outlined oddsmatcher-event-icon">sports_soccer</span>
                  <span className={`oddsmatcher-rating-pill oddsmatcher-rating-${oddsMatcherRatingTone(opportunity.display_rating)}`}>{Number(opportunity.display_rating).toFixed(2)}%</span>
                  <time dateTime={opportunity.starts_at}>{new Date(opportunity.starts_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</time>
                  <div><h3>{opportunity.event_name}</h3><span>{opportunity.competition}</span></div>
                  <div><strong>{opportunity.selection}</strong><span>{opportunity.market}</span></div>
                  <small>{opportunity.back.account_name} back · {formatObserved(opportunity.age_seconds)} · {simpleExchangeName(opportunity.lay.account_name)} lay · {formatObserved(opportunity.age_seconds)}</small>
                </section>
                {previewState === "loading" ? <LedgerLoadingIndicator label="Updating Bet Summary" /> : null}
                {preview ? <div className="oddsmatcher-outcome-stack">
                  <OutcomeTable heading={`If back (${opportunity.back.account_name}) bet wins`} outcome={preview.outcomes?.find((item) => item.key === "back-wins")} total={preview.pnl_if_back_wins} />
                  <OutcomeTable heading={`If lay (${simpleExchangeName(opportunity.lay.account_name)}) bet wins`} outcome={preview.outcomes?.find((item) => item.key === "lay-wins")} total={preview.pnl_if_lay_wins} />
                  <div className="oddsmatcher-total-profit"><span>Total Profit</span><strong><FinancialValue value={preview.matched_result} /></strong><small>Conservative / worst-case result</small></div>
                </div> : null}
                {draftError ? <p className="field-validation-text" role="alert">{draftError}</p> : null}
                {draftState === "saved" && profileId ? <p className="status-message" role="status">Prospecting draft saved. No balance or placed-bet state changed. <Link href={`/profiles/${profileId}/tracker/sportsbook-bets?record=${encodeURIComponent(draftId)}`}>Open Sportsbook draft</Link></p> : null}
                <div className="oddsmatcher-prospecting-action">
                  {!profileId ? profileStatus : null}
                  <button className="modal-primary-button" disabled={!profileId || !opportunity.can_create_prospecting_draft || previewState !== "ready" || draftState === "saving" || draftState === "saved"} onClick={() => void createDraft()} type="button">{draftState === "saving" ? "Adding draft…" : draftState === "saved" ? "Draft added" : "Add Prospecting Draft"}</button>
                  <button className="button-link icon-text-action" onClick={() => void navigator.clipboard.writeText(opportunityCopyText(opportunity))} type="button"><span aria-hidden="true" className="material-symbols-outlined">content_copy</span>Copy Opportunity</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </ModalBoundary>
  );
}

function OutcomeTable({ heading, outcome, total }: { heading: string; outcome?: Preview["outcomes"][number]; total: string }) {
  return <section className="oddsmatcher-outcome-card"><h3>{heading}</h3><div className="table-scroll"><table className="data-table"><thead><tr><th>Bookmaker</th><th>Exchange</th><th>Total</th></tr></thead><tbody><tr><td>{outcome ? <FinancialValue value={outcome.bookmaker_component} /> : "—"}</td><td>{outcome ? <FinancialValue value={outcome.exchange_component} /> : "—"}</td><td><strong><FinancialValue value={outcome?.total ?? total} /></strong></td></tr></tbody></table></div></section>;
}
