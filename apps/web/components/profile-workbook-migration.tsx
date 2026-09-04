"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { StatusToast } from "@/components/status-toast";
import { apiBaseUrl } from "@/lib/api";
import { beginRouteTransition } from "@/lib/shell-loading";

type ImportRun = {
  import_run_id: string;
  source_filename: string;
  workbook_checksum: string;
  effective_at: string;
  mapping_version: string;
  status: string;
  raw_workbook_retained: boolean;
  approved_at: string;
  completed_at: string;
  checkpoint_id: string;
  rollback_status: string;
  rolled_back_at: string;
  row_counts: Record<string, number>;
  updated_at: string;
  attempts?: Array<{
    execution_id: string;
    attempt_number: number;
    status: string;
    checkpoint_id: string;
    checkpoint_status: string;
    reconciliation_status: string;
    operational_health_status: string;
    rollback_status: string;
    legacy_ambiguous: boolean;
  }>;
};

type AnalysisResult = {
  metadata: { import_run_id: string };
};

const MAX_WORKBOOK_BYTES = 3 * 1024 * 1024;

function localDateTimeValue(date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

async function fileToBase64(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The selected workbook could not be read."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

async function apiError(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null) as { detail?: string | { msg?: string }[] } | null;
  if (typeof body?.detail === "string") return body.detail;
  if (Array.isArray(body?.detail)) return body.detail.map((item) => item.msg ?? "Invalid value").join(". ");
  return fallback;
}

function runStatus(value: string): string {
  return value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toLocaleUpperCase());
}

function runActionLabel(run: ImportRun): string {
  if (run.status === "READY_APPROVED") return "Import to Profile";
  if (["ANALYSING", "ANALYSED", "APPROVING", "IMPORTING", "RECONCILING"].includes(run.status)) return "View progress";
  if (["COMPLETE", "POST_IMPORT_RECONCILIATION_FAILED"].includes(run.status)) {
    return "Reconciliation";
  }
  if (["REVIEW_COMPLETE", "DRY_RUN_READY", "READY"].includes(run.status)) return "Approve dry run";
  return "Review";
}

async function fetchRuns(profileId: string, signal?: AbortSignal): Promise<ImportRun[]> {
  const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/workbook-imports`, {
    cache: "no-store",
    credentials: "include",
    signal,
  });
  if (!response.ok) {
    throw new Error(await apiError(response, "Unable to load workbook reviews."));
  }
  return response.json() as Promise<ImportRun[]>;
}

export function ProfileWorkbookMigration({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [runs, setRuns] = useState<ImportRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysing, setAnalysing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [effectiveAt, setEffectiveAt] = useState(localDateTimeValue);
  const [deleteRun, setDeleteRun] = useState<ImportRun | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchRuns(profileId, controller.signal)
      .then(setRuns)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMessage(error instanceof Error ? error.message : "Unable to load workbook reviews.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [profileId]);

  function chooseWorkbook(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    if (selected && !selected.name.toLocaleLowerCase().endsWith(".xlsx")) {
      event.target.value = "";
      setFile(null);
      setMessage("Select an .xlsx workbook.");
      return;
    }
    if (selected && selected.size > MAX_WORKBOOK_BYTES) {
      event.target.value = "";
      setFile(null);
      setMessage("Workbook must be no larger than 3 MB.");
      return;
    }
    setFile(selected);
  }

  async function analyseWorkbook() {
    if (!file || !effectiveAt) return;
    setAnalysing(true);
    try {
      const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/workbook-imports/analyse`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_filename: file.name,
          workbook_base64: await fileToBase64(file),
          effective_at: new Date(effectiveAt).toISOString(),
        }),
      });
      if (!response.ok) {
        throw new Error(await apiError(response, "Unable to analyse the workbook."));
      }
      const result = await response.json() as AnalysisResult;
      beginRouteTransition();
      router.push(`/profiles/${profileId}/imports/${result.metadata.import_run_id}/review`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to analyse the workbook.");
    } finally {
      setAnalysing(false);
    }
  }

  async function deleteReview() {
    if (!deleteRun || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch(
        `${apiBaseUrl}/profiles/${profileId}/workbook-imports/${deleteRun.import_run_id}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!response.ok) {
        throw new Error(await apiError(response, "Unable to delete the workbook review."));
      }
      setRuns(await fetchRuns(profileId));
      setMessage("Workbook review deleted. Profile data was not changed.");
      setDeleteRun(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Unable to delete the workbook review.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <StatusToast message={message} onDismiss={() => setMessage("")} />
      <section className="content-subpanel stack" data-pd-id="profile-workbook-migration.section">
        <div className="workflow-panel-header">
          <div>
            <span className="eyebrow">Profile migration</span>
            <h2>Workbook dry run</h2>
          </div>
        </div>
        <div className="form-grid">
          <label className="field-control">
            <span>Workbook (.xlsx)</span>
            <input accept=".xlsx" aria-label="Choose Profile workbook" onChange={chooseWorkbook} type="file" />
          </label>
          <label className="field-control">
            <span>Workbook effective date and time</span>
            <input onChange={(event) => setEffectiveAt(event.target.value)} type="datetime-local" value={effectiveAt} />
          </label>
        </div>
        <div className="tracker-nav tracker-nav-right">
          <button className="modal-primary-button icon-text-action" disabled={!file || !effectiveAt || analysing} onClick={() => void analyseWorkbook()} type="button">
            {analysing ? <span aria-hidden="true" className="button-spinner" /> : <span aria-hidden="true" className="material-symbols-outlined">fact_check</span>}
            <span>{analysing ? "Analysing" : "Analyse workbook"}</span>
          </button>
        </div>
        {loading ? <LedgerLoadingIndicator label="Loading workbook reviews" /> : runs.length ? (
          <div className="table-scroll">
            <table className="data-table profile-import-history-table" data-pd-id="profile-import.history-table">
              <thead><tr><th scope="col">Workbook</th><th scope="col">Effective</th><th scope="col">Status</th><th scope="col">Rows</th><th scope="col">Imported</th><th scope="col">Reconciliation / rollback</th><th scope="col">Checksum</th><th scope="col">Actions</th></tr></thead>
              <tbody>{runs.map((run) => <tr key={run.import_run_id}>
                <td><div className="table-cell-stack"><strong>{run.source_filename}</strong><span className="table-status">{run.mapping_version}</span></div></td>
                <td>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(run.effective_at))}</td>
                <td><span className="table-chip table-chip-neutral">{runStatus(run.status)}</span></td>
                <td><div className="table-cell-stack"><strong>{Object.values(run.row_counts ?? {}).reduce((total, value) => total + value, 0)}</strong><span className="table-status">{Object.entries(run.row_counts ?? {}).filter(([, value]) => value).map(([name, value]) => `${name.replaceAll("_", " ")} ${value}`).join(" · ") || "Awaiting analysis"}</span></div></td>
                <td>{run.completed_at ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(run.completed_at)) : "—"}</td>
                <td>
                  <div className="table-cell-stack"><span className={`table-chip ${run.status === "COMPLETE" ? "table-chip-success" : run.status === "POST_IMPORT_RECONCILIATION_FAILED" ? "table-chip-danger" : "table-chip-neutral"}`}>{run.status === "COMPLETE" ? "Passed" : run.status === "POST_IMPORT_RECONCILIATION_FAILED" ? "Failed" : "Pending"}</span>
                  <span className="table-status">{run.rollback_status ? `Rollback ${run.rollback_status.toLocaleLowerCase()}` : "No import writes"}</span>
                  {run.attempts?.length ? <details className="stack-tight" data-pd-id={`profile-workbook-migration.attempts-${run.import_run_id}`}>
                    <summary>{run.attempts.length} {run.attempts.length === 1 ? "attempt" : "attempts"} · latest Attempt {run.attempts[0].attempt_number}</summary>
                    {run.attempts.map((attempt, index) => <span className="table-status" key={attempt.execution_id}>
                      <strong>{index === 0 ? "Latest · " : ""}Attempt {attempt.attempt_number}</strong> — {runStatus(attempt.status)} · checkpoint {attempt.checkpoint_status || "unavailable"} · financial {attempt.reconciliation_status || "pending"} · operational {attempt.operational_health_status || "pending"} · rollback {attempt.rollback_status || "unavailable"}{attempt.legacy_ambiguous ? " · legacy boundaries unavailable" : ""}
                    </span>)}
                  </details> : null}</div>
                </td>
                <td><span className="spreadsheet-row-id" title={run.workbook_checksum}>{run.workbook_checksum.slice(0, 12)}…</span></td>
                <td><div className="table-action-row"><Link className="button-link compact-action" href={`/profiles/${profileId}/imports/${run.import_run_id}/review`}>{runActionLabel(run)}</Link><button aria-label={`Delete review ${run.source_filename}`} className="icon-button icon-button-destructive table-action-button" disabled={["ANALYSING", "ANALYSED", "APPROVING", "IMPORTING", "RECONCILING", "COMPLETE", "POST_IMPORT_RECONCILIATION_FAILED"].includes(run.status)} onClick={() => { setDeleteError(""); setDeleteRun(run); }} title={run.completed_at ? "Imported runs remain in audit history" : `Delete review ${run.source_filename}`} type="button"><span aria-hidden="true" className="material-symbols-outlined">delete</span></button></div></td>
              </tr>)}</tbody>
            </table>
          </div>
        ) : (
          <section className="content-subpanel stack-tight" data-pd-id="profile-workbook-migration.empty">
            <strong>No workbook awaiting review</strong>
            <span>Select an .xlsx workbook above to start a dry run.</span>
          </section>
        )}
      </section>
      <ConfirmationDialog
        busy={deleting}
        busyLabel="Deleting"
        confirmLabel="Delete review"
        description={`This removes the dry run, review items, decisions and reconciliation for ${deleteRun?.source_filename ?? "this workbook"}. It does not change the source workbook or any Profile data.`}
        error={deleteError}
        onCancel={() => { setDeleteError(""); setDeleteRun(null); }}
        onConfirm={() => void deleteReview()}
        open={deleteRun !== null}
        title="Delete workbook review?"
      />
    </>
  );
}
