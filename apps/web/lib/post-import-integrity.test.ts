import { describe, expect, it } from "vitest";

import { isPostImportIntegrityCheckPassed } from "./post-import-integrity";

describe("isPostImportIntegrityCheckPassed", () => {
  it("treats false silent_partial_writes as a passing integrity result", () => {
    expect(isPostImportIntegrityCheckPassed("silent_partial_writes", false)).toBe(true);
    expect(isPostImportIntegrityCheckPassed("silent_partial_writes", true)).toBe(false);
  });

  it("preserves positive-form integrity checks", () => {
    expect(isPostImportIntegrityCheckPassed("duplicate_protection", true)).toBe(true);
    expect(isPostImportIntegrityCheckPassed("duplicate_protection", false)).toBe(false);
  });
});
