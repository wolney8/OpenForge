"use client";

import { useState } from "react";

import { StatusToast } from "@/components/status-toast";
import { apiBaseUrl } from "@/lib/api";

type RecoveryDiagnostics = {
  profile_id: string;
  profile_display_name: string;
  import_run_id?: string;
  execution_id?: string;
  attempt_number?: number;
  import_status?: string;
  reconciliation_status?: string;
  operational_health_status?: string;
  checkpoint_id?: string;
  checkpoint_status?: string;
  checkpoint_checksum?: string;
  recorded_post_import_checksum?: string;
  current_profile_checksum: string;
  current_matches_post_import_checksum?: boolean;
  post_import_profile_drift_detected?: boolean;
  drift_evidence_status?: string;
  rollback_available?: boolean;
  active_write_audit_row_count?: number;
  execution_running: boolean;
  import_started_at?: string;
  import_completed_at?: string;
  import_rolled_back_at?: string;
  rollback_conclusion: string;
  rollback_reason: string;
  drift?: Array<{
    domain: string;
    row_id: string;
    operation: string;
    timestamp: string;
    actor: string;
    source: string;
  }>;
  attempts?: Array<{
    execution_id: string;
    attempt_number: number;
    status: string;
    reconciliation_status: string;
    operational_health_status: string;
    checkpoint_id?: string;
    checkpoint_status?: string;
    rollback_status: string;
    legacy_ambiguous: boolean;
    is_latest_attempt: boolean;
    started_at: string;
    completed_at: string;
  }>;
};

const fields: Array<[keyof RecoveryDiagnostics, string]> = [
  ["profile_id", "Profile ID"],
  ["profile_display_name", "Profile"],
  ["import_run_id", "ImportRun ID"],
  ["execution_id", "Execution ID"],
  ["attempt_number", "Latest attempt"],
  ["import_status", "Import status"],
  ["reconciliation_status", "Reconciliation"],
  ["operational_health_status", "Operational health"],
  ["checkpoint_id", "Checkpoint ID"],
  ["checkpoint_status", "Checkpoint status"],
  ["checkpoint_checksum", "Checkpoint checksum"],
  ["recorded_post_import_checksum", "Recorded post-import checksum"],
  ["current_profile_checksum", "Current Profile checksum"],
  ["current_matches_post_import_checksum", "Current checksum matches post-import"],
  ["post_import_profile_drift_detected", "Post-import Profile drift detected"],
  ["drift_evidence_status", "Row-level drift evidence"],
  ["rollback_available", "Rollback available"],
  ["active_write_audit_row_count", "Active write-audit rows"],
  ["execution_running", "Execution running"],
  ["import_started_at", "Import started"],
  ["import_completed_at", "Import completed"],
  ["import_rolled_back_at", "Rollback completed"],
];

function display(value: RecoveryDiagnostics[keyof RecoveryDiagnostics] | undefined): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function ProfileImportRecoveryDiagnostics({ profileId }: { profileId: string }) {
  const [diagnostics, setDiagnostics] = useState<RecoveryDiagnostics | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadDiagnostics() {
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${apiBaseUrl}/profiles/${profileId}/workbook-imports/recovery-diagnostics`,
        { cache: "no-store", credentials: "include" },
      );
      const body = await response.json().catch(() => null) as RecoveryDiagnostics & { detail?: string } | null;
      if (!response.ok || !body) throw new Error(body?.detail ?? "Unable to load recovery diagnostics.");
      setDiagnostics(body);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load recovery diagnostics.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby="import-recovery-diagnostics-title" className="content-subpanel stack profile-import-recovery-diagnostics" data-pd-id="profile-import.recovery-diagnostics">
      <StatusToast message={message} onDismiss={() => setMessage("")} />
      <div className="workflow-panel-header">
        <div>
          <span className="eyebrow">Fund Manager only</span>
          <h2 id="import-recovery-diagnostics-title">Recovery diagnostics</h2>
          <p className="field-hint">Read-only rollback-safety metadata for this Profile&apos;s latest workbook import.</p>
        </div>
        <button aria-label="Load import recovery diagnostics" className="button-link icon-text-action" data-pd-id="profile-import.recovery-diagnostics.load" disabled={loading} onClick={() => void loadDiagnostics()} type="button">
          {loading ? <span aria-hidden="true" className="button-spinner" /> : <span aria-hidden="true" className="material-symbols-outlined">troubleshoot</span>}
          <span>{loading ? "Loading" : "Load diagnostics"}</span>
        </button>
      </div>
      {diagnostics ? (
        <>
          <section aria-label="Rollback conclusion" className={`table-chip ${diagnostics.rollback_conclusion === "ROLLBACK SAFE" ? "table-chip-success" : diagnostics.rollback_conclusion.includes("LOCKED") ? "table-chip-danger" : "table-chip-neutral"}`} data-pd-id="profile-import.recovery-diagnostics.conclusion">
            {diagnostics.rollback_conclusion}
          </section>
          <p className="field-hint">{diagnostics.rollback_reason}</p>
          <dl className="profile-future-settings-list" data-pd-id="profile-import.recovery-diagnostics.fields">
            {fields.map(([key, label]) => (
              <div className="profile-future-setting-row" key={key}>
                <dt>{label}</dt>
                <dd className={`profile-import-recovery-diagnostics-value${key.includes("checksum") || key.endsWith("_id") ? " spreadsheet-row-id" : ""}`}>
                  {display(diagnostics[key])}
                </dd>
              </div>
            ))}
          </dl>
          {diagnostics.drift?.length ? <section aria-labelledby="import-recovery-drift-title" className="stack" data-pd-id="profile-import.recovery-diagnostics.drift">
            <div>
              <h3 id="import-recovery-drift-title">Post-import Profile drift</h3>
              <p className="field-hint">User attribution is shown only when a matching audit record identifies an actor.</p>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr><th scope="col">Domain</th><th scope="col">Row ID</th><th scope="col">Change</th><th scope="col">Timestamp</th><th scope="col">Actor / source</th></tr></thead>
                <tbody>{diagnostics.drift.map((change) => <tr key={`${change.domain}:${change.row_id}:${change.operation}`}>
                  <td>{change.domain}</td>
                  <td><span className="spreadsheet-row-id" title={change.row_id}>{change.row_id}</span></td>
                  <td>{change.operation}</td>
                  <td>{display(change.timestamp)}</td>
                  <td>{change.actor || change.source || "Unattributed"}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </section> : null}
          <section aria-labelledby="import-recovery-attempt-history-title" className="stack" data-pd-id="profile-import.recovery-diagnostics.attempt-history">
            <div>
              <h3 id="import-recovery-attempt-history-title">Attempt history</h3>
              <p className="field-hint">Each attempt retains its own execution, checkpoint, reconciliation and rollback state.</p>
            </div>
            {(diagnostics.attempts ?? []).map((attempt) => (
              <article className="content-subpanel stack" data-pd-id={`profile-import.recovery-diagnostics.attempt-${attempt.attempt_number}`} key={attempt.execution_id}>
                <div className="workflow-panel-header">
                  <div>
                    <span className="eyebrow">{attempt.is_latest_attempt ? "Current / latest attempt" : "Historical attempt"}</span>
                    <h4>Attempt {attempt.attempt_number}</h4>
                  </div>
                  {attempt.legacy_ambiguous ? <span className="table-chip table-chip-neutral">Legacy history — attempt boundaries unavailable</span> : null}
                </div>
                <dl className="profile-future-settings-list">
                  {([
                    ["Execution ID", attempt.execution_id],
                    ["Status", attempt.status],
                    ["Checkpoint", attempt.checkpoint_id],
                    ["Checkpoint status", attempt.checkpoint_status],
                    ["Financial reconciliation", attempt.reconciliation_status],
                    ["Operational health", attempt.operational_health_status],
                    ["Rollback", attempt.rollback_status],
                    ["Started", attempt.started_at],
                    ["Completed", attempt.completed_at],
                  ] as Array<[string, string | undefined]>).map(([label, value]) => (
                    <div className="profile-future-setting-row" key={label}>
                      <dt>{label}</dt>
                      <dd className={label.includes("ID") || label === "Checkpoint" ? "spreadsheet-row-id" : undefined}>{display(value)}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </section>
        </>
      ) : <p className="field-hint">Load diagnostics to inspect the latest ImportRun. This action does not change Profile data.</p>}
    </section>
  );
}
