import { describe, expect, it } from "vitest";
import { formatLedgerDateTime } from "./ledger-date-display";

describe("formatLedgerDateTime", () => {
  const now = new Date("2026-08-27T09:00:00");

  it("uses a compact today label", () => {
    expect(formatLedgerDateTime("2026-08-27T14:10:00", now)).toBe("Today at 14:10");
  });

  it("uses weekday, ordinal date and 24-hour time for older rows", () => {
    expect(formatLedgerDateTime("2026-08-26T12:45:00", now)).toBe("Wed 26th 12:45");
  });

  it("keeps missing values explicit", () => {
    expect(formatLedgerDateTime(null, now)).toBe("Unscheduled");
  });
});
