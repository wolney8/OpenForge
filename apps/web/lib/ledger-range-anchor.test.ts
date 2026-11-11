import { describe, expect, it } from "vitest";
import { isWithinLedgerRange, ledgerRangeAnchor } from "./ledger-range-anchor";

const first = "2026-11-03T12:00:00Z";
const second = "2026-10-02T12:00:00Z";

describe("shared Profile-owned ledger date anchors", () => {
  it.each([
    ["sportsbook-bets", { date_settled: first, created_at: second }],
    ["free-bets", { date_settled: first, expiry_datetime: second, created_at: second }],
    ["casino-offers", { date_settling: first, date_started: second, expiry_datetime: second }],
    ["each-way-extra-places", { placed_at: first }],
    ["cash-adjustments", { adjustment_date: first }],
  ] as const)("%s uses its native first recorded date", (module, source) => {
    expect(ledgerRangeAnchor(module, source)?.toISOString()).toBe("2026-11-03T12:00:00.000Z");
  });

  it("uses only the native fallback order and leaves unknown dates unknown", () => {
    expect(ledgerRangeAnchor("free-bets", { date_settled: "", expiry_datetime: second, created_at: first })?.toISOString()).toBe("2026-10-02T12:00:00.000Z");
    expect(ledgerRangeAnchor("casino-offers", { date_settling: "bad", date_started: first, expiry_datetime: second })?.toISOString()).toBe("2026-11-03T12:00:00.000Z");
    expect(ledgerRangeAnchor("each-way-extra-places", { placed_at: "" })).toBeNull();
    expect(ledgerRangeAnchor("cash-adjustments", { adjustment_date: null })).toBeNull();
    expect(ledgerRangeAnchor("sportsbook-bets", { date_settled: "bad", created_at: "" })).toBeNull();
  });

  it("keeps date boundaries inclusive", () => {
    const range = { start: new Date(first), end: new Date(first) };
    expect(isWithinLedgerRange(ledgerRangeAnchor("free-bets", { date_settled: first }), range)).toBe(true);
    expect(isWithinLedgerRange(ledgerRangeAnchor("free-bets", { date_settled: second }), range)).toBe(false);
  });
});
