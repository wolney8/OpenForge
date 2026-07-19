import { describe, expect, it } from "vitest";
import { getSettlementValidationMessage } from "./settlement-validation";

describe("settlement validation", () => {
  it("blocks Settled plus Pending", () => {
    expect(getSettlementValidationMessage("Settled", "Pending", "2026-06-20T12:00")).toContain(
      "final outcome"
    );
  });

  it("blocks settled rows without a settlement date", () => {
    expect(getSettlementValidationMessage("Settled", "Back Won", "")).toContain(
      "settlement date"
    );
  });

  it("allows pending rows and complete settled rows", () => {
    expect(getSettlementValidationMessage("Placed", "Pending", "")).toBe("");
    expect(getSettlementValidationMessage("Settled", "Back Won", "2026-06-20T12:00")).toBe("");
  });
});
