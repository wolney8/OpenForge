"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { FinancialValue } from "@/components/financial-value";
import {
  buildDashboardTargetProgress,
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
  formatMoney,
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
  const targetStyle = {
    "--dashboard-target-progress": `${targetProgress.progressPercent}%`,
  } as CSSProperties;
  const focusStyle = {
    "--dashboard-focus-progress": `${attentionScore}%`,
  } as CSSProperties;
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
  const accountHref = `/profiles/${profileId}/tracker/accounts`;
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
        <article className="dashboard-visual-card dashboard-performance-card portfolio-hero-card">
          <div className="dashboard-visual-header">
            <div>
              <span className="eyebrow">Portfolio P&amp;L</span>
              <h3>Selected Range Performance</h3>
            </div>
            <span className="badge" title={`Tracker range: ${resolvedRange.preset}`}>
              {formatResolvedDateRange(resolvedRange)}
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
          <strong className="dashboard-hero-value">
            <FinancialValue
              label="Selected range portfolio profit and loss"
              value={summary.profitQuickView.overallPnl}
            />
          </strong>
          <DashboardChartSurface
            area={dashboardSparkline.area}
            label="Selected range P&L trend"
            line={dashboardSparkline.line}
            points={dashboardTrend}
          />
          <div className="dashboard-point-rail" aria-label="Recent P&L movement points">
            {dashboardTrend.slice(-5).map((point) => (
              <span key={point.key}>
                <small>{point.label}</small>
                <FinancialValue animate={false} value={point.cumulativeValue} />
              </span>
            ))}
          </div>
        </article>

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
            <span>Settled final {formatMoney(summary.profitQuickView.settledFinalValue)}</span>
          </DashboardMetricCard>
          <DashboardMetricCard
            eyebrow="Liability"
            label="Current liability"
            moneyValue={summary.betsQuickView.currentLiability}
          >
            <span>Pending withdrawals {formatMoney(summary.accountQuickView.pendingWithdrawals)}</span>
          </DashboardMetricCard>
          <DashboardMetricCard
            eyebrow="Current Account Cash"
            label="Cash snapshot"
            moneyValue={summary.accountQuickView.cashSnapshot}
          >
            <span>Bookie {formatMoney(summary.accountQuickView.bookieBalance)}</span>
            <span>Exchange {formatMoney(summary.accountQuickView.exchangeBalance)}</span>
            <span>Bank {formatMoney(summary.accountQuickView.bankBalance)}</span>
          </DashboardMetricCard>
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
              summary.activityQuickView.cashAdjustmentCount
            }
          >
            <span>Sportsbook {summary.activityQuickView.sportsbookCount}</span>
            <span>Free bets {summary.activityQuickView.freeBetCount}</span>
            <span>Casino {summary.activityQuickView.casinoCount}</span>
          </DashboardMetricCard>
          <DashboardMetricCard
            eyebrow="Cash Movement"
            label="Range cash"
            moneyValue={summary.betsQuickView.selectedRangeCashAdjustments}
          >
            <span>Withdrawals {formatMoney(summary.cashAdjustmentBreakdown.withdrawals)}</span>
            <span>Costs {formatMoney(summary.cashAdjustmentBreakdown.deductionsAndSubscriptions)}</span>
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
      </div>

      <section className="dashboard-secondary-grid" aria-label="Portfolio supporting dashboard cards">
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
        <div className="dashboard-target-meter" style={targetStyle}>
          <span />
        </div>
        <dl className="dashboard-focus-list">
          <div>
            <dt>Current</dt>
            <dd><FinancialValue animate={false} value={targetProgress.currentValue} /></dd>
          </div>
          <div>
            <dt>Target</dt>
            <dd>{targetProgress.targetValue === null ? "Set target" : formatMoney(targetProgress.targetValue)}</dd>
          </div>
          <div>
            <dt>{targetProgress.isExceeded ? "Exceeded By" : "Remaining"}</dt>
            <dd>
              {targetProgress.remainingValue === null ? "Unset" : (
                <FinancialValue
                  animate={false}
                  value={targetProgress.isExceeded ? targetProgress.currentValue - (targetProgress.targetValue ?? 0) : targetProgress.remainingValue}
                />
              )}
            </dd>
          </div>
        </dl>
        </article>

        <article className="dashboard-visual-card" data-pd-id="dashboard.module-mix">
        <div className="dashboard-visual-header">
          <div>
            <span className="eyebrow">Module Mix</span>
            <h3>Where The Range Value Sits</h3>
          </div>
        </div>
        <div className="dashboard-module-bars">
          {summary.moduleBreakdown.map((row) => {
            const width = clampPercent((Math.abs(row.reportingValue) / moduleAbsoluteTotal) * 100);
            return (
              <div className="dashboard-module-row" key={row.moduleKey}>
                <div className="dashboard-module-row-header">
                  <span>{row.label}</span>
                  <FinancialValue animate={false} value={row.reportingValue} />
                </div>
                <div className="dashboard-module-track" aria-hidden="true">
                  <span
                    className={`dashboard-module-fill ${getModuleVisualClass(row.moduleKey)}`}
                    style={{ width: `${Math.max(4, width)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        </article>

        <article className="dashboard-visual-card dashboard-focus-card" data-pd-id="dashboard.action-load">
        <div className="dashboard-visual-header">
          <div>
            <span className="eyebrow">Operational Focus</span>
            <h3>Action Load</h3>
          </div>
        </div>
        <div className="dashboard-focus-body">
          <div
            aria-label={`${Math.round(attentionScore)} percent of tracked open attention items need action`}
            className="dashboard-focus-meter"
            role="img"
            style={focusStyle}
          >
            <strong>{Math.round(attentionScore)}%</strong>
          </div>
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
      </section>

      <section className="dashboard-tertiary-grid" aria-label="Portfolio detail dashboard cards">
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
              <FinancialValue animate={false} value={row.totalPnl} />
              <small>{row.openRowCount} open</small>
            </div>
          ))}
          {summary.bookmakerBreakdown.length === 0 ? <span className="muted-text">No bookmaker rows in range.</span> : null}
        </div>
        </article>

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
              <FinancialValue animate={false} value={row.value} />
            </div>
          ))}
          {summary.recentActivity.length === 0 ? <span className="muted-text">No activity in this range.</span> : null}
        </div>
        </article>

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
            <FinancialValue animate={false} value={summary.profitQuickView.overallPnl} />
            <i style={{ width: `${Math.max(6, currentPeerBarWidth)}%` }} />
          </div>
          <div className="dashboard-peer-row">
            <span>Open current value</span>
            <FinancialValue animate={false} value={summary.profitQuickView.openCurrentValue} />
            <i style={{ width: `${Math.max(6, openPeerBarWidth)}%` }} />
          </div>
          <div className="dashboard-peer-row dashboard-peer-row-muted">
            <span>Peer comparison</span>
            <strong>Fund Manager dashboard</strong>
            <i style={{ width: "52%" }} />
          </div>
        </div>
        <Link className="dashboard-card-action" href="/profiles">
          <span>Open aggregate comparison</span>
          <span aria-hidden="true" className="material-symbols-outlined">open_in_new</span>
        </Link>
        </article>
      </section>

      <section className="dashboard-fee-section" aria-label="Fund Manager selected range fee position">
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
              <dd><FinancialValue animate={false} value={feePosition?.feesEarned ?? 0} /></dd>
            </div>
            <div>
              <dt>Available to withdraw</dt>
              <dd><FinancialValue animate={false} value={feePosition?.availableToWithdraw ?? 0} /></dd>
            </div>
            <div>
              <dt>Withdrawn</dt>
              <dd><FinancialValue animate={false} value={feePosition?.feesWithdrawn ?? 0} /></dd>
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
      </section>
    </section>
  );
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
  value?: number;
}) {
  return (
    <article className={`dashboard-mini-card dashboard-mini-card-${badgeTone}`}>
      <div className="dashboard-mini-card-header">
        <span className="eyebrow">{eyebrow}</span>
        {badge ? <span className={`dashboard-card-badge dashboard-card-badge-${badgeTone}`}>{badge}</span> : null}
      </div>
      <strong aria-label={label}>
        {typeof moneyValue === "number" ? <FinancialValue value={moneyValue} /> : value}
      </strong>
      <div className="dashboard-mini-card-details">{children}</div>
      {actionHref && actionLabel ? (
        <Link className="dashboard-card-action" href={actionHref}>
          <span>{actionLabel}</span>
          <span aria-hidden="true" className="material-symbols-outlined">open_in_new</span>
        </Link>
      ) : null}
    </article>
  );
}

function DashboardChartSurface({
  area,
  label,
  line,
  points,
}: {
  area: string;
  label: string;
  line: string;
  points: Array<{ label: string; cumulativeValue?: number; value: number }>;
}) {
  const accessibleSummary =
    points.length === 0
      ? "No trend points available."
      : points.map((point) => `${point.label}: ${formatMoney(point.cumulativeValue ?? point.value)}`).join("; ");
  return (
    <figure className="dashboard-chart-figure">
      <svg
        aria-label={`${label}. ${accessibleSummary}`}
        className="dashboard-sparkline"
        preserveAspectRatio="none"
        role="img"
        viewBox="0 0 100 42"
      >
        <polygon className="dashboard-sparkline-area" points={area} />
        <polyline className="dashboard-sparkline-line" points={line} />
      </svg>
    </figure>
  );
}
