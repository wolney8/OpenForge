"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { ReportPointChart } from "@/components/report-point-chart";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { FinancialValue, FinancialValueReplayGroup } from "@/components/financial-value";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { BettingPnlReadValue } from "@/components/betting-pnl-read-value";
import { CurrentAccountCash, currentAccountCashIssueCount } from "@/components/current-account-cash";
import { ReplayableProgressFill, ReplayableProgressRing } from "@/components/replayable-progress";
import {
  buildDashboardTargetProgress,
  buildDashboardDrilldownRows,
  buildDashboardTrend,
  buildDashboardTrendFromDataset,
  buildSparklinePoints,
  getDashboardShortcutForPreset,
  mapDashboardShortcutToPreset,
  normalizeDashboardDisplayMode,
  type DashboardTrendPoint,
  type DashboardPeriodShortcut,
  type DashboardTargetSettings,
} from "@/lib/dashboard-analytics";
import {
  formatHumanDisplayDate,
  formatResolvedDateRange,
  type DatePreset,
  type ResolvedDateRange,
  type TrackerSummaryDataset,
  type TrackerSummaryResult,
} from "@/lib/tracker-summary";
import type { FeePositionSummary } from "@/lib/fee-period-summary";

type PortfolioDashboardViewProps = {
  activePreset: DatePreset;
  dataset?: TrackerSummaryDataset;
  isRangeSaving: boolean;
  onPresetChange: (preset: DatePreset) => void;
  profileId: string;
  rangeError?: string;
  requestedRange: ResolvedDateRange;
  resolvedRange: ResolvedDateRange;
  settings: DashboardTargetSettings & {
    dashboard_view_mode?: string | null;
  };
  summary: TrackerSummaryResult;
  feePosition?: FeePositionSummary | null;
};

const periodShortcuts: DashboardPeriodShortcut[] = ["1D", "1W", "1M", "1Y", "ALL"];

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function getModuleVisualClass(moduleKey: string) {
  switch (moduleKey) {
    case "sportsbook":
      return "dashboard-module-sportsbook";
    case "free-bets":
      return "dashboard-module-free-bets";
    case "casino":
      return "dashboard-module-casino";
    case "each-way-extra-places":
      return "dashboard-module-sportsbook";
    case "cash-adjustments":
      return "dashboard-module-cash-adjustments";
    default:
      return "";
  }
}

export function PortfolioDashboardView({
  activePreset,
  dataset,
  isRangeSaving,
  onPresetChange,
  profileId,
  rangeError,
  requestedRange,
  resolvedRange,
  settings,
  summary,
  feePosition,
}: PortfolioDashboardViewProps) {
  const displayMode = normalizeDashboardDisplayMode(settings.dashboard_view_mode);
  const activeShortcut = getDashboardShortcutForPreset(activePreset);
  const dashboardTrend: DashboardTrendPoint[] = dataset
    ? buildDashboardTrendFromDataset({ dataset, range: resolvedRange, summary })
    : buildDashboardTrend(summary).map((point, index) => ({
        key: `${point.label}-${index}`,
        label: point.label,
        value: point.value,
        cumulativeValue: point.value,
      }));
  const dashboardSparkline = buildSparklinePoints(
    dashboardTrend.map((point) => ({ value: point.cumulativeValue }))
  );
  const moduleAbsoluteTotal = Math.max(
    1,
    summary.moduleBreakdown.reduce((total, row) => total + Math.abs(row.reportingValue), 0)
  );
  const targetProgress = buildDashboardTargetProgress({
    range: resolvedRange,
    settings,
    summary,
  });
  const attentionScore = clampPercent(
    ((summary.betsQuickView.overdueBets +
      summary.betsQuickView.expiringFreeBetCount +
      summary.betsQuickView.partLaidBets) /
      Math.max(
        1,
        summary.betsQuickView.openBets +
          summary.betsQuickView.expiringFreeBetCount +
          summary.betsQuickView.partLaidBets
      )) *
      100
  );
  const openUnflaggedBets = Math.max(
    0,
    summary.betsQuickView.openBets -
      summary.betsQuickView.overdueBets -
      summary.betsQuickView.partLaidBets
  );
  const openPositionDetails = [
    { label: "Overdue", value: summary.betsQuickView.overdueBets },
    { label: "Part laid", value: summary.betsQuickView.partLaidBets },
    { label: "Due later", value: openUnflaggedBets },
  ];
  const totalActionLoad =
    summary.betsQuickView.overdueBets +
    summary.betsQuickView.expiringFreeBetCount +
    summary.betsQuickView.partLaidBets +
    summary.betsQuickView.accountsNeedingMugReview;
  const operationalAlertDetails = [
    { label: "Overdue rows", value: summary.betsQuickView.overdueBets },
    { label: "Part laid", value: summary.betsQuickView.partLaidBets },
    { label: "Expiring free bets", value: summary.betsQuickView.expiringFreeBetCount },
    { label: "Mug reviews", value: summary.betsQuickView.accountsNeedingMugReview },
  ];
  const overdueHref = `/profiles/${profileId}/tracker/sportsbook-bets?view=issues&issue=all-issues&source=dashboard`;
  const freeBetHref = `/profiles/${profileId}/tracker/free-bets?view=issues&issue=all-issues&source=dashboard`;
  const accountHref = `/profiles/${profileId}/tracker/accounts?view=issues&issue=needs-attention&source=dashboard`;
  const alertHref =
    summary.betsQuickView.overdueBets > 0 || summary.betsQuickView.partLaidBets > 0
      ? overdueHref
      : summary.betsQuickView.expiringFreeBetCount > 0
        ? freeBetHref
        : summary.betsQuickView.accountsNeedingMugReview > 0
          ? accountHref
          : undefined;
  const currentPeerBarWidth = clampPercent(
    Math.abs(summary.profitQuickView.overallPnl) /
      Math.max(1, Math.abs(summary.profitQuickView.overallPnl) + Math.abs(summary.profitQuickView.openCurrentValue)) *
      100
  );
  const bettingActivityCount =
    summary.activityQuickView.sportsbookCount + summary.activityQuickView.freeBetCount +
    summary.activityQuickView.casinoCount + summary.activityQuickView.eachWayExtraPlaceCount;
  const performanceAvailable = Number.isFinite(summary.profitQuickView.overallPnl);
  const showPerformanceChart = bettingActivityCount > 0 && performanceAvailable;
  const pnlReadinessIssues = (summary.financialReadinessIssues ?? []).filter((issue) => issue.kind === "pnl");
  const liabilityReadinessIssues = (summary.financialReadinessIssues ?? []).filter((issue) => issue.kind === "liability");
  const accountCashIssueCount = currentAccountCashIssueCount(summary.accountQuickView);
  const openPeerBarWidth = clampPercent(
    Math.abs(summary.profitQuickView.openCurrentValue) /
      Math.max(1, Math.abs(summary.profitQuickView.overallPnl) + Math.abs(summary.profitQuickView.openCurrentValue)) *
      100
  );

  return (
    <section
      aria-label="Portfolio dashboard"
      className={`portfolio-dashboard-view portfolio-dashboard-${displayMode.toLowerCase().replace(/\s+/g, "-")}`}
      data-pd-id="dashboard.portfolio-view"
    >
      <div className="dashboard-primary-row">
        <FinancialValueReplayGroup>
        <article
          aria-busy={isRangeSaving}
          className={`dashboard-visual-card dashboard-performance-card portfolio-hero-card ${
            showPerformanceChart ? "has-chart" : "is-compact-state"
          }`}
          data-performance-state={showPerformanceChart ? "chart" : performanceAvailable ? "no-activity" : "unavailable"}
          data-pd-id="dashboard.selected-range-performance"
        >
          <div className="dashboard-visual-header">
            <div>
              <span className="eyebrow">Portfolio P&amp;L</span>
              <h3>Selected Range Performance</h3>
            </div>
            <span
              className="badge"
              title={`Tracker range: ${requestedRange.preset}`}
            >
              {formatResolvedDateRange(requestedRange)}
            </span>
          </div>
          <div className="dashboard-period-control" aria-label="Dashboard range shortcuts">
            {periodShortcuts.map((shortcut) => {
              const nextPreset = mapDashboardShortcutToPreset(shortcut);
              return (
                <button
                  aria-label={`Dashboard range shortcut ${shortcut}`}
                  className={`dashboard-period-pill ${activeShortcut === shortcut ? "is-active" : ""}`}
                  data-pd-id={`dashboard.period.${shortcut.toLowerCase()}`}
                  disabled={isRangeSaving}
                  key={shortcut}
                  onClick={() => onPresetChange(nextPreset)}
                  type="button"
                >
                  {shortcut}
                </button>
              );
            })}
          </div>
          <div className="dashboard-performance-data">
            <div
              aria-hidden={isRangeSaving ? true : undefined}
              className={`dashboard-performance-content ${
                isRangeSaving ? "is-range-pending" : ""
              }`}
              inert={isRangeSaving ? true : undefined}
            >
              <strong className={`dashboard-hero-value ${showPerformanceChart ? "" : "is-compact"}`}>
                <BettingPnlReadValue state="ready" activityCount={bettingActivityCount} value={summary.profitQuickView.overallPnl} />
              </strong>
              {showPerformanceChart ? <DashboardChartSurface
                area={dashboardSparkline.area}
                label="Selected range P&L trend"
                line={dashboardSparkline.line}
                points={dashboardTrend}
                dataset={dataset}
                profileId={profileId}
                range={resolvedRange}
              /> : !performanceAvailable ? <FinancialReadinessIssues issues={pnlReadinessIssues} profileId={profileId} /> : null}
            </div>
            {isRangeSaving ? (
              <LedgerLoadingIndicator
                dataPdId="dashboard.selected-range-loading"
                label={`Updating ${formatResolvedDateRange(requestedRange)} performance`}
              />
            ) : null}
          </div>
          {rangeError ? (
            <p
              className="error-text dashboard-range-error"
              data-pd-id="dashboard.selected-range-error"
              role="alert"
            >
              {rangeError}
            </p>
          ) : null}
        </article>
        </FinancialValueReplayGroup>

        <section className="dashboard-health-grid" aria-label="Profile operational dashboard cards">
          <DashboardMetricCard
            actionHref={summary.betsQuickView.overdueBets > 0 ? overdueHref : undefined}
            actionLabel="Open overdue tracker rows"
            badge={summary.betsQuickView.overdueBets > 0 ? "Action needed" : "Current"}
            badgeTone={summary.betsQuickView.overdueBets > 0 ? "danger" : "neutral"}
            eyebrow="Open Positions"
            label="Open rows"
            value={summary.betsQuickView.openBets}
          >
            {openPositionDetails.map((detail) => (
              <span key={detail.label}>{detail.label} {detail.value}</span>
            ))}
          </DashboardMetricCard>
          <DashboardMetricCard
            eyebrow="Open Current Value"
            label="Current open"
            moneyValue={summary.profitQuickView.openCurrentValue}
          >
            <span>Settled final <FinancialValue value={summary.profitQuickView.settledFinalValue} /></span>
          </DashboardMetricCard>
          <DashboardMetricCard
            actionHref={liabilityReadinessIssues[0] ? `/profiles/${profileId}/tracker/${liabilityReadinessIssues[0].module}?search=${encodeURIComponent(liabilityReadinessIssues[0].recordId)}&source=liability-readiness` : undefined}
            actionLabel={liabilityReadinessIssues.length ? `Review ${liabilityReadinessIssues.length} affected ${liabilityReadinessIssues.length === 1 ? "record" : "records"}` : undefined}
            eyebrow="Liability"
            label="Current liability"
            moneyValue={summary.betsQuickView.currentLiability}
          >
            <span>Pending withdrawals <FinancialValue value={summary.accountQuickView.pendingWithdrawals} /></span>
          </DashboardMetricCard>
          <DashboardMetricCard
            actionHref={accountCashIssueCount ? accountHref : undefined}
            actionLabel={accountCashIssueCount ? "Review affected Accounts" : undefined}
            eyebrow="Current Account Cash"
            label="Cash snapshot"
            primary={<CurrentAccountCash cash={summary.accountQuickView} />}
          />
        </section>
      </div>

      <section className="dashboard-health-grid dashboard-health-grid-secondary" aria-label="Additional Profile operational dashboard cards">
          <DashboardMetricCard
            actionHref={alertHref}
            actionLabel="Open action-required tracker rows"
            badge={totalActionLoad > 0 ? "Action needed" : undefined}
            badgeTone={totalActionLoad > 0 ? "warning" : "neutral"}
            eyebrow="Operational Alerts"
            label="Alerts"
            value={totalActionLoad}
          >
            {operationalAlertDetails.map((detail) => (
              <span key={detail.label}>{detail.label} {detail.value}</span>
            ))}
          </DashboardMetricCard>
          <DashboardMetricCard
            eyebrow="Selected Range Activity"
            label="Rows"
            value={
              summary.activityQuickView.sportsbookCount +
              summary.activityQuickView.freeBetCount +
              summary.activityQuickView.casinoCount +
              summary.activityQuickView.eachWayExtraPlaceCount +
              summary.activityQuickView.cashAdjustmentCount
            }
          >
            <span>Sportsbook {summary.activityQuickView.sportsbookCount}</span>
            <span>Free bets {summary.activityQuickView.freeBetCount}</span>
            <span>Casino {summary.activityQuickView.casinoCount}</span>
            <span>Each way {summary.activityQuickView.eachWayExtraPlaceCount}</span>
          </DashboardMetricCard>
          <DashboardMetricCard
            eyebrow="Cash Movement"
            label="Range cash"
            moneyValue={summary.betsQuickView.selectedRangeCashAdjustments}
          >
            <span>Withdrawals <FinancialValue value={summary.cashAdjustmentBreakdown.withdrawals} /></span>
            <span>Costs <FinancialValue value={summary.cashAdjustmentBreakdown.deductionsAndSubscriptions} /></span>
          </DashboardMetricCard>
          <DashboardMetricCard
            actionHref={summary.betsQuickView.accountsNeedingMugReview > 0 ? accountHref : undefined}
            actionLabel="Open account health"
            eyebrow="Account Health"
            label="Mug review"
            value={summary.betsQuickView.accountsNeedingMugReview}
          >
            <span>Place mug bet {summary.accountHealthQuickView.placeMugBetCount}</span>
            <span>No action {summary.accountHealthQuickView.noActionCount}</span>
          </DashboardMetricCard>
        </section>

      <section className="dashboard-secondary-grid" aria-label="Portfolio supporting dashboard cards">
        <FinancialValueReplayGroup>
        <article className="dashboard-visual-card dashboard-target-card" data-pd-id="dashboard.target-progress">
        <div className="dashboard-visual-header">
          <div>
            <span className="eyebrow">Target Progress</span>
            <h3>{targetProgress.label}</h3>
          </div>
          <span className="badge" title="Targets are profile settings now; M12 can later recommend target changes.">
            {displayMode}
          </span>
        </div>
        <div className="dashboard-target-meter">
          <ReplayableProgressFill minimum="0.65rem" value={targetProgress.progressPercent} />
        </div>
        <dl className="dashboard-focus-list">
          <div>
            <dt>Current</dt>
            <dd><FinancialValue value={targetProgress.currentValue} /></dd>
          </div>
          <div>
            <dt>Target</dt>
            <dd>{targetProgress.targetValue === null ? "Set target" : <FinancialValue value={targetProgress.targetValue} />}</dd>
          </div>
          <div>
            <dt>{targetProgress.isExceeded ? "Exceeded By" : "Remaining"}</dt>
            <dd>
              {targetProgress.remainingValue === null ? "Unset" : (
                <FinancialValue
                  value={targetProgress.isExceeded ? targetProgress.currentValue - (targetProgress.targetValue ?? 0) : targetProgress.remainingValue}
                />
              )}
            </dd>
          </div>
        </dl>
        </article>
        </FinancialValueReplayGroup>

        <FinancialValueReplayGroup>
        <article className="dashboard-visual-card" data-pd-id="dashboard.module-mix">
        <div className="dashboard-visual-header">
          <div>
            <span className="eyebrow">Module Mix</span>
            <h3>Where The Range Value Sits</h3>
          </div>
        </div>
        <div className="dashboard-module-bars">
          {summary.moduleBreakdown.map((row, index) => {
            const width = clampPercent((Math.abs(row.reportingValue) / moduleAbsoluteTotal) * 100);
            return (
              <div className="dashboard-module-row" key={row.moduleKey}>
                <div className="dashboard-module-row-header">
                  <span>{row.label}</span>
                  <FinancialValue value={row.reportingValue} />
                </div>
                <div className="dashboard-module-track" aria-hidden="true">
                  <ReplayableProgressFill
                    className={`dashboard-module-fill ${getModuleVisualClass(row.moduleKey)}`}
                    minimum="0.55rem"
                    staggerIndex={index}
                    value={Math.max(4, width)}
                  />
                </div>
              </div>
            );
          })}
        </div>
        </article>
        </FinancialValueReplayGroup>

        <FinancialValueReplayGroup>
        <article className="dashboard-visual-card dashboard-focus-card" data-pd-id="dashboard.action-load">
        <div className="dashboard-visual-header">
          <div>
            <span className="eyebrow">Operational Focus</span>
            <h3>Action Load</h3>
          </div>
        </div>
        <div className="dashboard-focus-body">
          <ReplayableProgressRing
            className="dashboard-focus-meter"
            label={`${Math.round(attentionScore)} percent of tracked open attention items need action`}
            value={attentionScore}
          >
            <strong>{Math.round(attentionScore)}%</strong>
          </ReplayableProgressRing>
          <dl className="dashboard-focus-list">
            <div>
              <dt>Open</dt>
              <dd>{summary.betsQuickView.openBets}</dd>
            </div>
            <div>
              <dt>Overdue</dt>
              <dd>{summary.betsQuickView.overdueBets}</dd>
            </div>
            <div>
              <dt>Expiring</dt>
              <dd>{summary.betsQuickView.expiringFreeBetCount}</dd>
            </div>
          </dl>
        </div>
        </article>
        </FinancialValueReplayGroup>
      </section>

      <section className="dashboard-tertiary-grid" aria-label="Portfolio detail dashboard cards">
        <FinancialValueReplayGroup>
        <article className="dashboard-visual-card dashboard-bookmaker-card" data-pd-id="dashboard.bookmaker-breakdown">
        <div className="dashboard-visual-header">
          <div>
            <span className="eyebrow">Bookmaker Breakdown</span>
            <h3>Selected-Range P&amp;L</h3>
          </div>
        </div>
        <div className="dashboard-bookmaker-list">
          <div className="dashboard-bookmaker-row dashboard-bookmaker-row-heading" aria-hidden="true">
            <span>Bookmaker</span>
            <span>Range P&amp;L</span>
            <span>Open</span>
          </div>
          {summary.bookmakerBreakdown.slice(0, 6).map((row) => (
            <div className="dashboard-bookmaker-row" key={row.bookmaker}>
              <span>{row.bookmaker}</span>
              <FinancialValue value={row.totalPnl} />
              <small>{row.openRowCount} open</small>
            </div>
          ))}
          {summary.bookmakerBreakdown.length === 0 ? <span className="muted-text">No bookmaker rows in range.</span> : null}
        </div>
        </article>
        </FinancialValueReplayGroup>

        <FinancialValueReplayGroup>
        <article className="dashboard-visual-card" data-pd-id="dashboard.recent-activity">
        <div className="dashboard-visual-header">
          <div>
            <span className="eyebrow">Recent In Range</span>
          </div>
        </div>
        <div className="dashboard-activity-list">
          {summary.recentActivity.slice(0, 5).map((row) => (
            <div className="dashboard-activity-row" key={`${row.module}-${row.id}`}>
              <span>
                <strong>{row.label}</strong>
                <small>{row.bookmakerOrAccount} • {formatHumanDisplayDate(row.date, true)}</small>
              </span>
              <FinancialValue value={row.value} />
            </div>
          ))}
          {summary.recentActivity.length === 0 ? <span className="muted-text">No activity in this range.</span> : null}
        </div>
        </article>
        </FinancialValueReplayGroup>

        <FinancialValueReplayGroup>
        <article className="dashboard-visual-card" data-pd-id="dashboard.peer-comparison">
        <div className="dashboard-visual-header">
          <div>
            <span className="eyebrow">Internal Peer Comparison</span>
            <h3>Profile vs Fund Manager View</h3>
          </div>
        </div>
        <div className="dashboard-peer-bars" aria-label="Internal peer comparison status">
          <div className="dashboard-peer-row">
            <span>Selected range P&amp;L</span>
            <FinancialValue value={summary.profitQuickView.overallPnl} />
            <ReplayableProgressFill className="dashboard-peer-progress" minimum="0.65rem" value={Math.max(6, currentPeerBarWidth)} />
          </div>
          <div className="dashboard-peer-row">
            <span>Open current value</span>
            <FinancialValue value={summary.profitQuickView.openCurrentValue} />
            <ReplayableProgressFill className="dashboard-peer-progress" minimum="0.65rem" staggerIndex={1} value={Math.max(6, openPeerBarWidth)} />
          </div>
          <div className="dashboard-peer-row dashboard-peer-row-muted">
            <span>Peer comparison</span>
            <strong>Fund Manager dashboard</strong>
            <ReplayableProgressFill className="dashboard-peer-progress" minimum="0.65rem" staggerIndex={2} value={52} />
          </div>
        </div>
        <Link className="dashboard-card-action" href="/profiles">
          <span>Open aggregate comparison</span>
          <span aria-hidden="true" className="material-symbols-outlined">open_in_new</span>
        </Link>
        </article>
        </FinancialValueReplayGroup>
      </section>

      <section className="dashboard-fee-section" aria-label="Fund Manager selected range fee position">
        <FinancialValueReplayGroup>
        <article className="dashboard-visual-card dashboard-fee-card" data-pd-id="dashboard.fund-manager-fees">
          <div className="dashboard-visual-header">
            <div>
              <span className="eyebrow">Fund Manager Fees</span>
              <h3>Selected Range Fee Position</h3>
            </div>
            <span className="badge" title="Monthly fee reviews remain the authoritative withdrawal process.">
              M10 fee centre
            </span>
          </div>
          <dl className="dashboard-fee-grid">
            <div>
              <dt>Fees earned</dt>
              <dd><FinancialValue value={feePosition?.feesEarned ?? 0} /></dd>
            </div>
            <div>
              <dt>Available to withdraw</dt>
              <dd><FinancialValue value={feePosition?.availableToWithdraw ?? 0} /></dd>
            </div>
            <div>
              <dt>Withdrawn</dt>
              <dd><FinancialValue value={feePosition?.feesWithdrawn ?? 0} /></dd>
            </div>
            <div>
              <dt>Awaiting review</dt>
              <dd>{feePosition?.readyPeriodCount ?? 0}</dd>
            </div>
          </dl>
          <small className="muted-text">
            Informational here; review and withdrawal actions stay in the Fund Manager Fees tab.
          </small>
        </article>
        </FinancialValueReplayGroup>
      </section>
    </section>
  );
}

function FinancialReadinessIssues({
  issues,
  profileId,
}: {
  issues: NonNullable<TrackerSummaryResult["financialReadinessIssues"]>;
  profileId: string;
}) {
  if (!issues.length) {
    return <p className="dashboard-readiness-reason">Required betting values are unavailable, but no record-level evidence was returned.</p>;
  }
  return <details className="dashboard-readiness-issues">
    <summary>Review {issues.length} affected {issues.length === 1 ? "record" : "records"}</summary>
    <ul>
      {issues.map((issue) => <li key={`${issue.kind}-${issue.module}-${issue.recordId}`}>
        <Link href={`/profiles/${profileId}/tracker/${issue.module}?search=${encodeURIComponent(issue.recordId)}&source=financial-readiness`}>
          <strong>{issue.recordId}</strong>
          <span>{issue.field} · {issue.reason}</span>
        </Link>
      </li>)}
    </ul>
  </details>;
}

function DashboardMetricCard({
  actionHref,
  actionLabel,
  badge,
  badgeTone = "neutral",
  children,
  eyebrow,
  label,
  moneyValue,
  primary,
  value,
}: {
  actionHref?: string;
  actionLabel?: string;
  badge?: string;
  badgeTone?: "neutral" | "warning" | "danger";
  children?: ReactNode;
  eyebrow: string;
  label: string;
  moneyValue?: number;
  primary?: ReactNode;
  value?: number;
}) {
  return (
    <FinancialValueReplayGroup>
    <article
      className={`dashboard-mini-card dashboard-mini-card-${badgeTone}`}
      data-pd-id={`dashboard.metric.${eyebrow.toLowerCase().replaceAll(" ", "-")}`}
    >
      <div className="dashboard-mini-card-header">
        <span className="eyebrow">{eyebrow}</span>
        {badge ? <span className={`dashboard-card-badge dashboard-card-badge-${badgeTone}`}>{badge}</span> : null}
      </div>
      {primary ?? <strong aria-label={label}>
        {typeof moneyValue === "number" ? <FinancialValue value={moneyValue} /> : value}
      </strong>}
      <div className="dashboard-mini-card-details">{children}</div>
      {actionHref && actionLabel ? (
        <Link className="dashboard-card-action" href={actionHref}>
          <span>{actionLabel}</span>
          <span aria-hidden="true" className="material-symbols-outlined">open_in_new</span>
        </Link>
      ) : null}
    </article>
    </FinancialValueReplayGroup>
  );
}

function DashboardChartSurface({
  area,
  label,
  line,
  points,
  dataset,
  profileId,
  range,
}: {
  area: string;
  label: string;
  line: string;
  points: DashboardTrendPoint[];
  dataset?: TrackerSummaryDataset;
  profileId: string;
  range: ResolvedDateRange;
}) {
  const [selectedPointIndex, setSelectedPointIndex] = useState(Math.max(0, points.length - 1));
  const [openPointIndex, setOpenPointIndex] = useState<number | null>(null);
  const [showAllPointRows, setShowAllPointRows] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ left: 16, top: 16, above: false });
  const popoverRef = useRef<HTMLElement>(null);
  const pointTriggerRef = useRef<HTMLElement | SVGElement | null>(null);
  const pointIdentityRef = useRef(points.map((point) => point.key).join("|"));
  const index = points[selectedPointIndex] ? selectedPointIndex : points.length - 1;
  const openPoint = openPointIndex === null ? undefined : points[openPointIndex];
  const drilldownRows = dataset && openPoint
    ? buildDashboardDrilldownRows({ dataset, pointKey: openPoint.key, range }) : [];
  const storeOpenPoint = useCallback((pointKey: string | null) => {
    const url = new URL(window.location.href);
    if (pointKey) url.searchParams.set("reportPoint", pointKey);
    else url.searchParams.delete("reportPoint");
    window.history.replaceState(window.history.state, "", url);
  }, []);
  const dismissPointRows = useCallback((restoreFocus: boolean) => {
    storeOpenPoint(null);
    setOpenPointIndex(null);
    setShowAllPointRows(false);
    if (restoreFocus) requestAnimationFrame(() => pointTriggerRef.current?.focus());
  }, [storeOpenPoint]);
  useEffect(() => {
    const pointKey = new URL(window.location.href).searchParams.get("reportPoint");
    if (!pointKey) return;
    const nextIndex = points.findIndex((point) => point.key === pointKey);
    if (nextIndex < 0) return;
    const frame = requestAnimationFrame(() => {
      setSelectedPointIndex(nextIndex);
      setOpenPointIndex(nextIndex);
    });
    return () => cancelAnimationFrame(frame);
  }, [points]);
  useEffect(() => {
    const identity = points.map((point) => point.key).join("|");
    if (pointIdentityRef.current === identity) return;
    pointIdentityRef.current = identity;
    const frame = requestAnimationFrame(() => {
      setSelectedPointIndex(Math.max(0, points.length - 1));
      setOpenPointIndex(null);
      setShowAllPointRows(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [points]);
  useEffect(() => {
    if (openPointIndex === null) return;
    const position = () => {
      const bounds = pointTriggerRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const width = Math.min(448, window.innerWidth - 32);
      const above = bounds.top >= 340;
      setPopoverPosition({
        left: Math.max(16, Math.min(window.innerWidth - width - 16, bounds.left + bounds.width / 2 - width / 2)),
        top: above ? bounds.top - 12 : Math.min(window.innerHeight - 320, bounds.bottom + 12),
        above,
      });
    };
    position();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismissPointRows(true);
      }
    };
    const outside = (event: PointerEvent) => {
      if (!popoverRef.current?.contains(event.target as Node)) {
        dismissPointRows(false);
      }
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    popoverRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [dismissPointRows, openPointIndex]);
  return <><ReportPointChart area={area} line={line} label={label} points={points}
    selectedIndex={index} onSelect={setSelectedPointIndex} onActivate={(nextIndex, trigger) => {
      pointTriggerRef.current = trigger;
      storeOpenPoint(points[nextIndex]?.key ?? null);
      setSelectedPointIndex(nextIndex);
      setOpenPointIndex(nextIndex);
      setShowAllPointRows(false);
    }} />
    {openPoint && typeof document !== "undefined" ? createPortal(<section
      aria-label={`Records for ${openPoint.label}`}
      className="dashboard-chart-drilldown"
      data-pd-id="dashboard.chart.drilldown"
      ref={popoverRef}
      style={{
        left: popoverPosition.left,
        top: popoverPosition.top,
        transform: popoverPosition.above ? "translateY(-100%)" : "none",
      }}
      tabIndex={-1}
    >
      <div className="section-heading-row"><div><span className="eyebrow">Selected period</span><h4>{openPoint.label}</h4></div><button aria-label="Close point records" className="icon-button icon-button-danger" onClick={() => dismissPointRows(true)} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button></div>
      {drilldownRows.length ? <><ul>{drilldownRows.slice(0, showAllPointRows ? drilldownRows.length : 3).map((row) => <li key={`${row.module}-${row.id}`}><Link href={`/profiles/${profileId}/tracker/${row.module}?search=${encodeURIComponent(row.id)}&source=report-point`}><span>{row.label}</span><FinancialValue animate={false} value={row.value} /></Link></li>)}</ul>{drilldownRows.length > 3 && !showAllPointRows ? <button className="button-link" onClick={() => setShowAllPointRows(true)} type="button">View all {drilldownRows.length} records</button> : null}</> : <p className="muted-text">No underlying records in this point.</p>}
    </section>, document.body) : null}
  </>;
}
