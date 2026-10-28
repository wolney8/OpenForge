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
import { CalculatorOutcomes } from "@/components/calculator-outcomes";
import { FinancialValue } from "@/components/financial-value";
import { FinancialTextInput } from "@/components/financial-text-input";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { LedgerPagination } from "@/components/ledger-pagination";
import { ModalBoundary } from "@/components/modal-boundary";
import { PercentageTextInput } from "@/components/percentage-text-input";
import { SingleLayCustomSlider } from "@/components/single-lay-custom-slider";
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
  type OddsMatcherSavedSnapshot,
  type OddsMatcherSavedFilter,
  type OpportunitySort,
} from "@/lib/oddsmatcher";
import {
  PresetSelect,
  SearchableCombobox,
  type OptionListMode,
  type SelectionOption,
} from "@/components/selection-controls";
import { formatOdds, ODDS_FORMATS, parseOdds, type OddsFormat } from "@/lib/odds-format";

type Preview = {
  selected_lay_stake: string;
  reference_lay_stake_standard: string;
  reference_lay_stake_underlay: string | null;
  reference_lay_stake_overlay: string | null;
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
  strategy_references: Array<{
    strategy: string;
    lay_stake: string;
    liability: string;
    back_wins_total: string;
    back_loses_total: string;
  }>;
};
type Strategy = "Underlay" | "Standard" | "Overlay" | "Custom";
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
  const [position, setPosition] = useState({ left: 12, top: 12, width: 288 });
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      setPortalTarget(trigger.closest("dialog") ?? document.body);
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(320, Math.max(220, window.innerWidth - 24));
      const left = Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - width - 12));
      const top = rect.bottom + 84 <= window.innerHeight
        ? rect.bottom + 8
        : Math.max(12, rect.top - 84);
      setPosition({ left, top, width });
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!triggerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
    };
  }, [open]);
  return (
    <span className={`compact-status compact-status-${tone}${open ? " is-open" : ""}`}>
      <button
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        aria-label={`${label}. ${explanation}`}
        className="compact-status-trigger"
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((current) => !current)}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); event.currentTarget.focus(); } }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => { if (document.activeElement !== triggerRef.current) setOpen(false); }}
        ref={triggerRef}
        type="button"
      >
        <span aria-hidden="true" className="material-symbols-outlined">{icon}</span>
        <span>{label}</span>
      </button>
      {open && portalTarget ? createPortal(
        <span className="compact-status-tooltip compact-status-tooltip-portal" id={id} role="tooltip" style={position}>{explanation}</span>,
        portalTarget,
      ) : null}
    </span>
  );
}

function LiquidityUnavailableStatus({ compact = false }: { compact?: boolean }) {
  return <CompactStatus
    explanation="This provider supplies a lay price but not available exchange depth. Confirm exchange liquidity before placing a bet."
    label={compact ? "Unavailable" : "Liquidity unavailable"}
  />;
}
function effectiveRatingSupportingText(row: OddsMatcherOpportunity) {
  const commission = Number(row.exchange_commission);
  const display = Number(row.display_rating);
  const effective = Number(row.commission_aware_rating);
  if (!Number.isFinite(commission) || commission <= 0 || !Number.isFinite(display) || !Number.isFinite(effective)) return null;
  if (display.toFixed(2) === effective.toFixed(2)) return null;
  return `After ${Number((commission * 100).toFixed(2))}% commission · ${effective.toFixed(2)}%`;
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
  const [providerQuotaExhausted, setProviderQuotaExhausted] = useState(false);
  const [savedSnapshots, setSavedSnapshots] = useState<OddsMatcherSavedSnapshot[]>([]);
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
  const [savedFiltersOpen, setSavedFiltersOpen] = useState(false);
  const [activeSavedFilterId, setActiveSavedFilterId] = useState<string | null>(null);
  const [filterPanel, setFilterPanel] = useState<FilterPanel | null>(null);
  const [defaultStake, setDefaultStake] = useState("10");
  const [selected, setSelected] = useState<OddsMatcherOpportunity | null>(null);
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
  const loadSavedSnapshots = useCallback(async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/oddsmatcher/snapshots`, {
        cache: "no-store",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Saved snapshots could not be loaded.");
      const value = await response.json() as OddsMatcherSavedSnapshot[];
      setSavedSnapshots(value);
    } catch {
      setSavedSnapshots([]);
    }
  }, []);
  useEffect(() => {
    void Promise.resolve().then(loadSavedSnapshots);
  }, [loadSavedSnapshots]);
  useEffect(() => {
    void fetch(`${apiBaseUrl}/fund-manager/preferences/oddsmatcher`, { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(await responseError(response, "Oddsmatcher settings could not be loaded."));
        return response.json() as Promise<OddsMatcherPreferences>;
      })
      .then((value) => {
        const resolved = { ...defaultOddsMatcherPreferences, ...value };
        setPreferences(resolved);
        setDefaultStake(resolved.default_back_stake);
        setFilters((current) => ({ ...current, showArbs: resolved.show_arbs_default }));
        setPreferencesState("ready");
      })
      .catch(() => setPreferencesState("error"));
  }, []);
  const dataSource = preferences.data_source;
  const savedSnapshotId = preferences.saved_snapshot_id;
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
      if (refresh && dataSource !== "live") return;
      if (refresh && refreshInFlight.current) return;
      if (refresh) refreshInFlight.current = true;
      if (refresh) setRefreshing(true);
      else setReadState("loading");
      setError("");
      try {
        if (dataSource === "replay" && !savedSnapshotId) {
          setFeed(null);
          setReadState("ready");
          return;
        }
        const sourcePath = dataSource === "replay"
          ? `/oddsmatcher/snapshots/${encodeURIComponent(savedSnapshotId)}`
          : `/oddsmatcher${refresh ? "/refresh" : ""}`;
        const response = await fetch(
          `${apiBaseUrl}${sourcePath}${profileQuery}`,
          { credentials: "include", method: refresh ? "POST" : "GET" },
        );
        if (!response.ok) {
          const message = await responseError(
            response,
            "Oddsmatcher data could not be loaded.",
          );
          if (refresh && response.status === 429) {
            setProviderQuotaExhausted(true);
            setReadState((current) => current === "loading" ? "error" : current);
            return;
          }
          throw new Error(message);
        }
        const nextFeed = (await response.json()) as OddsMatcherFeed;
        setFeed(nextFeed);
        if (dataSource === "live") {
          setProviderQuotaExhausted(
            nextFeed.provider_quota_exhausted || nextFeed.provider_credits_remaining === 0,
          );
          if (refresh) void loadSavedSnapshots();
        }
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
    [dataSource, loadSavedSnapshots, profileQuery, savedSnapshotId],
  );
  useEffect(() => {
    if (preferencesState !== "ready") return;
    let active = true;
    void Promise.resolve().then(() => { if (active) void load(false); });
    return () => { active = false; };
  }, [load, preferencesState]);

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
  const refreshBlocked = dataSource === "replay" || providerQuotaExhausted || feed?.provider_credits_remaining === 0;
  const providerQuotaLow = Boolean(
    dataSource === "live" &&
    feed?.provider_credits_remaining != null &&
    feed.provider_credits_remaining > 0 &&
    feed.provider_credits_used != null &&
    feed.provider_credits_remaining <= Math.max(
      feed.provider_last_refresh_cost ?? 1,
      Math.ceil((feed.provider_credits_used + feed.provider_credits_remaining) * 0.1),
    )
  );
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
        <div className="oddsmatcher-card-quote"><span className="eyebrow">Back</span><span className="oddsmatcher-quote-cell"><QuoteBlock
          kind="back" catalogue={accountCatalogue} href={row.back.link}
          name={row.back.account_name} odds={row.back.odds} />
          <span aria-hidden={!profileId || row.back_eligibility.state === "eligible"} className="oddsmatcher-quote-status-slot">{profileId && row.back_eligibility.state !== "eligible" ? <small className={eligibilityClass(row.back_eligibility.state)}>{row.back_eligibility.reason}</small> : null}</span></span>
        </div>
        <div className="oddsmatcher-card-quote"><span className="eyebrow">Lay</span><span className="oddsmatcher-quote-cell"><QuoteBlock
          kind="lay" catalogue={accountCatalogue} href={row.lay.link}
          name={row.lay.account_name} odds={row.lay.odds} />
          <span className="oddsmatcher-quote-status-slot"><LiquidityUnavailableStatus compact /></span></span>
        </div>
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
          <Link
            className="button-link icon-text-action"
            data-pd-id="oddsmatcher.settings.open"
            href="/settings#oddsmatcher"
            title="Open Fund Manager Oddsmatcher settings"
          >
            <span aria-hidden="true" className="material-symbols-outlined">
              settings
            </span>
            <span>Settings</span>
          </Link>
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
              aria-label={refreshing ? "Refreshing odds" : dataSource === "replay" ? "Refresh unavailable in saved snapshot mode" : refreshBlocked ? "Refresh unavailable: provider quota exhausted" : "Refresh odds"}
              className="icon-button compact-action"
              data-pd-id="oddsmatcher.refresh"
              disabled={refreshing || refreshBlocked}
              onClick={() => void load(true)}
              title={dataSource === "replay" ? "Saved snapshots make no provider requests" : refreshBlocked ? "Provider quota exhausted" : "Refresh live odds"}
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
            <span>{feed.data_source === "replay" ? "Captured quota" : "Provider credits"}: {feed.provider_credits_remaining} remaining</span>
          ) : null}
          {feed?.provider_credits_used != null ? <span>{feed.provider_credits_used} used</span> : null}
          {feed?.provider_last_refresh_cost != null ? <span>Last refresh: {feed.provider_last_refresh_cost} credits</span> : null}
        </div>
        {feed?.data_source === "replay" ? (
          <div className="oddsmatcher-replay-status" role="status">
            <strong>Saved snapshot</strong>
            <span>
              {new Date(feed.replay_captured_at ?? feed.fetched_at ?? "").toLocaleString("en-GB")} · testing/replay
            </span>
            <span>Draft creation and external quote links are disabled for replayed odds.</span>
          </div>
        ) : null}
        {providerQuotaLow ? (
          <p className="field-warning-text" role="status">Provider quota is running low.</p>
        ) : null}
        <div className="oddsmatcher-boundary-note" role="note">
          <strong>Prospecting only · liquidity unknown.</strong>
          <span>
            Provider lay prices do not prove available depth. No placed-bet or
            exchange-placement action is available.
          </span>
        </div>
        {readState === "loading" ? (
          <LedgerLoadingIndicator
            label={dataSource === "replay" ? "Loading saved Oddsmatcher snapshot" : "Loading live Oddsmatcher snapshot"}
          />
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
            {feed.data_source === "replay"
              ? "These replayed prices are historical and must not be treated as live opportunities."
              : "These prices are stale. Refresh before relying on them."}
          </p>
        ) : null}
        {readState === "ready" && dataSource === "replay" && !savedSnapshots.length ? (
          <div className="oddsmatcher-provider-state" role="status">
            <strong>No saved snapshots are available.</strong>
            <p>Return to Live and refresh when the provider permits requests to retain a private replay snapshot.</p>
          </div>
        ) : null}
        {readState === "ready" && feed?.state === "empty" ? (
          <div
            aria-live="polite"
            className={`oddsmatcher-provider-state${refreshBlocked ? " is-warning" : ""}`}
            role="status"
          >
            {providerQuotaExhausted ? (
              <>
                <strong>Provider quota exhausted.</strong>
                <p>No odds snapshot is loaded.</p>
              </>
            ) : (
              <>
                <strong>No odds snapshot is loaded.</strong>
                <p>Use Refresh once to make one bounded provider request across the approved competitions.</p>
              </>
            )}
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
                        <span className="table-cell-stack oddsmatcher-quote-cell">
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
                          <span aria-hidden={!profileId || row.back_eligibility.state === "eligible"} className="oddsmatcher-quote-status-slot">{profileId && row.back_eligibility.state !== "eligible" ? <small className={eligibilityClass(row.back_eligibility.state)}>{row.back_eligibility.reason}</small> : null}</span>
                        </span>
                      </td>
                      <td>
                        <span className="table-cell-stack oddsmatcher-quote-cell oddsmatcher-lay-quote-stack">
                          <QuoteBlock
                            kind="lay"
                            catalogue={accountCatalogue}
                            href={row.lay.link}
                            name={row.lay.account_name}
                            odds={row.lay.odds}
                          />
                          <span className="oddsmatcher-quote-status-slot"><LiquidityUnavailableStatus compact /></span>
                        </span>
                      </td>
                      <td>
                        <span className="table-cell-stack oddsmatcher-rating-cell">
                          <strong className={`oddsmatcher-rating-pill oddsmatcher-rating-${oddsMatcherRatingTone(row.display_rating)}`}>
                            {Number(row.display_rating).toFixed(2)}%
                          </strong>
                          {effectiveRatingSupportingText(row) ? <span>{effectiveRatingSupportingText(row)}</span> : null}
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
            defaultAutoBack={preferences.auto_update_back_odds}
            defaultAutoLay={preferences.auto_update_lay_odds}
            onClose={() => setSelected(null)}
            opportunity={selected}
            profileId={profileId}
            replay={feed?.data_source === "replay"}
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
}: {
  kind: "back" | "lay";
  catalogue: MasterAccountCatalogueRecord[];
  href: string | null;
  name: string;
  odds: string;
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

function AnchoredSurface({ alignment = "start", children, className = "", label, onClose, returnFocusRef }: {
  alignment?: "start" | "end";
  children: ReactNode;
  className?: string;
  label: string;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const surfaceRef = useRef<HTMLElement>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [position, setPosition] = useState({ left: 12, top: 12, width: 420, maxHeight: 600 });
  useLayoutEffect(() => {
    const trigger = returnFocusRef.current;
    const surface = surfaceRef.current;
    if (!trigger || !surface) return;
    setPortalTarget(trigger.closest("dialog") ?? document.body);
    const place = () => {
      const rect = trigger.getBoundingClientRect();
      const margin = 16;
      const width = Math.min(440, window.innerWidth - margin * 2);
      const measuredHeight = Math.min(surface.scrollHeight, window.innerHeight - margin * 2);
      const roomBelow = window.innerHeight - rect.bottom - margin;
      const top = roomBelow >= Math.min(measuredHeight, 320)
        ? rect.bottom + 6
        : Math.max(margin, rect.top - measuredHeight - 6);
      setPosition({
        left: Math.min(
          Math.max(margin, alignment === "end" ? rect.right - width : rect.left),
          window.innerWidth - width - margin,
        ),
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
  }, [alignment, returnFocusRef]);
  useEffect(() => {
    const dismissNestedSurface = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onClose();
    };
    document.addEventListener("keydown", dismissNestedSurface, true);
    return () => document.removeEventListener("keydown", dismissNestedSurface, true);
  }, [onClose]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="oddsmatcher-anchored-layer" onPointerDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        aria-label={label}
        className={`oddsmatcher-anchored-surface ${className}`}
        onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); } }}
        ref={surfaceRef}
        role="dialog"
        style={position}
      >
        {children}
      </section>
    </div>,
    portalTarget ?? document.body,
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
    <AnchoredSurface alignment="end" className="oddsmatcher-saved-filters-menu" label="My Filters" onClose={onClose} returnFocusRef={returnFocusRef}>
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
  defaultAutoBack,
  defaultAutoLay,
  defaultAdvanced,
  defaultStake,
  onClose,
  opportunity,
  profileId,
  replay,
  returnFocusRef,
}: {
  defaultAutoBack: boolean;
  defaultAutoLay: boolean;
  defaultAdvanced: boolean;
  defaultStake: string;
  onClose: () => void;
  opportunity: OddsMatcherOpportunity;
  profileId: string | null;
  replay: boolean;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const [stake, setStake] = useState(defaultStake);
  const [backCommission, setBackCommission] = useState("0");
  const [backOdds, setBackOdds] = useState(opportunity.back.odds);
  const [layOdds, setLayOdds] = useState(opportunity.lay.odds);
  const [backOddsFormat, setBackOddsFormat] = useState<OddsFormat>("Decimal");
  const [layOddsFormat, setLayOddsFormat] = useState<OddsFormat>("Decimal");
  const [backOddsInput, setBackOddsInput] = useState(formatOdds(opportunity.back.odds, "Decimal"));
  const [layOddsInput, setLayOddsInput] = useState(formatOdds(opportunity.lay.odds, "Decimal"));
  const [backOddsError, setBackOddsError] = useState<string | null>(null);
  const [layOddsError, setLayOddsError] = useState<string | null>(null);
  const [commission, setCommission] = useState(opportunity.exchange_commission || "0");
  const [strategy, setStrategy] = useState<Strategy>("Standard");
  const [customLayStake, setCustomLayStake] = useState("");
  const [manualMinimum, setManualMinimum] = useState("");
  const [manualMaximum, setManualMaximum] = useState("");
  const [rangeMode, setRangeMode] = useState<"auto" | "manual">("auto");
  const [advanced, setAdvanced] = useState(defaultAdvanced);
  const [autoBack, setAutoBack] = useState(replay ? false : defaultAutoBack);
  const [autoLay, setAutoLay] = useState(replay ? false : defaultAutoLay);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewState, setPreviewState] = useState<"loading" | "ready" | "error">("loading");
  const [previewPending, setPreviewPending] = useState(false);
  const [draftState, setDraftState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [draftError, setDraftError] = useState("");
  const [draftId, setDraftId] = useState("");
  const [calculatorSettingsOpen, setCalculatorSettingsOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const retryToken = useRef(crypto.randomUUID());
  const version = useRef(0);
  const previewRef = useRef<Preview | null>(null);
  const commissionSource = opportunity.commission_origin === "profile-account"
    ? "Profile Account"
    : opportunity.commission_origin === "oddsmatcher-default"
      ? "Oddsmatcher default"
      : "0% default";
  const backCommissionUnsupported = backCommission.trim() === "" || !Number.isFinite(Number(backCommission)) || Number(backCommission) !== 0;
  const oddsInvalid = Boolean(backOddsError || layOddsError);
  const effectivePreviewState = backCommissionUnsupported || oddsInvalid ? "error" : previewState;
  const manual = isManualQuote(opportunity, backOdds, layOdds);

  useEffect(() => {
    const current = ++version.current;
    const controller = new AbortController();
    if (backCommissionUnsupported || oddsInvalid) {
      void Promise.resolve().then(() => {
        if (current === version.current) setPreviewPending(false);
      });
      return () => controller.abort();
    }
    const hasUsablePreview = previewRef.current !== null;
    void Promise.resolve().then(() => {
      if (current !== version.current) return;
      setPreviewPending(hasUsablePreview);
      if (!hasUsablePreview) setPreviewState("loading");
    });
    const timer = window.setTimeout(() => void (async () => {
      if (controller.signal.aborted) return;
      try {
        const response = await fetch(`${apiBaseUrl}/fund-manager/calculators/matched-betting/preview`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            bet_type: "qualifying", free_bet_mode: "SNR", promotion_mode: "standard", strategy,
            back_stake: stake, back_odds: backOdds, lay_odds: layOdds, exchange_commission: commission,
            manual_lay_stake: strategy === "Custom" ? customLayStake : "", promotion_value: "", bonus_trigger: "Lay Wins",
            bonus_backing_bet: "Normal", retention_percent: "70", underlay_bias_percent: "0.02", overlay_bias_percent: "0.02",
          }),
        });
        if (!response.ok) throw new Error();
        const value = (await response.json()) as Preview;
        if (current === version.current) {
          previewRef.current = value;
          setPreview(value);
          setPreviewPending(false);
          setPreviewState("ready");
        }
      } catch (caught) {
        if (current === version.current && !(caught instanceof DOMException && caught.name === "AbortError")) {
          setPreviewPending(false);
          setPreviewState("error");
        }
      }
    })(), hasUsablePreview ? 140 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [backCommissionUnsupported, backOdds, commission, customLayStake, layOdds, oddsInvalid, stake, strategy]);

  const createDraft = async () => {
    if (replay) { setDraftError("Saved snapshots are for testing only and cannot create Tracker drafts."); return; }
    if (!profileId) { setDraftError("Choose a Profile to add this opportunity to Tracker."); return; }
    setDraftState("saving"); setDraftError("");
    try {
      const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/oddsmatcher/prospecting-drafts`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunity_id: opportunity.opportunity_id, retry_token: retryToken.current,
          back_stake: stake, back_odds: backOdds, lay_odds: layOdds, exchange_commission: commission, strategy,
          custom_lay_stake: strategy === "Custom" ? customLayStake : "" }),
      });
      if (!response.ok) throw new Error(await responseError(response, "Prospecting draft could not be created."));
      const value = (await response.json()) as { sportsbook_bet: { sportsbook_bet_id: string } };
      setDraftId(value.sportsbook_bet.sportsbook_bet_id); setDraftState("saved");
    } catch (caught) {
      setDraftError(caught instanceof Error ? caught.message : "Prospecting draft could not be created.");
      setDraftState("error");
    }
  };

  const standardStake = preview?.reference_lay_stake_standard ?? preview?.strategy_references?.find((item) => item.strategy === "Standard")?.lay_stake ?? (strategy === "Standard" ? preview?.selected_lay_stake : "") ?? "";
  const underlayStake = preview?.reference_lay_stake_underlay ?? standardStake;
  const overlayStake = preview?.reference_lay_stake_overlay ?? standardStake;
  const customMinimum = rangeMode === "auto" ? underlayStake : manualMinimum;
  const customMaximum = rangeMode === "auto" ? overlayStake : manualMaximum;
  const displayedLayStake = strategy === "Custom"
    ? customLayStake
    : strategy === "Underlay"
      ? underlayStake
      : strategy === "Overlay"
        ? overlayStake
        : standardStake;
  const safePreview = backCommissionUnsupported || oddsInvalid ? null : preview;
  const rangeMinimumNumber = Number(customMinimum);
  const rangeMaximumNumber = Number(customMaximum);
  const standardStakeNumber = Number(standardStake);
  const rangeError = !customMinimum || !Number.isFinite(rangeMinimumNumber) || rangeMinimumNumber <= 0
    ? "Enter a valid Range Min."
    : !customMaximum || !Number.isFinite(rangeMaximumNumber) || rangeMaximumNumber <= 0
      ? "Enter a valid Range Max."
      : !Number.isFinite(standardStakeNumber) || standardStakeNumber <= 0
        ? "The governed Standard reference is unavailable."
        : rangeMinimumNumber >= standardStakeNumber
          ? "Range Min must be lower than the Standard lay stake."
          : rangeMaximumNumber <= standardStakeNumber
            ? "Range Max must be higher than the Standard lay stake."
            : rangeMinimumNumber >= rangeMaximumNumber
              ? "Range Min must be lower than Range Max."
              : null;
  const sliderMinimum = !rangeError ? rangeMinimumNumber : Math.max(0.01, Number(underlayStake || standardStake || "0.01"));
  const sliderMaximum = !rangeError ? rangeMaximumNumber : Math.max(sliderMinimum + 0.01, Number(overlayStake || standardStake || sliderMinimum + 0.01));
  const sliderCentre = Math.min(sliderMaximum, Math.max(sliderMinimum, standardStakeNumber || sliderMinimum));
  const sliderCurrent = Math.min(sliderMaximum, Math.max(sliderMinimum, Number(displayedLayStake || sliderCentre)));
  const isStandardMatch = strategy === "Standard" && Boolean(preview) &&
    Math.abs(Number(preview?.selected_lay_stake) - Number(standardStake)) <= 0.005;
  const backWinOutcome = safePreview?.outcomes?.find((item) => item.key === "back-wins");
  const layWinOutcome = safePreview?.outcomes?.find((item) => item.key === "lay-wins");
  const setNamedStrategy = (value: Strategy) => {
    setStrategy(value);
    if (value !== "Custom") setCustomLayStake("");
  };
  const setCustomStake = (value: string) => {
    const numeric = Number(value);
    if (standardStake && Number.isFinite(numeric) && Math.abs(numeric - Number(standardStake)) <= 0.005) {
      setNamedStrategy("Standard");
      return;
    }
    setCustomLayStake(value);
    setStrategy("Custom");
  };
  const changeOddsInput = (kind: "back" | "lay", value: string) => {
    const format = kind === "back" ? backOddsFormat : layOddsFormat;
    const parsed = parseOdds(value, format);
    if (kind === "back") {
      setBackOddsInput(value);
      setBackOddsError(parsed.error);
      if (parsed.canonicalDecimal) { setBackOdds(parsed.canonicalDecimal); setAutoBack(false); }
    } else {
      setLayOddsInput(value);
      setLayOddsError(parsed.error);
      if (parsed.canonicalDecimal) { setLayOdds(parsed.canonicalDecimal); setAutoLay(false); }
    }
  };
  const changeOddsFormat = (kind: "back" | "lay", format: OddsFormat) => {
    if (kind === "back") {
      setBackOddsFormat(format);
      setBackOddsInput(formatOdds(backOdds, format));
      setBackOddsError(null);
    } else {
      setLayOddsFormat(format);
      setLayOddsInput(formatOdds(layOdds, format));
      setLayOddsError(null);
    }
  };

  const profileStatus = replay
    ? <CompactStatus icon="history" label="Replay · draft creation disabled" explanation="Saved odds are retained for testing and cannot be added to Tracker or treated as live." tone="warning" />
    : !profileId
      ? <CompactStatus icon="person_off" label="Profile required to add to Tracker" explanation="Choose a Profile to apply Account eligibility and enable Add Prospecting Draft." />
      : null;

  return (
    <ModalBoundary onDismiss={onClose} returnFocusRef={returnFocusRef}>
      <div className="modal-backdrop modal-backdrop-elevated" onClick={onClose}>
        <section aria-label="Oddsmatcher Bet Summary" aria-modal="true" className={`modal-panel oddsmatcher-summary-dialog${advanced ? " is-advanced" : ""}`} data-pd-id="oddsmatcher.bet-summary" data-preview-pending={previewPending || undefined} onClick={(event) => event.stopPropagation()} role="dialog">
          <header className="modal-sticky-header oddsmatcher-summary-header">
            <h2 id="oddsmatcher-summary-title">Bet Summary</h2>
            <button aria-label="Close Bet Summary" className="modal-close-button" onClick={onClose} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button>
          </header>
          <div className="oddsmatcher-summary-body">
            <div className="oddsmatcher-summary-controls">
              <label className="field-control oddsmatcher-bet-type" htmlFor="oddsmatcher-bet-type"><span>Bet Type</span><select id="oddsmatcher-bet-type" value="qualifying" onChange={() => undefined}><option value="qualifying">Normal / Qualifying Bet</option></select></label>
              <button aria-checked={advanced} className={`material-switch${advanced ? " is-selected" : ""}`} data-pd-id="oddsmatcher.advanced" onClick={() => { setAdvanced((value) => !value); if (advanced) setNamedStrategy("Standard"); }} role="switch" type="button"><span aria-hidden="true" className="material-switch-track"><span className="material-switch-thumb" /></span><span>Advanced</span></button>
              <button aria-label="Open Bet Summary settings" className="icon-button compact-action" onClick={() => setCalculatorSettingsOpen(true)} ref={settingsButtonRef} title="Bet Summary settings" type="button"><span aria-hidden="true" className="material-symbols-outlined">settings</span></button>
            </div>
            <div className="oddsmatcher-summary-layout">
              <div className="oddsmatcher-summary-left">
                <section className="oddsmatcher-bet-card oddsmatcher-bet-card-back">
                  <header><h3>Back Bet</h3>{opportunity.back.link ? <a className="button-link icon-text-action" href={opportunity.back.link} rel="noreferrer" target="_blank">Go to {opportunity.back.account_name}<span aria-hidden="true" className="material-symbols-outlined">open_in_new</span></a> : null}</header>
                  {profileId ? <div className="oddsmatcher-card-account"><span className={eligibilityClass(opportunity.back_eligibility.state)}>{opportunity.back_eligibility.reason}</span></div> : null}
                  <label className="field-control" htmlFor="oddsmatcher-back-stake"><span>Back Stake</span><FinancialTextInput allowNegative={false} ariaLabel="Back Stake" dataPdId="oddsmatcher.back-stake" id="oddsmatcher-back-stake" onBlur={() => undefined} onChange={setStake} value={stake} /></label>
                  <div className="oddsmatcher-summary-input-row">
                    <label className="field-control"><span>Back Odds</span><input aria-describedby={backOddsError ? "oddsmatcher-back-odds-error" : undefined} aria-invalid={Boolean(backOddsError) || undefined} aria-label="Back Odds" inputMode={backOddsFormat === "Fractional" ? "text" : "decimal"} onChange={(event) => changeOddsInput("back", event.target.value)} value={backOddsInput} />{backOddsError ? <small className="field-validation-text" id="oddsmatcher-back-odds-error" role="alert">{backOddsError}</small> : null}</label>
                    <label className="field-control" htmlFor="oddsmatcher-back-commission"><span>Back Commission</span><PercentageTextInput ariaLabel="Back Commission" dataPdId="oddsmatcher.back-commission" id="oddsmatcher-back-commission" onChange={setBackCommission} value={backCommission} />{backCommissionUnsupported ? <small className="field-validation-text">The current qualifying contract supports 0% bookmaker commission.</small> : null}</label>
                  </div>
                  <button aria-checked={autoBack} aria-disabled={replay} className={`material-switch oddsmatcher-auto-switch${autoBack ? " is-selected" : ""}`} disabled={replay} onClick={() => { const next = !autoBack; setAutoBack(next); if (next) { setBackOdds(opportunity.back.odds); setBackOddsInput(formatOdds(opportunity.back.odds, backOddsFormat)); setBackOddsError(null); } }} role="switch" title={replay ? "Automatic quote updates are unavailable for saved snapshots" : undefined} type="button"><span aria-hidden="true" className="material-switch-track"><span className="material-switch-thumb" /></span><span>Auto-update Back Odds</span></button>
                </section>

                <section className="oddsmatcher-bet-card oddsmatcher-bet-card-lay">
                  <header><h3>Lay Bet</h3><button aria-label={`${simpleExchangeName(opportunity.lay.account_name)} link unavailable`} className="button-link icon-text-action" disabled title="Exchange link unavailable" type="button">Go to {simpleExchangeName(opportunity.lay.account_name)}<span aria-hidden="true" className="material-symbols-outlined">open_in_new</span></button></header>
                  {profileId ? <div className="oddsmatcher-card-account"><span className={eligibilityClass(opportunity.lay_eligibility.state)}>{opportunity.lay_eligibility.reason}</span></div> : null}
                  <div className="oddsmatcher-summary-input-row">
                    <label className="field-control"><span>Lay Odds</span><input aria-describedby={layOddsError ? "oddsmatcher-lay-odds-error" : undefined} aria-invalid={Boolean(layOddsError) || undefined} aria-label="Lay Odds" inputMode={layOddsFormat === "Fractional" ? "text" : "decimal"} onChange={(event) => changeOddsInput("lay", event.target.value)} value={layOddsInput} />{layOddsError ? <small className="field-validation-text" id="oddsmatcher-lay-odds-error" role="alert">{layOddsError}</small> : null}</label>
                    <label className="field-control" htmlFor="oddsmatcher-lay-commission" title={`Commission source: ${commissionSource}`}><span>Lay Commission</span><PercentageTextInput ariaLabel="Lay Commission" dataPdId="oddsmatcher.lay-commission" id="oddsmatcher-lay-commission" onChange={setCommission} value={commission} /></label>
                  </div>
                  <div className="oddsmatcher-lay-meta-row"><LiquidityUnavailableStatus /></div>
                  <button aria-checked={autoLay} aria-disabled={replay} className={`material-switch oddsmatcher-auto-switch${autoLay ? " is-selected" : ""}`} disabled={replay} onClick={() => { const next = !autoLay; setAutoLay(next); if (next) { setLayOdds(opportunity.lay.odds); setLayOddsInput(formatOdds(opportunity.lay.odds, layOddsFormat)); setLayOddsError(null); } }} role="switch" title={replay ? "Automatic quote updates are unavailable for saved snapshots" : undefined} type="button"><span aria-hidden="true" className="material-switch-track"><span className="material-switch-thumb" /></span><span>Auto-update Lay Odds</span></button>
                  <div className="oddsmatcher-lay-stake-block">
                    <div className="oddsmatcher-lay-stake-content">
                      <span>Lay Stake</span>
                      <FinancialTextInput allowNegative={false} ariaLabel="Lay Stake" contentAlignment="center" dataPdId="oddsmatcher.lay-stake" id="oddsmatcher-lay-stake" onBlur={() => undefined} onChange={setCustomStake} value={displayedLayStake} />
                      <span>Liability: {safePreview ? <FinancialValue value={safePreview.liability} /> : "—"}</span>
                    </div>
                    <button aria-label="Copy lay stake" className="icon-button compact-action" onClick={() => void navigator.clipboard.writeText(displayedLayStake)} title="Copy lay stake" type="button"><span aria-hidden="true" className="material-symbols-outlined">content_copy</span></button>
                  </div>
                  {advanced ? <div className="oddsmatcher-advanced-controls">
                    <CalculatorSegmentedControl ariaLabel="Lay strategy" dataPdId="oddsmatcher.strategy" onChange={setNamedStrategy} options={[{label:"Underlay",value:"Underlay"},{label:"Standard",value:"Standard"},{label:"Overlay",value:"Overlay"}]} value={strategy} />
                    <SingleLayCustomSlider ariaLabel="Lay strategy range" centre={sliderCentre} current={sliderCurrent} disabled={Boolean(rangeError)} layout="summary" maximum={sliderMaximum} maximumText={customMaximum} minimum={sliderMinimum} minimumText={customMinimum} onCommit={setCustomStake} onDraft={setCustomStake} onMaximumChange={(value) => { if (rangeMode === "auto") setManualMinimum(underlayStake); setManualMaximum(value); setRangeMode("manual"); }} onMinimumChange={(value) => { if (rangeMode === "auto") setManualMaximum(overlayStake); setManualMinimum(value); setRangeMode("manual"); }} />
                    {rangeError ? <p className="field-validation-text oddsmatcher-range-error" role="alert">{rangeError}</p> : null}
                  </div> : null}
                  <div className="oddsmatcher-place-lay-stub" data-pd-id="oddsmatcher.place-lay-stub">
                    <button aria-describedby="oddsmatcher-place-lay-explanation" aria-disabled="true" onClick={(event) => event.preventDefault()} type="button">Place lay bet</button>
                    <strong>Stake: {safePreview ? <FinancialValue value={safePreview.selected_lay_stake} /> : "—"} <span aria-hidden="true">|</span> Liability: {safePreview ? <FinancialValue value={safePreview.liability} /> : "—"}</strong>
                    <small className="visually-hidden" id="oddsmatcher-place-lay-explanation">Direct exchange placement is not enabled.</small>
                  </div>
                  {manual ? <button className="button-link" onClick={() => { setBackOdds(opportunity.back.odds); setBackOddsInput(formatOdds(opportunity.back.odds, backOddsFormat)); setBackOddsError(null); setLayOdds(opportunity.lay.odds); setLayOddsInput(formatOdds(opportunity.lay.odds, layOddsFormat)); setLayOddsError(null); setAutoBack(replay ? false : defaultAutoBack); setAutoLay(replay ? false : defaultAutoLay); }} type="button">Reset to latest quotes</button> : null}
                  {effectivePreviewState === "error" && !backCommissionUnsupported && !oddsInvalid ? <p className="field-validation-text" role="alert">Check the highlighted stake, odds or commission field.</p> : null}
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
                {effectivePreviewState === "loading" && !preview ? <LedgerLoadingIndicator label="Loading Bet Summary" /> : null}
                {safePreview ? <div className="oddsmatcher-outcome-stack">
                  <CalculatorOutcomes columns={["Bookmaker", "Exchange"]} compact inspectionId="oddsmatcher.bet-summary.outcomes" rows={[
                    { key: "back-wins", label: "Back bet wins", tone: "positive", components: [[backWinOutcome?.bookmaker_component], [backWinOutcome?.exchange_component]], total: backWinOutcome?.total ?? safePreview.pnl_if_back_wins },
                    { key: "lay-wins", label: "Lay bet wins", tone: "exchange", components: [[layWinOutcome?.bookmaker_component], [layWinOutcome?.exchange_component]], total: layWinOutcome?.total ?? safePreview.pnl_if_lay_wins },
                  ]} />
                  {isStandardMatch ? <div className="oddsmatcher-total-profit"><span>Total Profit</span><strong><FinancialValue value={safePreview.matched_result} /></strong><small>Conservative / worst-case result</small></div> : null}
                </div> : null}
                {draftError ? <p className="field-validation-text" role="alert">{draftError}</p> : null}
                {draftState === "saved" && profileId ? <p className="status-message" role="status">Prospecting draft saved. No balance or placed-bet state changed. <Link href={`/profiles/${profileId}/tracker/sportsbook-bets?record=${encodeURIComponent(draftId)}`}>Open Sportsbook draft</Link></p> : null}
                <div className="oddsmatcher-prospecting-action">
                  {profileStatus}
                  <button className="modal-primary-button" disabled={replay || !profileId || !opportunity.can_create_prospecting_draft || effectivePreviewState !== "ready" || previewPending || draftState === "saving" || draftState === "saved"} onClick={() => void createDraft()} type="button">{draftState === "saving" ? "Adding draft…" : draftState === "saved" ? "Draft added" : "Add Prospecting Draft"}</button>
                  <button className="button-link icon-text-action" onClick={() => void navigator.clipboard.writeText(opportunityCopyText(opportunity))} type="button"><span aria-hidden="true" className="material-symbols-outlined">content_copy</span>Copy Opportunity</button>
                </div>
              </div>
            </div>
          </div>
          {calculatorSettingsOpen ? <BetSummarySettingsDialog backFormat={backOddsFormat} layFormat={layOddsFormat} onBackFormatChange={(format) => changeOddsFormat("back", format)} onClose={() => setCalculatorSettingsOpen(false)} onLayFormatChange={(format) => changeOddsFormat("lay", format)} returnFocusRef={settingsButtonRef} /> : null}
        </section>
      </div>
    </ModalBoundary>
  );
}

function BetSummarySettingsDialog({ backFormat, layFormat, onBackFormatChange, onClose, onLayFormatChange, returnFocusRef }: {
  backFormat: OddsFormat;
  layFormat: OddsFormat;
  onBackFormatChange: (format: OddsFormat) => void;
  onClose: () => void;
  onLayFormatChange: (format: OddsFormat) => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  return <AnchoredSurface alignment="end" className="oddsmatcher-calculator-settings-popover" label="Bet Summary settings" onClose={onClose} returnFocusRef={returnFocusRef}>
        <div className="oddsmatcher-calculator-settings-fields" data-pd-id="oddsmatcher.bet-summary.settings">
          <label className="field-control" htmlFor="oddsmatcher-back-odds-format"><span>Back Odds Format</span><select id="oddsmatcher-back-odds-format" onChange={(event) => onBackFormatChange(event.target.value as OddsFormat)} value={backFormat}>{ODDS_FORMATS.map((format) => <option key={format} value={format}>{format}</option>)}</select></label>
          <label className="field-control" htmlFor="oddsmatcher-lay-odds-format"><span>Lay Odds Format</span><select id="oddsmatcher-lay-odds-format" onChange={(event) => onLayFormatChange(event.target.value as OddsFormat)} value={layFormat}>{ODDS_FORMATS.map((format) => <option key={format} value={format}>{format}</option>)}</select></label>
        </div>
  </AnchoredSurface>;
}
