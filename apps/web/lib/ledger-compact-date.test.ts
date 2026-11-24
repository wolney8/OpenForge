import { describe, expect, it } from "vitest";
import { formatCompactLedgerDate, ledgerDateSortValue } from "./ledger-compact-date";

describe("compact ledger date presentation", () => {
  it("preserves the full date and London clock for an offset timestamp", () => {
    expect(formatCompactLedgerDate("2026-11-20T18:54:00Z")).toEqual({ compact: "Fri 20th Nov - 18:54", full: "Friday 20th November 2026 - 18:54" });
  });
  it("keeps a local wall time and does not invent time for a date-only value", () => {
    expect(formatCompactLedgerDate("2026-07-20T18:54:00Z")?.compact).toBe("Mon 20th Jul - 19:54");
    expect(formatCompactLedgerDate("2026-07-20T18:54:00")?.compact).toBe("Mon 20th Jul - 18:54");
    expect(formatCompactLedgerDate("2026-07-20")?.compact).toBe("Mon 20th Jul");
  });
  it("leaves missing or invalid source dates explicit", () => {
    expect(formatCompactLedgerDate("")).toBeNull();
    expect(formatCompactLedgerDate("not-a-date")).toBeNull();
    expect(formatCompactLedgerDate("2026-02-31")).toBeNull();
  });
  it("sorts from recorded timestamps rather than the abbreviated text", () => {
    expect(ledgerDateSortValue("2026-07-20T18:54:00Z")).toBe(Date.UTC(2026, 6, 20, 19, 54));
    expect(ledgerDateSortValue("2026-07-20T18:54:00")).toBe(Date.UTC(2026, 6, 20, 18, 54));
    expect(ledgerDateSortValue("2026-07-20T18:54:00+01:00")).toBe(Date.UTC(2026, 6, 20, 18, 54));
    expect(ledgerDateSortValue("2026-02-31")).toBeNull();
  });
  it("orders local and offset timestamps by the London clock shown to the user in summer", () => {
    const local = "2026-07-20T19:30:00";
    const offset = "2026-07-20T18:54:00Z";
    expect(formatCompactLedgerDate(local)?.compact).toBe("Mon 20th Jul - 19:30");
    expect(formatCompactLedgerDate(offset)?.compact).toBe("Mon 20th Jul - 19:54");
    expect(ledgerDateSortValue(local)!).toBeLessThan(ledgerDateSortValue(offset)!);
  });
});
