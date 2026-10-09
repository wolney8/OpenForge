"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { StatusToast } from "@/components/status-toast";
import { apiBaseUrl } from "@/lib/api";

type ExportScope = "all_history" | "this_month" | "last_month" | "last_90_days" | "custom";
type ExportState = "idle" | "generating" | "complete" | "error";

type LedgerCount = {
  included: number;
  total: number;
  outside_range: number;
  no_reporting_date: number;
  relationship_support: number;
};

type ExportSummary = {
  scope: ExportScope;
  scope_label: string;
  start_date: string | null;
  end_date: string | null;
  timezone: string;
  date_basis: string;
  counts: Record<string, LedgerCount>;
  can_export: boolean;
  legacy_profile_defaults: boolean;
  notice: string;
  problem: string;
  owner_action: string;
  issues: string[];
};

type ExportProblem = {
  message: string;
  action: string;
  actionHref: string;
  technicalDetail: string;
};

type ExportResult = {
  filename: string;
  logicalChecksum: string;
  byteChecksum: string;
};

const LEDGER_ORDER = [
  "Accounts",
  "Sportsbook Bets",
  "Free Bets",
  "Casino Offers",
  "Cash Adjustments",
  "Historical Extra Places",
];

function responseFilename(response: Response, fallback: string): string {
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match?.[1]?.trim() || fallback;
}

function scopeQuery(scope: ExportScope, startDate: string, endDate: string): string {
  const query = new URLSearchParams({ scope });
  if (scope === "custom") {
    if (startDate) query.set("start_date", startDate);
    if (endDate) query.set("end_date", endDate);
  }
  return query.toString();
}

async function responseProblem(response: Response): Promise<ExportProblem> {
  const payload = (await response.json().catch(() => null)) as {
    detail?: string | {
      message?: string;
      action?: string;
      action_href?: string;
      technical_detail?: string;
    };
  } | null;
  if (payload?.detail && typeof payload.detail === "object") {
    return {
      message: payload.detail.message || "The working workbook could not be created safely.",
      action: payload.detail.action || "Review the Profile and try again.",
      actionHref: payload.detail.action_href || "",
      technicalDetail: payload.detail.technical_detail || "",
    };
  }
  return {
    message: typeof payload?.detail === "string"
      ? payload.detail
      : `The working workbook could not be created (${response.status}).`,
    action: "No source data was changed. Review the Profile and try again.",
    actionHref: "",
    technicalDetail: "",
  };
}

export function WorkingWorkbookExport({ profileId }: { profileId: string }) {
  const [scope, setScope] = useState<ExportScope>("all_history");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [summary, setSummary] = useState<ExportSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [problem, setProblem] = useState<ExportProblem | null>(null);
  const [state, setState] = useState<ExportState>("idle");
  const [result, setResult] = useState<ExportResult | null>(null);
  const [message, setMessage] = useState("");

  const query = useMemo(
    () => scopeQuery(scope, startDate, endDate),
    [endDate, scope, startDate],
  );

  useEffect(() => {
    if (scope === "custom" && (!startDate || !endDate)) {
      return;
    }
    let cancelled = false;
    void fetch(
      `${apiBaseUrl}/profiles/${profileId}/exports/working-workbook-summary?${query}`,
      { cache: "no-store", credentials: "include" },
    ).then(async (response) => {
      if (!response.ok) throw await responseProblem(response);
      return response.json() as Promise<ExportSummary>;
    }).then((nextSummary) => {
      if (!nextSummary || typeof nextSummary !== "object" || !nextSummary.counts) {
        throw Object.assign(new Error("The export contents could not be checked."), {
          action: "No source data was changed. Try again.",
        });
      }
      if (!cancelled) setSummary(nextSummary);
    }).catch((error: unknown) => {
      if (cancelled) return;
      const nextProblem = error as Partial<ExportProblem>;
      setProblem({
        message: nextProblem.message || "The export contents could not be checked.",
        action: nextProblem.action || "No source data was changed. Try again.",
        actionHref: nextProblem.actionHref || "",
        technicalDetail: nextProblem.technicalDetail || "",
      });
      setSummary(null);
    }).finally(() => {
      if (!cancelled) setSummaryLoading(false);
    });
    return () => { cancelled = true; };
  }, [profileId, query, scope, startDate, endDate]);

  async function generateExport() {
    if (state === "generating" || !summary?.can_export) return;
    setState("generating");
    setMessage("");
    setResult(null);
    setProblem(null);
    try {
      const response = await fetch(
        `${apiBaseUrl}/profiles/${profileId}/exports/working-workbook.xlsx?${query}`,
        { cache: "no-store", credentials: "include" },
      );
      if (!response.ok) throw await responseProblem(response);
      const blob = await response.blob();
      const filename = responseFilename(response, `working-workbook-${profileId}.xlsx`);
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
      setResult({
        filename,
        logicalChecksum: response.headers.get("X-Export-Logical-Checksum") ?? "Unavailable",
        byteChecksum: response.headers.get("X-Export-Byte-Checksum") ?? "Unavailable",
      });
      setState("complete");
      setMessage(`Working workbook downloaded: ${filename}`);
    } catch (error) {
      const nextProblem = error as Partial<ExportProblem>;
      setState("error");
      setProblem({
        message: nextProblem.message || "The working workbook could not be created safely.",
        action: nextProblem.action || "No source data was changed. Review the Profile and try again.",
        actionHref: nextProblem.actionHref || "",
        technicalDetail: nextProblem.technicalDetail || "",
      });
    }
  }

  return (
    <section
      aria-busy={state === "generating" || summaryLoading || undefined}
      aria-labelledby="working-workbook-export-title"
      className="content-subpanel stack spreadsheet-transfer-panel working-workbook-export"
      data-pd-id="workbook-template-export.panel"
    >
      <StatusToast message={state === "complete" ? message : ""} onDismiss={() => setMessage("")} tone="success" />
      <div>
        <span className="eyebrow">Working workbook</span>
        <h2 id="working-workbook-export-title">Create fresh working workbook</h2>
        <p className="field-support-text" id="working-workbook-export-description">
          Create an editable workbook for this Profile. Choose the history to include and check the
          ledger counts before downloading. Creating it does not change Plum Duff data.
        </p>
      </div>

      <div className="working-workbook-scope-grid">
        <label className="field-control">
          <span>Data range</span>
          <select
            aria-describedby="working-workbook-date-basis"
            data-pd-id="workbook-template-export.scope"
            onChange={(event) => {
              const nextScope = event.target.value as ExportScope;
              setScope(nextScope);
              setSummary(null);
              setProblem(null);
              setSummaryLoading(nextScope !== "custom" || Boolean(startDate && endDate));
            }}
            value={scope}
          >
            <option value="all_history">All history</option>
            <option value="this_month">This month</option>
            <option value="last_month">Last month</option>
            <option value="last_90_days">Last 90 days</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        {scope === "custom" ? (
          <>
            <label className="field-control">
              <span>Start date</span>
              <input data-pd-id="workbook-template-export.start-date" onChange={(event) => {
                const nextStart = event.target.value;
                setStartDate(nextStart);
                setSummary(null);
                setProblem(null);
                setSummaryLoading(Boolean(nextStart && endDate));
              }} type="date" value={startDate} />
            </label>
            <label className="field-control">
              <span>End date</span>
              <input data-pd-id="workbook-template-export.end-date" onChange={(event) => {
                const nextEnd = event.target.value;
                setEndDate(nextEnd);
                setSummary(null);
                setProblem(null);
                setSummaryLoading(Boolean(startDate && nextEnd));
              }} type="date" value={endDate} />
            </label>
          </>
        ) : null}
      </div>

      <div className="working-workbook-summary" data-pd-id="workbook-template-export.summary">
        <div className="working-workbook-summary-heading">
          <div>
            <h3>Workbook contents</h3>
            <p className="field-support-text">
              {summary ? `${summary.scope_label}${summary.start_date && summary.end_date ? ` · ${summary.start_date} to ${summary.end_date}` : ""}` : "Choose a complete range to preview its contents."}
            </p>
          </div>
          {summaryLoading ? <span aria-live="polite" className="table-status" role="status">Checking workbook contents…</span> : null}
        </div>
        {summary ? (
          <>
            <dl className="working-workbook-count-grid">
              {LEDGER_ORDER.map((ledger) => {
                const count = summary.counts[ledger];
                if (!count) return null;
                return (
                  <div key={ledger}>
                    <dt>{ledger}</dt>
                    <dd>{count.included}</dd>
                    {count.total !== count.included ? <small>{count.total} total · {count.outside_range} outside range{count.no_reporting_date ? ` · ${count.no_reporting_date} without a reporting date` : ""}</small> : null}
                    {count.relationship_support ? <small>{count.relationship_support} qualifying parent {count.relationship_support === 1 ? "row" : "rows"} included to preserve Free Bet links</small> : null}
                  </div>
                );
              })}
            </dl>
            <p className="field-support-text" id="working-workbook-date-basis">{summary.date_basis}</p>
            {summary.notice ? <p className="field-support-text">{summary.notice}</p> : null}
          </>
        ) : !summaryLoading && !problem ? (
          <p className="spreadsheet-no-change">Complete the custom date range to see what will be exported.</p>
        ) : null}
      </div>

      {problem ? (
        <div className="warning-text stack-tight" data-pd-id="workbook-template-export.problem" role="alert">
          <strong>{problem.message}</strong>
          <span>{problem.action}</span>
          {problem.actionHref ? <Link className="button-link" href={problem.actionHref}>Complete Profile setup</Link> : null}
          {problem.technicalDetail ? <details><summary>Technical details</summary><code>{problem.technicalDetail}</code></details> : null}
        </div>
      ) : null}
      {!problem && summary?.problem ? (
        <div className="warning-text stack-tight" data-pd-id="workbook-template-export.problem" role="alert">
          <strong>{summary.problem}</strong>
          {summary.issues.length ? <ul>{summary.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : null}
          <span>{summary.owner_action} No source data was changed.</span>
        </div>
      ) : null}

      <div className="working-workbook-actions">
        <button
          aria-describedby="working-workbook-export-description"
          className="modal-primary-button icon-text-action"
          data-pd-id="workbook-template-export.generate"
          disabled={state === "generating" || summaryLoading || !summary?.can_export}
          onClick={() => void generateExport()}
          type="button"
        >
          {state === "generating" ? <span aria-hidden="true" className="button-spinner" /> : <span aria-hidden="true" className="material-symbols-outlined">download</span>}
          <span>{state === "generating" ? "Creating workbook" : "Create workbook"}</span>
        </button>
      </div>

      {result ? (
        <div aria-label="Working workbook download" className="spreadsheet-backup-proof" data-pd-id="workbook-template-export.verification" role="status">
          <strong>{result.filename}</strong>
          <span>The file contains the ledger rows shown above. Plum Duff data was not changed.</span>
          <details>
            <summary>Download verification</summary>
            <span className="spreadsheet-row-id">Content SHA-256: {result.logicalChecksum}</span>
            <span className="spreadsheet-row-id">File SHA-256: {result.byteChecksum}</span>
          </details>
        </div>
      ) : null}
    </section>
  );
}
