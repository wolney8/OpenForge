"use client";

import { useState } from "react";

import { StatusToast } from "@/components/status-toast";
import { apiBaseUrl } from "@/lib/api";

type ExportState = "idle" | "generating" | "complete" | "error";

type ExportResult = {
  filename: string;
  formatVersion: string;
  logicalChecksum: string;
  byteChecksum: string;
  sheetCount: string;
};

function responseFilename(response: Response, fallback: string): string {
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match?.[1]?.trim() || fallback;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The portable Profile backup could not be generated.";
}

export function PortableProfileExport({ profileId }: { profileId: string }) {
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
        `${apiBaseUrl}/profiles/${profileId}/exports/portable-profile.xlsx`,
        { cache: "no-store", credentials: "include" },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(payload?.detail || `Export failed (${response.status}).`);
      }
      const blob = await response.blob();
      const filename = responseFilename(
        response,
        `profile-portable-backup-${profileId}.xlsx`,
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
          response.headers.get("X-Export-Format-Version") ?? "profile-portable-export-v1",
        logicalChecksum: response.headers.get("X-Export-Logical-Checksum") ?? "Unavailable",
        byteChecksum: response.headers.get("X-Export-Byte-Checksum") ?? "Unavailable",
        sheetCount: response.headers.get("X-Export-Sheet-Count") ?? "Unavailable",
      });
      setState("complete");
      setMessage(`Portable Profile backup downloaded: ${filename}`);
    } catch (error) {
      setState("error");
      setMessage(`Export failed. ${errorMessage(error)}`);
    }
  }

  return (
    <section
      aria-busy={state === "generating" || undefined}
      aria-labelledby="portable-profile-export-title"
      className="content-subpanel stack spreadsheet-transfer-panel"
      data-pd-id="profile-portable-export.panel"
    >
      <StatusToast
        message={state === "complete" ? message : ""}
        onDismiss={() => setMessage("")}
        tone="success"
      />
      <div className="workflow-panel-header">
        <div>
          <span className="eyebrow">Portable backup</span>
          <h2 id="portable-profile-export-title">Export portable Profile backup</h2>
        </div>
        <button
          aria-describedby="portable-profile-export-description"
          className="modal-primary-button icon-text-action"
          data-pd-id="profile-portable-export.generate"
          disabled={state === "generating"}
          onClick={() => void generateExport()}
          type="button"
        >
          {state === "generating" ? (
            <span aria-hidden="true" className="button-spinner" />
          ) : (
            <span aria-hidden="true" className="material-symbols-outlined">download</span>
          )}
          <span>{state === "generating" ? "Generating backup" : "Export portable backup"}</span>
        </button>
      </div>
      <p className="field-support-text" id="portable-profile-export-description">
        Download a structured backup for portability and future restore into a fresh Profile. This
        is not a legacy working workbook.
      </p>
      <div className="portable-profile-export-feedback">
        {state === "generating" ? (
          <p aria-live="polite" className="table-status" role="status">
            Reading this Profile and verifying the workbook export…
          </p>
        ) : null}
        {result ? (
          <div
            aria-label="Portable Profile backup verification"
            className="spreadsheet-backup-proof"
            data-pd-id="profile-portable-export.verification"
            role="status"
          >
            <strong>{result.filename}</strong>
            <span>Format: {result.formatVersion} · {result.sheetCount} payload sheets</span>
            <span className="spreadsheet-row-id">Logical SHA-256: {result.logicalChecksum}</span>
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
