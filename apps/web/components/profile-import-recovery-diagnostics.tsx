"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { StatusToast } from "@/components/status-toast";
import { apiBaseUrl } from "@/lib/api";
import { invalidateCachedJson } from "@/lib/client-json-cache";
import { PROFILE_DIRECTORY_UPDATED_EVENT } from "@/lib/recent-profiles";
import { beginRouteTransition } from "@/lib/shell-loading";

type RecoveryDiagnostics = {
  profile_id: string;
  profile_display_name: string;
  profile_status: string;
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
  ["profile_status", "Profile status"],
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

async function responseDetail(response: Response) {
  const body = await response.json().catch(() => null) as { detail?: string } | null;
  return body?.detail || `Request failed with status ${response.status}`;
}

export function ProfileImportRecoveryDiagnostics({ profileId }: { profileId: string }) {
  const router = useRouter();
  const initialLoadStarted = useRef(false);
  const [diagnostics, setDiagnostics] = useState<RecoveryDiagnostics | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<"archive" | "delete" | null>(null);
  const [confirmation, setConfirmation] = useState<"archive" | "delete" | null>(null);
  const [message, setMessage] = useState("");
  const [diagnosticsError, setDiagnosticsError] = useState("");

  const loadDiagnostics = useCallback(async () => {
    setLoading(true);
    setDiagnosticsError("");
    try {
      const response = await fetch(
        `${apiBaseUrl}/profiles/${profileId}/workbook-imports/recovery-diagnostics`,
        { cache: "no-store", credentials: "include" },
      );
      const body = await response.json().catch(() => null) as RecoveryDiagnostics & { detail?: string } | null;
      if (!response.ok || !body) throw new Error(body?.detail ?? "Unable to load recovery diagnostics.");
      setDiagnostics(body);
    } catch (error) {
      setDiagnosticsError(
        error instanceof Error ? error.message : "Unable to load recovery diagnostics.",
      );
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    if (initialLoadStarted.current) return;
    initialLoadStarted.current = true;
    void loadDiagnostics();
  }, [loadDiagnostics]);

  async function archiveProfile() {
    if (pendingAction || confirmation !== "archive") return;
    setPendingAction("archive");
    setMessage("");
    try {
      const response = await fetch(
        `${apiBaseUrl}/fund-manager/import-recovery/${profileId}/archive`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ confirmation: "ARCHIVE PROFILE" }),
        },
      );
      if (!response.ok) throw new Error(await responseDetail(response));
      setConfirmation(null);
      setMessage("Profile archived. Permanent deletion is now available.");
      invalidateCachedJson(`${apiBaseUrl}/profiles`);
      invalidateCachedJson(`${apiBaseUrl}/profiles/${profileId}`);
      window.dispatchEvent(new CustomEvent(PROFILE_DIRECTORY_UPDATED_EVENT, { detail: { profileId } }));
      await loadDiagnostics();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Profile archive failed.");
    } finally {
      setPendingAction(null);
    }
  }

  async function permanentlyDeleteProfile() {
    if (pendingAction || confirmation !== "delete" || !diagnostics) return;
    setPendingAction("delete");
    setMessage("");
    try {
      const response = await fetch(
        `${apiBaseUrl}/fund-manager/import-recovery/${profileId}/permanent-delete`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ confirmation_name: diagnostics.profile_display_name }),
        },
      );
      if (!response.ok) throw new Error(await responseDetail(response));
      invalidateCachedJson(`${apiBaseUrl}/profiles`);
      invalidateCachedJson(`${apiBaseUrl}/profiles/${profileId}`);
      invalidateCachedJson(
        `${apiBaseUrl}/profiles/${profileId}/workbook-imports/recovery-diagnostics`,
      );
      window.dispatchEvent(new CustomEvent(PROFILE_DIRECTORY_UPDATED_EVENT, { detail: { profileId } }));
      setConfirmation(null);
      beginRouteTransition();
      router.replace("/profiles?status=Archived");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Profile deletion failed.");
      setPendingAction(null);
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
        <button aria-label="Refresh import recovery diagnostics" className="button-link icon-text-action" data-pd-id="profile-import.recovery-diagnostics.load" disabled={loading || pendingAction !== null} onClick={() => void loadDiagnostics()} type="button">
          {loading ? <span aria-hidden="true" className="button-spinner" /> : <span aria-hidden="true" className="material-symbols-outlined">troubleshoot</span>}
          <span>{loading ? "Loading" : "Refresh diagnostics"}</span>
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
          <section aria-labelledby="import-recovery-actions-title" className="content-panel stack profile-lifecycle-danger" data-pd-id="profile-import.recovery-actions">
            <div>
              <span className="eyebrow">Emergency Profile lifecycle</span>
              <h3 id="import-recovery-actions-title">Recovery actions</h3>
            </div>
            <p>
              These actions use only Profile identity and lifecycle metadata. They do not load
              Accounts, tracker summaries, ledgers, reporting, or Profile Management.
            </p>
            {diagnostics.profile_status === "Active" ? (
              <button
                className="icon-button icon-button-destructive icon-text-action"
                data-pd-id="profile-import.recovery-actions.archive"
                disabled={pendingAction !== null || loading}
                onClick={() => setConfirmation("archive")}
                type="button"
              >
                <span aria-hidden="true" className="material-symbols-outlined">archive</span>
                <span>Archive Profile</span>
              </button>
            ) : diagnostics.profile_status === "Archived" ? (
              <div className="stack">
                <p className="field-hint">
                  This Profile is Archived. Permanent deletion removes only Profile-scoped data
                  and cannot be undone.
                </p>
                <button
                  className="icon-button icon-button-destructive icon-text-action"
                  data-pd-id="profile-import.recovery-actions.delete"
                  disabled={pendingAction !== null || loading}
                  onClick={() => setConfirmation("delete")}
                  type="button"
                >
                  <span aria-hidden="true" className="material-symbols-outlined">delete</span>
                  <span>Permanently Delete Profile</span>
                </button>
              </div>
            ) : (
              <p className="field-hint">
                Emergency recovery supports Active → Archived → permanently deleted. Current
                status: {diagnostics.profile_status}.
              </p>
            )}
          </section>
        </>
      ) : diagnosticsError ? (
        <p className="error-text" role="alert">{diagnosticsError}</p>
      ) : (
        <p className="field-hint">Loading Profile identity and import recovery metadata.</p>
      )}
      <ConfirmationDialog
        busy={pendingAction !== null}
        busyLabel={confirmation === "archive" ? "Archiving" : "Deleting"}
        confirmLabel={confirmation === "archive" ? "Archive Profile" : "Permanently Delete Profile"}
        confirmationLabel="Profile name"
        confirmationText={confirmation === "delete" ? diagnostics?.profile_display_name : undefined}
        description={confirmation === "archive"
          ? `Archive ${diagnostics?.profile_display_name ?? "this Profile"}? The Profile becomes read-only and permanent deletion becomes available.`
          : `Permanently delete ${diagnostics?.profile_display_name ?? "this Profile"} and all Profile-scoped financial, import, and audit data? This cannot be undone.`}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => confirmation === "archive" ? void archiveProfile() : void permanentlyDeleteProfile()}
        open={confirmation !== null}
        title={confirmation === "archive" ? "Archive Profile?" : "Delete Profile permanently?"}
      />
    </section>
  );
}
