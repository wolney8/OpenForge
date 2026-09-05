"use client";

import Link from "next/link";
import { useState } from "react";

import { StatusToast } from "@/components/status-toast";
import { apiBaseUrl } from "@/lib/api";
import { formatApiErrorBody } from "@/lib/api-error";

type RestoreReview = {
  item_id: string;
  reference_domain: string;
  reference_id: string;
  reason: string;
  allowed_resolutions: Array<"USE_CURRENT" | "REMOVE_REFERENCE">;
  resolution: "USE_CURRENT" | "REMOVE_REFERENCE" | "";
};

type RestoreRun = {
  restore_run_id: string;
  source_filename: string;
  source_byte_checksum: string;
  source_logical_checksum: string;
  format_version: string;
  restore_contract_version: string;
  source_profile_display_name: string;
  target_profile_id: string;
  target_display_name: string;
  target_profile_code: string;
  status: "REVIEW_REQUIRED" | "READY" | "RESTORING" | "COMPLETE" | "FAILED";
  reviews: RestoreReview[];
  result: {
    financial_reconciliation?: { status?: string };
    operational_reconciliation?: { status?: string };
    logical_parity?: { status?: string; source_checksum?: string; restored_checksum?: string };
  };
};

type Mutation = "idle" | "analysing" | "saving-reviews" | "restoring";

async function fileToBase64(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The selected backup could not be read."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
  const separator = dataUrl.indexOf(",");
  if (separator < 0) throw new Error("The selected backup could not be encoded.");
  return dataUrl.slice(separator + 1);
}

async function responseJson(response: Response): Promise<RestoreRun> {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(formatApiErrorBody(text, `Restore request failed (${response.status}).`));
  }
  return JSON.parse(text) as RestoreRun;
}

function resolutionLabel(value: RestoreReview["resolution"]): string {
  return value === "USE_CURRENT" ? "Use current global reference" : "Remove reference";
}

export function PortableProfileRestore() {
  const [file, setFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [profileCode, setProfileCode] = useState("");
  const [run, setRun] = useState<RestoreRun | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, RestoreReview["resolution"]>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [mutation, setMutation] = useState<Mutation>("idle");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const busy = mutation !== "idle";

  async function analyse() {
    if (busy || !file || !profileCode) return;
    setMutation("analysing");
    setError("");
    setSuccess("");
    setRun(null);
    try {
      const response = await fetch(`${apiBaseUrl}/fund-manager/portable-restores/analyse`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_filename: file.name,
          content_base64: await fileToBase64(file),
          target_display_name: displayName.trim() || null,
          target_profile_code: profileCode,
        }),
      });
      const result = await responseJson(response);
      setRun(result);
      setResolutions(Object.fromEntries(result.reviews.map((review) => [review.item_id, ""])));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The backup could not be analysed.");
    } finally {
      setMutation("idle");
    }
  }

  async function saveReviews() {
    if (!run || busy || run.reviews.some((review) => !resolutions[review.item_id])) return;
    setMutation("saving-reviews");
    setError("");
    try {
      const response = await fetch(
        `${apiBaseUrl}/fund-manager/portable-restores/${run.restore_run_id}/reviews`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decisions: run.reviews.map((review) => ({
              item_id: review.item_id,
              resolution: resolutions[review.item_id],
            })),
          }),
        },
      );
      setRun(await responseJson(response));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Review decisions could not be saved.");
    } finally {
      setMutation("idle");
    }
  }

  async function restore() {
    if (!run || run.status !== "READY" || !confirmed || busy) return;
    setMutation("restoring");
    setError("");
    try {
      const response = await fetch(
        `${apiBaseUrl}/fund-manager/portable-restores/${run.restore_run_id}/execute`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmation: "RESTORE PORTABLE PROFILE" }),
        },
      );
      const result = await responseJson(response);
      setRun(result);
      setConfirmed(false);
      setSuccess(`Fresh Profile restored: ${result.target_display_name}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The Profile restore failed.");
    } finally {
      setMutation("idle");
    }
  }

  return (
    <section
      aria-busy={busy || undefined}
      aria-labelledby="portable-profile-restore-title"
      className="content-panel stack founder-onboarding"
      data-pd-id="portable-profile-restore.page"
    >
      <StatusToast message={success} onDismiss={() => setSuccess("")} tone="success" />
      <header className="stack-tight">
        <span className="eyebrow">Fund Manager</span>
        <h1 id="portable-profile-restore-title">Restore portable Profile backup</h1>
        <p className="field-hint">
          Verify a structured portable backup, then restore it into one new Profile. Existing
          Profiles and global catalogue data are never overwritten.
        </p>
      </header>

      {!run ? (
        <section className="content-subpanel stack" data-pd-id="portable-profile-restore.upload">
          <div className="form-grid">
            <label className="field-control">
              <span>Portable backup</span>
              <input
                accept=".xlsx"
                aria-describedby="portable-restore-file-help"
                disabled={busy}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                type="file"
              />
              <small id="portable-restore-file-help">profile-portable-export-v1 XLSX only</small>
            </label>
            <label className="field-control">
              <span>New Profile name (optional)</span>
              <input
                disabled={busy}
                maxLength={120}
                onChange={(event) => setDisplayName(event.target.value)}
                value={displayName}
              />
            </label>
            <label className="field-control">
              <span>New Profile code</span>
              <input
                disabled={busy}
                maxLength={32}
                onChange={(event) =>
                  setProfileCode(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))
                }
                placeholder="RESTORED-001"
                value={profileCode}
              />
            </label>
          </div>
          <div className="tracker-nav">
            <Link className="button-link" href="/profiles">
              Cancel
            </Link>
            <button
              className="modal-primary-button icon-text-action"
              data-pd-id="portable-profile-restore.analyse"
              disabled={busy || !file || profileCode.length < 3}
              onClick={() => void analyse()}
              type="button"
            >
              {mutation === "analysing" ? (
                <span aria-hidden="true" className="button-spinner" />
              ) : (
                <span aria-hidden="true" className="material-symbols-outlined">fact_check</span>
              )}
              <span>{mutation === "analysing" ? "Verifying backup" : "Verify backup"}</span>
            </button>
          </div>
        </section>
      ) : null}

      {run ? (
        <section className="content-subpanel stack" data-pd-id="portable-profile-restore.result">
          <div className="spreadsheet-backup-proof portable-profile-export-feedback" role="status">
            <strong>{run.source_filename}</strong>
            <span>
              {run.format_version} · source Profile {run.source_profile_display_name}
            </span>
            <span className="spreadsheet-row-id">
              Logical SHA-256: {run.source_logical_checksum}
            </span>
            <span className="spreadsheet-row-id">File SHA-256: {run.source_byte_checksum}</span>
          </div>

          {run.status === "REVIEW_REQUIRED" ? (
            <section className="stack" aria-labelledby="portable-restore-review-title">
              <div>
                <span className="eyebrow">Restore review</span>
                <h2 id="portable-restore-review-title">Resolve global references</h2>
                <p className="field-hint">
                  The backup cannot replace global authorities. Choose how each missing or changed
                  reference should be handled.
                </p>
              </div>
              <div className="settings-card-grid">
                {run.reviews.map((review) => (
                  <label className="field-control" key={review.item_id}>
                    <span>
                      {review.reference_domain}: {review.reference_id}
                    </span>
                    <select
                      aria-label={`Resolution for ${review.reference_domain} ${review.reference_id}`}
                      disabled={busy}
                      onChange={(event) =>
                        setResolutions((current) => ({
                          ...current,
                          [review.item_id]: event.target.value as RestoreReview["resolution"],
                        }))
                      }
                      value={resolutions[review.item_id] ?? ""}
                    >
                      <option value="">Select a resolution</option>
                      {review.allowed_resolutions.map((resolution) => (
                        <option key={resolution} value={resolution}>
                          {resolutionLabel(resolution)}
                        </option>
                      ))}
                    </select>
                    <small>{review.reason.replaceAll("_", " ").toLowerCase()}</small>
                  </label>
                ))}
              </div>
              <button
                className="modal-primary-button icon-text-action"
                data-pd-id="portable-profile-restore.save-reviews"
                disabled={
                  busy || run.reviews.some((review) => !resolutions[review.item_id])
                }
                onClick={() => void saveReviews()}
                type="button"
              >
                {mutation === "saving-reviews" ? (
                  <span aria-hidden="true" className="button-spinner" />
                ) : (
                  <span aria-hidden="true" className="material-symbols-outlined">save</span>
                )}
                <span>{mutation === "saving-reviews" ? "Saving reviews" : "Save reviews"}</span>
              </button>
            </section>
          ) : null}

          {run.status === "READY" ? (
            <section className="stack-tight" data-pd-id="portable-profile-restore.ready">
              <span className="status-chip status-chip-success">Verified · ready to restore</span>
              <p>
                A new Profile named <strong>{run.target_display_name}</strong> with code{" "}
                <strong>{run.target_profile_code}</strong> will be created.
              </p>
              <label className="spreadsheet-confirmation-control">
                <input
                  checked={confirmed}
                  disabled={busy}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  type="checkbox"
                />
                <span>I confirm this backup should create a fresh Profile.</span>
              </label>
              <button
                className="modal-primary-button icon-text-action"
                data-pd-id="portable-profile-restore.execute"
                disabled={busy || !confirmed}
                onClick={() => void restore()}
                type="button"
              >
                {mutation === "restoring" ? (
                  <span aria-hidden="true" className="button-spinner" />
                ) : (
                  <span aria-hidden="true" className="material-symbols-outlined">restore_page</span>
                )}
                <span>{mutation === "restoring" ? "Restoring fresh Profile" : "Restore fresh Profile"}</span>
              </button>
            </section>
          ) : null}

          {run.status === "COMPLETE" ? (
            <section className="stack-tight" data-pd-id="portable-profile-restore.complete">
              <span className="status-chip status-chip-success">Restore complete</span>
              <p>
                Financial reconciliation: {run.result.financial_reconciliation?.status} ·
                Operational health: {run.result.operational_reconciliation?.status} · Logical
                parity: {run.result.logical_parity?.status}
              </p>
              <Link
                className="modal-primary-button button-link icon-text-action"
                href={`/profiles/${run.target_profile_id}/tracker/dashboard`}
              >
                <span aria-hidden="true" className="material-symbols-outlined">dashboard</span>
                View restored Profile
              </Link>
            </section>
          ) : null}
        </section>
      ) : null}

      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
