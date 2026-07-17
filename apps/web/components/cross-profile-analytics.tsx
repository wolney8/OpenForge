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

type ProfileDescriptor = {
  profileId: string;
  displayName: string;
  profileCode: string;
  status: string;
  trackingStartDate: string;
  managementFeePercent: string;
  investmentFeePercent: string;
};

type AnalyticsTab = "profiles" | "performance" | "exposure" | "reports";
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

function rangeLabel(start: Date, end: Date) {
  return `${formatHumanDisplayDate(start.toISOString())} to ${formatHumanDisplayDate(end.toISOString())}`;
}

function ReportTable({
  feeHeading,
  title,
  rows,
}: {
  feeHeading: "Estimated Fees" | "Fees Earned";
  title: string;
  rows: ReturnType<typeof aggregateCrossProfileReporting>["weeklyReports"];
}) {
  return (
    <section className="content-subpanel stack">
      <h3>{title}</h3>
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Period</th>
              <th>Sportsbook</th>
              <th>Free Bets</th>
              <th>Casino</th>
              <th>Total P&amp;L</th>
              <th>Withdrawals</th>
              <th>Costs</th>
              <th>Retained profit</th>
              <th>{feeHeading}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9}>No formal report periods are available.</td>
              </tr>
            ) : (
              rows.slice(0, 12).map((row) => (
                <tr key={row.periodKey}>
                  <td>{row.periodLabel}</td>
                  <td>{formatMoney(row.sportsbookPnl)}</td>
                  <td>{formatMoney(row.freeBetPnl)}</td>
                  <td>{formatMoney(row.casinoPnl)}</td>
                  <td>{formatMoney(row.totalPnl)}</td>
                  <td>{formatMoney(row.withdrawals)}</td>
                  <td>{formatMoney(row.costs)}</td>
                  <td>{formatMoney(row.retainedProfit)}</td>
                  <td><span className="table-status">Not Yet Calculated</span></td>
                </tr>
              ))
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

export function CrossProfileAnalytics({ profiles }: CrossProfileAnalyticsProps) {
  const [profileRecords, setProfileRecords] = useState(profiles);
  const [preset, setPreset] = useState<DatePreset>("Week (Mon-Sun)");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedProfileIds, setSelectedProfileIds] = useState(() =>
    profiles.map((profile) => profile.profileId)
  );
  const [datasets, setDatasets] = useState<Map<string, TrackerSummaryDataset>>(new Map());
  const [failures, setFailures] = useState<ProfileLoadFailure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("profiles");
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [directoryStatus, setDirectoryStatus] = useState("all");
  const [directoryPage, setDirectoryPage] = useState(1);
  const [pinnedProfileIds, setPinnedProfileIds] = useState<string[]>([]);
  const [detailProfileId, setDetailProfileId] = useState<string | null>(null);
  const [profileEdit, setProfileEdit] = useState<{
    field: EditableProfileField;
    value: string;
  } | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileEditError, setProfileEditError] = useState("");
  const [drawerNavigationLabel, setDrawerNavigationLabel] = useState("");
  const detailDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    void Promise.allSettled(
      profiles.map(async (profile) => ({
        profile,
        dataset: await loadProfileDataset(profile.profileId, controller.signal),
      }))
    ).then((results) => {
      if (controller.signal.aborted) {
        return;
      }

      const nextDatasets = new Map<string, TrackerSummaryDataset>();
      const nextFailures: ProfileLoadFailure[] = [];
      results.forEach((result, index) => {
        const profile = profiles[index];
        if (result.status === "fulfilled") {
          nextDatasets.set(profile.profileId, result.value.dataset);
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

  const combined = useMemo(
    () =>
      aggregateCrossProfileReporting(
        allProfileSummaries.filter((profile) => selectedProfileIds.includes(profile.profileId))
      ),
    [allProfileSummaries, selectedProfileIds]
  );

  const allProfilesCombined = useMemo(
    () => aggregateCrossProfileReporting(allProfileSummaries),
    [allProfileSummaries]
  );

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
  const detailModuleValues = new Map(
    detailSummary?.summary.moduleBreakdown.map((row) => [row.moduleKey, row.reportingValue]) ?? []
  );

  const balanceSnapshots = useMemo(
    () =>
      profileRecords
        .filter((profile) => selectedProfileIds.includes(profile.profileId))
        .flatMap((profile) =>
          (datasets.get(profile.profileId)?.balanceSnapshots ?? []).map((snapshot) => ({
            ...snapshot,
            displayName: profile.displayName,
          }))
        )
        .filter((snapshot) => {
          const timestamp = Date.parse(snapshot.snapshot_at);
          return (
            Number.isFinite(timestamp) &&
            timestamp >= resolvedRange.start.getTime() &&
            timestamp <= resolvedRange.end.getTime()
          );
        })
        .sort((left, right) => right.snapshot_at.localeCompare(left.snapshot_at))
        .slice(0, 20),
    [datasets, profileRecords, resolvedRange.end, resolvedRange.start, selectedProfileIds]
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
        {activeTab !== "profiles" ? (
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

      <p className="lede">
        Shared range: {rangeLabel(resolvedRange.start, resolvedRange.end)}. Displayed earnings are pre-fee.
      </p>

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
          <ReportTable feeHeading="Estimated Fees" title="Combined Weekly Reports" rows={combined.weeklyReports} />
          <ReportTable feeHeading="Fees Earned" title="Combined Monthly Reports" rows={combined.monthlyReports} />
          <ReportTable feeHeading="Fees Earned" title="Combined Yearly Reports" rows={combined.yearlyReports} />
          <section className="content-subpanel stack">
            <h3>Combined balance snapshot history</h3>
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
            <strong>Not Yet Calculated</strong>
            <span>M10 monthly fee-period engine pending</span>
          </article>
        </section>
        <div className="section-heading-row">
          <div>
            <span className="eyebrow">Fund Manager Directory</span>
            <h2 id="profile-directory-title">Profiles</h2>
          </div>
          <span className="profile-picker-count">{directoryProfiles.length} shown</span>
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
                    onClick={() => openProfileDetails(profile.profileId)}
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
                    <td><span className="table-status">Not Yet Calculated</span></td>
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
                <div><dt>Estimated Fees</dt><dd>Not Yet Calculated</dd></div>
                <div><dt>Fees Earned</dt><dd>Not Yet Calculated</dd></div>
                <div><dt>Available to Withdraw</dt><dd>Not Yet Calculated</dd></div>
                <div><dt>Fees Withdrawn</dt><dd>Not Yet Calculated</dd></div>
              </dl>
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
    </section>
  );
}
