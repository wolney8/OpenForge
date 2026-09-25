"use client";

import { useCallback, useState } from "react";
import { FinancialValue } from "@/components/financial-value";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { apiBaseUrl } from "@/lib/api";
import {
  financialHistoryOperationLabel,
  historyEventSummary,
  snapshotFinancialValue,
  type FinancialHistoryEvent,
  type FinancialHistoryLedger,
} from "@/lib/financial-history";
import { commissionRatioToPercentage } from "@/lib/commission-input";
import { formatHumanDisplayDate } from "@/lib/tracker-summary";

type FinancialHistoryPanelProps = {
  activityId: string;
  ledger: FinancialHistoryLedger;
  profileId: string;
};

function RecordedMultiLayFills({ snapshot }: { snapshot: Record<string, unknown> | null }) {
  let legs: Array<{ id: string; label: string; execution?: import("@/components/multi-lay-actual-editor").MultiLayExecution }>;
  try { legs = JSON.parse(String(snapshot?.multi_lay_outcomes_json ?? "[]")); } catch { return null; }
  if (!Array.isArray(legs)) return null;
  const actual = legs.find(l => l && typeof l === "object" && l.id === "outcome1")?.execution;
  if (actual?.version !== "multi-lay-actual-v1" || !Array.isArray(actual.fills) || actual.fills.some(f => !f || typeof f.stake !== "string" || typeof f.odds !== "string" || !Number.isFinite(Number(f.stake)))) return null;
  return <details className="stack-tight"><summary>Recorded fills</summary>
    <p>{String(snapshot?.exchange_name ?? "Exchange")} · {actual.market} · Market commission {commissionRatioToPercentage(actual.commission)}%</p>
    <div className="table-scroll"><table className="data-table"><thead><tr><th>Outcome</th><th>Matched stake</th><th>Actual odds</th></tr></thead>
      <tbody>{actual.fills.map(fill => <tr key={fill.id}><td>{legs.find(l => l.id === fill.outcomeId)?.label ?? fill.outcomeId}</td><td><FinancialValue animate={false} value={Number(fill.stake)} /></td><td>{fill.odds}</td></tr>)}</tbody>
    </table></div>
    {actual.fills.length === 0 ? <p>No recorded fills.</p> : null}
  </details>;
}

export function FinancialHistoryPanel({ activityId, ledger, profileId }: FinancialHistoryPanelProps) {
  const [events, setEvents] = useState<FinancialHistoryEvent[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (loading || events) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `${apiBaseUrl}/profiles/${profileId}/financial-history/${ledger}/${activityId}`,
        { cache: "no-store" }
      );
      if (!response.ok) throw new Error("History could not be loaded");
      setEvents((await response.json()) as FinancialHistoryEvent[]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "History could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [activityId, events, ledger, loading, profileId]);

  return (
    <details
      className="content-subpanel stack-tight financial-history-panel"
      data-pd-id={`${ledger}.editor.history`}
      onToggle={(event) => {
        if (event.currentTarget.open) void load();
      }}
    >
      <summary>
        <span>History</span>
        {events ? <span className="table-chip">{events.length}</span> : null}
      </summary>
      <p className="field-hint">
        History explains how this record changed. Reports use the current governed result once.
      </p>
      {loading ? <LedgerLoadingIndicator label="Loading financial history" /> : null}
      {error ? (
        <div className="stack-tight" role="alert">
          <p className="field-validation-text">{error}</p>
          <button className="button-link compact-action" onClick={() => { setEvents(null); void load(); }} type="button">
            Try again
          </button>
        </div>
      ) : null}
      {events?.length === 0 ? (
        <p className="empty-state compact-empty-state">No governed changes have been recorded yet.</p>
      ) : null}
      {events?.length ? (
        <ol className="financial-history-list">
          {events.map((event) => {
            const before = snapshotFinancialValue(ledger, event.before_snapshot);
            const after = snapshotFinancialValue(ledger, event.after_snapshot);
            return (
              <li className="financial-history-event" key={event.history_id}>
                <div className="financial-history-event-heading">
                  <strong>{financialHistoryOperationLabel(event.operation)}</strong>
                  <time dateTime={event.recorded_at}>{formatHumanDisplayDate(event.recorded_at, true)}</time>
                </div>
                <p>{historyEventSummary(event)}</p>
                {after !== null ? (
                  <div className="financial-history-values">
                    {before !== null && before !== after ? (
                      <span>Previous <FinancialValue animate={false} value={before} /></span>
                    ) : null}
                    <span>{event.operation === "corrected" ? "Corrected result" : "Recorded value"} <FinancialValue animate={false} value={after} /></span>
                  </div>
                ) : null}
                {ledger === "sportsbook" ? <RecordedMultiLayFills snapshot={event.after_snapshot} /> : null}
                {event.reason ? <p><span className="summary-label">Reason</span> {event.reason}</p> : null}
              </li>
            );
          })}
        </ol>
      ) : null}
    </details>
  );
}
