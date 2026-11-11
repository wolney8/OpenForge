import { describe, expect, it } from "vitest";
import { isWithinSportsbookRange, sportsbookRangeAnchor } from "./sportsbook-range-anchor";

describe("Sportsbook range anchor shared by native and combined views", () => {
  it("uses the recorded event/settles field before creation and never invents a missing date", () => {
    expect(sportsbookRangeAnchor({ date_settled: "2026-11-03T12:00:00Z", created_at: "2026-01-01T10:00:00Z" })?.toISOString()).toBe("2026-11-03T12:00:00.000Z");
    expect(sportsbookRangeAnchor({ date_settled: "", created_at: "2026-01-01T10:00:00Z" })?.toISOString()).toBe("2026-01-01T10:00:00.000Z");
    expect(sportsbookRangeAnchor({ date_settled: "invalid", created_at: "" })).toBeNull();
  });
  it("keeps both date boundaries inclusive", () => {
    const range = { start: new Date("2026-11-03T00:00:00Z"), end: new Date("2026-11-03T23:59:59Z") };
    expect(isWithinSportsbookRange(sportsbookRangeAnchor({ date_settled: "2026-11-03T00:00:00Z" }), range)).toBe(true);
    expect(isWithinSportsbookRange(sportsbookRangeAnchor({ date_settled: "2026-11-04T00:00:00Z" }), range)).toBe(false);
  });
});
