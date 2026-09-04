import { describe, expect, it } from "vitest";

import {
  importWorkflowSteps,
  isConflictingImportMutation,
  normalizeImportWorkflowState,
} from "./import-workflow-state";

describe("import workflow state", () => {
  it("normalizes legacy dry-run states without using browser-local state", () => {
    expect(normalizeImportWorkflowState("READY")).toBe("DRY_RUN_READY");
    expect(normalizeImportWorkflowState("READY_APPROVED", { approvedAt: "2026-09-04" })).toBe("READY_APPROVED");
  });

  it("marks one current workflow step and completed prior steps", () => {
    const ready = importWorkflowSteps("READY_APPROVED");
    expect(ready.map((step) => step.state)).toEqual([
      "completed",
      "completed",
      "completed",
      "completed",
      "completed",
      "current",
      "upcoming",
    ]);
  });

  it("marks required review as blocked and places approval failures at approval", () => {
    expect(importWorkflowSteps("REVIEW_REQUIRED")[2].state).toBe("blocked");
    expect(importWorkflowSteps("FAILED", { failureStage: "Approval failed" })[4].state).toBe("failed");
  });

  it("treats both persisted analysis phases and server mutations as conflicting", () => {
    expect(isConflictingImportMutation("ANALYSED", "ANALYSED")).toBe(true);
    expect(isConflictingImportMutation("APPROVING", "APPROVING")).toBe(true);
    expect(isConflictingImportMutation("DRY_RUN_READY", "DRY_RUN_READY")).toBe(false);
  });
});
