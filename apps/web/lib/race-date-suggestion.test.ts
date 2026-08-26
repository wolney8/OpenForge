import { describe, expect, it } from "vitest";
import { getRaceDateSuggestions } from "./race-date-suggestion";

describe("getRaceDateSuggestions", () => {
  const now = new Date(2026, 7, 26, 9, 30);

  it("derives local today and tomorrow suggestions from a trailing race time", () => {
    expect(getRaceDateSuggestions("Sandtown 14:10", now)).toEqual({
      time: "14:10",
      today: "2026-08-26T14:10",
      tomorrow: "2026-08-27T14:10",
    });
  });

  it("rejects invalid and non-trailing times", () => {
    expect(getRaceDateSuggestions("Sandtown 25:10", now)).toBeNull();
    expect(getRaceDateSuggestions("14:10 Sandtown", now)).toBeNull();
  });
});
