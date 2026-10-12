"use client";
import { FinancialReadValue } from "@/components/financial-read-value";
import { BettingPnlReadValue } from "@/components/betting-pnl-read-value";
import { AccountMoneyStatus } from "@/components/account-money-status";

import Link from "next/link";
import { ReportExplorer } from "@/components/report-explorer";
import { PeriodPnlReport } from "@/components/period-pnl-report";
import { LedgerPagination } from "@/components/ledger-pagination";
import { usePersistedState } from "@/lib/ledger-ui";
import {
  profileIdsForReportScope,
  resolveReportProfileSelection,
  type ReportProfileScopeMode,
  type ReportProfileSelection,
} from "@/lib/report-profile-selection";
import { useRouter } from "next/navigation";
import { type ComponentProps, useEffect, useMemo, useRef, useState } from "react";
import { apiBaseUrl } from "@/lib/api";
import { beginRouteTransition, beginShellLoading, endShellLoading } from "@/lib/shell-loading";
import { AccessScopeBadge } from "./access-scope-badge";
import { FinancialValue as PlatformFinancialValue, FinancialValueReplayGroup, FinancialValueReplayRow } from "./financial-value";
import { JsonRequestError, readCachedJson } from "@/lib/client-json-cache";
import {
  fetchCombinedTrackerSummarySources,
  fetchTrackerSummarySources,
  type TrackerSummarySources,
} from "@/lib/tracker-summary-sources";
import { resolveCrossProfileSummaryLoadIds } from "@/lib/cross-profile-load-scope";
import {
  aggregateCrossProfileReporting,
  type ProfileComparisonRow,
} from "@/lib/cross-profile-reporting";
import {
  buildOperationalLedgerHref,
  countOperationalActions,
} from "@/lib/operational-actions";
import {
  formatHumanDisplayDate,
  formatTrackingTenure,
  getDatePresetOptions,
  countTrueOpenPositions,
  resolveDateRange,
  summarizeTrackerData,
  type AccountSummaryRecord,
  type BalanceSnapshotSummaryRecord,
  type CashAdjustmentSummaryRecord,
  type CasinoSummaryRecord,
  type EachWayExtraPlaceSummaryRecord,
  type DatePreset,
  type FreeBetSummaryRecord,
  type SportsbookSummaryRecord,
  type TrackerSummaryDataset,
} from "@/lib/tracker-summary";
import { LedgerLoadingIndicator } from "./ledger-loading-indicator";
import { MultiProfileOpportunityDialog } from "./multi-profile-opportunity-dialog";
import { FeePeriodReviewDialog } from "./fee-period-review-dialog";
import { FeeCentreBreakdownDrawer } from "./fee-centre-breakdown-drawer";
import {
  FeeReportReviewQueueDialog,
  type FeeReportQueueEntry,
} from "./fee-report-review-queue-dialog";
import {
  combineFeePositions,
  getClosedMonthOptions,
  getPreviousMonthValue,
  summarizeFeePeriods,
  summarizeFeePeriodsForReports,
  summarizeWeeklyIndicativeFeeImpacts,
  type FeeReportValue,
  type FeePeriodApiRecord,
} from "@/lib/fee-period-summary";
import {
  filterFormalReportRows,
  type FormalReportFinancialFilter,
} from "@/lib/formal-report-filters";
import {
  deriveFeeCentreRow,
  feeCentreStateLabels,
} from "@/lib/fee-centre-status";

export type ProfileDescriptor = {
  profileId: string;
  displayName: string;
  profileCode: string;
  status: string;
  trackingStartDate: string;
  managementFeePercent: string;
  investmentFeePercent: string;
};

export type AnalyticsTab = "profiles" | "performance" | "exposure" | "fees" | "reports";
export type DirectoryStatus = "Active" | "Archived" | "all";
type TrackerSettingsRecord = {
  active_date_preset: DatePreset;
  custom_start_date: string;
  custom_end_date: string;
  range_back_days: number;
  range_forward_days: number;
};

function FinancialValue(props: ComponentProps<typeof PlatformFinancialValue>) {
  return <PlatformFinancialValue zeroTone="neutral" {...props} />;
}

const analyticsTabs: { id: AnalyticsTab; label: string }[] = [
  { id: "profiles", label: "Profiles" },
  { id: "performance", label: "Performance" },
  { id: "exposure", label: "Exposure" },
  { id: "fees", label: "Fees" },
  { id: "reports", label: "Formal Reports" },
];

const directoryDefaultPageSize = 16;
const reportProfilePickerPageSize = 16;
const reportProfileTableDefaultPageSize = 16;
const profileStatusOptions = ["Active", "Pending", "Inactive", "Paused", "Archived"];

function normalizeProfileStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  return profileStatusOptions.find((option) => option.toLowerCase() === normalized) ?? status;
}

type CrossProfileAnalyticsProps = {
  initialTab?: AnalyticsTab;
  profiles: ProfileDescriptor[];
};

type ProfileLoadFailure = {
  profileId: string;
  displayName: string;
  message: string;
  status?: number;
};

type ProfileSourceLoadResult = {
  profile: ProfileDescriptor;
  sources?: TrackerSummarySources;
  error?: unknown;
};

function ReportingCellLoading({ label }: { label: string }) {
  return (
    <span aria-label={label} className="profile-reporting-cell-loading" role="status">
      <span aria-hidden="true" className="material-linear-progress"><span /></span>
    </span>
  );
}

function ReportTable({
  feeHeading,
  feeGranularity,
  title,
  rows,
  feeValues,
  indicativeFeeValues,
  onFeeAction,
}: {
  feeHeading: "Indicative Fee Impact" | "Fees Earned";
  feeGranularity: "week" | "month" | "year";
  title: string;
  rows: ReturnType<typeof aggregateCrossProfileReporting>["weeklyReports"];
  feeValues?: Map<string, FeeReportValue>;
  indicativeFeeValues?: Map<string, number>;
  onFeeAction: (granularity: "week" | "month" | "year", key: string, label: string) => void;
}) {
  const [maximumPeriods, setMaximumPeriods] = useState("all");
  const [periodKey, setPeriodKey] = useState("");
  const [financialFilter, setFinancialFilter] =
    useState<FormalReportFinancialFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(16);
  const periodNoun = feeGranularity === "week" ? "weeks" : feeGranularity === "month" ? "months" : "years";
  const periodLimits = feeGranularity === "week" ? [3, 6, 12] : feeGranularity === "month" ? [3, 6, 12] : [3, 5];
  const filteredRows = filterFormalReportRows({
    rows,
    maximumPeriods: maximumPeriods === "all" ? null : Number(maximumPeriods),
    periodKey,
    financialFilter,
    feeValue: (row) =>
      feeGranularity === "week"
        ? indicativeFeeValues?.get(row.periodKey) ?? 0
        : feeValues?.get(row.periodKey)?.feesEarned ?? 0,
    feeReviewRequired: (row) => {
      if (feeGranularity === "week") return false;
      return !(feeValues?.get(row.periodKey)?.crystallisedPeriodCount);
    },
  });
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = filteredRows.slice(
    (Math.min(page, pageCount) - 1) * pageSize,
    Math.min(page, pageCount) * pageSize,
  );

  return (
    <section className="content-subpanel stack">
      <div className="section-heading-row formal-report-section-heading">
        <h3>{title}</h3>
        <div className="compact-report-controls formal-report-section-controls">
          <label className="m3-picker-field">
            <span className="m3-picker-label">Period range</span>
            <span className="m3-picker-control">
              <span aria-hidden="true" className="material-symbols-outlined">date_range</span>
              <select
                aria-label={`${title} period range`}
                data-pd-id={`formal-reports.${feeGranularity}.period-range`}
                onChange={(event) => {
                  setMaximumPeriods(event.target.value);
                  setPeriodKey("");
                  setPage(1);
                }}
                value={maximumPeriods}
              >
                <option value="all">All {periodNoun}</option>
                {periodLimits.map((limit) => (
                  <option key={limit} value={limit}>Latest {limit} {periodNoun}</option>
                ))}
              </select>
            </span>
          </label>
          <label className="m3-picker-field">
            <span className="m3-picker-label">Specific {feeGranularity}</span>
            <span className="m3-picker-control">
              <span aria-hidden="true" className="material-symbols-outlined">event</span>
              <select
                aria-label={`${title} specific period`}
                data-pd-id={`formal-reports.${feeGranularity}.specific-period`}
                onChange={(event) => { setPeriodKey(event.target.value); setPage(1); }}
                value={periodKey}
              >
                <option value="">Any {feeGranularity}</option>
                {rows.map((row) => (
                  <option key={row.periodKey} value={row.periodKey}>{row.periodLabel}</option>
                ))}
              </select>
            </span>
          </label>
          <label className="m3-picker-field">
            <span className="m3-picker-label">Financial result</span>
            <span className="m3-picker-control">
              <span aria-hidden="true" className="material-symbols-outlined">filter_alt</span>
              <select
                aria-label={`${title} financial result`}
                data-pd-id={`formal-reports.${feeGranularity}.financial-result`}
                onChange={(event) => { setFinancialFilter(event.target.value as FormalReportFinancialFilter); setPage(1); }}
                value={financialFilter}
              >
                <option value="all">All results</option>
                <option value="positive-pnl">Positive P&amp;L</option>
                <option value="negative-pnl">Negative P&amp;L</option>
                <option value="positive-fees">Positive fees</option>
                <option value="negative-fees">Negative fees</option>
                {feeGranularity !== "week" ? (
                  <option value="fee-review-required">Fee review required</option>
                ) : null}
              </select>
            </span>
          </label>
        </div>
      </div>
      <LedgerPagination ariaLabel={title} currentPage={Math.min(page, pageCount)}
        onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        pageCount={pageCount} pageSize={pageSize} position="top" totalRows={filteredRows.length} />
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th scope="col">Period</th>
              <th scope="col">Sportsbook</th>
              <th scope="col">Free Bets</th>
              <th scope="col">Casino</th>
              <th scope="col">Total P&amp;L</th>
              <th scope="col">Withdrawals</th>
              <th scope="col">Costs</th>
              <th scope="col">Retained profit</th>
              <th scope="col">{feeHeading}</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={9}>No formal report periods match these filters.</td>
              </tr>
            ) : (
              visibleRows.map((row) => {
                const feeValue = feeValues?.get(row.periodKey);
                const indicativeFeeValue = indicativeFeeValues?.get(row.periodKey);
                const feeLabel =
                  feeGranularity === "week"
                    ? <FinancialValue value={indicativeFeeValue ?? 0} />
                    : feeValue?.crystallisedPeriodCount
                      ? <FinancialValue value={feeValue.feesEarned} />
                      : feeValue?.readyPeriodCount
                        ? "Awaiting Confirmation"
                        : "Review Required";
                return (
                <FinancialValueReplayRow key={row.periodKey}>
                  <td>{row.periodLabel}</td>
                  <td><FinancialValue value={row.sportsbookPnl} /></td>
                  <td><FinancialValue value={row.freeBetPnl} /></td>
                  <td><FinancialValue value={row.casinoPnl} /></td>
                  <td><FinancialValue value={row.totalPnl} /></td>
                  <td><FinancialValue value={row.withdrawals} /></td>
                  <td><FinancialValue value={row.costs} /></td>
                  <td><FinancialValue value={row.retainedProfit} /></td>
                  <td>
                    <button
                      aria-label={`${feeGranularity === "week" ? "View monthly fee status for" : "Open fee review queue for"} ${row.periodLabel}`}
                      className="report-value-link formal-report-fee-link"
                      data-pd-id={`formal-reports.${feeGranularity}.${row.periodKey}.fees`}
                      onClick={() => onFeeAction(feeGranularity, row.periodKey, row.periodLabel)}
                      type="button"
                    >
                      <span className="table-status">{feeLabel}</span>
                      <span aria-hidden="true" className="material-symbols-outlined">open_in_new</span>
                    </button>
                    {feeGranularity === "week" ? (
                      <small className="formal-report-fee-note">Informational until month-end</small>
                    ) : feeValue?.readyPeriodCount && feeValue.crystallisedPeriodCount ? (
                      <small className="formal-report-fee-note">
                        <FinancialValue value={feeValue.awaitingConfirmation} /> awaiting confirmation
                      </small>
                    ) : null}
                  </td>
                </FinancialValueReplayRow>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <LedgerPagination ariaLabel={title} currentPage={Math.min(page, pageCount)}
        onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        pageCount={pageCount} pageSize={pageSize} position="bottom" totalRows={filteredRows.length} />
    </section>
  );
}

function OperationalActionLinks({ row }: { row: ProfileComparisonRow }) {
  const actions = [
    { ledger: "sportsbook" as const, label: "Sportsbook", icon: "sports", count: row.sportsbookActionCount },
    { ledger: "free-bets" as const, label: "Free Bets", icon: "award_star", count: row.freeBetActionCount },
    { ledger: "casino-offers" as const, label: "Casino", icon: "playing_cards", count: row.casinoActionCount },
    { ledger: "each-way-extra-places" as const, label: "Extra Place", icon: "chess_knight", count: row.extraPlaceActionCount },
  ];

  return (
    <span className="profile-action-links">
      {actions.map((action) => {
        const requiresAction = action.count > 0;
        const accessibleLabel = requiresAction
          ? `Open ${row.displayName} ${action.label} rows requiring action`
          : `Open ${row.displayName} ${action.label} ledger`;
        return (
          <Link
            aria-label={accessibleLabel}
            className={`report-value-link profile-action-link ${requiresAction ? "report-value-link-urgent" : "is-inactive-action"}`}
            data-pd-id={`profiles.${row.profileId}.actions.${action.ledger}`}
            href={buildOperationalLedgerHref(row.profileId, action.ledger, requiresAction ? "all" : null)}
            key={action.ledger}
            onClick={(event) => event.stopPropagation()}
            title={accessibleLabel}
          >
            <span aria-hidden="true" className="profile-action-icon-wrap">
              <span className="material-symbols-outlined profile-action-icon">{action.icon}</span>
              {requiresAction ? (
                <strong className="profile-action-count">{action.count > 9 ? "9+" : action.count}</strong>
              ) : null}
            </span>
          </Link>
        );
      })}
    </span>
  );
}

export function CrossProfileAnalytics({
  profiles,
  initialTab = "profiles",
  initialDetailProfileId,
  initialFeeReviewMonth,
  initialOpportunityId,
  initialDirectoryStatus = "Active",
}: CrossProfileAnalyticsProps & {
  initialDetailProfileId?: string;
  initialFeeReviewMonth?: string;
  initialOpportunityId?: string;
  initialDirectoryStatus?: DirectoryStatus;
}) {
  const router = useRouter();
  const profileRecords = profiles;
  const isReportAnalysisTab = initialTab === "reports" || initialTab === "performance";
  const activeProfileIds = useMemo(
    () => profiles
      .filter((profile) => normalizeProfileStatus(profile.status) !== "Archived")
      .map((profile) => profile.profileId),
    [profiles]
  );
  const [preset, setPreset] = useState<DatePreset>("Week (Mon-Sun)");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [localProfileIds, setLocalProfileIds] = useState(() =>
    profiles
      .filter((profile) => normalizeProfileStatus(profile.status) !== "Archived")
      .map((profile) => profile.profileId)
  );
  const [savedReportProfileIds, setSavedReportProfileIds] = usePersistedState<ReportProfileSelection | null>(
    "openforge-report-profile-selection", null);
  const resolvedReportSelection = useMemo(
    () => resolveReportProfileSelection(savedReportProfileIds, profiles),
    [profiles, savedReportProfileIds]
  );
  const selectedProfileIds = useMemo(() => {
    if (!isReportAnalysisTab) return localProfileIds;
    return resolvedReportSelection.selectedIds;
  }, [isReportAnalysisTab, localProfileIds, resolvedReportSelection.selectedIds]);
  const setSelectedProfileIds = (
    next: string[] | ((ids: string[]) => string[]),
    scope: ReportProfileScopeMode = "custom",
  ) => {
    const ids = typeof next === "function" ? next(selectedProfileIds) : next;
    if (isReportAnalysisTab) setSavedReportProfileIds({ selectedIds: ids,
      archivedIds: ids.filter((id) => profiles.some((profile) => profile.profileId === id && normalizeProfileStatus(profile.status) === "Archived")),
      scope });
    else setLocalProfileIds(ids);
  };
  const [datasets, setDatasets] = useState<Map<string, TrackerSummaryDataset>>(new Map());
  const [feePeriods, setFeePeriods] = useState<Map<string, FeePeriodApiRecord[]>>(new Map());
  const [trackerSettings, setTrackerSettings] = useState<Map<string, TrackerSettingsRecord>>(new Map());
  const [failures, setFailures] = useState<ProfileLoadFailure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AnalyticsTab>(initialTab);
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [directoryStatus, setDirectoryStatus] = useState<DirectoryStatus>(initialDirectoryStatus);
  const [directoryPage, setDirectoryPage] = useState(1);
  const [directoryPageSize, setDirectoryPageSize] = useState(directoryDefaultPageSize);
  const [reportProfilePickerQuery, setReportProfilePickerQuery] = useState("");
  const [reportProfilePickerPage, setReportProfilePickerPage] = useState(1);
  const [reportProfileTableQuery, setReportProfileTableQuery] = useState("");
  const [reportProfileTableSort, setReportProfileTableSort] = useState("pnl-desc");
  const [reportProfileTablePage, setReportProfileTablePage] = useState(1);
  const [reportProfileTablePageSize, setReportProfileTablePageSize] = useState(reportProfileTableDefaultPageSize);
  const [bookmakerPage, setBookmakerPage] = useState(1);
  const [bookmakerPageSize, setBookmakerPageSize] = useState(16);
  const [exposurePage, setExposurePage] = useState(1);
  const [exposurePageSize, setExposurePageSize] = useState(16);
  const [feePage, setFeePage] = useState(1);
  const [feePageSize, setFeePageSize] = useState(16);
  const [balancePage, setBalancePage] = useState(1);
  const [balancePageSize, setBalancePageSize] = useState(16);
  const [pinnedProfileIds, setPinnedProfileIds] = useState<string[]>([]);
  const [detailProfileId, setDetailProfileId] = useState<string | null>(initialDetailProfileId ?? null);
  const [drawerNavigationLabel, setDrawerNavigationLabel] = useState("");
  const [opportunityDialogOpen, setOpportunityDialogOpen] = useState(Boolean(initialOpportunityId));
  const [feeReviewProfileId, setFeeReviewProfileId] = useState<string | null>(
    initialDetailProfileId && initialFeeReviewMonth ? initialDetailProfileId : null
  );

  const [feeReviewMonth, setFeeReviewMonth] = useState(initialFeeReviewMonth ?? "");
  const [feeCentreMonth, setFeeCentreMonth] = useState(() => getPreviousMonthValue());
  const [feeBreakdownProfileId, setFeeBreakdownProfileId] = useState<string | null>(null);
  const [feeReportQueue, setFeeReportQueue] = useState<{
    granularity: "week" | "month" | "year";
    key: string;
    label: string;
  } | null>(null);
  const [loadRevision, setLoadRevision] = useState(0);
  const [balanceSnapshotRange, setBalanceSnapshotRange] = useState("all");
  const [balanceSnapshotType, setBalanceSnapshotType] = useState("all");
  const [reportFilterAsOf] = useState(() => Date.now());
  const detailDialogRef = useRef<HTMLDialogElement>(null);

  const requestedProfileIds = useMemo(() => {
    return resolveCrossProfileSummaryLoadIds({
      profiles: profileRecords.map((profile) => ({
        ...profile,
        status: normalizeProfileStatus(profile.status),
      })),
      selectedProfileIds,
      includeDirectoryPage: activeTab === "profiles",
      directoryStatus,
      directoryQuery,
      directoryPage,
      directoryPageSize,
      pinnedProfileIds,
      explicitProfileIds: [detailProfileId, feeReviewProfileId, feeBreakdownProfileId],
    });
  }, [
    activeTab,
    detailProfileId,
    directoryPage,
    directoryPageSize,
    directoryQuery,
    directoryStatus,
    feeBreakdownProfileId,
    feeReviewProfileId,
    pinnedProfileIds,
    profileRecords,
    selectedProfileIds,
  ]);

  useEffect(() => {
    const controller = new AbortController();
    let stateTimer: number | null = null;
    const cachedDatasets = new Map<string, TrackerSummaryDataset>();
    const cachedFeePeriods = new Map<string, FeePeriodApiRecord[]>();
    const cachedTrackerSettings = new Map<string, TrackerSettingsRecord>();

    const requestedProfiles = profiles.filter((profile) => requestedProfileIds.includes(profile.profileId));

    for (const profile of requestedProfiles) {
      const base = `${apiBaseUrl}/profiles/${profile.profileId}`;
      const accounts = readCachedJson<AccountSummaryRecord[]>(`${base}/accounts`);
      const sportsbookBets = readCachedJson<SportsbookSummaryRecord[]>(`${base}/sportsbook-bets`);
      const freeBets = readCachedJson<FreeBetSummaryRecord[]>(`${base}/free-bets`);
      const casinoOffers = readCachedJson<CasinoSummaryRecord[]>(`${base}/casino-offers`);
      const cashAdjustments = readCachedJson<CashAdjustmentSummaryRecord[]>(`${base}/cash-adjustments`);
      const eachWayExtraPlaces = readCachedJson<EachWayExtraPlaceSummaryRecord[]>(`${base}/each-way-extra-places`);
      const balanceSnapshots = readCachedJson<BalanceSnapshotSummaryRecord[]>(`${base}/balance-snapshots`);
      const periods = readCachedJson<FeePeriodApiRecord[]>(`${base}/fee-periods`);
      const settings = readCachedJson<TrackerSettingsRecord>(`${base}/tracker-settings`);

      if (accounts && sportsbookBets && freeBets && casinoOffers && cashAdjustments && eachWayExtraPlaces && balanceSnapshots) {
        cachedDatasets.set(profile.profileId, {
          accounts,
          sportsbookBets,
          freeBets,
          casinoOffers,
          cashAdjustments,
          eachWayExtraPlaces,
          balanceSnapshots,
        });
      }
      if (periods) cachedFeePeriods.set(profile.profileId, periods);
      if (settings) cachedTrackerSettings.set(profile.profileId, settings);
    }

    const hasCompleteCriticalCache =
      cachedDatasets.size === requestedProfiles.length &&
      cachedTrackerSettings.size === requestedProfiles.length &&
      cachedFeePeriods.size === requestedProfiles.length;

    // React state updates from effects remain asynchronous, but the task is
    // cancelled if the request settles first. This prevents a delayed loading
    // write from overwriting a successful post-auth response.
    stateTimer = window.setTimeout(() => {
      if (controller.signal.aborted) return;
      if (hasCompleteCriticalCache) {
        setDatasets(cachedDatasets);
        if (cachedFeePeriods.size > 0) setFeePeriods(cachedFeePeriods);
        if (cachedTrackerSettings.size > 0) setTrackerSettings(cachedTrackerSettings);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }
    }, 0);
    if (!hasCompleteCriticalCache && initialTab !== "profiles") beginShellLoading();

    const loadProfiles = async (): Promise<ProfileSourceLoadResult[]> => {
      if (isReportAnalysisTab) {
        const combinedResult = await fetchCombinedTrackerSummarySources(
          resolvedReportSelection.scope,
          requestedProfiles.map((profile) => profile.profileId),
          { signal: controller.signal },
        );
        return requestedProfiles.map((profile) => {
          const sources = combinedResult.sources.get(profile.profileId);
          const failure = combinedResult.failures.find(
            (candidate) => candidate.profileId === profile.profileId,
          );
          if (!sources && failure) {
            return {
              profile,
              error: new JsonRequestError(failure.status),
            };
          }
          if (!sources) throw new Error(`Combined Reports source omitted ${profile.profileId}`);
          return { profile, sources };
        });
      }
      const settled = await Promise.allSettled(requestedProfiles.map(async (profile) => {
        const sources = await fetchTrackerSummarySources(profile.profileId, {
          signal: controller.signal,
        });
        return { profile, sources };
      }));
      return settled.map((result, index) => result.status === "fulfilled"
        ? result.value
        : { profile: requestedProfiles[index]!, error: result.reason });
    };

    void loadProfiles().then((results) => {
      if (controller.signal.aborted) {
        return;
      }
      if (stateTimer !== null) {
        window.clearTimeout(stateTimer);
        stateTimer = null;
      }

      const nextDatasets = new Map<string, TrackerSummaryDataset>();
      const nextFeePeriods = new Map<string, FeePeriodApiRecord[]>();
      const nextTrackerSettings = new Map<string, TrackerSettingsRecord>();
      const nextFailures: ProfileLoadFailure[] = [];
      results.forEach((result) => {
        const profile = result.profile;
        if (result.sources) {
          nextDatasets.set(profile.profileId, {
            accounts: result.sources.accounts,
            sportsbookBets: result.sources.sportsbookBets,
            freeBets: result.sources.freeBets,
            casinoOffers: result.sources.casinoOffers,
            cashAdjustments: result.sources.cashAdjustments,
            eachWayExtraPlaces: result.sources.eachWayExtraPlaces,
            balanceSnapshots: result.sources.balanceSnapshots,
          });
          nextFeePeriods.set(profile.profileId, result.sources.feePeriods);
          nextTrackerSettings.set(profile.profileId, result.sources.trackerSettings);
        } else {
          nextFailures.push({
            profileId: profile.profileId,
            displayName: profile.displayName,
            message: result.error instanceof Error ? result.error.message : "Unknown profile load error",
            status: result.error instanceof JsonRequestError ? result.error.status : undefined,
          });
        }
      });
      setDatasets(nextDatasets);
      setFeePeriods(nextFeePeriods);
      setTrackerSettings(nextTrackerSettings);
      setFailures(nextFailures);
      setIsLoading(false);
      if (!hasCompleteCriticalCache && initialTab !== "profiles") endShellLoading();
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return;
      if (stateTimer !== null) window.clearTimeout(stateTimer);
      setFailures(requestedProfiles.map((profile) => ({
        profileId: profile.profileId,
        displayName: profile.displayName,
        message: reason instanceof Error ? reason.message : "Unknown profile load error",
        status: reason instanceof JsonRequestError ? reason.status : undefined,
      })));
      setIsLoading(false);
      if (!hasCompleteCriticalCache && initialTab !== "profiles") endShellLoading();
    });

    return () => {
      controller.abort();
      if (stateTimer !== null) window.clearTimeout(stateTimer);
      if (!hasCompleteCriticalCache && initialTab !== "profiles") endShellLoading();
    };
  }, [initialTab, isReportAnalysisTab, profiles, requestedProfileIds, loadRevision, resolvedReportSelection.scope]);

  useEffect(() => {
    const retryableFailures = failures.filter((failure) => failure.status !== 404);
    if (retryableFailures.length === 0) {
      return;
    }

    const retry = () => setLoadRevision((current) => current + 1);
    const intervalId = window.setInterval(retry, 10_000);
    window.addEventListener("focus", retry);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", retry);
    };
  }, [failures]);

  const resolvedRange = useMemo(
    () => resolveDateRange({ preset, customStart, customEnd }),
    [customEnd, customStart, preset]
  );

  const allProfileSummaries = useMemo(() => {
    return profileRecords.flatMap((profile) => {
      const dataset = datasets.get(profile.profileId);
      if (!dataset) {
        return [];
      }
      return [
        {
          ...profile,
          summary: summarizeTrackerData(dataset, resolvedRange),
          actionable: countOperationalActions(dataset),
          trueOpenPositionCount: countTrueOpenPositions(dataset),
        },
      ];
    });
  }, [datasets, profileRecords, resolvedRange]);

  const trackerRangeProfileSummaries = useMemo(() => {
    return profileRecords.flatMap((profile) => {
      const dataset = datasets.get(profile.profileId);
      if (!dataset) {
        return [];
      }
      const settings = trackerSettings.get(profile.profileId);
      const profileRange = settings
        ? resolveDateRange({
            preset: settings.active_date_preset,
            customStart: settings.custom_start_date,
            customEnd: settings.custom_end_date,
            rangeBackDays: settings.range_back_days,
            rangeForwardDays: settings.range_forward_days,
          })
        : resolvedRange;

      return [
        {
          ...profile,
          summary: summarizeTrackerData(dataset, profileRange),
          actionable: countOperationalActions(dataset),
          trueOpenPositionCount: countTrueOpenPositions(dataset),
        },
      ];
    });
  }, [datasets, profileRecords, resolvedRange, trackerSettings]);

  const formalReportRange = useMemo(
    () =>
      resolveDateRange({
        preset: "Custom",
        customStart: "2000-01-01",
        customEnd: "2100-12-31",
      }),
    []
  );
  const formalProfileSummaries = useMemo(
    () =>
      profileRecords.flatMap((profile) => {
        const dataset = datasets.get(profile.profileId);
        return dataset
          ? [{ ...profile, summary: summarizeTrackerData(dataset, formalReportRange) }]
          : [];
      }),
    [datasets, formalReportRange, profileRecords]
  );

  const combined = useMemo(
    () =>
      aggregateCrossProfileReporting(
        allProfileSummaries.filter((profile) => selectedProfileIds.includes(profile.profileId))
      ),
    [allProfileSummaries, selectedProfileIds]
  );
  const formalCombined = useMemo(
    () =>
      aggregateCrossProfileReporting(
        formalProfileSummaries.filter((profile) =>
          selectedProfileIds.includes(profile.profileId)
        )
      ),
    [formalProfileSummaries, selectedProfileIds]
  );

  // Directory-only reads must not hide or replay confirmed Active-Profile totals.
  // A missing/failed Active source is not an authoritative zero or partial total.
  const profileReadState = (ids: string[], kind: "summary" | "fees" = "summary"): "loading" | "ready" | "error" => {
    if (failures.some((failure) => ids.includes(failure.profileId))) return "error";
    const missing = ids.filter((id) => kind === "fees" ? !feePeriods.has(id) : !datasets.has(id) || !trackerSettings.has(id));
    if (missing.length === 0) return "ready";
    // Preserve Fee Centre's existing all-Profile membership without requesting
    // every archived Profile or silently presenting the loaded subset as complete.
    return missing.some((id) => !requestedProfileIds.includes(id)) ? "error" : "loading";
  };
  const headlineReadState = profileReadState(activeProfileIds);
  const activeFeeReadState = profileReadState(activeProfileIds, "fees");
  const selectedReadState = profileReadState(selectedProfileIds);
  const feeCentreReadState = profileReadState(profileRecords.map((profile) => profile.profileId), "fees");

  const reportScopeMode = isReportAnalysisTab ? resolvedReportSelection.scope : "custom";
  const reportScopeLabel = reportScopeMode === "active"
    ? `${selectedProfileIds.length} Active ${selectedProfileIds.length === 1 ? "Profile" : "Profiles"}`
    : reportScopeMode === "inactive"
      ? `${selectedProfileIds.length} Inactive ${selectedProfileIds.length === 1 ? "Profile" : "Profiles"}`
      : reportScopeMode === "all"
        ? `All Profiles · ${selectedProfileIds.length}`
        : `Custom · ${selectedProfileIds.length} ${selectedProfileIds.length === 1 ? "Profile" : "Profiles"}`;
  const reportPickerProfiles = useMemo(() => {
    const query = reportProfilePickerQuery.trim().toLowerCase();
    return profileRecords
      .filter((profile) => !query || profile.displayName.toLowerCase().includes(query) ||
        profile.profileCode.toLowerCase().includes(query))
      .toSorted((left, right) => left.displayName.localeCompare(right.displayName));
  }, [profileRecords, reportProfilePickerQuery]);
  const reportPickerPageCount = Math.max(1, Math.ceil(reportPickerProfiles.length / reportProfilePickerPageSize));
  const visibleReportPickerProfiles = reportPickerProfiles.slice(
    (Math.min(reportProfilePickerPage, reportPickerPageCount) - 1) * reportProfilePickerPageSize,
    Math.min(reportProfilePickerPage, reportPickerPageCount) * reportProfilePickerPageSize,
  );

  const allProfilesCombined = useMemo(
    () => aggregateCrossProfileReporting(allProfileSummaries),
    [allProfileSummaries]
  );
  const activeProfilesCombined = useMemo(
    () => aggregateCrossProfileReporting(
      allProfileSummaries.filter((profile) => activeProfileIds.includes(profile.profileId))
    ),
    [activeProfileIds, allProfileSummaries]
  );
  const trackerRangeActiveProfilesCombined = useMemo(
    () => aggregateCrossProfileReporting(
      trackerRangeProfileSummaries.filter((profile) => activeProfileIds.includes(profile.profileId))
    ),
    [activeProfileIds, trackerRangeProfileSummaries]
  );

  const feePositionByProfile = useMemo(
    () =>
      new Map(
        profileRecords.map((profile) => [
          profile.profileId,
          summarizeFeePeriods(
            feePeriods.get(profile.profileId) ?? [],
            resolvedRange.start,
            resolvedRange.end
          ),
        ])
      ),
    [feePeriods, profileRecords, resolvedRange.end, resolvedRange.start]
  );

  const activeProfilesFeePosition = useMemo(
    () => combineFeePositions(
      activeProfileIds.flatMap((profileId) => {
        const position = feePositionByProfile.get(profileId);
        return position ? [position] : [];
      })
    ),
    [activeProfileIds, feePositionByProfile]
  );
  const allTimeFeePositionByProfile = useMemo(
    () =>
      new Map(
        profileRecords.map((profile) => [
          profile.profileId,
          summarizeFeePeriods(
            feePeriods.get(profile.profileId) ?? [],
            new Date("2000-01-01T00:00:00"),
            new Date("2100-12-31T23:59:59")
          ),
        ])
      ),
    [feePeriods, profileRecords]
  );
  const allTimeFeePosition = useMemo(
    () => combineFeePositions([...allTimeFeePositionByProfile.values()]),
    [allTimeFeePositionByProfile]
  );
  const feeCentreMonthOptions = useMemo(() => {
    const earliestTrackingDate = profileRecords
      .map((profile) => profile.trackingStartDate)
      .sort()[0] ?? `${getPreviousMonthValue()}-01`;
    return getClosedMonthOptions(earliestTrackingDate);
  }, [profileRecords]);
  const feeCentreRows = useMemo(
    () =>
      profileRecords.map((profile) => ({
        profile,
        result: deriveFeeCentreRow({
          month: feeCentreMonth,
          lastClosedMonth: getPreviousMonthValue(),
          periods: feePeriods.get(profile.profileId) ?? [],
          trackingStartDate: profile.trackingStartDate,
        }),
      })),
    [feeCentreMonth, feePeriods, profileRecords]
  );
  const feeBreakdownRow = feeCentreRows.find(
    (row) => row.profile.profileId === feeBreakdownProfileId
  );
  const feeCentreMonthLabel = feeCentreMonthOptions.find(
    (option) => option.value === feeCentreMonth
  )?.label ?? feeCentreMonth;
  const feeCentreRange = useMemo(() => {
    const [year, monthNumber] = feeCentreMonth.split("-").map(Number);
    const periodEnd = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
    return resolveDateRange({
      preset: "Custom",
      customStart: `${feeCentreMonth}-01`,
      customEnd: periodEnd,
    });
  }, [feeCentreMonth]);
  const feeBreakdownCashAdjustmentTotal = useMemo(() => {
    if (!feeBreakdownProfileId) return Number.NaN;
    const dataset = datasets.get(feeBreakdownProfileId);
    return dataset
      ? summarizeTrackerData(dataset, feeCentreRange).reportingModel.selectedRange.cashAdjustments
      : Number.NaN;
  }, [datasets, feeBreakdownProfileId, feeCentreRange]);
  const selectedFeePeriods = useMemo(
    () =>
      selectedProfileIds.flatMap((profileId) => feePeriods.get(profileId) ?? []),
    [feePeriods, selectedProfileIds]
  );
  const monthlyReportFees = useMemo(
    () => summarizeFeePeriodsForReports(selectedFeePeriods, "month"),
    [selectedFeePeriods]
  );
  const yearlyReportFees = useMemo(
    () => summarizeFeePeriodsForReports(selectedFeePeriods, "year"),
    [selectedFeePeriods]
  );
  const weeklyIndicativeFeeImpacts = useMemo(
    () =>
      summarizeWeeklyIndicativeFeeImpacts(
        formalProfileSummaries
          .filter((profile) => selectedProfileIds.includes(profile.profileId))
          .map((profile) => ({
            managementFeePercent: profile.managementFeePercent,
            investmentFeePercent: profile.investmentFeePercent,
            weeklyReports: profile.summary.weeklyReports,
          }))
      ),
    [formalProfileSummaries, selectedProfileIds]
  );

  const feeReportQueueEntries = useMemo<FeeReportQueueEntry[]>(() => {
    if (!feeReportQueue) return [];
    const lastClosedMonth = getPreviousMonthValue();
    const months =
      feeReportQueue.granularity === "year"
        ? Array.from({ length: 12 }, (_, index) => `${feeReportQueue.key}-${String(index + 1).padStart(2, "0")}`)
        : [feeReportQueue.key.slice(0, 7)];
    const monthFormatter = new Intl.DateTimeFormat("en-GB", {
      month: "long",
      timeZone: "UTC",
      year: "numeric",
    });

    return profileRecords
      .filter((profile) => selectedProfileIds.includes(profile.profileId))
      .flatMap((profile) =>
        months.map((month) => {
          const period = (feePeriods.get(profile.profileId) ?? []).find(
            (candidate) => candidate.period_start.slice(0, 7) === month
          );
          const beforeTracking = month < profile.trackingStartDate.slice(0, 7);
          const state: FeeReportQueueEntry["state"] = beforeTracking
            ? "not_applicable"
            : month > lastClosedMonth
              ? "open"
              : period?.state === "crystallised"
                ? "crystallised"
                : period?.state === "ready_to_crystallise"
                  ? "awaiting_confirmation"
                  : "review_required";
          const monthDate = new Date(`${month}-01T00:00:00Z`);
          return {
            key: `${profile.profileId}:${month}`,
            profileId: profile.profileId,
            profileName: profile.displayName,
            month,
            monthLabel: monthFormatter.format(monthDate),
            state,
            amount: period ? Number(period.current_revision.total_fee_due) : null,
          };
        })
      );
  }, [feePeriods, feeReportQueue, profileRecords, selectedProfileIds]);

  const directoryProfiles = useMemo(() => {
    const normalizedQuery = directoryQuery.trim().toLowerCase();
    const summaryByProfile = new Map(
      allProfilesCombined.profileRows.map((row) => [
        row.profileId,
        row,
      ])
    );

    return profileRecords
      .filter(
        (profile) =>
          (directoryStatus === "all" || normalizeProfileStatus(profile.status) === directoryStatus) &&
          (!normalizedQuery ||
            profile.displayName.toLowerCase().includes(normalizedQuery) ||
            profile.profileCode.toLowerCase().includes(normalizedQuery))
      )
      .map((profile) => ({ ...profile, summary: summaryByProfile.get(profile.profileId) }))
      .sort((left, right) => {
        const pinDifference =
          Number(pinnedProfileIds.includes(right.profileId)) -
          Number(pinnedProfileIds.includes(left.profileId));
        return pinDifference || left.displayName.localeCompare(right.displayName);
      });
  }, [allProfilesCombined.profileRows, directoryQuery, directoryStatus, pinnedProfileIds, profileRecords]);

  const directoryPageCount = Math.max(1, Math.ceil(directoryProfiles.length / directoryPageSize));
  const visibleDirectoryProfiles = directoryProfiles.slice(
    (directoryPage - 1) * directoryPageSize,
    directoryPage * directoryPageSize
  );
  const reportProfileRows = useMemo(() => {
    const query = reportProfileTableQuery.trim().toLowerCase();
    return combined.profileRows
      .filter((row) => !query || row.displayName.toLowerCase().includes(query) ||
        row.profileCode.toLowerCase().includes(query))
      .toSorted((left, right) => {
        if (reportProfileTableSort === "profile-asc") return left.displayName.localeCompare(right.displayName);
        if (reportProfileTableSort === "pnl-asc") {
          if (!Number.isFinite(left.grossBettingPnl)) return Number.isFinite(right.grossBettingPnl) ? 1 : left.displayName.localeCompare(right.displayName);
          if (!Number.isFinite(right.grossBettingPnl)) return -1;
          return left.grossBettingPnl - right.grossBettingPnl || left.displayName.localeCompare(right.displayName);
        }
        if (reportProfileTableSort === "open-desc") return right.openBets - left.openBets || left.displayName.localeCompare(right.displayName);
        if (!Number.isFinite(left.grossBettingPnl)) return Number.isFinite(right.grossBettingPnl) ? 1 : left.displayName.localeCompare(right.displayName);
        if (!Number.isFinite(right.grossBettingPnl)) return -1;
        return right.grossBettingPnl - left.grossBettingPnl || left.displayName.localeCompare(right.displayName);
      });
  }, [combined.profileRows, reportProfileTableQuery, reportProfileTableSort]);
  const reportProfileTablePageCount = Math.max(1, Math.ceil(reportProfileRows.length / reportProfileTablePageSize));
  const visibleReportProfileRows = reportProfileRows.slice(
    (Math.min(reportProfileTablePage, reportProfileTablePageCount) - 1) * reportProfileTablePageSize,
    Math.min(reportProfileTablePage, reportProfileTablePageCount) * reportProfileTablePageSize,
  );
  const detailProfile = profileRecords.find((profile) => profile.profileId === detailProfileId);
  const detailSummary = trackerRangeProfileSummaries.find(
    (profile) => profile.profileId === detailProfileId
  );
  const detailComparisonRow = allProfilesCombined.profileRows.find(
    (profile) => profile.profileId === detailProfileId
  );
  const detailFeePosition = detailProfileId
    ? feePositionByProfile.get(detailProfileId)
    : undefined;
  const detailModuleValues = new Map(
    detailSummary?.summary.moduleBreakdown.map((row) => [row.moduleKey, row.reportingValue]) ?? []
  );

  const balanceSnapshots = useMemo(
    () => {
      const rangeDays = balanceSnapshotRange === "all" ? null : Number(balanceSnapshotRange);
      const cutoff = rangeDays === null ? null : reportFilterAsOf - rangeDays * 86_400_000;
      return profileRecords
        .filter((profile) => selectedProfileIds.includes(profile.profileId))
        .flatMap((profile) =>
          (datasets.get(profile.profileId)?.balanceSnapshots ?? []).map((snapshot) => ({
            ...snapshot,
            displayName: profile.displayName,
          }))
        )
        .filter((snapshot) => {
          const timestamp = Date.parse(snapshot.snapshot_at);
          return Number.isFinite(timestamp) &&
            (cutoff === null || timestamp >= cutoff) &&
            (balanceSnapshotType === "all" || snapshot.snapshot_type === balanceSnapshotType);
        })
        .sort((left, right) => right.snapshot_at.localeCompare(left.snapshot_at) ||
          `${left.profile_id}:${left.balance_snapshot_id}`.localeCompare(`${right.profile_id}:${right.balance_snapshot_id}`));
    },
    [balanceSnapshotRange, balanceSnapshotType, datasets, profileRecords, reportFilterAsOf, selectedProfileIds]
  );
  const balanceSnapshotTypes = useMemo(
    () =>
      [...new Set(
        profileRecords
          .filter((profile) => selectedProfileIds.includes(profile.profileId))
          .flatMap((profile) =>
            (datasets.get(profile.profileId)?.balanceSnapshots ?? []).map(
              (snapshot) => snapshot.snapshot_type
            )
          )
      )].sort(),
    [datasets, profileRecords, selectedProfileIds]
  );
  const bookmakerPageCount = Math.max(1, Math.ceil(combined.bookmakerBreakdown.length / bookmakerPageSize));
  const visibleBookmakerRows = combined.bookmakerBreakdown.slice(
    (Math.min(bookmakerPage, bookmakerPageCount) - 1) * bookmakerPageSize,
    Math.min(bookmakerPage, bookmakerPageCount) * bookmakerPageSize,
  );
  const exposurePageCount = Math.max(1, Math.ceil(combined.profileRows.length / exposurePageSize));
  const visibleExposureRows = combined.profileRows.slice(
    (Math.min(exposurePage, exposurePageCount) - 1) * exposurePageSize,
    Math.min(exposurePage, exposurePageCount) * exposurePageSize,
  );
  const feePageCount = Math.max(1, Math.ceil(feeCentreRows.length / feePageSize));
  const visibleFeeRows = feeCentreRows.slice(
    (Math.min(feePage, feePageCount) - 1) * feePageSize,
    Math.min(feePage, feePageCount) * feePageSize,
  );
  const balancePageCount = Math.max(1, Math.ceil(balanceSnapshots.length / balancePageSize));
  const visibleBalanceSnapshots = balanceSnapshots.slice(
    (Math.min(balancePage, balancePageCount) - 1) * balancePageSize,
    Math.min(balancePage, balancePageCount) * balancePageSize,
  );

  function toggleProfile(profileId: string) {
    setSelectedProfileIds((current) => {
      if (current.includes(profileId)) {
        return current.length === 1 ? current : current.filter((id) => id !== profileId);
      }
      return [...current, profileId];
    });
  }

  function selectTab(tab: AnalyticsTab) {
    if (tab === initialTab) {
      setActiveTab(tab);
      return;
    }
    if (tab === "profiles") {
      beginRouteTransition();
      router.push("/profiles");
      return;
    }
    if (tab === "performance") {
      beginRouteTransition();
      router.push("/");
      return;
    }
    if (tab === "reports") {
      beginRouteTransition();
      router.push("/reports");
      return;
    }
    setActiveTab(tab);
  }

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, tab: AnalyticsTab) {
    const currentIndex = analyticsTabs.findIndex((item) => item.id === tab);
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % analyticsTabs.length;
    if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + analyticsTabs.length) % analyticsTabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = analyticsTabs.length - 1;
    if (nextIndex === currentIndex) return;
    event.preventDefault();
    const nextTab = analyticsTabs[nextIndex].id;
    selectTab(nextTab);
    document.getElementById(`analytics-tab-${nextTab}`)?.focus();
  }

  function togglePinnedProfile(profileId: string) {
    setPinnedProfileIds((current) =>
      current.includes(profileId)
        ? current.filter((id) => id !== profileId)
        : [...current, profileId]
    );
  }

  function openProfileDetails(profileId: string) {
    setDrawerNavigationLabel("");
    setDetailProfileId(profileId);
    window.requestAnimationFrame(() => detailDialogRef.current?.showModal());
  }

  function openFeeReportQueue(
    granularity: "week" | "month" | "year",
    key: string,
    label: string
  ) {
    setFeeReportQueue({ granularity, key, label });
  }

  function openFeeReviewFromQueue(profileId: string, month: string) {
    setFeeReportQueue(null);
    setDetailProfileId(profileId);
    setFeeReviewMonth(month);
    setFeeReviewProfileId(profileId);
  }

  function openFeeReview(profileId: string, month: string) {
    setDetailProfileId(profileId);
    setFeeReviewMonth(month);
    setFeeReviewProfileId(profileId);
  }

  const reportingIsLoading = isLoading && activeTab !== "profiles";
  const failedProfileIds = new Set(failures.map((failure) => failure.profileId));

  return (
    <section
      className="content-panel stack cross-profile-analytics"
      aria-labelledby="combined-analytics-title"
    >
      <div
        className={`fund-manager-control-bar${activeTab === "profiles" ? " is-directory" : " is-analytics"}`}
      >
        {activeTab !== "profiles" && activeTab !== "fees" ? (
        <details className="profile-report-picker fund-manager-control-slot-profile" data-pd-id="reports.profile-scope">
        <summary>
          <span aria-hidden="true" className="material-symbols-outlined">
            group
          </span>
          <span>{isReportAnalysisTab ? "Profile Scope" : "Profiles"}</span>
          <span className="profile-picker-count">{isReportAnalysisTab ? reportScopeLabel : `${selectedProfileIds.length} of ${profileRecords.length}`}</span>
        </summary>
        <fieldset>
          <legend>{isReportAnalysisTab ? "Profiles Included In Reports" : "Profiles included in combined analytics"}</legend>
          {isReportAnalysisTab ? <>
          <label className="m3-picker-field report-profile-scope-mode">
            <span className="m3-picker-label">Profile scope</span>
            <span className="m3-picker-control">
              <span aria-hidden="true" className="material-symbols-outlined">filter_alt</span>
              <select
                aria-label="Report Profile scope"
                onChange={(event) => {
                  const scope = event.target.value as ReportProfileScopeMode;
                  if (scope === "custom") {
                    setSelectedProfileIds(selectedProfileIds, "custom");
                  } else {
                    setSelectedProfileIds(profileIdsForReportScope(scope, profileRecords), scope);
                  }
                  setReportProfilePickerPage(1);
                  setReportProfileTablePage(1);
                }}
                value={reportScopeMode}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="all">All</option>
                <option value="custom">Custom</option>
              </select>
            </span>
          </label>
          <p className="field-hint profile-picker-guidance">
            Active Profiles are the default. Inactive includes retained non-Active Profiles only when deliberately selected.
          </p>
          {reportScopeMode === "custom" ? <>
          <label className="m3-picker-field report-profile-picker-search">
            <span className="m3-picker-label">Find a Profile</span>
            <span className="m3-picker-control">
              <span aria-hidden="true" className="material-symbols-outlined">search</span>
              <input aria-label="Search Report Profiles" type="search" value={reportProfilePickerQuery}
                onChange={(event) => { setReportProfilePickerQuery(event.target.value); setReportProfilePickerPage(1); }} />
            </span>
          </label>
          <p className="field-hint">{selectedProfileIds.length} selected · showing at most {reportProfilePickerPageSize} Profiles per page.</p>
          <button className="button-link" disabled={reportPickerProfiles.length === 0}
            onClick={() => { setSelectedProfileIds(reportPickerProfiles.map((profile) => profile.profileId), "custom"); setReportProfileTablePage(1); }} type="button">
            Use Matching Profiles
          </button>
          <div className="profile-picker-options" data-pd-id="reports.profile-scope.options">
            {visibleReportPickerProfiles.map((profile) => {
              const isSelected = selectedProfileIds.includes(profile.profileId);
              return (
                <label className={`profile-filter-chip${isSelected ? " is-selected" : ""}`} key={profile.profileId}>
                  <input
                    checked={isSelected}
                    disabled={isSelected && selectedProfileIds.length === 1}
                    onChange={() => toggleProfile(profile.profileId)}
                    type="checkbox"
                  />
                  <span>{profile.displayName}{normalizeProfileStatus(profile.status) === "Archived" ? " (Archived)" : ""}</span>
                  <small>{profile.profileCode}</small>
                </label>
              );
            })}
          </div>
          {reportPickerProfiles.length === 0 ? <p role="status">No Profiles match this search.</p> : null}
          <div className="directory-pagination" aria-label="Custom Profile selection pagination">
            <button className="button-link" disabled={reportProfilePickerPage <= 1}
              onClick={() => setReportProfilePickerPage((page) => Math.max(1, page - 1))} type="button">Previous</button>
            <span>Page {Math.min(reportProfilePickerPage, reportPickerPageCount)} of {reportPickerPageCount}</span>
            <button className="button-link" disabled={reportProfilePickerPage >= reportPickerPageCount}
              onClick={() => setReportProfilePickerPage((page) => Math.min(reportPickerPageCount, page + 1))} type="button">Next</button>
          </div>
          </> : null}
          </> : <>
          <div className="profile-picker-actions">
            <p className="field-hint profile-picker-guidance">Active Profiles are included by default.</p>
            <button className="button-link" onClick={() => setSelectedProfileIds(activeProfileIds)} type="button">Select active</button>
          </div>
          <div className="profile-picker-options">
            {profileRecords.map((profile) => {
              const isSelected = selectedProfileIds.includes(profile.profileId);
              return <label className={`profile-filter-chip${isSelected ? " is-selected" : ""}`} key={profile.profileId}>
                <input aria-label={`${profile.displayName} ${profile.profileCode}`} checked={isSelected}
                  disabled={isSelected && selectedProfileIds.length === 1} onChange={() => toggleProfile(profile.profileId)} type="checkbox" />
                <span>{profile.displayName}{normalizeProfileStatus(profile.status) === "Archived" ? " (Archived)" : ""}</span><small>{profile.profileCode}</small>
              </label>;
            })}
          </div>
          </>}
        </fieldset>
        </details>
        ) : null}
        {activeTab === "profiles" ? (
          <>
        <label className="m3-picker-field fund-manager-control-slot-search">
          <span className="m3-picker-label">Search directory</span>
          <span className="m3-picker-control">
            <span aria-hidden="true" className="material-symbols-outlined">search</span>
            <input
              data-pd-id="profiles.directory.search"
              type="search"
              value={directoryQuery}
              onChange={(event) => {
                setDirectoryQuery(event.target.value);
                setDirectoryPage(1);
              }}
            />
          </span>
        </label>
        <label className="m3-picker-field fund-manager-control-slot-status">
          <span className="m3-picker-label">Directory status</span>
          <span className="m3-picker-control">
            <span aria-hidden="true" className="material-symbols-outlined">filter_alt</span>
            <select
              data-pd-id="profiles.directory.status-filter"
              value={directoryStatus}
              onChange={(event) => {
                setDirectoryStatus(event.target.value as DirectoryStatus);
                setDirectoryPage(1);
              }}
            >
              <option value="Active">Active</option>
              <option value="Archived">Archived</option>
              <option value="all">All</option>
            </select>
          </span>
        </label>
          </>
        ) : null}
        {activeTab === "fees" ? (
          <label className="m3-picker-field fund-manager-control-slot-range">
            <span className="m3-picker-label">Closed month</span>
            <span className="m3-picker-control">
              <span aria-hidden="true" className="material-symbols-outlined">calendar_month</span>
              <select
                aria-label="Fee centre closed month"
                data-pd-id="fees.closed-month"
                onChange={(event) => { setFeeCentreMonth(event.target.value); setFeePage(1); }}
                value={feeCentreMonth}
              >
                {feeCentreMonthOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </span>
          </label>
        ) : null}
        {activeTab !== "fees" ? (
        <div className="compact-report-controls fund-manager-control-slot-range">
          <label className="m3-picker-field">
            <span className="m3-picker-label">Date range</span>
            <span className="m3-picker-control">
              <span aria-hidden="true" className="material-symbols-outlined">date_range</span>
              <select value={preset} onChange={(event) => setPreset(event.target.value as DatePreset)}>
                {getDatePresetOptions().map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </span>
          </label>
          {preset === "Custom" ? (
            <>
              <label className="m3-picker-field">
                <span className="m3-picker-label">Start</span>
                <span className="m3-picker-control">
                  <span aria-hidden="true" className="material-symbols-outlined">date_range</span>
                  <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} />
                </span>
              </label>
              <label className="m3-picker-field">
                <span className="m3-picker-label">End</span>
                <span className="m3-picker-control">
                  <span aria-hidden="true" className="material-symbols-outlined">date_range</span>
                  <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} />
                </span>
              </label>
            </>
          ) : null}
        </div>
        ) : null}
      </div>
      <div className="workflow-panel-header">
        <div className="stack-tight">
          <span className="eyebrow">Portfolio control</span>
          <div className="section-heading-row">
            <h2 id="combined-analytics-title">
              {activeTab === "profiles" ? "Profile management" : "Combined analytics"}
            </h2>
            <AccessScopeBadge />
          </div>
        </div>
      </div>

      {reportingIsLoading ? (
        <section
          aria-busy="true"
          className="profile-reporting-secondary-loader"
          data-pd-id="combined-reporting.loading"
        >
          <LedgerLoadingIndicator label="Loading combined profile reporting" />
        </section>
      ) : null}
      {!isLoading ? <AccountMoneyStatus issues={trackerRangeActiveProfilesCombined.cashIssues} /> : null}
      {!isLoading && trackerRangeActiveProfilesCombined.sportsbookFinancialIssues?.length ? (
        <p className="error-text" role="status" data-pd-id="sportsbook-money.incomplete">
          Sportsbook P&amp;L incomplete. {trackerRangeActiveProfilesCombined.sportsbookFinancialIssues.join(" · ")}
        </p>
      ) : null}
      {!isLoading && trackerRangeActiveProfilesCombined.freeBetFinancialIssues?.length ? (
        <p className="error-text" role="status" data-pd-id="free-bet-money.incomplete">
          Free Bet P&amp;L incomplete. {trackerRangeActiveProfilesCombined.freeBetFinancialIssues.join(" · ")}
        </p>
      ) : null}

      {failures.filter((failure) => selectedProfileIds.includes(failure.profileId)).length > 0 ? (
        <div className="validation-message" role="alert">
          <strong>
            {failures.filter((failure) => selectedProfileIds.includes(failure.profileId)).length} profile load failed.
          </strong>{" "}
          {failures
            .filter((failure) => selectedProfileIds.includes(failure.profileId))
            .slice(0, 3)
            .map((failure) => failure.displayName)
            .join(", ")}{failures.filter((failure) => selectedProfileIds.includes(failure.profileId)).length > 3 ? " and others" : ""} are unavailable. Summary cards require complete reads; other breakdowns contain only the known Profile rows.
        </div>
      ) : null}

      <div
        aria-label="Fund Manager profile and analytics sections"
        className="analytics-tab-list"
        data-pd-id="profiles.navigation.tabs"
        role="tablist"
      >
        {analyticsTabs.map((tab) => (
          <button
            aria-controls={`analytics-panel-${tab.id}`}
            aria-selected={activeTab === tab.id}
            className={`analytics-tab${activeTab === tab.id ? " is-active" : ""}`}
            data-pd-id={`profiles.navigation.${tab.id}`}
            id={`analytics-tab-${tab.id}`}
            key={tab.id}
            onClick={() => selectTab(tab.id)}
            onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
            role="tab"
            tabIndex={activeTab === tab.id ? 0 : -1}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {!isLoading || activeTab === "fees" || activeTab === "exposure" ? (
        <>
          {activeTab === "fees" ? (
            <section
              aria-labelledby="analytics-tab-fees"
              className="analytics-tab-panel stack fee-centre"
              data-pd-id="fees.panel"
              id="analytics-panel-fees"
              role="tabpanel"
            >
              <section className="stat-strip" aria-label="Fund Manager fee position">
                <FinancialValueReplayGroup>
                <article className="stat-card">
                  <span className="eyebrow">Available to Withdraw</span>
                  <strong><FinancialReadValue state={feeCentreReadState} subject="available fees" value={allTimeFeePosition.availableToWithdraw} /></strong>
                  <span>Confirmed and not yet withdrawn</span>
                </article>
                </FinancialValueReplayGroup>
                <article className="stat-card">
                  <span className="eyebrow">Waiting for Confirmation</span>
                  <strong>{feeCentreReadState === "ready" ? feeCentreRows.filter((row) => row.result.state === "waiting_for_confirmation").length : feeCentreReadState === "loading" ? "Loading…" : "Unavailable"}</strong>
                  <span>Prepared reviews for the selected month</span>
                </article>
                <article className="stat-card">
                  <span className="eyebrow">Review Required</span>
                  <strong>{feeCentreReadState === "ready" ? feeCentreRows.filter((row) => row.result.state === "review_required").length : feeCentreReadState === "loading" ? "Loading…" : "Unavailable"}</strong>
                  <span>Profiles not yet prepared for the selected month</span>
                </article>
                <FinancialValueReplayGroup>
                <article className="stat-card">
                  <span className="eyebrow">Fees Withdrawn</span>
                  <strong><FinancialReadValue state={feeCentreReadState} subject="withdrawn fees" value={allTimeFeePosition.feesWithdrawn} /></strong>
                  <span>Audited fee cash movements</span>
                </article>
                </FinancialValueReplayGroup>
              </section>
              {feeCentreReadState === "error" ? <p className="muted">The all-Profile fee total is incomplete. Known Profile amounts remain available below; unread or failed Profiles are not treated as zero.</p> : null}
              <section className="content-subpanel stack">
                <div className="section-heading-row">
                  <div>
                    <span className="eyebrow">Fund Manager Only</span>
                    <h3>Monthly Fee Status</h3>
                  </div>
                </div>
                <LedgerPagination ariaLabel="Monthly Fee Status" currentPage={Math.min(feePage,feePageCount)} onPageChange={setFeePage} onPageSizeChange={(size)=>{setFeePageSize(size);setFeePage(1);}} pageCount={feePageCount} pageSize={feePageSize} position="top" totalRows={feeCentreRows.length}/>
                <div className="table-shell">
                  <table className="profile-action-table fee-centre-table">
                    <thead>
                      <tr>
                        <th scope="col">Profile</th>
                        <th scope="col">Status</th>
                        <th scope="col">Fees Earned</th>
                        <th scope="col">Fees Withdrawn</th>
                        <th scope="col">Available to Withdraw</th>
                        <th scope="col">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleFeeRows.map(({ profile, result }) => {
                        const readState = profileReadState([profile.profileId], "fees");
                        const canReview = readState === "ready" && result.state !== "unavailable" && result.state !== "open" && result.state !== "not_applicable";
                        const actionLabel = result.state === "review_required"
                          ? "Review Fees"
                          : result.state === "waiting_for_confirmation"
                            ? "Confirm Fees"
                            : result.state === "ready_to_withdraw" || result.state === "part_withdrawn"
                              ? "Record Withdrawal"
                              : "View Details";
                        return (
                          <FinancialValueReplayRow
                            aria-label={`Open fee breakdown for ${profile.displayName}`}
                            className="fee-centre-row"
                            data-pd-id={`fees.${profile.profileId}.row`}
                            key={profile.profileId}
                            onClick={(event) => {
                              if (event.target instanceof Element && event.target.closest("button, a")) return;
                              setFeeBreakdownProfileId(profile.profileId);
                            }}
                            onKeyDown={(event) => {
                              if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
                              event.preventDefault();
                              setFeeBreakdownProfileId(profile.profileId);
                            }}
                            tabIndex={0}
                          >
                            <td><strong>{profile.displayName}</strong><br /><small>{profile.profileCode}</small></td>
                            <td>
                              <span className={`table-status fee-centre-state fee-centre-state-${result.state}`}>
                                {readState === "ready" ? feeCentreStateLabels[result.state] : readState === "loading" ? "Loading…" : "Unavailable"}
                              </span>
                            </td>
                            <td>{readState !== "ready" || result.period?.state === "crystallised" ? <FinancialReadValue state={readState} subject="fees" value={result.feesEarned} /> : "—"}</td>
                            <td>{readState !== "ready" || result.period?.state === "crystallised" ? <FinancialReadValue state={readState} subject="fees" value={result.feesWithdrawn} /> : "—"}</td>
                            <td>{readState !== "ready" || result.period?.state === "crystallised" ? <FinancialReadValue state={readState} subject="fees" value={result.availableToWithdraw} /> : "—"}</td>
                            <td>
                              <button
                                aria-label={`${actionLabel} for ${profile.displayName}, ${feeCentreMonth}`}
                                className="button-link report-action-link"
                                data-pd-id={`fees.${profile.profileId}.action`}
                                disabled={!canReview}
                                onClick={() => openFeeReview(profile.profileId, feeCentreMonth)}
                                type="button"
                              >
                                <span aria-hidden="true" className="material-symbols-outlined">
                                  {result.state === "done" ? "visibility" : "calculate"}
                                </span>
                                {actionLabel}
                              </button>
                            </td>
                          </FinancialValueReplayRow>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <LedgerPagination ariaLabel="Monthly Fee Status" currentPage={Math.min(feePage,feePageCount)} onPageChange={setFeePage} onPageSizeChange={(size)=>{setFeePageSize(size);setFeePage(1);}} pageCount={feePageCount} pageSize={feePageSize} position="bottom" totalRows={feeCentreRows.length}/>
              </section>
            </section>
          ) : null}

          {activeTab === "exposure" ? (
            <section
              aria-labelledby="analytics-tab-exposure"
              className="analytics-tab-panel stack"
              id="analytics-panel-exposure"
              role="tabpanel"
            >
              <section className="stat-strip" aria-label="Combined exposure totals">
                <article className="stat-card">
                  <span className="eyebrow">Open / overdue</span>
                  <strong>{selectedReadState === "ready" ? `${combined.totals.openBets} / ${combined.totals.overdueBets}` : selectedReadState === "loading" ? "Loading…" : "Unavailable"}</strong>
                  <span>Profile-scoped rows combined</span>
                </article>
                <FinancialValueReplayGroup>
                <article className="stat-card">
                  <span className="eyebrow">Current liability</span>
                  <strong><FinancialReadValue state={selectedReadState} subject="current liability" value={combined.totals.currentLiability} /></strong>
                  <span>Open sportsbook, free-bet, and each-way exposure</span>
                </article>
                </FinancialValueReplayGroup>
                <article className="stat-card">
                  <span className="eyebrow">Expiring free bets</span>
                  <strong>{selectedReadState === "ready" ? combined.totals.expiringFreeBetCount : selectedReadState === "loading" ? "Loading…" : "Unavailable"}</strong>
                  <span>Available rows inside alert windows</span>
                </article>
              </section>
              <section className="content-subpanel stack">
                <h3>Profile Exposure</h3>
                <LedgerPagination ariaLabel="Profile Exposure" currentPage={Math.min(exposurePage,exposurePageCount)} onPageChange={setExposurePage} onPageSizeChange={(size)=>{setExposurePageSize(size);setExposurePage(1);}} pageCount={exposurePageCount} pageSize={exposurePageSize} position="top" totalRows={combined.profileRows.length}/>
                <div className="table-shell">
                  <table className="profile-analytics-table">
                    <thead>
                      <tr>
                        <th>Profile</th>
                        <th>Open positions</th>
                        <th>Expiring free bets</th>
                        <th>Current liability</th>
                        <th>Open current value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleExposureRows.map((row) => (
                        <FinancialValueReplayRow key={row.profileId}>
                          <td>{row.displayName}</td>
                          <td>{row.openBets}</td>
                          <td>{row.expiringFreeBetCount}</td>
                          <td><FinancialValue value={row.currentLiability} /></td>
                          <td><FinancialValue value={row.openCurrentValue} /></td>
                        </FinancialValueReplayRow>
                      ))}
                    </tbody>
                  </table>
                </div>
                <LedgerPagination ariaLabel="Profile Exposure" currentPage={Math.min(exposurePage,exposurePageCount)} onPageChange={setExposurePage} onPageSizeChange={(size)=>{setExposurePageSize(size);setExposurePage(1);}} pageCount={exposurePageCount} pageSize={exposurePageSize} position="bottom" totalRows={combined.profileRows.length}/>
              </section>
            </section>
          ) : null}

          {activeTab === "performance" ? (
          <section
            aria-labelledby="analytics-tab-performance"
            className="analytics-tab-panel stack"
            id="analytics-panel-performance"
            role="tabpanel"
          >
          <section aria-label="Selected range performance" className="portfolio-dashboard-view portfolio-dashboard-compact" data-pd-id="performance.selected-range">
            <FinancialValueReplayGroup>
            <article className="dashboard-visual-card dashboard-performance-card">
              <div className="dashboard-visual-header"><div><span className="eyebrow">Combined P&amp;L</span><h3>Selected Range Performance</h3></div><span className="badge">{preset}</span></div>
              <strong className="dashboard-hero-value"><FinancialReadValue state={selectedReadState} subject="combined profit and loss" label="Combined selected range profit and loss" value={combined.totals.grossBettingPnl}/></strong>
              <div className="dashboard-point-rail profiles-command-rail" aria-label="Selected range metrics">
                <span><small>Profiles In Scope</small>{selectedProfileIds.length}</span>
                <span><small>Retained Profit</small><FinancialReadValue state={selectedReadState} subject="retained profit" value={combined.totals.retainedProfit}/></span>
                <span><small>Cash Snapshot</small><FinancialReadValue state={selectedReadState} subject="Account cash" value={combined.totals.cashSnapshot}/></span>
              </div>
            </article>
            </FinancialValueReplayGroup>
          </section>
          <div className="reporting-breakdown-grid">
            <section className="content-subpanel stack" data-pd-id="reports.category-breakdown">
              <h3>P&amp;L Breakdown</h3>
              <p className="field-hint">{reportScopeLabel} · {preset}. Existing governed category values; cash movements remain separate.</p>
              <div className="table-shell">
                <table>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Rows</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combined.moduleBreakdown.map((row) => (
                      <FinancialValueReplayRow key={row.moduleKey}>
                        <td>{row.label}</td>
                        <td>{row.rowCount}</td>
                        <td><FinancialValue value={row.reportingValue} /></td>
                      </FinancialValueReplayRow>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="content-subpanel stack">
              <h3>Bookmaker P&amp;L</h3>
              <LedgerPagination ariaLabel="Bookmaker P&L" currentPage={Math.min(bookmakerPage,bookmakerPageCount)} onPageChange={setBookmakerPage} onPageSizeChange={(size)=>{setBookmakerPageSize(size);setBookmakerPage(1);}} pageCount={bookmakerPageCount} pageSize={bookmakerPageSize} position="top" totalRows={combined.bookmakerBreakdown.length}/>
              <div className="table-shell">
                <table>
                  <thead>
                    <tr>
                      <th>Bookmaker</th>
                      <th>Total</th>
                      <th>Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combined.bookmakerBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={3}>No bookmaker rows are in the shared range.</td>
                      </tr>
                    ) : (
                      visibleBookmakerRows.map((row) => (
                        <FinancialValueReplayRow key={row.bookmaker}>
                          <td>{row.bookmaker}</td>
                          <td><FinancialValue value={row.totalPnl} /></td>
                          <td>{row.openRowCount}</td>
                        </FinancialValueReplayRow>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <LedgerPagination ariaLabel="Bookmaker P&L" currentPage={Math.min(bookmakerPage,bookmakerPageCount)} onPageChange={setBookmakerPage} onPageSizeChange={(size)=>{setBookmakerPageSize(size);setBookmakerPage(1);}} pageCount={bookmakerPageCount} pageSize={bookmakerPageSize} position="bottom" totalRows={combined.bookmakerBreakdown.length}/>
            </section>
          </div>
          <ReportExplorer contextKey="combined" state={selectedReadState} scopeLabel={reportScopeLabel}
            scopes={profileRecords.filter((profile)=>selectedProfileIds.includes(profile.profileId)).flatMap((profile)=>{const dataset=datasets.get(profile.profileId);return dataset?[{profileId:profile.profileId,label:profile.displayName,dataset}]:[];})}/>
          <section className="content-subpanel stack" data-pd-id="reports.profile-performance">
            <div className="section-heading-row formal-report-section-heading"><div><span className="eyebrow">Profile Comparison</span><h3>Profile Performance</h3></div><div className="compact-report-controls formal-report-section-controls reports-profile-controls">
              <label className="m3-picker-field"><span className="m3-picker-label">Find a Profile</span><span className="m3-picker-control"><span aria-hidden="true" className="material-symbols-outlined">search</span><input aria-label="Search Profile Performance" type="search" value={reportProfileTableQuery} onChange={(event)=>{setReportProfileTableQuery(event.target.value);setReportProfileTablePage(1);}}/></span></label>
              <label className="m3-picker-field"><span className="m3-picker-label">Sort Profiles</span><span className="m3-picker-control"><span aria-hidden="true" className="material-symbols-outlined">sort</span><select aria-label="Sort Profile Performance" value={reportProfileTableSort} onChange={(event)=>{setReportProfileTableSort(event.target.value);setReportProfileTablePage(1);}}><option value="pnl-desc">P&amp;L High To Low</option><option value="pnl-asc">P&amp;L Low To High</option><option value="profile-asc">Profile A–Z</option><option value="open-desc">Open Items High To Low</option></select></span></label>
            </div></div>
            <LedgerPagination ariaLabel="Profile Performance" currentPage={Math.min(reportProfileTablePage,reportProfileTablePageCount)} onPageChange={setReportProfileTablePage} onPageSizeChange={(size)=>{setReportProfileTablePageSize(size);setReportProfileTablePage(1);}} pageCount={reportProfileTablePageCount} pageSize={reportProfileTablePageSize} position="top" totalRows={reportProfileRows.length}/>
            <div className="table-shell"><table className="profile-analytics-table"><thead><tr><th scope="col">Profile</th><th scope="col">Status</th><th scope="col">Betting P&amp;L</th><th scope="col">Retained Profit</th><th scope="col">Open Items</th><th scope="col">Report</th></tr></thead><tbody>
              {visibleReportProfileRows.length?visibleReportProfileRows.map((row)=><FinancialValueReplayRow key={row.profileId} data-pd-id={`reports.profile.${row.profileId}`}><td><strong>{row.displayName}</strong><br/><small>{row.profileCode}</small></td><td><span className="table-chip">{normalizeProfileStatus(row.status)}</span></td><td><FinancialReadValue state={profileReadState([row.profileId])} subject={`${row.displayName} betting profit and loss`} value={row.grossBettingPnl}/></td><td><FinancialReadValue state={profileReadState([row.profileId])} subject={`${row.displayName} retained profit`} value={row.retainedProfit}/></td><td>{row.openBets}</td><td><Link className="report-value-link" href={`/profiles/${row.profileId}/tracker/reports?source=combined-reports`}><span className="material-symbols-outlined" aria-hidden="true">open_in_new</span>View Report</Link></td></FinancialValueReplayRow>):<tr><td colSpan={6}>No Profiles match this scope and search.</td></tr>}
            </tbody></table></div>
            <LedgerPagination ariaLabel="Profile Performance" currentPage={Math.min(reportProfileTablePage,reportProfileTablePageCount)} onPageChange={setReportProfileTablePage} onPageSizeChange={(size)=>{setReportProfileTablePageSize(size);setReportProfileTablePage(1);}} pageCount={reportProfileTablePageCount} pageSize={reportProfileTablePageSize} position="bottom" totalRows={reportProfileRows.length}/>
          </section>
          </section>
          ) : null}

          {activeTab === "reports" ? (
          <section
            aria-labelledby="analytics-tab-reports"
            className="analytics-tab-panel stack"
            id="analytics-panel-reports"
            role="tabpanel"
          >
          <PeriodPnlReport rows={formalCombined.weeklyReports} contextKey="combined"
            scopeLabel={reportScopeLabel}
            scopes={profileRecords.filter((profile) => selectedProfileIds.includes(profile.profileId))
              .flatMap((profile) => {
                const dataset = datasets.get(profile.profileId);
                return dataset ? [{ profileId: profile.profileId, label: profile.displayName, dataset }] : [];
              })} />
          <div className="section-heading-row"><div><span className="eyebrow">Formal Reporting</span><h3>Detailed Formal Reports</h3></div></div>
          <ReportTable
            feeGranularity="week"
            feeHeading="Indicative Fee Impact"
            indicativeFeeValues={weeklyIndicativeFeeImpacts}
            onFeeAction={openFeeReportQueue}
            rows={formalCombined.weeklyReports}
            title="Combined Weekly Reports"
          />
          <ReportTable
            feeGranularity="month"
            feeHeading="Fees Earned"
            feeValues={monthlyReportFees}
            onFeeAction={openFeeReportQueue}
            rows={formalCombined.monthlyReports}
            title="Combined Monthly Reports"
          />
          <ReportTable
            feeGranularity="year"
            feeHeading="Fees Earned"
            feeValues={yearlyReportFees}
            onFeeAction={openFeeReportQueue}
            rows={formalCombined.yearlyReports}
            title="Combined Yearly Reports"
          />
          </section>
          ) : null}
        </>
      ) : null}

      {activeTab === "profiles" ? (
      <section
        aria-labelledby="analytics-tab-profiles"
        className="analytics-tab-panel content-subpanel stack profile-directory"
        data-pd-id="profiles.directory.panel"
        id="analytics-panel-profiles"
        role="tabpanel"
      >
        <section
          aria-busy={headlineReadState === "loading"}
          className="stat-strip"
          aria-label="All-profile headline totals"
        >
          <FinancialValueReplayGroup>
            <article className="stat-card">
              <span className="eyebrow">Gross P&amp;L</span>
              <strong><FinancialReadValue state={headlineReadState} subject="gross profit and loss" value={activeProfilesCombined.totals.grossBettingPnl} zeroTone="neutral" /></strong>
              <span>Sportsbook + Free Bets + Casino</span>
            </article>
          </FinancialValueReplayGroup>
          <FinancialValueReplayGroup>
            <article className="stat-card">
              <span className="eyebrow">Retained profit</span>
              <strong><FinancialReadValue state={headlineReadState} subject="retained profit" value={activeProfilesCombined.totals.retainedProfit} zeroTone="neutral" /></strong>
              <span>Gross P&amp;L after signed withdrawals and costs</span>
            </article>
          </FinancialValueReplayGroup>
          <FinancialValueReplayGroup>
            <article className="stat-card">
              <span className="eyebrow">Current Account Cash</span>
              <strong><FinancialReadValue state={headlineReadState} subject="current Account cash" value={trackerRangeActiveProfilesCombined.totals.cashSnapshot} zeroTone="neutral" /></strong>
              <span>Current bookmaker, exchange, and bank balances</span>
            </article>
          </FinancialValueReplayGroup>
          <FinancialValueReplayGroup>
            <article className="stat-card" data-pd-id="profiles.fees.available-to-withdraw">
              <span className="eyebrow">Available to Withdraw</span>
              <strong><FinancialReadValue state={activeFeeReadState} subject="available fees" value={activeProfilesFeePosition.availableToWithdraw} zeroTone="neutral" /></strong>
              <span>
                {activeFeeReadState !== "ready"
                  ? activeFeeReadState === "loading" ? "Loading fee position" : "Fee position unavailable"
                  : activeProfilesFeePosition.crystallisedPeriodCount > 0
                  ? <><FinancialValue value={activeProfilesFeePosition.feesEarned} /> earned · <FinancialValue value={activeProfilesFeePosition.feesWithdrawn} /> withdrawn</>
                  : "No crystallised fee periods in this range"}
              </span>
            </article>
          </FinancialValueReplayGroup>
        </section>
        <section className="content-subpanel stack" data-pd-id="profiles.workload">
          <h3>Profile Workload</h3>
          <dl className="dashboard-focus-list">
            <div><dt>Sportsbook</dt><dd>{selectedReadState === "ready" ? combined.profileRows.reduce((total, row) => total + row.sportsbookActionCount, 0) : selectedReadState === "loading" ? "Loading…" : "Unavailable"}</dd></div>
            <div><dt>Free Bets</dt><dd>{selectedReadState === "ready" ? combined.profileRows.reduce((total, row) => total + row.freeBetActionCount, 0) : selectedReadState === "loading" ? "Loading…" : "Unavailable"}</dd></div>
            <div><dt>Casino</dt><dd>{selectedReadState === "ready" ? combined.profileRows.reduce((total, row) => total + row.casinoActionCount, 0) : selectedReadState === "loading" ? "Loading…" : "Unavailable"}</dd></div>
            <div><dt>Extra Place</dt><dd>{selectedReadState === "ready" ? combined.profileRows.reduce((total, row) => total + row.extraPlaceActionCount, 0) : selectedReadState === "loading" ? "Loading…" : "Unavailable"}</dd></div>
          </dl>
        </section>
        <section className="content-subpanel stack" data-pd-id="profiles.balance-history">
          <div className="section-heading-row formal-report-section-heading"><h3>Balance Snapshot History</h3><div className="compact-report-controls formal-report-section-controls">
            <label className="m3-picker-field"><span className="m3-picker-label">Snapshot Range</span><span className="m3-picker-control"><span aria-hidden="true" className="material-symbols-outlined">date_range</span><select aria-label="Balance snapshot period range" data-pd-id="profiles.balance-snapshots.period-range" onChange={(event)=>{setBalanceSnapshotRange(event.target.value);setBalancePage(1);}} value={balanceSnapshotRange}><option value="all">All Snapshots</option><option value="30">Last 30 Days</option><option value="90">Last 3 Months</option><option value="180">Last 6 Months</option></select></span></label>
            <label className="m3-picker-field"><span className="m3-picker-label">Snapshot Type</span><span className="m3-picker-control"><span aria-hidden="true" className="material-symbols-outlined">filter_alt</span><select aria-label="Balance snapshot type" data-pd-id="profiles.balance-snapshots.type" onChange={(event)=>{setBalanceSnapshotType(event.target.value);setBalancePage(1);}} value={balanceSnapshotType}><option value="all">All Types</option>{balanceSnapshotTypes.map((type)=><option key={type} value={type}>{type}</option>)}</select></span></label>
          </div></div>
          <LedgerPagination ariaLabel="Balance Snapshot History" currentPage={Math.min(balancePage,balancePageCount)} onPageChange={setBalancePage} onPageSizeChange={(size)=>{setBalancePageSize(size);setBalancePage(1);}} pageCount={balancePageCount} pageSize={balancePageSize} position="top" totalRows={balanceSnapshots.length}/>
          <div className="table-shell"><table className="profile-action-table"><thead><tr><th scope="col">Profile</th><th scope="col">Captured</th><th scope="col">Type</th><th scope="col">Account</th><th scope="col">Balance</th></tr></thead><tbody>
            {visibleBalanceSnapshots.length?visibleBalanceSnapshots.map((row)=><FinancialValueReplayRow key={`${row.profile_id}-${row.balance_snapshot_id}`}><td>{row.displayName}</td><td>{formatHumanDisplayDate(row.snapshot_at,true)}</td><td>{row.snapshot_type}</td><td>{row.account_id??"Profile total"}</td><td><FinancialValue value={Number(row.balance_amount)}/></td></FinancialValueReplayRow>):<tr><td colSpan={5}>No balance snapshots fall inside the selected range.</td></tr>}
          </tbody></table></div>
          <LedgerPagination ariaLabel="Balance Snapshot History" currentPage={Math.min(balancePage,balancePageCount)} onPageChange={setBalancePage} onPageSizeChange={(size)=>{setBalancePageSize(size);setBalancePage(1);}} pageCount={balancePageCount} pageSize={balancePageSize} position="bottom" totalRows={balanceSnapshots.length}/>
        </section>
        <div className="section-heading-row">
          <div>
            <span className="eyebrow">Profile management</span>
            <h2 id="profile-directory-title">Profiles</h2>
            <p className="muted-text">Gross P&amp;L range: {formatHumanDisplayDate(resolvedRange.start.toISOString())} to {formatHumanDisplayDate(resolvedRange.end.toISOString())}.</p>
          </div>
          <div className="tracker-nav profile-directory-heading-actions">
            <span className="profile-picker-count">{directoryProfiles.length} shown</span>
            <Link
              className="modal-primary-button button-link"
              data-pd-id="profiles.add-profile"
              href="/profiles/new"
            >
              <span aria-hidden="true" className="material-symbols-outlined">person_add</span>
              Add Profile
            </Link>
            <button
              className="button-link"
              data-pd-id="profiles.opportunity.add"
              onClick={() => setOpportunityDialogOpen(true)}
              type="button"
            >
              <span aria-hidden="true" className="material-symbols-outlined">group_add</span>
              Add Opportunity
            </button>
          </div>
        </div>
        <LedgerPagination ariaLabel="Profile Directory" currentPage={Math.min(directoryPage,directoryPageCount)} onPageChange={setDirectoryPage} onPageSizeChange={(size)=>{setDirectoryPageSize(size);setDirectoryPage(1);}} pageCount={directoryPageCount} pageSize={directoryPageSize} position="top" totalRows={directoryProfiles.length}/>
        <div className="table-shell">
          <table className="profile-action-table">
            <thead>
              <tr>
                <th scope="col"><span className="visually-hidden">Pinned</span></th>
                <th scope="col">Profile</th>
                <th scope="col">Subscriber</th>
                <th scope="col">Status</th>
                <th scope="col">Access</th>
                <th scope="col">Tracking</th>
                <th scope="col">Gross P&amp;L</th>
                <th scope="col">Available to Withdraw</th>
                <th scope="col">Open Positions</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleDirectoryProfiles.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <div className="profile-directory-empty-state" data-pd-id="profiles.directory.empty" role="status">
                      <strong>{directoryStatus === "Archived" ? "No archived Profiles" : directoryStatus === "Active" ? "No active Profiles" : "No Profiles match these controls"}</strong>
                      {directoryStatus === "Archived" ? (
                        <button className="button-link" onClick={() => { setDirectoryStatus("Active"); setDirectoryPage(1); }} type="button">
                          View Active Profiles
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : visibleDirectoryProfiles.map((profile) => {
                const isPinned = pinnedProfileIds.includes(profile.profileId);
                return (
                  <FinancialValueReplayRow
                    aria-label={`Open details for ${profile.displayName}`}
                    className="profile-directory-row"
                    data-pd-id={`profiles.directory.row.${profile.profileId}`}
                    key={profile.profileId}
                    onClick={(event) => {
                      if (event.target instanceof Element && event.target.closest("a, button, input, select")) return;
                      openProfileDetails(profile.profileId);
                    }}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
                      event.preventDefault();
                      openProfileDetails(profile.profileId);
                    }}
                    tabIndex={0}
                  >
                    <td>
                      <button
                        aria-label={`${isPinned ? "Unpin" : "Pin"} ${profile.displayName}`}
                        aria-pressed={isPinned}
                        className={`directory-icon-button${isPinned ? " is-active" : ""}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          togglePinnedProfile(profile.profileId);
                        }}
                        type="button"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined">push_pin</span>
                      </button>
                    </td>
                    <td><strong>{profile.displayName}</strong><br /><small>{profile.profileCode}</small></td>
                    <td><span className="table-chip table-chip-muted">Not linked</span></td>
                    <td><span className="badge">{normalizeProfileStatus(profile.status)}</span></td>
                    <td><span className="table-chip table-chip-muted">OAuth pending</span></td>
                    <td>
                      <span className="action-tooltip-wrap">
                        <span
                          aria-describedby={`tracking-tenure-${profile.profileId}`}
                          aria-label={`Tracking for ${formatTrackingTenure(profile.trackingStartDate)} since ${formatHumanDisplayDate(profile.trackingStartDate)}`}
                          className="profile-tenure-pill"
                          tabIndex={0}
                        >
                          {formatTrackingTenure(profile.trackingStartDate)}
                        </span>
                        <span
                          className="action-tooltip profile-tenure-tooltip"
                          id={`tracking-tenure-${profile.profileId}`}
                          role="tooltip"
                        >
                          Tracking started {formatHumanDisplayDate(profile.trackingStartDate)}
                        </span>
                      </span>
                    </td>
                    <td><BettingPnlReadValue state={profileReadState([profile.profileId])} activityCount={profile.summary?.bettingActivityCount ?? 0} value={profile.summary?.grossBettingPnl ?? Number.NaN} /></td>
                    <td>
                      <span className="table-status">
                        <FinancialReadValue state={profileReadState([profile.profileId], "fees")} subject="fee position" value={feePositionByProfile.get(profile.profileId)?.availableToWithdraw ?? Number.NaN} />
                      </span>
                    </td>
                    <td>{profile.summary ? profile.summary.openBets : isLoading ? <ReportingCellLoading label={`Loading ${profile.displayName} open positions`} /> : failedProfileIds.has(profile.profileId) ? "Unavailable" : 0}</td>
                    <td>
                      <div className="directory-actions" onClick={(event) => event.stopPropagation()}>
                        {profile.summary ? <OperationalActionLinks row={profile.summary} /> : isLoading ? <ReportingCellLoading label={`Loading ${profile.displayName} actions`} /> : failedProfileIds.has(profile.profileId) ? "Unavailable" : null}
                        <span className="directory-navigation-actions">
                          <Link
                            aria-label={`Manage ${profile.displayName}`}
                            className="directory-nav-action"
                            data-pd-id={`profiles.${profile.profileId}.actions.manage`}
                            href={`/profiles/${profile.profileId}/manage`}
                            title={`Manage ${profile.displayName}`}
                          >
                            <span aria-hidden="true" className="material-symbols-outlined">manage_accounts</span>
                          </Link>
                          <Link
                            aria-label={`Open ${profile.displayName} dashboard`}
                            className="directory-nav-action"
                            data-pd-id={`profiles.${profile.profileId}.actions.dashboard`}
                            href={`/profiles/${profile.profileId}/tracker/dashboard`}
                            title={`Open ${profile.displayName} dashboard`}
                          >
                            <span aria-hidden="true" className="material-symbols-outlined">dashboard</span>
                          </Link>
                          <Link
                            aria-label={`Open ${profile.displayName} reports`}
                            className="directory-nav-action"
                            data-pd-id={`profiles.${profile.profileId}.actions.reports`}
                            href={`/profiles/${profile.profileId}/tracker/reports`}
                            title={`Open ${profile.displayName} reports`}
                          >
                            <span aria-hidden="true" className="material-symbols-outlined">summarize</span>
                          </Link>
                        </span>
                      </div>
                    </td>
                  </FinancialValueReplayRow>
                );
              })}
            </tbody>
          </table>
        </div>
        <LedgerPagination ariaLabel="Profile Directory" currentPage={Math.min(directoryPage,directoryPageCount)} onPageChange={setDirectoryPage} onPageSizeChange={(size)=>{setDirectoryPageSize(size);setDirectoryPage(1);}} pageCount={directoryPageCount} pageSize={directoryPageSize} position="bottom" totalRows={directoryProfiles.length}/>
      </section>
      ) : null}

      {feeReportQueue ? (
        <FeeReportReviewQueueDialog
          entries={feeReportQueueEntries}
          label={feeReportQueue.label}
          onClose={() => setFeeReportQueue(null)}
          onReview={openFeeReviewFromQueue}
          open
        />
      ) : null}
      {opportunityDialogOpen ? (
        <MultiProfileOpportunityDialog
          initialOpportunityId={initialOpportunityId}
          onClose={() => setOpportunityDialogOpen(false)}
          profiles={profileRecords}
        />
      ) : null}

      {feeBreakdownRow ? (
        <FeeCentreBreakdownDrawer
          cashAdjustmentTotal={feeBreakdownCashAdjustmentTotal}
          sourceState={profileReadState([feeBreakdownRow.profile.profileId], "fees")}
          key={`${feeBreakdownRow.profile.profileId}-${feeCentreMonth}`}
          month={feeCentreMonth}
          monthLabel={feeCentreMonthLabel}
          onClose={() => setFeeBreakdownProfileId(null)}
          onReview={() => openFeeReview(feeBreakdownRow.profile.profileId, feeCentreMonth)}
          open
          profileCode={feeBreakdownRow.profile.profileCode}
          profileId={feeBreakdownRow.profile.profileId}
          profileName={feeBreakdownRow.profile.displayName}
          result={feeBreakdownRow.result}
        />
      ) : null}

      <dialog
        aria-label={detailProfile ? `Profile details for ${detailProfile.displayName}` : "Profile details"}
        className="profile-details-drawer"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        ref={detailDialogRef}
      >
        {detailProfile ? (
          <div className="profile-details-drawer-content stack">
            <div className="section-heading-row">
              <div>
                <span className="eyebrow">Profile Summary</span>
                <h2>{detailProfile.displayName}</h2>
              </div>
              <button aria-label="Close profile details" className="dialog-close-button" onClick={() => detailDialogRef.current?.close()} type="button">
                <span aria-hidden="true" className="material-symbols-outlined">close</span>
              </button>
            </div>
            <section className="profile-drawer-section stack-tight">
              <h3>Profile</h3>
              <dl className="profile-detail-list">
                <div><dt>Profile code</dt><dd>{detailProfile.profileCode}</dd></div>
                <div><dt>Status</dt><dd><span className="badge">{normalizeProfileStatus(detailProfile.status)}</span></dd></div>
                <div><dt>Subscriber access</dt><dd><span className="table-chip table-chip-muted">Not linked</span></dd></div>
                <div><dt>Tracking start</dt><dd>{formatHumanDisplayDate(detailProfile.trackingStartDate)}</dd></div>
                <div><dt>Management fee</dt><dd>{detailProfile.managementFeePercent}%</dd></div>
                <div><dt>Investment fee</dt><dd>{detailProfile.investmentFeePercent}%</dd></div>
              </dl>
            </section>
            <FinancialValueReplayGroup>
            <section className="profile-drawer-section stack-tight">
              <h3>Selected Range Performance</h3>
              <dl className="profile-detail-list">
                <div><dt>Sportsbook</dt><dd>{detailSummary ? <FinancialValue value={detailModuleValues.get("sportsbook") ?? 0} /> : isLoading ? <ReportingCellLoading label="Loading Sportsbook reporting" /> : "Unavailable"}</dd></div>
                <div><dt>Free Bets</dt><dd>{detailSummary ? <FinancialValue value={detailModuleValues.get("free-bets") ?? 0} /> : isLoading ? <ReportingCellLoading label="Loading Free Bet reporting" /> : "Unavailable"}</dd></div>
                <div><dt>Casino</dt><dd>{detailSummary ? <FinancialValue value={detailModuleValues.get("casino") ?? 0} /> : isLoading ? <ReportingCellLoading label="Loading Casino reporting" /> : "Unavailable"}</dd></div>
                <div><dt>Cash Adjustments</dt><dd>{detailSummary ? <FinancialValue value={detailModuleValues.get("cash-adjustments") ?? 0} /> : isLoading ? <ReportingCellLoading label="Loading Cash Adjustment reporting" /> : "Unavailable"}</dd></div>
                <div><dt>Gross P&amp;L</dt><dd>{detailSummary ? <FinancialValue value={detailSummary.summary.reportingModel.selectedRange.grossBettingPnl} /> : isLoading ? <ReportingCellLoading label="Loading gross profit and loss" /> : "Unavailable"}</dd></div>
              </dl>
            </section>
            </FinancialValueReplayGroup>
            <FinancialValueReplayGroup>
            <section className="profile-drawer-section stack-tight">
              <h3>Current Cash</h3>
              <dl className="profile-detail-list">
                <div><dt>Current Account Cash</dt><dd>{detailSummary ? <FinancialValue value={detailSummary.summary.accountQuickView.cashSnapshot} /> : isLoading ? <ReportingCellLoading label="Loading current Account cash" /> : "Unavailable"}</dd></div>
              </dl>
            </section>
            </FinancialValueReplayGroup>
            <FinancialValueReplayGroup>
            <section className="profile-drawer-section stack-tight" data-pd-id="profiles.drawer.fee-position">
              <h3>Fee Position</h3>
              <dl className="profile-detail-list">
                <div><dt>Estimated Fees</dt><dd><FinancialReadValue state={profileReadState([detailProfile.profileId], "fees")} subject="estimated fees" value={detailFeePosition?.estimatedFees ?? Number.NaN} /></dd></div>
                <div><dt>Fees Earned</dt><dd><FinancialReadValue state={profileReadState([detailProfile.profileId], "fees")} subject="fees earned" value={detailFeePosition?.feesEarned ?? Number.NaN} /></dd></div>
                <div><dt>Available to Withdraw</dt><dd><FinancialReadValue state={profileReadState([detailProfile.profileId], "fees")} subject="fees available to withdraw" value={detailFeePosition?.availableToWithdraw ?? Number.NaN} /></dd></div>
                <div><dt>Fees Withdrawn</dt><dd><FinancialReadValue state={profileReadState([detailProfile.profileId], "fees")} subject="withdrawn fees" value={detailFeePosition?.feesWithdrawn ?? Number.NaN} /></dd></div>
              </dl>
              <button
                className="button-link"
                data-pd-id="profiles.drawer.review-monthly-fees"
                onClick={() => {
                  setFeeReviewMonth("");
                  setFeeReviewProfileId(detailProfile.profileId);
                }}
                type="button"
              >
                Review Monthly Fees
              </button>
            </section>
            </FinancialValueReplayGroup>
            <nav className="profile-drawer-actions" aria-label="Profile quick navigation">
              {detailComparisonRow ? <OperationalActionLinks row={detailComparisonRow} /> : null}
              <Link
                aria-label={`Open ${detailProfile.displayName} dashboard`}
                className="directory-nav-action"
                href={`/profiles/${detailProfile.profileId}/tracker/dashboard`}
                onClick={() => setDrawerNavigationLabel("Opening dashboard")}
                title={`Open ${detailProfile.displayName} dashboard`}
              >
                <span aria-hidden="true" className="material-symbols-outlined">dashboard</span>
              </Link>
              <Link
                aria-label={`Open ${detailProfile.displayName} reports`}
                className="directory-nav-action"
                href={`/profiles/${detailProfile.profileId}/tracker/reports`}
                onClick={() => setDrawerNavigationLabel("Opening reports")}
                title={`Open ${detailProfile.displayName} reports`}
              >
                <span aria-hidden="true" className="material-symbols-outlined">summarize</span>
              </Link>
              <Link
                aria-label={`Open ${detailProfile.displayName} accounts`}
                className="directory-nav-action"
                href={`/profiles/${detailProfile.profileId}/tracker/accounts`}
                onClick={() => setDrawerNavigationLabel("Opening accounts")}
                title={`Open ${detailProfile.displayName} accounts`}
              >
                <span aria-hidden="true" className="material-symbols-outlined">account_balance_wallet</span>
              </Link>
              <Link
                className="button-link profile-drawer-manage-action"
                data-pd-id="profiles.drawer.manage"
                href={`/profiles/${detailProfile.profileId}/manage`}
                onClick={() => setDrawerNavigationLabel("Opening Profile management")}
              >
                <span aria-hidden="true" className="material-symbols-outlined">manage_accounts</span>
                <span>Manage Profile</span>
              </Link>
            </nav>
            {drawerNavigationLabel ? (
              <div className="profile-drawer-loading" role="status">
                <span aria-hidden="true" className="profile-drawer-spinner" />
                <span>{drawerNavigationLabel}</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </dialog>
      {detailProfile && feeReviewProfileId === detailProfile.profileId ? (
        <FeePeriodReviewDialog
          initialMonth={feeReviewMonth || initialFeeReviewMonth}
          onClose={() => setFeeReviewProfileId(null)}
          onPeriodsChanged={(updatedPeriods) => {
            setFeePeriods((current) => {
              const next = new Map(current);
              next.set(detailProfile.profileId, updatedPeriods);
              return next;
            });
          }}
          open
          operationalActions={{
            sportsbook: detailComparisonRow?.sportsbookActionCount ?? 0,
            freeBets: detailComparisonRow?.freeBetActionCount ?? 0,
            casinoOffers: detailComparisonRow?.casinoActionCount ?? 0,
            extraPlaces: detailComparisonRow?.extraPlaceActionCount ?? 0,
          }}
          periods={feePeriods.get(detailProfile.profileId) ?? []}
          profileId={detailProfile.profileId}
          profileName={detailProfile.displayName}
          trackingStartDate={detailProfile.trackingStartDate}
        />
      ) : null}
    </section>
  );
}
