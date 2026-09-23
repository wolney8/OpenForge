import { describe, expect, it } from "vitest";

import { isOnlyFieldChange } from "./field-change";

describe("isOnlyFieldChange", () => {
  const pristine = { notes: "old", amount: "6.00", account: "Bookmaker A" };

  it("accepts an explicit notes-only change", () => {
    expect(
      isOnlyFieldChange(
        { ...pristine, notes: "new" },
        pristine,
        new Set<keyof typeof pristine>(["notes"]),
      ),
    ).toBe(true);
  });

  it("does not treat an unchanged form as a notes edit", () => {
    expect(
      isOnlyFieldChange(pristine, pristine, new Set<keyof typeof pristine>(["notes"])),
    ).toBe(false);
  });

  it("rejects a hidden financial or identity change", () => {
    expect(
      isOnlyFieldChange(
        { ...pristine, notes: "new", amount: "5.00" },
        pristine,
        new Set<keyof typeof pristine>(["notes"]),
      ),
    ).toBe(false);
    expect(
      isOnlyFieldChange(
        { ...pristine, notes: "new", account: "Bookmaker B" },
        pristine,
        new Set<keyof typeof pristine>(["notes"]),
      ),
    ).toBe(false);
  });
});
