import { describe, expect, it } from "vitest";
import { assertLedgerCellCapabilityCoverage, ledgerCellCapability, ledgerCellDecision } from "./ledger-cell-capabilities";

describe("displayed ledger field capabilities", () => {
  it("covers every owned and combined display column without an unknown fallback", () => {
    expect(assertLedgerCellCapabilityCoverage).not.toThrow();
    expect(() => ledgerCellCapability("sportsbook-bets", "uncontracted_field")).toThrow(/Missing/);
  });
  it("keeps calculated and lifecycle fields outside ordinary scalar editing", () => {
    expect(ledgerCellCapability("sportsbook-bets", "event_name")).toEqual({ type: "text", authority: "scalar" });
    expect(ledgerCellCapability("sportsbook-bets", "displayed_value").authority).toBe("calculated");
    expect(ledgerCellCapability("casino-offers", "status").authority).toBe("lifecycle");
    expect(ledgerCellCapability("accounts", "channel")).toEqual({ type: "multi-value", authority: "native-composite" });
    expect(ledgerCellCapability("each-way-extra-places", "runner")).toEqual({ type: "composite", authority: "native-composite" });
    expect(ledgerCellCapability("each-way-extra-places", "bookmaker")).toEqual({ type: "enum", authority: "typed" });
    expect(ledgerCellCapability("free-bets", "expiry_datetime")).toEqual({ type: "datetime", authority: "typed" });
    expect(ledgerCellDecision("each-way-extra-places", "stake", { status: "Prospecting" }, true).interaction).toBe("edit");
    expect(ledgerCellDecision("each-way-extra-places", "stake", { status: "Placed" }, false)).toEqual({ interaction: "review", reason: "Placement and financial evidence require the populated Extra Place review workflow." });
    expect(ledgerCellDecision("each-way-extra-places", "rating", { status: "Prospecting" }, true).interaction).toBe("protected");
  });
});
