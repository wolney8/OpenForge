import { describe, expect, it } from "vitest";

import { resolveImportRunPresentation } from "./import-run-presentation";

describe("resolveImportRunPresentation", () => {
  it("separates a rolled-back failed attempt from the current retryable run", () => {
    const presentation = resolveImportRunPresentation({
      approvedAt: "2026-08-31T08:40:00+00:00",
      currentStatus: "READY_APPROVED",
      preflightPassed: true,
      reconciliationResult: "POST-IMPORT RECONCILIATION: FAILED",
      rollbackStatus: "COMPLETE",
      rolledBackAt: "2026-08-31T19:54:05+00:00",
    });

    expect(presentation).toEqual({
      approvedReady: true,
      currentRetryable: true,
      currentStateLabel: "Restored and ready to retry",
      hasPreviousFailedAttempt: true,
      importActionLabel: "Retry import",
      restoredRetryable: true,
    });
  });

  it("keeps the initial approved import action distinct from retry", () => {
    const presentation = resolveImportRunPresentation({
      approvedAt: "2026-08-31T08:40:00+00:00",
      currentStatus: "READY_APPROVED",
      preflightPassed: true,
      reconciliationResult: undefined,
      rollbackStatus: "",
      rolledBackAt: "",
    });

    expect(presentation.approvedReady).toBe(true);
    expect(presentation.currentRetryable).toBe(true);
    expect(presentation.hasPreviousFailedAttempt).toBe(false);
    expect(presentation.importActionLabel).toBe("Import to Profile");
    expect(presentation.restoredRetryable).toBe(false);
  });

  it("does not let a historical failure make a non-ready run retryable", () => {
    const presentation = resolveImportRunPresentation({
      approvedAt: "2026-08-31T08:40:00+00:00",
      currentStatus: "IMPORT_FAILED",
      preflightPassed: true,
      reconciliationResult: "POST-IMPORT RECONCILIATION: FAILED",
      rollbackStatus: "COMPLETE",
      rolledBackAt: "2026-08-31T19:54:05+00:00",
    });

    expect(presentation.approvedReady).toBe(false);
    expect(presentation.currentRetryable).toBe(false);
    expect(presentation.hasPreviousFailedAttempt).toBe(false);
    expect(presentation.importActionLabel).toBe("Import to Profile");
    expect(presentation.restoredRetryable).toBe(false);
  });
});
