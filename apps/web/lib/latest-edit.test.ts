import { describe, expect, it } from "vitest";
import { hasNewerFormEdits, reconcileSavedForm } from "./latest-edit";

describe("PD-QA-019 save acknowledgement", () => {
  const submitted = { exchange: "Exchange A", odds: "", actual: "", id: "" };
  const saved = { ...submitted, id: "synthetic-id" };
  it("retains rapid odds and actual edits made while an exchange save is pending", () => {
    const current = { ...submitted, odds: "5.20", actual: "3.50" };
    expect(reconcileSavedForm(submitted, saved, current)).toEqual({ ...current, id: "synthetic-id" });
    expect(hasNewerFormEdits(submitted, current)).toBe(true);
  });
  it("acknowledges server normalization of untouched fields", () => {
    expect(reconcileSavedForm(submitted, saved, submitted)).toEqual(saved);
    expect(hasNewerFormEdits(submitted, submitted)).toBe(false);
  });
  it("does not turn a later blank, zero or malformed draft into a saved value", () => {
    for (const actual of ["", "0", "not-money"]) {
      const original = { ...submitted, actual: "3.50" };
      const current = { ...original, actual };
      expect(reconcileSavedForm(original, { ...original, id: "synthetic-id" }, current).actual).toBe(actual);
    }
  });
});
