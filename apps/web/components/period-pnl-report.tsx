"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ContextHelp } from "@/components/context-help";
import { FinancialValue } from "@/components/financial-value";
import { usePersistedState } from "@/lib/ledger-ui";
import { LedgerPagination } from "@/components/ledger-pagination";
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
  const [periodPage, setPeriodPage] = useState(1);
  const [periodPageSize, setPeriodPageSize] = useState(16);
  const [recordPage, setRecordPage] = useState(1);
  const [recordPageSize, setRecordPageSize] = useState(16);
  const selection = {
    maximum: ["all", "3", "6", "12"].includes(stored?.maximum) ? stored.maximum : "all",
    week: formalReportWeekKey(stored?.week) ?? "",
    filter: filters.includes(stored?.filter) ? stored.filter : "all",
    point: typeof stored?.point === "string" ? stored.point : "",
  };
  const change = (patch: Partial<Selection>) => {
    setSelection({ ...selection, ...patch });
    setPeriodPage(1);
    setRecordPage(1);
  };
  const visible = filterFormalReportRows({ rows,
    maximumPeriods: selection.maximum === "all" ? null : Number(selection.maximum),
    periodKey: selection.week, financialFilter: selection.filter as FormalReportFinancialFilter,
    feeValue: () => 0, feeReviewRequired: () => false,
  }).toSorted((a, b) => a.periodKey.localeCompare(b.periodKey));
  const selected = visible.find((row) => row.periodKey === selection.point) ?? visible.at(-1);
  const records = useMemo(() => scopes.flatMap((scope) => buildFormalReportRecords(scope.dataset)
    .map((row) => ({ ...row, profileId: scope.profileId, profileLabel: scope.label }))), [scopes]);
  const pointRecords = records.filter((row) => row.weekKey === selected?.periodKey && row.component !== "funding");
  const bettingRecords = pointRecords.filter((row) => row.component !== "costs" && row.component !== "withdrawals");
  const cashRecords = pointRecords.filter((row) => row.component === "costs" || row.component === "withdrawals");
  const total = (field: "totalPnl" | "costs" | "withdrawals" | "retainedProfit") =>
    visible.reduce((sum, row) => sum + row[field], 0);
  const periodPageCount = Math.max(1, Math.ceil(visible.length / periodPageSize));
  const safePeriodPage = Math.min(periodPage, periodPageCount);
  const visiblePeriods = visible.slice((safePeriodPage - 1) * periodPageSize, safePeriodPage * periodPageSize);
  const recordPageCount = Math.max(1, Math.ceil(pointRecords.length / recordPageSize));
  const safeRecordPage = Math.min(recordPage, recordPageCount);
  const visibleRecords = pointRecords.slice((safeRecordPage - 1) * recordPageSize, safeRecordPage * recordPageSize);
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
    {visible.length ? <>
      <LedgerPagination ariaLabel="Period P&L Periods" currentPage={safePeriodPage} onPageChange={setPeriodPage}
        onPageSizeChange={(size) => { setPeriodPageSize(size); setPeriodPage(1); }} pageCount={periodPageCount}
        pageSize={periodPageSize} position="top" totalRows={visible.length} />
      <div className="table-shell"><table><thead><tr><th scope="col">Period</th><th scope="col">Betting P&amp;L</th><th scope="col">Cash Costs</th><th scope="col">Withdrawals</th><th scope="col">Retained Profit</th><th scope="col">Records</th></tr></thead><tbody>
        {visiblePeriods.map((row) => <tr key={row.periodKey} data-pd-id={`reports.period-pnl.period.${row.periodKey}`}>
          <td>Week commencing {formatHumanDisplayDate(row.periodKey, false)}</td><td><FinancialValue animate={false} value={row.totalPnl} /></td><td><FinancialValue animate={false} value={row.costs} /></td><td><FinancialValue animate={false} value={row.withdrawals} /></td><td><FinancialValue animate={false} value={row.retainedProfit} /></td><td><button aria-pressed={selected?.periodKey === row.periodKey} className="button-link" onClick={() => change({ point: row.periodKey })} type="button">Inspect Period</button></td>
        </tr>)}
      </tbody></table></div>
      <LedgerPagination ariaLabel="Period P&L Periods" currentPage={safePeriodPage} onPageChange={setPeriodPage}
        onPageSizeChange={(size) => { setPeriodPageSize(size); setPeriodPage(1); }} pageCount={periodPageCount}
        pageSize={periodPageSize} position="bottom" totalRows={visible.length} />
      <section className="dashboard-chart-drilldown stack" aria-label={`Records for week commencing ${selected?.periodKey}`} data-pd-id="reports.period-pnl.records">
        <h4>Selected Period Records · Week Commencing {selected ? formatHumanDisplayDate(selected.periodKey, false) : "—"}</h4>
        <p className="field-hint">{bettingRecords.length} betting records · {cashRecords.length} cash costs or withdrawals shown separately.</p>
        <LedgerPagination ariaLabel="Period P&L Records" currentPage={safeRecordPage} onPageChange={setRecordPage}
          onPageSizeChange={(size) => { setRecordPageSize(size); setRecordPage(1); }} pageCount={recordPageCount}
          pageSize={recordPageSize} position="top" totalRows={pointRecords.length} />
        <div className="table-shell"><table><thead><tr><th scope="col">Record</th><th scope="col">Profile</th><th scope="col">Type</th><th scope="col">Reporting Date</th><th scope="col">Value</th></tr></thead><tbody>
          {visibleRecords.map((row) => <tr key={row.profileId + ":" + row.module + ":" + row.id}><td><Link href={`/profiles/${row.profileId}/tracker/${row.module}?search=${encodeURIComponent(row.id)}&source=report-point`}>{row.label}</Link></td><td>{row.profileLabel}</td><td>{row.component === "costs" || row.component === "withdrawals" ? "Cash movement" : "Betting"}</td><td>{formatHumanDisplayDate(row.date.toISOString(), false)}</td><td><FinancialValue animate={false} value={row.value} /></td></tr>)}
          {!pointRecords.length ? <tr><td colSpan={5}>No records are available for this period.</td></tr> : null}
        </tbody></table></div>
        <LedgerPagination ariaLabel="Period P&L Records" currentPage={safeRecordPage} onPageChange={setRecordPage}
          onPageSizeChange={(size) => { setRecordPageSize(size); setRecordPage(1); }} pageCount={recordPageCount}
          pageSize={recordPageSize} position="bottom" totalRows={pointRecords.length} />
      </section>
    </> : <p role="status">No report records match this period and result filter.</p>}
  </section>;
}
