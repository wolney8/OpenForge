"use client";

import { useState } from "react";

import { StatusToast } from "@/components/status-toast";
import { apiBaseUrl } from "@/lib/api";

const OUTPUT_CLASSIFICATION =
  "STRUCTURALLY VALID WORKING-WORKBOOK EXPORT — GOOGLE RUNTIME VALIDATION PENDING";

type ExportState = "idle" | "generating" | "complete" | "error";

type ExportResult = {
  filename: string;
  formatVersion: string;
  logicalChecksum: string;
  byteChecksum: string;
  changedPartCount: string;
  unchangedPartCount: string;
  platformOnlyWarningCount: string;
};

function responseFilename(response: Response, fallback: string): string {
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match?.[1]?.trim() || fallback;
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The working workbook could not be generated.";
}

export function WorkingWorkbookExport({ profileId }: { profileId: string }) {
  const [state, setState] = useState<ExportState>("idle");
  const [result, setResult] = useState<ExportResult | null>(null);
  const [message, setMessage] = useState("");

  async function generateExport() {
    if (state === "generating") return;
    setState("generating");
    setMessage("");
    setResult(null);
    try {
      const response = await fetch(
        `${apiBaseUrl}/profiles/${profileId}/exports/working-workbook.xlsx`,
        { cache: "no-store", credentials: "include" },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          detail?: string;
        } | null;
        throw new Error(payload?.detail || `Export failed (${response.status}).`);
      }
      const blob = await response.blob();
      const filename = responseFilename(
        response,
        `working-workbook-${profileId}.xlsx`,
      );
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
        formatVersion:
          response.headers.get("X-Export-Format-Version") ??
          "workbook-template-export-v1",
        logicalChecksum:
          response.headers.get("X-Export-Logical-Checksum") ?? "Unavailable",
        byteChecksum:
          response.headers.get("X-Export-Byte-Checksum") ?? "Unavailable",
        changedPartCount:
          response.headers.get("X-Export-Changed-Part-Count") ?? "Unavailable",
        unchangedPartCount:
          response.headers.get("X-Export-Unchanged-Part-Count") ?? "Unavailable",
        platformOnlyWarningCount:
          response.headers.get("X-Export-Platform-Only-Warning-Count") ?? "Unavailable",
      });
      setState("complete");
      setMessage(`Working workbook downloaded: ${filename}`);
    } catch (error) {
      setState("error");
      setMessage(`Export failed. ${errorMessage(error)}`);
    }
  }

  return (
    <section
      aria-busy={state === "generating" || undefined}
      aria-labelledby="working-workbook-export-title"
      className="content-subpanel stack spreadsheet-transfer-panel"
      data-pd-id="workbook-template-export.panel"
    >
      <StatusToast
        message={state === "complete" ? message : ""}
        onDismiss={() => setMessage("")}
        tone="success"
      />
      <div className="workflow-panel-header">
        <div>
          <span className="eyebrow">Working workbook</span>
          <h2 id="working-workbook-export-title">Create fresh working workbook</h2>
        </div>
        <button
          aria-describedby="working-workbook-export-description"
          className="modal-primary-button icon-text-action"
          data-pd-id="workbook-template-export.generate"
          disabled={state === "generating"}
          onClick={() => void generateExport()}
          type="button"
        >
          {state === "generating" ? (
            <span aria-hidden="true" className="button-spinner" />
          ) : (
            <span aria-hidden="true" className="material-symbols-outlined">
              download
            </span>
          )}
          <span>{state === "generating" ? "Creating workbook" : "Create workbook"}</span>
        </button>
      </div>
      <p className="field-support-text" id="working-workbook-export-description">
        Populate a fresh copy of the approved workbook template with this Profile&apos;s current
        supported data. This is not the portable Profile backup, does not update an existing
        workbook, and still requires the deferred Google runtime smoke test. Any state that the
        approved template cannot safely represent blocks the download rather than being silently
        omitted. The XLSX file does not contain a bound Google Apps Script project.
      </p>
      <div className="portable-profile-export-feedback">
        {state === "generating" ? (
          <p aria-live="polite" className="table-status" role="status">
            Reading this Profile, sanitizing the template copy, and validating its structure…
          </p>
        ) : null}
        {result ? (
          <div
            aria-label="Working workbook verification"
            className="spreadsheet-backup-proof"
            data-pd-id="workbook-template-export.verification"
            role="status"
          >
            <strong>{result.filename}</strong>
            <span>Format: {result.formatVersion}</span>
            <span>{OUTPUT_CLASSIFICATION}</span>
            <span>
              Package verification: {result.changedPartCount} changed · {result.unchangedPartCount}{" "}
              unchanged parts
            </span>
            <span>
              Explicitly platform-only domains: {result.platformOnlyWarningCount}
            </span>
            <span className="spreadsheet-row-id">
              Logical SHA-256: {result.logicalChecksum}
            </span>
            <span className="spreadsheet-row-id">File SHA-256: {result.byteChecksum}</span>
          </div>
        ) : null}
        {state === "error" ? (
          <p className="warning-text" role="alert">
            {message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
