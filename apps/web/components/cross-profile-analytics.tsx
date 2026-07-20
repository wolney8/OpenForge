"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiBaseUrl } from "@/lib/api";
import { AccessScopeBadge } from "./access-scope-badge";
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
  formatMoney,
  formatTrackingTenure,
  getDatePresetOptions,
  countTrueOpenPositions,
  resolveDateRange,
  summarizeTrackerData,
  type AccountSummaryRecord,
  type BalanceSnapshotSummaryRecord,
  type CashAdjustmentSummaryRecord,
  type CasinoSummaryRecord,
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

type ProfileDescriptor = {
  profileId: string;
  displayName: string;
  profileCode: string;
  status: string;
  trackingStartDate: string;
  managementFeePercent: string;
  investmentFeePercent: string;
};

type AnalyticsTab = "profiles" | "performance" | "exposure" | "fees" | "reports";
type EditableProfileField =
  | "display_name"
  | "profile_code"
  | "status"
  | "tracking_start_date"
  | "management_fee_percent"
  | "investment_fee_percent";

type ProfileApiResponse = {
  profile_id: string;
  display_name: string;
  profile_code: string;
  status: string;
  tracking_start_date: string;
  management_fee_percent: string;
  investment_fee_percent: string;
};

const analyticsTabs: { id: AnalyticsTab; label: string }[] = [
  { id: "profiles", label: "Profiles" },
  { id: "performance", label: "Performance" },
  { id: "exposure", label: "Exposure" },
  { id: "fees", label: "Fees" },
  { id: "reports", label: "Formal Reports" },
];

const directoryPageSize = 8;
const profileStatusOptions = ["Active", "Pending", "Inactive", "Paused", "Archived"];

function normalizeProfileStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  return profileStatusOptions.find((option) => option.toLowerCase() === normalized) ?? status;
}

type CrossProfileAnalyticsProps = {
  profiles: ProfileDescriptor[];
};

type ProfileLoadFailure = {
  profileId: string;
  displayName: string;
  message: string;
};

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { cache: "no-store", signal });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

async function loadProfileDataset(
  profileId: string,
  signal: AbortSignal
): Promise<TrackerSummaryDataset> {
  const base = `${apiBaseUrl}/profiles/${profileId}`;
  const [accounts, sportsbookBets, freeBets, casinoOffers, cashAdjustments, balanceSnapshots] =
    await Promise.all([
    fetchJson<AccountSummaryRecord[]>(`${base}/accounts`, signal),
    fetchJson<SportsbookSummaryRecord[]>(`${base}/sportsbook-bets`, signal),
    fetchJson<FreeBetSummaryRecord[]>(`${base}/free-bets`, signal),
    fetchJson<CasinoSummaryRecord[]>(`${base}/casino-offers`, signal),
    fetchJson<CashAdjustmentSummaryRecord[]>(`${base}/cash-adjustments`, signal),
    fetchJson<BalanceSnapshotSummaryRecord[]>(`${base}/balance-snapshots`, signal),
  ]);

  return { accounts, sportsbookBets, freeBets, casinoOffers, cashAdjustments, balanceSnapshots };
}

async function loadProfileFeePeriods(
  profileId: string,
  signal: AbortSignal
): Promise<FeePeriodApiRecord[]> {
  return fetchJson<FeePeriodApiRecord[]>(
    `${apiBaseUrl}/profiles/${profileId}/fee-periods`,
    signal
  );
}

function rangeLabel(start: Date, end: Date) {
  return `${formatHumanDisplayDate(start.toISOString())} to ${formatHumanDisplayDate(end.toISOString())}`;
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
                onChange={(event) => setPeriodKey(event.target.value)}
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
                onChange={(event) => setFinancialFilter(event.target.value as FormalReportFinancialFilter)}
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
              filteredRows.map((row) => {
                const feeValue = feeValues?.get(row.periodKey);
                const indicativeFeeValue = indicativeFeeValues?.get(row.periodKey);
                const feeLabel =
                  feeGranularity === "week"
                    ? formatMoney(indicativeFeeValue ?? 0)
                    : feeValue?.crystallisedPeriodCount
                      ? formatMoney(feeValue.feesEarned)
                      : feeValue?.readyPeriodCount
                        ? "Awaiting Confirmation"
                        : "Review Required";
                return (
                <tr key={row.periodKey}>
                  <td>{row.periodLabel}</td>
                  <td>{formatMoney(row.sportsbookPnl)}</td>
                  <td>{formatMoney(row.freeBetPnl)}</td>
                  <td>{formatMoney(row.casinoPnl)}</td>
                  <td>{formatMoney(row.totalPnl)}</td>
                  <td>{formatMoney(row.withdrawals)}</td>
                  <td>{formatMoney(row.costs)}</td>
                  <td>{formatMoney(row.retainedProfit)}</td>
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
                        {formatMoney(feeValue.awaitingConfirmation)} awaiting confirmation
                      </small>
                    ) : null}
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OperationalActionLinks({ row }: { row: ProfileComparisonRow }) {
  const actions = [
    { ledger: "sportsbook" as const, label: "Sportsbook", icon: "sports", count: row.sportsbookActionCount },
    { ledger: "free-bets" as const, label: "Free Bets", icon: "award_star", count: row.freeBetActionCount },
    { ledger: "casino-offers" as const, label: "Casino", icon: "playing_cards", count: row.casinoActionCount },
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
  initialDetailProfileId,
  initialFeeReviewMonth,
  initialOpportunityId,
}: CrossProfileAnalyticsProps & {
  initialDetailProfileId?: string;
  initialFeeReviewMonth?: string;
  initialOpportunityId?: string;
}) {
  const [profileRecords, setProfileRecords] = useState(profiles);
  const [preset, setPreset] = useState<DatePreset>("Week (Mon-Sun)");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedProfileIds, setSelectedProfileIds] = useState(() =>
    profiles.map((profile) => profile.profileId)
  );
  const [datasets, setDatasets] = useState<Map<string, TrackerSummaryDataset>>(new Map());
  const [feePeriods, setFeePeriods] = useState<Map<string, FeePeriodApiRecord[]>>(new Map());
  const [failures, setFailures] = useState<ProfileLoadFailure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("profiles");
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [directoryStatus, setDirectoryStatus] = useState("all");
  const [directoryPage, setDirectoryPage] = useState(1);
  const [pinnedProfileIds, setPinnedProfileIds] = useState<string[]>([]);
  const [detailProfileId, setDetailProfileId] = useState<string | null>(initialDetailProfileId ?? null);
  const [profileEdit, setProfileEdit] = useState<{
    field: EditableProfileField;
    value: string;
  } | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileEditError, setProfileEditError] = useState("");
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
  const [balanceSnapshotRange, setBalanceSnapshotRange] = useState("all");
  const [balanceSnapshotType, setBalanceSnapshotType] = useState("all");
  const [reportFilterAsOf] = useState(() => Date.now());
  const detailDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    void Promise.allSettled(
      profiles.map(async (profile) => ({
        profile,
        dataset: await loadProfileDataset(profile.profileId, controller.signal),
        periods: await loadProfileFeePeriods(profile.profileId, controller.signal),
      }))
    ).then((results) => {
      if (controller.signal.aborted) {
        return;
      }

      const nextDatasets = new Map<string, TrackerSummaryDataset>();
      const nextFeePeriods = new Map<string, FeePeriodApiRecord[]>();
      const nextFailures: ProfileLoadFailure[] = [];
      results.forEach((result, index) => {
        const profile = profiles[index];
        if (result.status === "fulfilled") {
          nextDatasets.set(profile.profileId, result.value.dataset);
          nextFeePeriods.set(profile.profileId, result.value.periods);
        } else {
          nextFailures.push({
            profileId: profile.profileId,
            displayName: profile.displayName,
            message:
              result.reason instanceof Error ? result.reason.message : "Unknown profile load error",
          });
        }
      });
      setDatasets(nextDatasets);
      setFeePeriods(nextFeePeriods);
      setFailures(nextFailures);
      setIsLoading(false);
    });

    return () => controller.abort();
  }, [profiles]);

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

  const allProfilesCombined = useMemo(
    () => aggregateCrossProfileReporting(allProfileSummaries),
    [allProfileSummaries]
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

  const allProfilesFeePosition = useMemo(
    () => combineFeePositions([...feePositionByProfile.values()]),
    [feePositionByProfile]
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
    if (!feeBreakdownProfileId) return 0;
    const dataset = datasets.get(feeBreakdownProfileId);
    return dataset
      ? summarizeTrackerData(dataset, feeCentreRange).reportingModel.selectedRange.cashAdjustments
      : 0;
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
  const detailProfile = profileRecords.find((profile) => profile.profileId === detailProfileId);
  const detailSummary = allProfileSummaries.find(
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
        .sort((left, right) => right.snapshot_at.localeCompare(left.snapshot_at))
        .slice(0, 50);
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

  function toggleProfile(profileId: string) {
    setSelectedProfileIds((current) => {
      if (current.includes(profileId)) {
        return current.length === 1 ? current : current.filter((id) => id !== profileId);
      }
      return [...current, profileId];
    });
  }

  function selectTab(tab: AnalyticsTab) {
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
    setActiveTab(nextTab);
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
    setProfileEdit(null);
    setProfileEditError("");
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

  async function saveProfileField(edit = profileEdit) {
    if (!detailProfile || !edit || isSavingProfile) return;
    setIsSavingProfile(true);
    setProfileEditError("");
    try {
      const response = await fetch(`${apiBaseUrl}/profiles/${detailProfile.profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [edit.field]: edit.value.trim() }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          detail?: string | { msg?: string }[];
        } | null;
        const detail = Array.isArray(body?.detail)
          ? body.detail.map((item) => item.msg).filter(Boolean).join(". ")
          : body?.detail;
        throw new Error(detail || `Profile update failed with status ${response.status}`);
      }
      const updated = (await response.json()) as ProfileApiResponse;
      setProfileRecords((current) =>
        current.map((profile) =>
          profile.profileId === updated.profile_id
            ? {
                ...profile,
                displayName: updated.display_name,
                profileCode: updated.profile_code,
                status: updated.status,
                trackingStartDate: updated.tracking_start_date,
                managementFeePercent: updated.management_fee_percent,
                investmentFeePercent: updated.investment_fee_percent,
              }
            : profile
        )
      );
      setProfileEdit((current) => current?.field === edit.field ? null : current);
    } catch (error) {
      setProfileEditError(error instanceof Error ? error.message : "Profile update failed");
    } finally {
      setIsSavingProfile(false);
    }
  }

  function handleInlineEditKeyDown(
    event: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setProfileEdit(null);
      setProfileEditError("");
    }
  }

  function renderEditableProfileValue(
    field: EditableProfileField,
    value: string,
    label: string,
    suffix = "",
    displayValue = value
  ) {
    if (profileEdit?.field === field) {
      return (
        <span className="profile-inline-editor">
          {field === "status" ? (
            <select
              aria-label={`Edit ${label}`}
              autoFocus
              className="profile-inline-control"
              disabled={isSavingProfile}
              onChange={(event) => setProfileEdit({ field, value: event.target.value })}
              onBlur={() => void saveProfileField(profileEdit)}
              onKeyDown={handleInlineEditKeyDown}
              value={profileEdit.value}
            >
              {profileStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          ) : (
            <input
              aria-label={`Edit ${label}`}
              autoFocus
              className={`profile-inline-control${field.includes("fee") ? " is-fee" : ""}`}
              disabled={isSavingProfile}
              max={field.includes("fee") ? "100" : field === "tracking_start_date" ? new Date().toISOString().slice(0, 10) : undefined}
              maxLength={field === "profile_code" ? 32 : undefined}
              min={field.includes("fee") ? "0" : undefined}
              onChange={(event) => setProfileEdit({
                field,
                value: field === "profile_code" ? event.target.value.toUpperCase() : event.target.value,
              })}
              onBlur={() => void saveProfileField(profileEdit)}
              onKeyDown={handleInlineEditKeyDown}
              pattern={field === "profile_code" ? "[A-Z0-9-]+" : undefined}
              step={field.includes("fee") ? "0.01" : undefined}
              type={field.includes("fee") ? "number" : field === "tracking_start_date" ? "date" : "text"}
              value={profileEdit.value}
            />
          )}
          {suffix ? <span>{suffix}</span> : null}
          {isSavingProfile ? <span aria-label="Saving profile field" className="profile-inline-saving" /> : null}
        </span>
      );
    }

    return (
      <span className="profile-inline-value">
        {field === "status" ? normalizeProfileStatus(value) : `${displayValue}${suffix}`}
        <button
          aria-label={`Edit ${label}`}
          className="profile-field-action"
          onClick={() => { setProfileEditError(""); setProfileEdit({ field, value: field === "status" ? normalizeProfileStatus(value) : value }); }}
          type="button"
        >
          <span aria-hidden="true" className="material-symbols-outlined">edit</span>
        </button>
      </span>
    );
  }

  return (
    <section
      className="content-panel stack cross-profile-analytics"
      aria-labelledby="combined-analytics-title"
    >
      <div className={`fund-manager-control-bar${activeTab === "profiles" ? " is-directory" : " is-analytics"}`}>
        {activeTab !== "profiles" && activeTab !== "fees" ? (
        <details className="profile-report-picker">
        <summary>
          <span aria-hidden="true" className="material-symbols-outlined">
            group
          </span>
          Profiles
          <span className="profile-picker-count">
            {selectedProfileIds.length} of {profileRecords.length}
          </span>
        </summary>
        <fieldset>
          <legend>Profiles included in combined analytics</legend>
          <div className="profile-picker-actions">
            <button
              className="button-link"
              onClick={() => setSelectedProfileIds(profileRecords.map((profile) => profile.profileId))}
              type="button"
            >
              Select all
            </button>
          </div>
          <div className="profile-picker-options">
            {profileRecords.map((profile) => {
              const isSelected = selectedProfileIds.includes(profile.profileId);
              return (
                <label className={`profile-filter-chip${isSelected ? " is-selected" : ""}`} key={profile.profileId}>
                  <input
                    checked={isSelected}
                    disabled={isSelected && selectedProfileIds.length === 1}
                    onChange={() => toggleProfile(profile.profileId)}
                    type="checkbox"
                  />
                  <span>{profile.displayName}</span>
                  <small>{profile.profileCode}</small>
                </label>
              );
            })}
          </div>
        </fieldset>
        </details>
        ) : null}
        {activeTab === "profiles" ? (
          <>
        <label className="m3-picker-field">
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
        <label className="m3-picker-field">
          <span className="m3-picker-label">Directory status</span>
          <span className="m3-picker-control">
            <span aria-hidden="true" className="material-symbols-outlined">filter_alt</span>
            <select
              data-pd-id="profiles.directory.status-filter"
              value={directoryStatus}
              onChange={(event) => {
                setDirectoryStatus(event.target.value);
                setDirectoryPage(1);
              }}
            >
              <option value="all">All statuses</option>
              {[...new Set(profileRecords.map((profile) => normalizeProfileStatus(profile.status)))].map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </span>
        </label>
          </>
        ) : null}
        {activeTab === "fees" ? (
          <label className="m3-picker-field">
            <span className="m3-picker-label">Closed month</span>
            <span className="m3-picker-control">
              <span aria-hidden="true" className="material-symbols-outlined">calendar_month</span>
              <select
                aria-label="Fee centre closed month"
                data-pd-id="fees.closed-month"
                onChange={(event) => setFeeCentreMonth(event.target.value)}
                value={feeCentreMonth}
              >
                {feeCentreMonthOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </span>
          </label>
        ) : null}
        {activeTab !== "reports" && activeTab !== "fees" ? (
        <div className="compact-report-controls">
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
          <span className="eyebrow">Fund Manager control</span>
          <div className="section-heading-row">
            <h2 id="combined-analytics-title">Profiles and combined analytics</h2>
            <AccessScopeBadge />
          </div>
        </div>
      </div>

      {activeTab !== "reports" ? (
        <p className="lede">
          Shared range: {rangeLabel(resolvedRange.start, resolvedRange.end)}. Displayed earnings are pre-fee.
        </p>
      ) : null}

      {isLoading ? <LedgerLoadingIndicator label="Loading combined profile reporting" /> : null}

      {failures.filter((failure) => selectedProfileIds.includes(failure.profileId)).length > 0 ? (
        <div className="validation-message" role="alert">
          <strong>
            {failures.filter((failure) => selectedProfileIds.includes(failure.profileId)).length} profile load failed.
          </strong>{" "}
          {failures
            .filter((failure) => selectedProfileIds.includes(failure.profileId))
            .map((failure) => failure.displayName)
            .join(", ")} are excluded from totals.
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

      {!isLoading ? (
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
                <article className="stat-card">
                  <span className="eyebrow">Available to Withdraw</span>
                  <strong>{formatMoney(allTimeFeePosition.availableToWithdraw)}</strong>
                  <span>Confirmed and not yet withdrawn</span>
                </article>
                <article className="stat-card">
                  <span className="eyebrow">Waiting for Confirmation</span>
                  <strong>{feeCentreRows.filter((row) => row.result.state === "waiting_for_confirmation").length}</strong>
                  <span>Prepared reviews for the selected month</span>
                </article>
                <article className="stat-card">
                  <span className="eyebrow">Review Required</span>
                  <strong>{feeCentreRows.filter((row) => row.result.state === "review_required").length}</strong>
                  <span>Profiles not yet prepared for the selected month</span>
                </article>
                <article className="stat-card">
                  <span className="eyebrow">Fees Withdrawn</span>
                  <strong>{formatMoney(allTimeFeePosition.feesWithdrawn)}</strong>
                  <span>Audited fee cash movements</span>
                </article>
              </section>
              <section className="content-subpanel stack">
                <div className="section-heading-row">
                  <div>
                    <span className="eyebrow">Fund Manager Only</span>
                    <h3>Monthly Fee Status</h3>
                  </div>
                </div>
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
                      {feeCentreRows.map(({ profile, result }) => {
                        const canReview = result.state !== "open" && result.state !== "not_applicable";
                        const actionLabel = result.state === "review_required"
                          ? "Review Fees"
                          : result.state === "waiting_for_confirmation"
                            ? "Confirm Fees"
                            : result.state === "ready_to_withdraw" || result.state === "part_withdrawn"
                              ? "Record Withdrawal"
                              : "View Details";
                        return (
                          <tr
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
                                {feeCentreStateLabels[result.state]}
                              </span>
                            </td>
                            <td>{result.period?.state === "crystallised" ? formatMoney(result.feesEarned) : "—"}</td>
                            <td>{result.period?.state === "crystallised" ? formatMoney(result.feesWithdrawn) : "—"}</td>
                            <td>{result.period?.state === "crystallised" ? formatMoney(result.availableToWithdraw) : "—"}</td>
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
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
                  <strong>{combined.totals.openBets} / {combined.totals.overdueBets}</strong>
                  <span>Profile-scoped rows combined</span>
                </article>
                <article className="stat-card">
                  <span className="eyebrow">Current liability</span>
                  <strong>{formatMoney(combined.totals.currentLiability)}</strong>
                  <span>Open sportsbook and free-bet exposure</span>
                </article>
                <article className="stat-card">
                  <span className="eyebrow">Expiring free bets</span>
                  <strong>{combined.totals.expiringFreeBetCount}</strong>
                  <span>Available rows inside alert windows</span>
                </article>
              </section>
              <section className="content-subpanel stack">
                <h3>Profile exposure</h3>
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
                      {combined.profileRows.map((row) => (
                        <tr key={row.profileId}>
                          <td>{row.displayName}</td>
                          <td>{row.openBets}</td>
                          <td>{row.expiringFreeBetCount}</td>
                          <td>{formatMoney(row.currentLiability)}</td>
                          <td>{formatMoney(row.openCurrentValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </section>
          ) : null}

          {activeTab === "performance" ? (
          <section
            aria-labelledby="analytics-tab-performance"
            className="analytics-tab-panel"
            id="analytics-panel-performance"
            role="tabpanel"
          >
          <div className="reporting-breakdown-grid">
            <section className="content-subpanel stack">
              <h3>Category P&amp;L</h3>
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
                      <tr key={row.moduleKey}>
                        <td>{row.label}</td>
                        <td>{row.rowCount}</td>
                        <td>{formatMoney(row.reportingValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="content-subpanel stack">
              <h3>Bookmaker P&amp;L</h3>
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
                      combined.bookmakerBreakdown.slice(0, 12).map((row) => (
                        <tr key={row.bookmaker}>
                          <td>{row.bookmaker}</td>
                          <td>{formatMoney(row.totalPnl)}</td>
                          <td>{row.openRowCount}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
          </section>
          ) : null}

          {activeTab === "reports" ? (
          <section
            aria-labelledby="analytics-tab-reports"
            className="analytics-tab-panel stack"
            id="analytics-panel-reports"
            role="tabpanel"
          >
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
          <section className="content-subpanel stack">
            <div className="section-heading-row formal-report-section-heading">
              <h3>Combined balance snapshot history</h3>
              <div className="compact-report-controls formal-report-section-controls">
                <label className="m3-picker-field">
                  <span className="m3-picker-label">Snapshot range</span>
                  <span className="m3-picker-control">
                    <span aria-hidden="true" className="material-symbols-outlined">date_range</span>
                    <select
                      aria-label="Balance snapshot period range"
                      data-pd-id="formal-reports.balance-snapshots.period-range"
                      onChange={(event) => setBalanceSnapshotRange(event.target.value)}
                      value={balanceSnapshotRange}
                    >
                      <option value="all">All snapshots</option>
                      <option value="30">Last 30 days</option>
                      <option value="90">Last 3 months</option>
                      <option value="180">Last 6 months</option>
                    </select>
                  </span>
                </label>
                <label className="m3-picker-field">
                  <span className="m3-picker-label">Snapshot type</span>
                  <span className="m3-picker-control">
                    <span aria-hidden="true" className="material-symbols-outlined">filter_alt</span>
                    <select
                      aria-label="Balance snapshot type"
                      data-pd-id="formal-reports.balance-snapshots.type"
                      onChange={(event) => setBalanceSnapshotType(event.target.value)}
                      value={balanceSnapshotType}
                    >
                      <option value="all">All types</option>
                      {balanceSnapshotTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </span>
                </label>
              </div>
            </div>
            <div className="table-shell">
              <table className="profile-action-table">
                <thead>
                  <tr>
                    <th>Profile</th>
                    <th>Captured</th>
                    <th>Type</th>
                    <th>Account</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {balanceSnapshots.length === 0 ? (
                    <tr>
                      <td colSpan={5}>No balance snapshots fall inside the shared range.</td>
                    </tr>
                  ) : (
                    balanceSnapshots.map((row) => (
                      <tr key={`${row.profile_id}-${row.balance_snapshot_id}`}>
                        <td>{row.displayName}</td>
                        <td>{formatHumanDisplayDate(row.snapshot_at, true)}</td>
                        <td>{row.snapshot_type}</td>
                        <td>{row.account_id ?? "Profile total"}</td>
                        <td>{formatMoney(Number(row.balance_amount))}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
          </section>
          ) : null}
        </>
      ) : null}

      {activeTab === "profiles" && !isLoading ? (
      <section
        aria-labelledby="analytics-tab-profiles"
        className="analytics-tab-panel content-subpanel stack profile-directory"
        data-pd-id="profiles.directory.panel"
        id="analytics-panel-profiles"
        role="tabpanel"
      >
        <section className="stat-strip" aria-label="All-profile headline totals">
          <article className="stat-card">
            <span className="eyebrow">Gross P&amp;L</span>
            <strong>{formatMoney(allProfilesCombined.totals.grossBettingPnl)}</strong>
            <span>Sportsbook + Free Bets + Casino</span>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Retained profit</span>
            <strong>{formatMoney(allProfilesCombined.totals.retainedProfit)}</strong>
            <span>Gross P&amp;L after signed withdrawals and costs</span>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Cash snapshot</span>
            <strong>{formatMoney(allProfilesCombined.totals.cashSnapshot)}</strong>
            <span>Current included account balances</span>
          </article>
          <article className="stat-card" data-pd-id="profiles.fees.available-to-withdraw">
            <span className="eyebrow">Available to Withdraw</span>
            <strong>{formatMoney(allProfilesFeePosition.availableToWithdraw)}</strong>
            <span>
              {allProfilesFeePosition.crystallisedPeriodCount > 0
                ? `${formatMoney(allProfilesFeePosition.feesEarned)} earned · ${formatMoney(allProfilesFeePosition.feesWithdrawn)} withdrawn`
                : "No crystallised fee periods in this range"}
            </span>
          </article>
        </section>
        <div className="section-heading-row">
          <div>
            <span className="eyebrow">Fund Manager Directory</span>
            <h2 id="profile-directory-title">Profiles</h2>
          </div>
          <div className="tracker-nav profile-directory-heading-actions">
            <span className="profile-picker-count">{directoryProfiles.length} shown</span>
            <button
              className="modal-primary-button"
              data-pd-id="profiles.opportunity.add"
              onClick={() => setOpportunityDialogOpen(true)}
              type="button"
            >
              <span aria-hidden="true" className="material-symbols-outlined">group_add</span>
              Add Opportunity
            </button>
          </div>
        </div>
        <div className="table-shell">
          <table className="profile-action-table">
            <thead>
              <tr>
                <th scope="col"><span className="visually-hidden">Pinned</span></th>
                <th scope="col">Profile</th>
                <th scope="col">Status</th>
                <th scope="col">Tracking</th>
                <th scope="col">Gross P&amp;L</th>
                <th scope="col">Available to Withdraw</th>
                <th scope="col">Open Positions</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleDirectoryProfiles.length === 0 ? (
                <tr><td colSpan={8}>No profiles match the directory controls.</td></tr>
              ) : visibleDirectoryProfiles.map((profile) => {
                const isPinned = pinnedProfileIds.includes(profile.profileId);
                return (
                  <tr
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
                    <td><span className="badge">{normalizeProfileStatus(profile.status)}</span></td>
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
                    <td>{profile.summary ? formatMoney(profile.summary.grossBettingPnl) : "Unavailable"}</td>
                    <td>
                      <span className="table-status">
                        {formatMoney(
                          feePositionByProfile.get(profile.profileId)?.availableToWithdraw ?? 0
                        )}
                      </span>
                    </td>
                    <td>{profile.summary ? profile.summary.openBets : "Unavailable"}</td>
                    <td>
                      <div className="directory-actions" onClick={(event) => event.stopPropagation()}>
                        {profile.summary ? <OperationalActionLinks row={profile.summary} /> : "Unavailable"}
                        <span className="directory-navigation-actions">
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="directory-pagination" aria-label="Profile directory pagination">
          <button
            className="button-link"
            disabled={directoryPage === 1}
            onClick={() => setDirectoryPage((current) => Math.max(1, current - 1))}
            type="button"
          >Previous</button>
          <span>Page {Math.min(directoryPage, directoryPageCount)} of {directoryPageCount}</span>
          <button
            className="button-link"
            disabled={directoryPage >= directoryPageCount}
            onClick={() => setDirectoryPage((current) => Math.min(directoryPageCount, current + 1))}
            type="button"
          >Next</button>
        </div>
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
                <span className="eyebrow">Profile Details</span>
                <div className="profile-drawer-title-row">
                  {profileEdit?.field === "display_name" ? (
                    renderEditableProfileValue("display_name", detailProfile.displayName, "subscriber name")
                  ) : (
                    <>
                    <h2>{detailProfile.displayName}</h2>
                    <button
                      aria-label="Edit subscriber name"
                      className="profile-field-action"
                      onClick={() => { setProfileEditError(""); setProfileEdit({ field: "display_name", value: detailProfile.displayName }); }}
                      type="button"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined">edit</span>
                    </button>
                    </>
                  )}
                </div>
              </div>
              <button aria-label="Close profile details" className="dialog-close-button" onClick={() => detailDialogRef.current?.close()} type="button">
                <span aria-hidden="true" className="material-symbols-outlined">close</span>
              </button>
            </div>
            <section className="profile-drawer-section stack-tight">
              <h3>Profile Settings</h3>
              <dl className="profile-detail-list">
                <div><dt>Profile code</dt><dd>{renderEditableProfileValue("profile_code", detailProfile.profileCode, "profile code")}</dd></div>
                <div><dt>Status</dt><dd>{renderEditableProfileValue("status", detailProfile.status, "status")}</dd></div>
                <div><dt>Tracking start</dt><dd>{renderEditableProfileValue("tracking_start_date", detailProfile.trackingStartDate, "tracking start", "", formatHumanDisplayDate(detailProfile.trackingStartDate))}</dd></div>
                <div><dt>Management fee</dt><dd>{renderEditableProfileValue("management_fee_percent", detailProfile.managementFeePercent, "management fee", "%")}</dd></div>
                <div><dt>Investment fee</dt><dd>{renderEditableProfileValue("investment_fee_percent", detailProfile.investmentFeePercent, "investment fee", "%")}</dd></div>
              </dl>
            </section>
            <section className="profile-drawer-section stack-tight">
              <h3>Selected-Range Performance</h3>
              <dl className="profile-detail-list">
                <div><dt>Sportsbook</dt><dd>{detailSummary ? formatMoney(detailModuleValues.get("sportsbook") ?? 0) : "Unavailable"}</dd></div>
                <div><dt>Free Bets</dt><dd>{detailSummary ? formatMoney(detailModuleValues.get("free-bets") ?? 0) : "Unavailable"}</dd></div>
                <div><dt>Casino</dt><dd>{detailSummary ? formatMoney(detailModuleValues.get("casino") ?? 0) : "Unavailable"}</dd></div>
                <div><dt>Cash Adjustments</dt><dd>{detailSummary ? formatMoney(detailModuleValues.get("cash-adjustments") ?? 0) : "Unavailable"}</dd></div>
                <div><dt>Gross P&amp;L</dt><dd>{detailSummary ? formatMoney(detailSummary.summary.reportingModel.selectedRange.grossBettingPnl) : "Unavailable"}</dd></div>
              </dl>
            </section>
            <section className="profile-drawer-section stack-tight">
              <h3>Current Cash</h3>
              <dl className="profile-detail-list">
                <div><dt>Cash snapshot</dt><dd>{detailSummary ? formatMoney(detailSummary.summary.accountQuickView.cashSnapshot) : "Unavailable"}</dd></div>
              </dl>
            </section>
            <section className="profile-drawer-section stack-tight" data-pd-id="profiles.drawer.fee-position">
              <h3>Fee Position</h3>
              <dl className="profile-detail-list">
                <div><dt>Estimated Fees</dt><dd>{formatMoney(detailFeePosition?.estimatedFees ?? 0)}</dd></div>
                <div><dt>Fees Earned</dt><dd>{formatMoney(detailFeePosition?.feesEarned ?? 0)}</dd></div>
                <div><dt>Available to Withdraw</dt><dd>{formatMoney(detailFeePosition?.availableToWithdraw ?? 0)}</dd></div>
                <div><dt>Fees Withdrawn</dt><dd>{formatMoney(detailFeePosition?.feesWithdrawn ?? 0)}</dd></div>
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
            {profileEditError ? <div className="validation-message" role="alert">{profileEditError}</div> : null}
            <nav className="profile-drawer-icon-actions" aria-label="Profile actions">
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
