"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiBaseUrl } from "@/lib/api";
import { AccessScopeBadge } from "@/components/access-scope-badge";
import {
  BookmakerIdentity,
  catalogueIdForBookmaker,
  useBookmakerCatalogue,
} from "@/components/bookmaker-identity";
import { FinancialValue } from "@/components/financial-value";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { PortfolioDashboardView } from "@/components/portfolio-dashboard-view";
import { TrackerRangeCard } from "@/components/tracker-range-card";
import {
  readCachedJson,
  TRACKER_STALE_WHILE_REFRESH_MS,
} from "@/lib/client-json-cache";
import { fetchTrackerSummarySources } from "@/lib/tracker-summary-sources";
import {
  summarizeFeePeriods,
  type FeePeriodApiRecord,
} from "@/lib/fee-period-summary";
import { saveTrackerDatePreset } from "@/lib/tracker-settings-client";
import { buildOperationalLedgerHref } from "@/lib/operational-actions";
import {
  TRACKER_HEADER_SUMMARY_READY_EVENT,
  type TrackerHeaderSummaryReadyDetail,
} from "@/lib/tracker-data-events";
import {
  formatHumanDisplayDate,
  formatMoney,
  formatResolvedDateRange,
  formatResolvedDateRangeContext,
  resolveDateRange,
  summarizeTrackerData,
  type AccountSummaryRecord,
  type BalanceSnapshotSummaryRecord,
  type CashAdjustmentSummaryRecord,
  type CasinoSummaryRecord,
  type EachWayExtraPlaceSummaryRecord,
  type FreeBetSummaryRecord,
  type DatePreset,
  type SportsbookSummaryRecord,
  type TrackerSummaryDataset,
} from "@/lib/tracker-summary";

type SummaryVariant = "dashboard" | "profit-tracker" | "reports";

type TrackerSummaryShellProps = {
  profileId: string;
  variant: SummaryVariant;
};

type TrackerSettingsRecord = {
  profile_id: string;
  active_date_preset: DatePreset;
  custom_start_date: string;
  custom_end_date: string;
  range_back_days: number;
  range_forward_days: number;
  mug_bet_frequency_days: number;
  free_bet_expiry_alert_window_days: number;
  use_global_date_range_toggle: boolean;
  this_month_mode: string;
  default_free_bet_underlay_factor: string;
  default_free_bet_overlay_factor: string;
  default_bonus_retention_percent: string;
  default_exchange_name?: string;
  dashboard_view_mode?: string;
  weekly_profit_target?: string;
  monthly_profit_target?: string;
  annual_profit_target?: string;
};

function readErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function isWithinResolvedRange(value: string, start: Date, end: Date) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp >= start.getTime() && timestamp <= end.getTime();
}

function getActivityModuleLabel(module: string) {
  switch (module) {
    case "sportsbook":
      return "Sportsbook";
    case "free-bet":
      return "Free Bet";
    case "casino":
      return "Casino";
    case "each-way-extra-place":
      return "Extra Place";
    case "cash-adjustment":
      return "Cash Adjustment";
    default:
      return module;
  }
}

function getActivityLedgerHref(profileId: string, module: string, reference: string) {
  const route =
    module === "sportsbook"
      ? "sportsbook-bets"
      : module === "free-bet"
        ? "free-bets"
        : module === "casino"
          ? "casino-offers"
          : module === "each-way-extra-place"
            ? "each-way-extra-places"
          : "cash-adjustments";
  return `/profiles/${profileId}/tracker/${route}?search=${encodeURIComponent(reference)}`;
}

function getVariantTitle(variant: SummaryVariant) {
  switch (variant) {
    case "dashboard":
      return "Dashboard";
    case "profit-tracker":
      return "Dashboard / Profit Tracker";
    case "reports":
      return "Reports";
  }
}

function renderReportTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{
    periodKey: string;
    periodLabel: string;
    sportsbookPnl: number;
    freeBetPnl: number;
    casinoPnl: number;
    eachWayExtraPlacePnl: number;
    totalPnl: number;
    withdrawals: number;
    costs: number;
    retainedProfit: number;
  }>;
}) {
  return (
    <section className="content-panel stack">
      <div className="panel-header">
        <h2>{title}</h2>
      </div>
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Period</th>
              <th className="align-end">Sportsbook</th>
              <th className="align-end">Free Bets</th>
              <th className="align-end">Casino</th>
              <th className="align-end">Extra Place</th>
              <th className="align-end">Total P&amp;L</th>
              <th className="align-end">Withdrawals</th>
              <th className="align-end">Costs</th>
              <th className="align-end">Retained Profit</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9}>No rows currently resolve into this report period.</td>
              </tr>
            ) : (
              rows.slice(0, 12).map((row) => (
                <tr key={row.periodKey}>
                  <td>{row.periodLabel}</td>
                  <td className="align-end"><FinancialValue value={row.sportsbookPnl} /></td>
                  <td className="align-end"><FinancialValue value={row.freeBetPnl} /></td>
                  <td className="align-end"><FinancialValue value={row.casinoPnl} /></td>
                  <td className="align-end"><FinancialValue value={row.eachWayExtraPlacePnl} /></td>
                  <td className="align-end"><FinancialValue value={row.totalPnl} /></td>
                  <td className="align-end"><FinancialValue value={row.withdrawals} /></td>
                  <td className="align-end"><FinancialValue value={row.costs} /></td>
                  <td className="align-end"><FinancialValue value={row.retainedProfit} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function renderBreakdownTable({
  title,
  headers,
  rows,
  sectionId,
}: {
  title: string;
  headers: string[];
  rows: ReactNode;
  sectionId?: string;
}) {
  return (
    <section className="content-panel stack" id={sectionId}>
      <div className="panel-header">
        <h2>{title}</h2>
      </div>
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              {headers.map((header) => (
                <th
                  className={
                    /p&l|value|rows|open/i.test(header) ? "align-end" : undefined
                  }
                  key={header}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    </section>
  );
}

function renderAttentionTable({
  title,
  headers,
  emptyText,
  emptyColSpan,
  rows,
  sectionId,
}: {
  title: string;
  headers: string[];
  emptyText: string;
  emptyColSpan: number;
  rows: ReactNode;
  sectionId?: string;
}) {
  return renderBreakdownTable({
    title,
    headers,
    sectionId,
    rows: rows ?? (
      <tr>
        <td colSpan={emptyColSpan}>{emptyText}</td>
      </tr>
    ),
  });
}

export function TrackerSummaryShell({ profileId, variant }: TrackerSummaryShellProps) {
  const { catalogue: bookmakerCatalogue, providerIdsByName } = useBookmakerCatalogue(profileId);
  const [data, setData] = useState<TrackerSummaryDataset | null>(null);
  const [feePeriods, setFeePeriods] = useState<FeePeriodApiRecord[]>([]);
  const [settings, setSettings] = useState<TrackerSettingsRecord | null>(null);
  const [isTrackerRangeSaving, setIsTrackerRangeSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loadRevision, setLoadRevision] = useState(0);

  const loadData = useCallback(async () => {
    const urls = {
      accounts: `${apiBaseUrl}/profiles/${profileId}/accounts`,
      sportsbookBets: `${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`,
      freeBets: `${apiBaseUrl}/profiles/${profileId}/free-bets`,
      casinoOffers: `${apiBaseUrl}/profiles/${profileId}/casino-offers`,
      cashAdjustments: `${apiBaseUrl}/profiles/${profileId}/cash-adjustments`,
      eachWayExtraPlaces: `${apiBaseUrl}/profiles/${profileId}/each-way-extra-places`,
      balanceSnapshots: `${apiBaseUrl}/profiles/${profileId}/balance-snapshots`,
      feePeriods: `${apiBaseUrl}/profiles/${profileId}/fee-periods`,
      trackerSettings: `${apiBaseUrl}/profiles/${profileId}/tracker-settings`,
    };
    const cachedSettings = readCachedJson<TrackerSettingsRecord>(
      urls.trackerSettings,
      TRACKER_STALE_WHILE_REFRESH_MS
    );
    const cachedData = {
      accounts: readCachedJson<AccountSummaryRecord[]>(
        urls.accounts,
        TRACKER_STALE_WHILE_REFRESH_MS
      ),
      sportsbookBets: readCachedJson<SportsbookSummaryRecord[]>(
        urls.sportsbookBets,
        TRACKER_STALE_WHILE_REFRESH_MS
      ),
      freeBets: readCachedJson<FreeBetSummaryRecord[]>(
        urls.freeBets,
        TRACKER_STALE_WHILE_REFRESH_MS
      ),
      casinoOffers: readCachedJson<CasinoSummaryRecord[]>(
        urls.casinoOffers,
        TRACKER_STALE_WHILE_REFRESH_MS
      ),
      cashAdjustments: readCachedJson<CashAdjustmentSummaryRecord[]>(
        urls.cashAdjustments,
        TRACKER_STALE_WHILE_REFRESH_MS
      ),
      eachWayExtraPlaces: readCachedJson<EachWayExtraPlaceSummaryRecord[]>(
        urls.eachWayExtraPlaces,
        TRACKER_STALE_WHILE_REFRESH_MS
      ),
      balanceSnapshots: readCachedJson<BalanceSnapshotSummaryRecord[]>(
        urls.balanceSnapshots,
        TRACKER_STALE_WHILE_REFRESH_MS
      ),
      feePeriods: readCachedJson<FeePeriodApiRecord[]>(
        urls.feePeriods,
        TRACKER_STALE_WHILE_REFRESH_MS
      ),
    };

    if (
      cachedSettings &&
      cachedData.accounts &&
      cachedData.sportsbookBets &&
      cachedData.freeBets &&
      cachedData.casinoOffers &&
      cachedData.cashAdjustments &&
      cachedData.eachWayExtraPlaces &&
      cachedData.balanceSnapshots &&
      cachedData.feePeriods
    ) {
      setSettings(cachedSettings);
      setData({
        accounts: cachedData.accounts,
        sportsbookBets: cachedData.sportsbookBets,
        freeBets: cachedData.freeBets,
        casinoOffers: cachedData.casinoOffers,
        cashAdjustments: cachedData.cashAdjustments,
        eachWayExtraPlaces: cachedData.eachWayExtraPlaces,
        balanceSnapshots: cachedData.balanceSnapshots,
      });
      setFeePeriods(cachedData.feePeriods);
    }

    const sources = await fetchTrackerSummarySources(profileId);
    setSettings(sources.trackerSettings as TrackerSettingsRecord);
    setFeePeriods(sources.feePeriods);
    setData({
      accounts: sources.accounts,
      sportsbookBets: sources.sportsbookBets,
      freeBets: sources.freeBets,
      casinoOffers: sources.casinoOffers,
      cashAdjustments: sources.cashAdjustments,
      eachWayExtraPlaces: sources.eachWayExtraPlaces,
      balanceSnapshots: sources.balanceSnapshots,
    });
  }, [profileId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData()
        .then(() => {
          setErrorMessage("");
        })
        .catch((error: unknown) => {
          setErrorMessage(readErrorMessage(error, "Unable to load tracker summaries"));
        });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadData, loadRevision]);

  useEffect(() => {
    if (!errorMessage) {
      return;
    }

    const retry = () => setLoadRevision((current) => current + 1);
    const intervalId = window.setInterval(retry, 10_000);
    window.addEventListener("focus", retry);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", retry);
    };
  }, [errorMessage]);

  const resolvedRange = useMemo(
    () => {
      const trackerSettings = settings;
      return trackerSettings
        ? resolveDateRange({
            preset: trackerSettings.active_date_preset,
            customStart: trackerSettings.custom_start_date,
            customEnd: trackerSettings.custom_end_date,
            rangeBackDays: trackerSettings.range_back_days,
            rangeForwardDays: trackerSettings.range_forward_days,
          })
        : resolveDateRange({
            preset: "Week (Mon-Sun)",
          });
    },
    [settings]
  );

  const updateTrackerDatePreset = useCallback(
    async (preset: DatePreset) => {
      if (!settings || settings.active_date_preset === preset) return;
      setIsTrackerRangeSaving(true);
      setErrorMessage("");
      try {
        const savedSettings = await saveTrackerDatePreset(profileId, settings, preset);
        setSettings(savedSettings);
      } catch (error) {
        setErrorMessage(readErrorMessage(error, "Unable to save tracker range."));
      } finally {
        setIsTrackerRangeSaving(false);
      }
    },
    [profileId, settings]
  );

  const summary = useMemo(() => {
    if (!data) {
      return null;
    }
    return summarizeTrackerData(data, resolvedRange, undefined, {
      mugBetFrequencyDays: settings?.mug_bet_frequency_days,
      freeBetExpiryAlertWindowDays: settings?.free_bet_expiry_alert_window_days,
      useGlobalDateRangeToggle: settings?.use_global_date_range_toggle,
    });
  }, [
    data,
    resolvedRange,
    settings?.free_bet_expiry_alert_window_days,
    settings?.mug_bet_frequency_days,
    settings?.use_global_date_range_toggle,
  ]);

  useEffect(() => {
    if (!summary) return;
    const detail: TrackerHeaderSummaryReadyDetail = {
      profileId,
      overallPnl: summary.profitQuickView.overallPnl,
      profileRangeLabel: formatResolvedDateRange(resolvedRange),
      profileRangeDetail: formatResolvedDateRangeContext(resolvedRange),
    };
    window.dispatchEvent(
      new CustomEvent<TrackerHeaderSummaryReadyDetail>(TRACKER_HEADER_SUMMARY_READY_EVENT, {
        detail,
      })
    );
  }, [profileId, resolvedRange, summary]);

  const feePosition = useMemo(
    () => summarizeFeePeriods(feePeriods, resolvedRange.start, resolvedRange.end),
    [feePeriods, resolvedRange.end, resolvedRange.start]
  );

  const openAttentionRows = useMemo(() => {
    if (!data) {
      return [];
    }

    return [
      ...data.sportsbookBets
        .filter(
          (row) =>
            row.counts_as_open &&
            !row.is_overdue &&
            isWithinResolvedRange(row.date_settled, resolvedRange.start, resolvedRange.end)
        )
        .map((row) => ({
          key: `sportsbook-${row.sportsbook_bet_id}`,
          module: "sportsbook",
          reference: row.event_name || row.offer_name || row.sportsbook_bet_id,
          owner: row.bookmaker,
          status: `${row.status} / ${row.lay_status}`,
          dueDate: row.date_settled,
          value: row.reporting_value,
        })),
      ...data.freeBets
        .filter(
          (row) =>
            row.counts_as_open &&
            !row.is_overdue &&
            isWithinResolvedRange(row.date_settled, resolvedRange.start, resolvedRange.end)
        )
        .map((row) => ({
          key: `free-bet-${row.free_bet_id}`,
          module: "free-bet",
          reference: row.event_name || row.free_bet_id,
          owner: row.bookmaker,
          status: `${row.status} / ${row.lay_status}`,
          dueDate: row.expiry_datetime || row.date_settled,
          value: row.reporting_value,
        })),
      ...data.casinoOffers
        .filter(
          (row) =>
            row.counts_as_open &&
            !row.is_overdue &&
            isWithinResolvedRange(row.date_settling, resolvedRange.start, resolvedRange.end)
        )
        .map((row) => ({
          key: `casino-${row.casino_offer_id}`,
          module: "casino",
          reference: row.offer_name || row.casino_offer_id,
          owner: row.bookmaker,
          status: `${row.status} / ${row.result}`,
          dueDate: row.expiry_datetime || row.date_settling,
          value: row.resolved_net_pnl,
        })),
    ]
      .filter((row) => row.dueDate.trim())
      .sort((left, right) => left.dueDate.localeCompare(right.dueDate))
      .slice(0, 12);
  }, [data, resolvedRange.end, resolvedRange.start]);

  const overdueAttentionRows = useMemo(() => {
    if (!data) {
      return [];
    }

    return [
      ...data.sportsbookBets
        .filter(
          (row) =>
            row.is_overdue &&
            isWithinResolvedRange(row.date_settled, resolvedRange.start, resolvedRange.end)
        )
        .map((row) => ({
          key: `sportsbook-${row.sportsbook_bet_id}`,
          module: "sportsbook",
          reference: row.event_name || row.offer_name || row.sportsbook_bet_id,
          owner: row.bookmaker,
          status: `${row.status} / ${row.result}`,
          dueDate: row.date_settled,
          value: row.reporting_value,
        })),
      ...data.freeBets
        .filter(
          (row) =>
            row.is_overdue &&
            isWithinResolvedRange(row.date_settled, resolvedRange.start, resolvedRange.end)
        )
        .map((row) => ({
          key: `free-bet-${row.free_bet_id}`,
          module: "free-bet",
          reference: row.event_name || row.free_bet_id,
          owner: row.bookmaker,
          status: `${row.status} / ${row.result}`,
          dueDate: row.expiry_datetime || row.date_settled,
          value: row.reporting_value,
        })),
      ...data.casinoOffers
        .filter(
          (row) =>
            row.is_overdue &&
            isWithinResolvedRange(row.date_settling, resolvedRange.start, resolvedRange.end)
        )
        .map((row) => ({
          key: `casino-${row.casino_offer_id}`,
          module: "casino",
          reference: row.offer_name || row.casino_offer_id,
          owner: row.bookmaker,
          status: `${row.status} / ${row.result}`,
          dueDate: row.expiry_datetime || row.date_settling,
          value: row.resolved_net_pnl,
        })),
    ]
      .sort((left, right) => left.dueDate.localeCompare(right.dueDate))
      .slice(0, 12);
  }, [data, resolvedRange.end, resolvedRange.start]);

  const isDashboardLike = variant === "dashboard" || variant === "profit-tracker";
  const isReports = variant === "reports";

  const isCriticalLoading = !summary && !errorMessage;

  return (
    <section aria-busy={isCriticalLoading} className="stack tracker-summary-shell">
      <section className="content-panel stack" inert={isCriticalLoading ? true : undefined}>
        <div className="panel-header">
          <div className="section-heading-row">
            <h2>{getVariantTitle(variant)}</h2>
            <AccessScopeBadge />
          </div>
        </div>
        <section className="stat-strip" aria-label="Tracker range and reporting">
          <TrackerRangeCard
            activePreset={settings?.active_date_preset ?? "Week (Mon-Sun)"}
            isSaving={isTrackerRangeSaving}
            onPresetChange={(preset) => void updateTrackerDatePreset(preset)}
            rangeDetail={formatResolvedDateRangeContext(resolvedRange)}
            rangeContext={formatResolvedDateRange(resolvedRange)}
          />
          {summary && !isDashboardLike ? (
            <>
              <article className="stat-card">
                <span className="eyebrow">Selected Range P&amp;L</span>
                <strong><FinancialValue value={summary.profitQuickView.overallPnl} /></strong>
                <span>Total profit and loss for this range</span>
              </article>
              <article className="stat-card">
                <span className="eyebrow">Retained profit</span>
                <strong><FinancialValue value={summary.reportingModel.selectedRange.retainedProfit} /></strong>
                <span>After withdrawals, costs, and retained adjustments</span>
              </article>
              <article className="stat-card">
                <span className="eyebrow">Open current / settled final</span>
                <strong>
                  <FinancialValue value={summary.reportingModel.selectedRange.openCurrentValue} /> /{" "}
                  <FinancialValue value={summary.reportingModel.selectedRange.settledFinalValue} />
                </strong>
                <span>Current value stays separate from settled value</span>
              </article>
              <article className="stat-card">
                <span className="eyebrow">
                  {isReports ? "Formal Report Periods" : "Current Account Cash"}
                </span>
                <strong>
                  {isReports
                    ? `${summary.reportingModel.formalReports.weeklyPeriods}W / ${summary.reportingModel.formalReports.monthlyPeriods}M`
                    : <FinancialValue value={summary.accountQuickView.cashSnapshot} />}
                </strong>
                <span>
                  {isReports
                    ? `${summary.reportingModel.formalReports.yearlyPeriods}Y formal periods`
                    : `Pending withdrawals ${formatMoney(summary.accountQuickView.pendingWithdrawals)}`}
                </span>
              </article>
            </>
          ) : null}
        </section>
        {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
      </section>

      {summary ? (
        <>
          {isDashboardLike && (
            <PortfolioDashboardView
              activePreset={settings?.active_date_preset ?? "Week (Mon-Sun)"}
              isRangeSaving={isTrackerRangeSaving}
              onPresetChange={(preset) => void updateTrackerDatePreset(preset)}
              profileId={profileId}
              dataset={data ?? undefined}
              resolvedRange={resolvedRange}
              settings={{
                dashboard_view_mode: settings?.dashboard_view_mode,
                weekly_profit_target: settings?.weekly_profit_target,
                monthly_profit_target: settings?.monthly_profit_target,
                annual_profit_target: settings?.annual_profit_target,
              }}
              summary={summary}
              feePosition={feePosition}
            />
          )}

          {!isDashboardLike ? (
          <>
          <section className="content-panel stack">
            <div className="panel-header">
              <h2>Selected Range Module Mix</h2>
            </div>
            <section className="stat-strip" aria-label="Selected range module mix">
              <article className="stat-card">
                <span className="eyebrow">Sportsbook</span>
                <strong><FinancialValue value={summary.profitQuickView.sportsbook.reportingValue} /></strong>
                <span>
                  Open/current {formatMoney(summary.profitQuickView.sportsbook.currentValue)} • Final{" "}
                  {formatMoney(summary.profitQuickView.sportsbook.finalValue)}
                </span>
              </article>
              <article className="stat-card">
                <span className="eyebrow">Free Bets</span>
                <strong><FinancialValue value={summary.profitQuickView.freeBets.reportingValue} /></strong>
                <span>
                  Open/current {formatMoney(summary.profitQuickView.freeBets.currentValue)} • Final{" "}
                  {formatMoney(summary.profitQuickView.freeBets.finalValue)}
                </span>
              </article>
              <article className="stat-card">
                <span className="eyebrow">Casino</span>
                <strong><FinancialValue value={summary.profitQuickView.casino.reportingValue} /></strong>
                <span>Resolved from casino net P&amp;L rows</span>
              </article>
              <article className="stat-card">
                <span className="eyebrow">Cash Adjustments</span>
                <strong><FinancialValue value={summary.betsQuickView.selectedRangeCashAdjustments} /></strong>
                <span>
                  Withdrawals {formatMoney(summary.cashAdjustmentBreakdown.withdrawals)} • Costs{" "}
                  {formatMoney(summary.cashAdjustmentBreakdown.deductionsAndSubscriptions)}
                </span>
              </article>
            </section>
          </section>

          {isDashboardLike && (
            <section className="stat-strip" aria-label="Tracker quick views">
              <article className="stat-card">
                <span className="eyebrow">Current Account Cash</span>
                <strong><FinancialValue value={summary.accountQuickView.cashSnapshot} /></strong>
                <span>
                  Bookie {formatMoney(summary.accountQuickView.bookieBalance)} • Exchange{" "}
                  {formatMoney(summary.accountQuickView.exchangeBalance)} • Bank{" "}
                  {formatMoney(summary.accountQuickView.bankBalance)}
                </span>
              </article>
              <article className="stat-card">
                <span className="eyebrow">Selected Range P&amp;L</span>
                <strong><FinancialValue value={summary.profitQuickView.overallPnl} /></strong>
                <span>
                  Sportsbook {formatMoney(summary.profitQuickView.sportsbook.reportingValue)} •
                  Free Bets {formatMoney(summary.profitQuickView.freeBets.reportingValue)} • Casino{" "}
                  {formatMoney(summary.profitQuickView.casino.reportingValue)}
                </span>
              </article>
              <article className="stat-card">
                <span className="eyebrow">Retained profit</span>
                <strong><FinancialValue value={summary.reportingModel.selectedRange.retainedProfit} /></strong>
                <span>
                  Cash adjustments {formatMoney(summary.reportingModel.selectedRange.cashAdjustments)}
                </span>
              </article>
              <article className="stat-card">
                <span className="eyebrow">Open positions</span>
                <strong>{summary.betsQuickView.openBets}</strong>
                <span>
                  Overdue {summary.betsQuickView.overdueBets} • Part laid{" "}
                  {summary.betsQuickView.partLaidBets}
                </span>
                {summary.betsQuickView.overdueBets > 0 ? (
                  <Link className="report-action-badge" href={`/profiles/${profileId}/tracker/sportsbook-bets?view=issues&issue=all-issues&source=reports`}>
                    Action needed: {summary.betsQuickView.overdueBets} overdue
                  </Link>
                ) : null}
              </article>
              <article className="stat-card">
                <span className="eyebrow">Open current value</span>
                <strong><FinancialValue value={summary.profitQuickView.openCurrentValue} /></strong>
                <span>Settled/final <FinancialValue value={summary.profitQuickView.settledFinalValue} /></span>
              </article>
              <article className="stat-card">
                <span className="eyebrow">Liability</span>
                <strong><FinancialValue value={summary.betsQuickView.currentLiability} /></strong>
                <span>
                  Pending withdrawals {formatMoney(summary.accountQuickView.pendingWithdrawals)}
                </span>
              </article>
              <article className="stat-card">
                <span className="eyebrow">Operational alerts</span>
                <strong>{summary.betsQuickView.expiringFreeBetCount}</strong>
                <span>
                  Expiring free bets • Mug review {summary.betsQuickView.accountsNeedingMugReview}
                </span>
                {summary.betsQuickView.expiringFreeBetCount > 0 ? (
                  <Link className="report-action-badge" href={`/profiles/${profileId}/tracker/free-bets?view=issues&issue=all-issues&source=reports`}>
                    Action needed
                  </Link>
                ) : null}
              </article>
            </section>
          )}

          {isDashboardLike && (
            <section className="content-panel stack">
              <div className="panel-header">
                <h2>Selected Range Activity</h2>
              </div>
              <section className="stat-strip" aria-label="Selected range activity">
              <article className="stat-card">
                <span className="eyebrow">Sportsbook rows</span>
                <strong>{summary.activityQuickView.sportsbookCount}</strong>
                <span>Rows inside the resolved range</span>
              </article>
              <article className="stat-card">
                <span className="eyebrow">Free-bet rows</span>
                <strong>{summary.activityQuickView.freeBetCount}</strong>
                <span>Rows inside the resolved range</span>
              </article>
              <article className="stat-card">
                <span className="eyebrow">Casino and cash rows</span>
                <strong>
                  {summary.activityQuickView.casinoCount +
                      summary.activityQuickView.cashAdjustmentCount}
                </strong>
                <span>
                  Casino {summary.activityQuickView.casinoCount} • Cash adjustments{" "}
                  {summary.activityQuickView.cashAdjustmentCount}
                </span>
              </article>
              <article className="stat-card">
                <span className="eyebrow">Latest activity</span>
                <strong>
                  {summary.activityQuickView.latestActivityDate
                      ? formatHumanDisplayDate(summary.activityQuickView.latestActivityDate, true)
                      : "Unscheduled"}
                </strong>
                <span>Latest dated row inside the range</span>
              </article>
            </section>
          </section>
          )}

          {(isDashboardLike || isReports) &&
            renderBreakdownTable({
              title: "Module breakdown",
              headers: ["Module", "Rows", "Reporting value"],
              rows:
                summary.moduleBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={3}>No module breakdown rows are available for the current range.</td>
                  </tr>
                ) : (
                  summary.moduleBreakdown.map((row) => (
                    <tr key={row.moduleKey}>
                      <td>{row.label}</td>
                      <td className="align-end">{row.rowCount}</td>
                      <td className="align-end"><FinancialValue value={row.reportingValue} /></td>
                    </tr>
                  ))
                ),
            })}

          {(isDashboardLike || isReports) &&
            renderBreakdownTable({
              title: "Bookmaker breakdown",
              headers: [
                "Bookmaker",
                "Sportsbook P&L",
                "Free Bet P&L",
                "Casino P&L",
                "Extra Place P&L",
                "Total P&L",
                "Open rows",
              ],
              rows:
                summary.bookmakerBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={7}>No bookmaker breakdown rows are available for the current range.</td>
                  </tr>
                ) : (
                  summary.bookmakerBreakdown.map((row) => (
                    <tr key={row.bookmaker}>
                      <td><BookmakerIdentity bookmaker={row.bookmaker} catalogueId={catalogueIdForBookmaker(providerIdsByName, row.bookmaker)} catalogue={bookmakerCatalogue} mode="Brand badge" /></td>
                      <td className="align-end"><FinancialValue value={row.sportsbookPnl} /></td>
                      <td className="align-end"><FinancialValue value={row.freeBetPnl} /></td>
                      <td className="align-end"><FinancialValue value={row.casinoPnl} /></td>
                      <td className="align-end"><FinancialValue value={row.eachWayExtraPlacePnl} /></td>
                      <td className="align-end"><FinancialValue value={row.totalPnl} /></td>
                      <td className="align-end">
                        {row.openRowCount > 0 ? (
                          <span className="report-open-module-links" aria-label={`${row.openRowCount} ${row.bookmaker} rows requiring action`}>
                            {[
                              { ledger: "sportsbook" as const, icon: "sports", count: row.sportsbookOpenRowCount, label: "Sportsbook" },
                              { ledger: "free-bets" as const, icon: "award_star", count: row.freeBetOpenRowCount, label: "Free Bets" },
                              { ledger: "casino-offers" as const, icon: "playing_cards", count: row.casinoOpenRowCount, label: "Casino" },
                              { ledger: "each-way-extra-places" as const, icon: "chess_knight", count: row.extraPlaceOpenRowCount, label: "Extra Place" },
                            ].filter((module) => module.count > 0).map((module, index) => (
                              <span key={module.ledger}>
                                {index ? <span aria-hidden="true" className="report-open-module-separator">|</span> : null}
                                <Link aria-label={`Open ${module.count} ${row.bookmaker} ${module.label} rows requiring action`} className="report-value-link" href={buildOperationalLedgerHref(profileId, module.ledger)} title={module.label}>
                                  <span aria-hidden="true" className="material-symbols-outlined">{module.icon}</span>{module.count}
                                </Link>
                              </span>
                            ))}
                          </span>
                        ) : row.openRowCount}
                      </td>
                    </tr>
                  ))
                ),
            })}

          {isDashboardLike &&
            renderAttentionTable({
              title: "Open positions due soon",
              sectionId: "open-watchlist",
              headers: ["Module", "Reference", "Bookmaker", "Status", "Due", "Reporting value", "Action"],
              emptyText: "No open positions currently have a due date in the live profile rows.",
              emptyColSpan: 7,
              rows:
                openAttentionRows.length === 0 ? null : (
                  openAttentionRows.map((row) => (
                    <tr key={row.key}>
                      <td>{getActivityModuleLabel(row.module)}</td>
                      <td>{row.reference}</td>
                      <td>{row.owner}</td>
                      <td>{row.status}</td>
                      <td>{formatHumanDisplayDate(row.dueDate, true)}</td>
                      <td className="align-end"><FinancialValue value={Number(row.value ?? 0)} /></td>
                      <td><Link aria-label={`Open ${row.reference} in ${getActivityModuleLabel(row.module)}`} className="report-value-link" href={getActivityLedgerHref(profileId, row.module, row.reference)}><span aria-hidden="true" className="material-symbols-outlined">open_in_new</span></Link></td>
                    </tr>
                  ))
                ),
            })}

          {isDashboardLike &&
            renderAttentionTable({
              title: "Overdue items",
              sectionId: "overdue-watchlist",
              headers: ["Module", "Reference", "Bookmaker", "Status", "Due", "Reporting value", "Action"],
              emptyText: "No overdue sportsbook, free-bet, or casino rows are currently flagged.",
              emptyColSpan: 7,
              rows:
                overdueAttentionRows.length === 0 ? null : (
                  overdueAttentionRows.map((row) => (
                    <tr key={row.key}>
                      <td>{getActivityModuleLabel(row.module)}</td>
                      <td>{row.reference}</td>
                      <td>{row.owner}</td>
                      <td>{row.status}</td>
                      <td>{formatHumanDisplayDate(row.dueDate, true)}</td>
                      <td className="align-end"><FinancialValue value={Number(row.value ?? 0)} /></td>
                      <td><Link aria-label={`Open ${row.reference} in ${getActivityModuleLabel(row.module)}`} className="report-value-link" href={getActivityLedgerHref(profileId, row.module, row.reference)}><span aria-hidden="true" className="material-symbols-outlined">open_in_new</span></Link></td>
                    </tr>
                  ))
                ),
            })}

          {isDashboardLike && (
            <>
            <section className="content-panel stack">
              <div className="panel-header">
                <h2>Selected Range Cash Adjustments</h2>
              </div>
              <section className="stat-strip" aria-label="Cash adjustment summary">
                <article className="stat-card">
                  <span className="eyebrow">Selected range</span>
                  <strong><FinancialValue value={summary.betsQuickView.selectedRangeCashAdjustments} /></strong>
                    <span>Range-visible cash movement</span>
                </article>
                  <article className="stat-card">
                    <span className="eyebrow">Top ups</span>
                    <strong><FinancialValue value={summary.cashAdjustmentBreakdown.topUps} /></strong>
                    <span>Included in cash movement only</span>
                  </article>
                  <article className="stat-card">
                    <span className="eyebrow">Deductions and subscriptions</span>
                    <strong>
                      <FinancialValue value={summary.cashAdjustmentBreakdown.deductionsAndSubscriptions} />
                    </strong>
                    <span>Feeds retained-profit reporting</span>
                  </article>
                <article className="stat-card">
                  <span className="eyebrow">Retained profit</span>
                  <strong><FinancialValue value={summary.cashAdjustmentBreakdown.retainedProfit} /></strong>
                    <span>Workbook retained-profit output</span>
                </article>
              </section>
            </section>

              <section className="content-panel stack">
                <div className="panel-header" id="expiring-free-bets">
                  <h2>Expiring free bets</h2>
                </div>
                <div className="table-shell">
                  <table>
                    <thead>
                      <tr>
                        <th>Free Bet ID</th>
                        <th>Bookmaker</th>
                        <th>Status</th>
                        <th>Expiry</th>
                        <th className="align-end">Current value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.expiringFreeBets.length === 0 ? (
                        <tr>
                          <td colSpan={5}>No expiring free bets in the current data set.</td>
                        </tr>
                      ) : (
                        summary.expiringFreeBets.map((row) => (
                          <tr key={row.free_bet_id}>
                            <td>{row.free_bet_id}</td>
                            <td><BookmakerIdentity bookmaker={row.bookmaker} catalogueId={catalogueIdForBookmaker(providerIdsByName, row.bookmaker)} catalogue={bookmakerCatalogue} mode="Brand badge" /></td>
                            <td>{row.status}</td>
                            <td>{formatHumanDisplayDate(row.expiry_datetime, true)}</td>
                            <td className="align-end"><FinancialValue value={Number(row.reporting_value ?? 0)} /></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {isDashboardLike && (
              <section className="stat-strip" aria-label="Account health quick views">
                <article className="stat-card">
                  <span className="eyebrow">Place mug bet</span>
                  <strong>{summary.accountHealthQuickView.placeMugBetCount}</strong>
                  <span>Outside the current cadence</span>
                </article>
                <article className="stat-card">
                  <span className="eyebrow">Review cadence</span>
                  <strong>{summary.accountHealthQuickView.reviewMugCadenceCount}</strong>
                  <span>No mug-bet history yet</span>
                </article>
                <article className="stat-card">
                  <span className="eyebrow">No action</span>
                  <strong>{summary.accountHealthQuickView.noActionCount}</strong>
                  <span>Inside the cadence window</span>
                </article>
                <article className="stat-card">
                  <span className="eyebrow">Cadence</span>
                  <strong>{settings?.mug_bet_frequency_days ?? 14} days</strong>
                  <span>Set in profile settings</span>
                </article>
              </section>
          )}

          {isDashboardLike && (
            <section className="content-panel stack">
              <div className="panel-header">
                <h2>Account health</h2>
              </div>
              <div className="table-shell">
                <table>
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Status</th>
                      <th>Last offer</th>
                      <th>Last mug bet</th>
                      <th>Days since mug</th>
                      <th>Suggested action</th>
                      <th>Last offer type</th>
                      <th>Last offer result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.accountHealth.length === 0 ? (
                      <tr>
                        <td colSpan={8}>No active bookmaker account-health rows are currently available.</td>
                      </tr>
                    ) : (
                      summary.accountHealth.map((row) => (
                        <tr key={row.accountName}>
                          <td>{row.accountName}</td>
                          <td>{row.accountStatus}</td>
                          <td>{row.lastOfferActivityAt ? formatHumanDisplayDate(row.lastOfferActivityAt, true) : "—"}</td>
                          <td>{row.lastMugBetAt ? formatHumanDisplayDate(row.lastMugBetAt, true) : "—"}</td>
                          <td>{row.daysSinceMugBet}</td>
                          <td>{row.suggestedAction}</td>
                          <td>{row.lastOfferType || "—"}</td>
                          <td>{row.lastOfferResult || "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {isDashboardLike && (
            <section className="content-panel stack">
              <div className="panel-header">
                <h2>Recent in range</h2>
              </div>
              <div className="table-shell">
                <table>
                  <thead>
                    <tr>
                      <th>Module</th>
                      <th>Reference</th>
                      <th>Bookmaker / Account</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th className="align-end">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.recentActivity.length === 0 ? (
                      <tr>
                        <td colSpan={6}>No activity currently falls inside the selected range.</td>
                      </tr>
                    ) : (
                      summary.recentActivity.map((row) => (
                        <tr key={`${row.module}-${row.id}`}>
                          <td>{getActivityModuleLabel(row.module)}</td>
                          <td>{row.label}</td>
                          <td>{row.bookmakerOrAccount}</td>
                          <td>{row.status}</td>
                          <td>{formatHumanDisplayDate(row.date, true)}</td>
                          <td className="align-end"><FinancialValue value={row.value} /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          </>
          ) : null}

          {isReports && (
            <>
              <section className="stat-strip" aria-label="Report quick views">
                <article className="stat-card">
                  <span className="eyebrow">Weekly periods</span>
                  <strong>{summary.reportingModel.formalReports.weeklyPeriods}</strong>
                  <span>
                    {summary.reportingModel.formalReports.latestWeeklyLabel} •{" "}
                    <FinancialValue value={summary.reportingModel.formalReports.latestWeeklyRetainedProfit} />
                  </span>
                </article>
                <article className="stat-card">
                  <span className="eyebrow">Monthly periods</span>
                  <strong>{summary.reportingModel.formalReports.monthlyPeriods}</strong>
                  <span>
                    {summary.reportingModel.formalReports.latestMonthlyLabel} •{" "}
                    <FinancialValue value={summary.reportingModel.formalReports.latestMonthlyRetainedProfit} />
                  </span>
                </article>
                <article className="stat-card">
                  <span className="eyebrow">Yearly periods</span>
                  <strong>{summary.reportingModel.formalReports.yearlyPeriods}</strong>
                  <span>
                    {summary.reportingModel.formalReports.latestYearlyLabel} •{" "}
                    <FinancialValue value={summary.reportingModel.formalReports.latestYearlyRetainedProfit} />
                  </span>
                </article>
                <article className="stat-card">
                  <span className="eyebrow">Open exposure</span>
                  <strong><FinancialValue value={summary.betsQuickView.currentLiability} /></strong>
                  <span>
                    Open positions {summary.betsQuickView.openBets} • Overdue{" "}
                    {summary.betsQuickView.overdueBets}
                  </span>
                  {summary.betsQuickView.overdueBets > 0 ? (
                    <Link className="report-action-badge" href={`/profiles/${profileId}/tracker/sportsbook-bets?view=issues&issue=all-issues&source=reports`}>
                      Action needed: {summary.betsQuickView.overdueBets} overdue
                    </Link>
                  ) : null}
                </article>
              </section>
              <section className="content-panel stack">
                <div className="panel-header">
                  <h2>Selected range vs formal reports</h2>
                </div>
                <section className="stat-strip" aria-label="Report boundary summary">
                  <article className="stat-card">
                    <span className="eyebrow">Gross betting P&amp;L</span>
                    <strong><FinancialValue value={summary.reportingModel.selectedRange.grossBettingPnl} /></strong>
                    <span>Selected range module reporting values</span>
                  </article>
                  <article className="stat-card">
                    <span className="eyebrow">Retained profit</span>
                    <strong><FinancialValue value={summary.reportingModel.selectedRange.retainedProfit} /></strong>
                    <span>After report-eligible withdrawals and costs</span>
                  </article>
                  <article className="stat-card">
                    <span className="eyebrow">Cash adjustments</span>
                    <strong><FinancialValue value={summary.reportingModel.selectedRange.cashAdjustments} /></strong>
                    <span>Dashboard-visible movement in range</span>
                  </article>
                  <article className="stat-card">
                    <span className="eyebrow">Open / final value</span>
                    <strong>
                      <FinancialValue value={summary.reportingModel.selectedRange.openCurrentValue} /> /{" "}
                      <FinancialValue value={summary.reportingModel.selectedRange.settledFinalValue} />
                    </strong>
                    <span>Current open value remains separate from final</span>
                  </article>
                  <article className="stat-card">
                    <span className="eyebrow">Latest weekly period</span>
                    <strong>{summary.reportingModel.formalReports.latestWeeklyLabel}</strong>
                    <span>Formal weekly output</span>
                  </article>
                  <article className="stat-card">
                    <span className="eyebrow">Latest monthly period</span>
                    <strong>{summary.reportingModel.formalReports.latestMonthlyLabel}</strong>
                    <span>Formal monthly output</span>
                  </article>
                </section>
              </section>

              {renderAttentionTable({
                title: "Open watchlist",
                sectionId: "open-watchlist",
                headers: ["Module", "Reference", "Bookmaker", "Status", "Due", "Reporting value", "Action"],
                emptyText: "No open positions currently have a due date in the live profile rows.",
                emptyColSpan: 7,
                rows:
                  openAttentionRows.length === 0 ? null : (
                    openAttentionRows.map((row) => (
                      <tr key={row.key}>
                        <td>{getActivityModuleLabel(row.module)}</td>
                        <td>{row.reference}</td>
                        <td>{row.owner}</td>
                        <td>{row.status}</td>
                        <td>{formatHumanDisplayDate(row.dueDate, true)}</td>
                      <td className="align-end"><FinancialValue value={Number(row.value ?? 0)} /></td>
                      <td><Link aria-label={`Open ${row.reference} in ${getActivityModuleLabel(row.module)}`} className="report-value-link" href={getActivityLedgerHref(profileId, row.module, row.reference)}><span aria-hidden="true" className="material-symbols-outlined">open_in_new</span></Link></td>
                      </tr>
                    ))
                  ),
              })}

              {renderAttentionTable({
                title: "Overdue watchlist",
                sectionId: "overdue-watchlist",
                headers: ["Module", "Reference", "Bookmaker", "Status", "Due", "Reporting value", "Action"],
                emptyText: "No overdue sportsbook, free-bet, or casino rows are currently flagged.",
                emptyColSpan: 7,
                rows:
                  overdueAttentionRows.length === 0 ? null : (
                    overdueAttentionRows.map((row) => (
                      <tr key={row.key}>
                        <td>{getActivityModuleLabel(row.module)}</td>
                        <td>{row.reference}</td>
                        <td>{row.owner}</td>
                        <td>{row.status}</td>
                        <td>{formatHumanDisplayDate(row.dueDate, true)}</td>
                      <td className="align-end"><FinancialValue value={Number(row.value ?? 0)} /></td>
                      <td><Link aria-label={`Open ${row.reference} in ${getActivityModuleLabel(row.module)}`} className="report-value-link" href={getActivityLedgerHref(profileId, row.module, row.reference)}><span aria-hidden="true" className="material-symbols-outlined">open_in_new</span></Link></td>
                      </tr>
                    ))
                  ),
              })}

              {renderAttentionTable({
                title: "Balance snapshots",
                headers: ["Captured", "Type", "Account", "Balance", "Notes"],
                emptyText: "No balance snapshots fall inside the selected range.",
                emptyColSpan: 5,
                rows:
                  summary.recentBalanceSnapshots.length === 0
                    ? null
                    : summary.recentBalanceSnapshots.map((row) => (
                        <tr key={row.balance_snapshot_id}>
                          <td>{formatHumanDisplayDate(row.snapshot_at, true)}</td>
                          <td>{row.snapshot_type}</td>
                          <td>{row.account_id ?? "Profile total"}</td>
                          <td className="align-end"><FinancialValue value={Number(row.balance_amount)} /></td>
                          <td>{row.notes || "—"}</td>
                        </tr>
                      )),
              })}

              {renderReportTable({ title: "Weekly reports", rows: summary.weeklyReports })}
              {renderReportTable({ title: "Monthly reports", rows: summary.monthlyReports })}
              {renderReportTable({ title: "Yearly reports", rows: summary.yearlyReports })}
            </>
          )}
        </>
      ) : errorMessage ? null : (
        <LedgerLoadingIndicator label="Loading tracker summaries" />
      )}
    </section>
  );
}
