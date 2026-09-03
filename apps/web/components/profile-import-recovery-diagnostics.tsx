"use client";

import { useState } from "react";

import { StatusToast } from "@/components/status-toast";
import { apiBaseUrl } from "@/lib/api";

type RecoveryDiagnostics = {
  profile_id: string;
  profile_display_name: string;
  import_run_id?: string;
  execution_id?: string;
  import_status?: string;
  reconciliation_status?: string;
  checkpoint_id?: string;
  checkpoint_status?: string;
  checkpoint_checksum?: string;
  recorded_post_import_checksum?: string;
  current_profile_checksum: string;
  current_matches_post_import_checksum?: boolean;
  manual_post_import_mutation_detected?: boolean;
  rollback_available?: boolean;
  active_write_audit_row_count?: number;
  execution_running: boolean;
  import_started_at?: string;
  import_completed_at?: string;
  import_rolled_back_at?: string;
  rollback_conclusion: string;
  rollback_reason: string;
};

const fields: Array<[keyof RecoveryDiagnostics, string]> = [
  ["profile_id", "Profile ID"],
  ["profile_display_name", "Profile"],
  ["import_run_id", "ImportRun ID"],
  ["execution_id", "Execution ID"],
  ["import_status", "Import status"],
  ["reconciliation_status", "Reconciliation"],
  ["checkpoint_id", "Checkpoint ID"],
  ["checkpoint_status", "Checkpoint status"],
  ["checkpoint_checksum", "Checkpoint checksum"],
  ["recorded_post_import_checksum", "Recorded post-import checksum"],
  ["current_profile_checksum", "Current Profile checksum"],
  ["current_matches_post_import_checksum", "Current checksum matches post-import"],
  ["manual_post_import_mutation_detected", "Manual mutation detected"],
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
        </>
      ) : <p className="field-hint">Load diagnostics to inspect the latest ImportRun. This action does not change Profile data.</p>}
    </section>
  );
}
