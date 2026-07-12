"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiBaseUrl } from "@/lib/api";
import {
  formatDisplayDate,
  formatMoney,
  resolveDateRange,
  summarizeTrackerData,
  type AccountSummaryRecord,
  type CashAdjustmentSummaryRecord,
  type CasinoSummaryRecord,
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
};

function readErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function buildRangeLabel(start: Date, end: Date) {
  return `${formatDisplayDate(start.toISOString())} to ${formatDisplayDate(end.toISOString())}`;
}

function getActivityModuleLabel(module: string) {
  switch (module) {
    case "sportsbook":
      return "Sportsbook";
    case "free-bet":
      return "Free Bet";
    case "casino":
      return "Casino";
    case "cash-adjustment":
      return "Cash Adjustment";
    default:
      return module;
  }
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
              <th className="align-end">Total P&amp;L</th>
              <th className="align-end">Withdrawals</th>
              <th className="align-end">Costs</th>
              <th className="align-end">Retained Profit</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8}>No rows currently resolve into this report period.</td>
              </tr>
            ) : (
              rows.slice(0, 12).map((row) => (
                <tr key={row.periodKey}>
                  <td>{row.periodLabel}</td>
                  <td className="align-end">{formatMoney(row.sportsbookPnl)}</td>
                  <td className="align-end">{formatMoney(row.freeBetPnl)}</td>
                  <td className="align-end">{formatMoney(row.casinoPnl)}</td>
                  <td className="align-end">{formatMoney(row.totalPnl)}</td>
                  <td className="align-end">{formatMoney(row.withdrawals)}</td>
                  <td className="align-end">{formatMoney(row.costs)}</td>
                  <td className="align-end">{formatMoney(row.retainedProfit)}</td>
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
}: {
  title: string;
  headers: string[];
  rows: ReactNode;
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
}: {
  title: string;
  headers: string[];
  emptyText: string;
  emptyColSpan: number;
  rows: ReactNode;
}) {
  return renderBreakdownTable({
    title,
    headers,
    rows: rows ?? (
      <tr>
        <td colSpan={emptyColSpan}>{emptyText}</td>
      </tr>
    ),
  });
}

export function TrackerSummaryShell({ profileId, variant }: TrackerSummaryShellProps) {
  const [data, setData] = useState<TrackerSummaryDataset | null>(null);
  const [settings, setSettings] = useState<TrackerSettingsRecord | null>(null);
  const [statusMessage, setStatusMessage] = useState("Loading tracker summaries...");
  const [errorMessage, setErrorMessage] = useState("");

  const loadData = useCallback(async () => {
    const [accounts, sportsbookBets, freeBets, casinoOffers, cashAdjustments, trackerSettings] =
      await Promise.all([
        fetch(`${apiBaseUrl}/profiles/${profileId}/accounts`, { cache: "no-store" }),
        fetch(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`, { cache: "no-store" }),
        fetch(`${apiBaseUrl}/profiles/${profileId}/free-bets`, { cache: "no-store" }),
        fetch(`${apiBaseUrl}/profiles/${profileId}/casino-offers`, { cache: "no-store" }),
        fetch(`${apiBaseUrl}/profiles/${profileId}/cash-adjustments`, { cache: "no-store" }),
        fetch(`${apiBaseUrl}/profiles/${profileId}/tracker-settings`, { cache: "no-store" }),
      ]);

    if (
      !accounts.ok ||
      !sportsbookBets.ok ||
      !freeBets.ok ||
      !casinoOffers.ok ||
      !cashAdjustments.ok ||
      !trackerSettings.ok
    ) {
      throw new Error("Unable to load one or more tracker summary sources");
    }

    setSettings((await trackerSettings.json()) as TrackerSettingsRecord);
    setData({
      accounts: (await accounts.json()) as AccountSummaryRecord[],
      sportsbookBets: (await sportsbookBets.json()) as SportsbookSummaryRecord[],
      freeBets: (await freeBets.json()) as FreeBetSummaryRecord[],
      casinoOffers: (await casinoOffers.json()) as CasinoSummaryRecord[],
      cashAdjustments: (await cashAdjustments.json()) as CashAdjustmentSummaryRecord[],
    });
  }, [profileId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData()
        .then(() => {
          setStatusMessage("Tracker summaries loaded from live profile rows.");
          setErrorMessage("");
        })
        .catch((error: unknown) => {
          setErrorMessage(readErrorMessage(error, "Unable to load tracker summaries"));
          setStatusMessage("Tracker summaries could not be loaded.");
        });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

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

  const openAttentionRows = useMemo(() => {
    if (!data) {
      return [];
    }

    return [
      ...data.sportsbookBets
        .filter((row) => row.counts_as_open && !row.is_overdue)
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
        .filter((row) => row.counts_as_open && !row.is_overdue)
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
        .filter((row) => row.counts_as_open && !row.is_overdue)
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
  }, [data]);

  const overdueAttentionRows = useMemo(() => {
    if (!data) {
      return [];
    }

    return [
      ...data.sportsbookBets
        .filter((row) => row.is_overdue)
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
        .filter((row) => row.is_overdue)
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
        .filter((row) => row.is_overdue)
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
  }, [data]);

  const isDashboardLike = variant === "dashboard" || variant === "profit-tracker";
  const isReports = variant === "reports";

  return (
    <section className="stack">
      <section className="content-panel stack">
        <div className="panel-header">
          <h2>{getVariantTitle(variant)}</h2>
        </div>
        <section className="stat-strip" aria-label="Resolved range and workbook reporting">
          <article className="stat-card">
            <span className="eyebrow">Preset</span>
            <strong>{settings?.active_date_preset ?? "Week (Mon-Sun)"}</strong>
            <span>
              Back {settings?.range_back_days ?? 0} / Forward {settings?.range_forward_days ?? 0}
            </span>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Resolved range</span>
            <strong>{buildRangeLabel(resolvedRange.start, resolvedRange.end)}</strong>
            <span>{statusMessage}</span>
          </article>
          {summary ? (
            <>
              <article className="stat-card">
                <span className="eyebrow">Selected-range P&amp;L</span>
                <strong>{formatMoney(summary.profitQuickView.overallPnl)}</strong>
                <span>Workbook reporting value inside the resolved range</span>
              </article>
              <article className="stat-card">
                <span className="eyebrow">Retained profit</span>
                <strong>{formatMoney(summary.reportingModel.selectedRange.retainedProfit)}</strong>
                <span>After workbook cash-adjustment report rules</span>
              </article>
              <article className="stat-card">
                <span className="eyebrow">Open current / settled final</span>
                <strong>
                  {formatMoney(summary.reportingModel.selectedRange.openCurrentValue)} /{" "}
                  {formatMoney(summary.reportingModel.selectedRange.settledFinalValue)}
                </strong>
                <span>Current value stays separate from settled value</span>
              </article>
              <article className="stat-card">
                <span className="eyebrow">
                  {isReports ? "Formal report periods" : "Cash snapshot"}
                </span>
                <strong>
                  {isReports
                    ? `${summary.reportingModel.formalReports.weeklyPeriods}W / ${summary.reportingModel.formalReports.monthlyPeriods}M`
                    : formatMoney(summary.accountQuickView.cashSnapshot)}
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
          <section className="content-panel stack">
            <div className="panel-header">
              <h2>Selected-range module mix</h2>
            </div>
            <section className="stat-strip" aria-label="Workbook module mix">
              <article className="stat-card">
                <span className="eyebrow">Sportsbook</span>
                <strong>{formatMoney(summary.profitQuickView.sportsbook.reportingValue)}</strong>
                <span>
                  Open/current {formatMoney(summary.profitQuickView.sportsbook.currentValue)} • Final{" "}
                  {formatMoney(summary.profitQuickView.sportsbook.finalValue)}
                </span>
              </article>
              <article className="stat-card">
                <span className="eyebrow">Free Bets</span>
                <strong>{formatMoney(summary.profitQuickView.freeBets.reportingValue)}</strong>
                <span>
                  Open/current {formatMoney(summary.profitQuickView.freeBets.currentValue)} • Final{" "}
                  {formatMoney(summary.profitQuickView.freeBets.finalValue)}
                </span>
              </article>
              <article className="stat-card">
                <span className="eyebrow">Casino</span>
                <strong>{formatMoney(summary.profitQuickView.casino.reportingValue)}</strong>
                <span>Resolved from casino net P&amp;L rows</span>
              </article>
              <article className="stat-card">
                <span className="eyebrow">Cash Adjustments</span>
                <strong>{formatMoney(summary.betsQuickView.selectedRangeCashAdjustments)}</strong>
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
                <span className="eyebrow">Cash snapshot</span>
                <strong>{formatMoney(summary.accountQuickView.cashSnapshot)}</strong>
                <span>
                  Bookie {formatMoney(summary.accountQuickView.bookieBalance)} • Exchange{" "}
                  {formatMoney(summary.accountQuickView.exchangeBalance)} • Bank{" "}
                  {formatMoney(summary.accountQuickView.bankBalance)}
                </span>
              </article>
              <article className="stat-card">
                <span className="eyebrow">Selected-range P&amp;L</span>
                <strong>{formatMoney(summary.profitQuickView.overallPnl)}</strong>
                <span>
                  Sportsbook {formatMoney(summary.profitQuickView.sportsbook.reportingValue)} •
                  Free Bets {formatMoney(summary.profitQuickView.freeBets.reportingValue)} • Casino{" "}
                  {formatMoney(summary.profitQuickView.casino.reportingValue)}
                </span>
              </article>
              <article className="stat-card">
                <span className="eyebrow">Retained profit</span>
                <strong>{formatMoney(summary.reportingModel.selectedRange.retainedProfit)}</strong>
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
              </article>
              <article className="stat-card">
                <span className="eyebrow">Open current value</span>
                <strong>{formatMoney(summary.profitQuickView.openCurrentValue)}</strong>
                <span>Settled/final {formatMoney(summary.profitQuickView.settledFinalValue)}</span>
              </article>
              <article className="stat-card">
                <span className="eyebrow">Liability</span>
                <strong>{formatMoney(summary.betsQuickView.currentLiability)}</strong>
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
              </article>
            </section>
          )}

          {isDashboardLike && (
            <section className="content-panel stack">
              <div className="panel-header">
                <h2>Selected-range activity</h2>
              </div>
              <section className="stat-strip" aria-label="Selected-range activity">
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
                      ? formatDisplayDate(summary.activityQuickView.latestActivityDate)
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
                      <td className="align-end">{formatMoney(row.reportingValue)}</td>
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
                "Total P&L",
                "Open rows",
              ],
              rows:
                summary.bookmakerBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No bookmaker breakdown rows are available for the current range.</td>
                  </tr>
                ) : (
                  summary.bookmakerBreakdown.map((row) => (
                    <tr key={row.bookmaker}>
                      <td>{row.bookmaker}</td>
                      <td className="align-end">{formatMoney(row.sportsbookPnl)}</td>
                      <td className="align-end">{formatMoney(row.freeBetPnl)}</td>
                      <td className="align-end">{formatMoney(row.casinoPnl)}</td>
                      <td className="align-end">{formatMoney(row.totalPnl)}</td>
                      <td className="align-end">{row.openRowCount}</td>
                    </tr>
                  ))
                ),
            })}

          {isDashboardLike &&
            renderAttentionTable({
              title: "Open positions due soon",
              headers: ["Module", "Reference", "Bookmaker", "Status", "Due", "Reporting value"],
              emptyText: "No open positions currently have a due date in the live profile rows.",
              emptyColSpan: 6,
              rows:
                openAttentionRows.length === 0 ? null : (
                  openAttentionRows.map((row) => (
                    <tr key={row.key}>
                      <td>{getActivityModuleLabel(row.module)}</td>
                      <td>{row.reference}</td>
                      <td>{row.owner}</td>
                      <td>{row.status}</td>
                      <td>{formatDisplayDate(row.dueDate)}</td>
                      <td className="align-end">{formatMoney(Number(row.value ?? 0))}</td>
                    </tr>
                  ))
                ),
            })}

          {isDashboardLike &&
            renderAttentionTable({
              title: "Overdue items",
              headers: ["Module", "Reference", "Bookmaker", "Status", "Due", "Reporting value"],
              emptyText: "No overdue sportsbook, free-bet, or casino rows are currently flagged.",
              emptyColSpan: 6,
              rows:
                overdueAttentionRows.length === 0 ? null : (
                  overdueAttentionRows.map((row) => (
                    <tr key={row.key}>
                      <td>{getActivityModuleLabel(row.module)}</td>
                      <td>{row.reference}</td>
                      <td>{row.owner}</td>
                      <td>{row.status}</td>
                      <td>{formatDisplayDate(row.dueDate)}</td>
                      <td className="align-end">{formatMoney(Number(row.value ?? 0))}</td>
                    </tr>
                  ))
                ),
            })}

          {isDashboardLike && (
            <>
            <section className="content-panel stack">
              <div className="panel-header">
                <h2>Selected-range cash adjustments</h2>
              </div>
              <section className="stat-strip" aria-label="Cash adjustment summary">
                <article className="stat-card">
                  <span className="eyebrow">Selected range</span>
                  <strong>{formatMoney(summary.betsQuickView.selectedRangeCashAdjustments)}</strong>
                    <span>Range-visible cash movement</span>
                </article>
                  <article className="stat-card">
                    <span className="eyebrow">Top ups</span>
                    <strong>{formatMoney(summary.cashAdjustmentBreakdown.topUps)}</strong>
                    <span>Included in cash movement only</span>
                  </article>
                  <article className="stat-card">
                    <span className="eyebrow">Deductions and subscriptions</span>
                    <strong>
                      {formatMoney(summary.cashAdjustmentBreakdown.deductionsAndSubscriptions)}
                    </strong>
                    <span>Feeds retained-profit reporting</span>
                  </article>
                <article className="stat-card">
                  <span className="eyebrow">Retained profit</span>
                  <strong>{formatMoney(summary.cashAdjustmentBreakdown.retainedProfit)}</strong>
                    <span>Workbook retained-profit output</span>
                </article>
              </section>
            </section>

              <section className="content-panel stack">
                <div className="panel-header">
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
                            <td>{row.bookmaker}</td>
                            <td>{row.status}</td>
                            <td>{formatDisplayDate(row.expiry_datetime)}</td>
                            <td className="align-end">{formatMoney(Number(row.reporting_value ?? 0))}</td>
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
                  <span>Settings-owned workbook cadence</span>
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
                          <td>{row.lastOfferActivityAt ? formatDisplayDate(row.lastOfferActivityAt) : "—"}</td>
                          <td>{row.lastMugBetAt ? formatDisplayDate(row.lastMugBetAt) : "—"}</td>
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
                          <td>{formatDisplayDate(row.date)}</td>
                          <td className="align-end">{formatMoney(row.value)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {isReports && (
            <>
              <section className="stat-strip" aria-label="Report quick views">
                <article className="stat-card">
                  <span className="eyebrow">Weekly periods</span>
                  <strong>{summary.reportingModel.formalReports.weeklyPeriods}</strong>
                  <span>
                    {summary.reportingModel.formalReports.latestWeeklyLabel} •{" "}
                    {formatMoney(summary.reportingModel.formalReports.latestWeeklyRetainedProfit)}
                  </span>
                </article>
                <article className="stat-card">
                  <span className="eyebrow">Monthly periods</span>
                  <strong>{summary.reportingModel.formalReports.monthlyPeriods}</strong>
                  <span>
                    {summary.reportingModel.formalReports.latestMonthlyLabel} •{" "}
                    {formatMoney(summary.reportingModel.formalReports.latestMonthlyRetainedProfit)}
                  </span>
                </article>
                <article className="stat-card">
                  <span className="eyebrow">Yearly periods</span>
                  <strong>{summary.reportingModel.formalReports.yearlyPeriods}</strong>
                  <span>
                    {summary.reportingModel.formalReports.latestYearlyLabel} •{" "}
                    {formatMoney(summary.reportingModel.formalReports.latestYearlyRetainedProfit)}
                  </span>
                </article>
                <article className="stat-card">
                  <span className="eyebrow">Open exposure</span>
                  <strong>{formatMoney(summary.betsQuickView.currentLiability)}</strong>
                  <span>
                    Open positions {summary.betsQuickView.openBets} • Overdue{" "}
                    {summary.betsQuickView.overdueBets}
                  </span>
                </article>
              </section>
              <section className="content-panel stack">
                <div className="panel-header">
                  <h2>Selected range vs formal reports</h2>
                </div>
                <section className="stat-strip" aria-label="Report boundary summary">
                  <article className="stat-card">
                    <span className="eyebrow">Gross betting P&amp;L</span>
                    <strong>{formatMoney(summary.reportingModel.selectedRange.grossBettingPnl)}</strong>
                    <span>Selected-range module reporting values</span>
                  </article>
                  <article className="stat-card">
                    <span className="eyebrow">Retained profit</span>
                    <strong>{formatMoney(summary.reportingModel.selectedRange.retainedProfit)}</strong>
                    <span>After report-eligible withdrawals and costs</span>
                  </article>
                  <article className="stat-card">
                    <span className="eyebrow">Cash adjustments</span>
                    <strong>{formatMoney(summary.reportingModel.selectedRange.cashAdjustments)}</strong>
                    <span>Dashboard-visible movement in range</span>
                  </article>
                  <article className="stat-card">
                    <span className="eyebrow">Open / final value</span>
                    <strong>
                      {formatMoney(summary.reportingModel.selectedRange.openCurrentValue)} /{" "}
                      {formatMoney(summary.reportingModel.selectedRange.settledFinalValue)}
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
                headers: ["Module", "Reference", "Bookmaker", "Status", "Due", "Reporting value"],
                emptyText: "No open positions currently have a due date in the live profile rows.",
                emptyColSpan: 6,
                rows:
                  openAttentionRows.length === 0 ? null : (
                    openAttentionRows.map((row) => (
                      <tr key={row.key}>
                        <td>{getActivityModuleLabel(row.module)}</td>
                        <td>{row.reference}</td>
                        <td>{row.owner}</td>
                        <td>{row.status}</td>
                        <td>{formatDisplayDate(row.dueDate)}</td>
                        <td className="align-end">{formatMoney(Number(row.value ?? 0))}</td>
                      </tr>
                    ))
                  ),
              })}

              {renderAttentionTable({
                title: "Overdue watchlist",
                headers: ["Module", "Reference", "Bookmaker", "Status", "Due", "Reporting value"],
                emptyText: "No overdue sportsbook, free-bet, or casino rows are currently flagged.",
                emptyColSpan: 6,
                rows:
                  overdueAttentionRows.length === 0 ? null : (
                    overdueAttentionRows.map((row) => (
                      <tr key={row.key}>
                        <td>{getActivityModuleLabel(row.module)}</td>
                        <td>{row.reference}</td>
                        <td>{row.owner}</td>
                        <td>{row.status}</td>
                        <td>{formatDisplayDate(row.dueDate)}</td>
                        <td className="align-end">{formatMoney(Number(row.value ?? 0))}</td>
                      </tr>
                    ))
                  ),
              })}

              {renderReportTable({ title: "Weekly reports", rows: summary.weeklyReports })}
              {renderReportTable({ title: "Monthly reports", rows: summary.monthlyReports })}
              {renderReportTable({ title: "Yearly reports", rows: summary.yearlyReports })}
            </>
          )}
        </>
      ) : (
        <section className="content-panel stack">
          <p>Loading live tracker summaries.</p>
        </section>
      )}
    </section>
  );
}
