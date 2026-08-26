import { describe, expect, it } from "vitest";
import {
  extraPlacePositionChoices,
  extraPlacePositionForResult,
  extraPlaceResultChoices,
  ordinalPosition,
  resultForExtraPlacePosition,
} from "./extra-place-place-terms";

describe("Extra Place paid-place display logic", () => {
  it("uses paid-place counts rather than the 1/x payout fraction", () => {
    expect(resultForExtraPlacePosition("Extra Place", "6", "4", "1st")).toBe("Win");
    expect(resultForExtraPlacePosition("Extra Place", "6", "4", "4th")).toBe("Standard Place");
    expect(resultForExtraPlacePosition("Extra Place", "6", "4", "5th")).toBe("Extra Place");
    expect(resultForExtraPlacePosition("Extra Place", "6", "4", "6th")).toBe("Extra Place");
    expect(resultForExtraPlacePosition("Extra Place", "6", "4", "7th")).toBe("Unplaced");
  });

  it("does not expose Extra Place when bookmaker and exchange pay the same places", () => {
    expect(extraPlaceResultChoices("Extra Place", "5", "5")).not.toContain("Extra Place");
    expect(resultForExtraPlacePosition("Each Way", "5", "4", "5th")).toBe("Standard Place");
  });

  it("keeps fast settlement position controls aligned with the boundary", () => {
    expect(extraPlacePositionChoices("Extra Place", "6", "4")).toEqual([
      "1", "2", "3", "4", "5", "6", "7+",
    ]);
    expect(extraPlacePositionForResult("Extra Place", "Extra Place", "6", "4")).toBe("5th");
    expect(ordinalPosition("6")).toBe("6th");
  });
});
