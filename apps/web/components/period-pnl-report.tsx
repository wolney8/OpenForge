"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ContextHelp } from "@/components/context-help";
import { FinancialValue } from "@/components/financial-value";
import { ReportPointChart } from "@/components/report-point-chart";
import { usePersistedState } from "@/lib/ledger-ui";
import { buildSparklinePoints } from "@/lib/dashboard-analytics";
import { filterFormalReportRows, type FormalReportFinancialFilter } from "@/lib/formal-report-filters";
import { buildFormalReportRecords, formatHumanDisplayDate, formalReportWeekKey,
  type ReportRow, type TrackerSummaryDataset } from "@/lib/tracker-summary";

type Scope = { profileId: string; label: string; dataset: TrackerSummaryDataset };
type Selection = { maximum: string; week: string; filter: string; point: string };
const defaults: Selection = { maximum: "all", week: "", filter: "all", point: "" };
const filters = ["all", "positive-pnl", "negative-pnl"];

export function PeriodPnlReport({ rows, scopes, contextKey, scopeLabel }: {
  rows: ReportRow[]; scopes: Scope[]; contextKey: string; scopeLabel?: string;
}) {
  // Existing UI preference storage, not a saved-preset/domain object.
  const [stored, setSelection] = usePersistedState<Selection>(
    "openforge-report-period-pnl:" + contextKey, defaults);
  const selection = {
    maximum: ["all", "3", "6", "12"].includes(stored?.maximum) ? stored.maximum : "all",
    week: formalReportWeekKey(stored?.week) ?? "",
    filter: filters.includes(stored?.filter) ? stored.filter : "all",
    point: typeof stored?.point === "string" ? stored.point : "",
  };
  const change = (patch: Partial<Selection>) => setSelection({ ...selection, ...patch });
  const visible = filterFormalReportRows({ rows,
    maximumPeriods: selection.maximum === "all" ? null : Number(selection.maximum),
    periodKey: selection.week, financialFilter: selection.filter as FormalReportFinancialFilter,
    feeValue: () => 0, feeReviewRequired: () => false,
  }).toSorted((a, b) => a.periodKey.localeCompare(b.periodKey));
  const points = visible.map((row) => ({ key: row.periodKey,
    label: "Week commencing " + formatHumanDisplayDate(row.periodKey, false), value: row.totalPnl }));
  const foundIndex = points.findIndex((point) => point.key === selection.point);
  const selectedIndex = foundIndex < 0 ? points.length - 1 : foundIndex;
  const selected = points[selectedIndex];
  const records = useMemo(() => scopes.flatMap((scope) => buildFormalReportRecords(scope.dataset)
    .map((row) => ({ ...row, profileId: scope.profileId, profileLabel: scope.label }))), [scopes]);
  const pointRecords = records.filter((row) => row.weekKey === selected?.key && row.component !== "funding");
  const bettingRecords = pointRecords.filter((row) => row.component !== "costs" && row.component !== "withdrawals");
  const cashRecords = pointRecords.filter((row) => row.component === "costs" || row.component === "withdrawals");
  const total = (field: "totalPnl" | "costs" | "withdrawals" | "retainedProfit") =>
    visible.reduce((sum, row) => sum + row[field], 0);
  const graph = buildSparklinePoints(points, true);
  const recordList = (list: typeof records) => <ul>{list.map((row) => <li key={row.profileId + ":" + row.module + ":" + row.id}>
    <Link href={`/profiles/${row.profileId}/tracker/${row.module}?search=${encodeURIComponent(row.id)}&source=report-point`}>
      <span>{row.profileLabel} · {row.label} · {formatHumanDisplayDate(row.date.toISOString(), false)}</span>
      <FinancialValue animate={false} value={row.value} />
    </Link>
  </li>)}</ul>;
  return <section className="content-subpanel stack" aria-label="Period P&L" data-pd-id="reports.period-pnl">
    <div className="section-heading-row formal-report-section-heading">
      <h3>Period P&amp;L <ContextHelp label="About period P&L" text="Weekly betting P&L before management and investment fees. Sportsbook and Free Bets use their recorded settlement date; Free Bets include Placed and Settled rows. Casino uses its settling date; Extra Place uses its placed date. Eligible current values are included, so this is not a settled-only report. Commission and Casino costs already included in row values are not deducted twice. Funding and History are not betting profit. Signed cash costs and withdrawals are separate in retained profit." /></h3>
      <div className="compact-report-controls formal-report-section-controls">
        <label className="m3-picker-field"><span className="m3-picker-label">Period range</span><span className="m3-picker-control">
          <span aria-hidden="true" className="material-symbols-outlined">date_range</span>
          <select aria-label="P&L period range" value={selection.maximum}
            disabled={Boolean(selection.week)} onChange={(e) => change({ maximum: e.target.value, point: "" })}>
            <option value="all">All weeks</option>{["3", "6", "12"].map((n) => <option key={n} value={n}>Latest {n} weeks</option>)}
          </select></span></label>
        <label className="m3-picker-field"><span className="m3-picker-label">Week containing</span><span className="m3-picker-control">
          <span aria-hidden="true" className="material-symbols-outlined">calendar_month</span>
          <input aria-label="P&L week containing" type="date" value={selection.week}
            onChange={(e) => change({ week: e.target.value, point: "" })} /></span></label>
        <label className="m3-picker-field"><span className="m3-picker-label">Results</span><span className="m3-picker-control">
          <span aria-hidden="true" className="material-symbols-outlined">filter_alt</span>
          <select aria-label="P&L results" value={selection.filter} onChange={(e) => change({ filter: e.target.value, point: "" })}>
            <option value="all">All results</option><option value="positive-pnl">Positive P&amp;L</option><option value="negative-pnl">Negative P&amp;L</option>
          </select></span></label>
      </div>
    </div>
    <p className="field-hint">Weekly betting P&amp;L · before management fees · includes eligible current values.
      {" "}Scope: {scopeLabel ?? (scopes.map((scope) => scope.label).join(", ") || "No Profiles")}.
      {" "}{selection.week ? "Week commencing " + formatHumanDisplayDate(selection.week, false) + " (Monday–Sunday)." : "All selected weeks (Monday–Sunday)."}
    </p>
    <dl className="dashboard-focus-list">
      <div><dt>Betting P&amp;L</dt><dd data-pd-id="reports.period-pnl.total"><FinancialValue animate={false} value={total("totalPnl")} /></dd></div>
      <div><dt>Cash costs</dt><dd><FinancialValue animate={false} value={total("costs")} /></dd></div>
      <div><dt>Withdrawals</dt><dd><FinancialValue animate={false} value={total("withdrawals")} /></dd></div>
      <div><dt>Retained profit</dt><dd data-pd-id="reports.period-pnl.retained"><FinancialValue animate={false} value={total("retainedProfit")} /></dd></div>
    </dl>
    {points.length ? <ReportPointChart {...graph} label="Weekly betting P&L points" points={points}
      selectedIndex={selectedIndex} onSelect={(index) => change({ point: points[index].key })}>
      <section className="dashboard-chart-drilldown" aria-label={"Betting records for " + selected?.label} data-pd-id="reports.period-pnl.records">
        <h4>Betting records in this point</h4>
        {bettingRecords.length ? recordList(bettingRecords) : <p className="muted-text">No betting records in this week.</p>}
        {cashRecords.length ? <details><summary>Cash costs and withdrawals — separate from betting P&amp;L</summary>{recordList(cashRecords)}</details> : null}
      </section>
    </ReportPointChart> : <p role="status">No report records match this period and result filter.</p>}
  </section>;
}
