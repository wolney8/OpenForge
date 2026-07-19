import { describe, expect, it } from "vitest";
import {
  buildFeeReviewLedgerHref,
  buildFeeReviewReturnHref,
  getFeeReviewMonthBounds,
  parseFeeReviewRecordIds,
} from "./fee-review-session";

describe("fee review resolution session", () => {
  it("builds a ledger URL that preserves month, profile, records, and return path", () => {
    const returnHref = buildFeeReviewReturnHref("profile-demo-001", "2026-06");
    const href = buildFeeReviewLedgerHref({
      profileId: "profile-demo-001",
      profileName: "Subscriber Alpha",
      month: "2026-06",
      ledger: "sportsbook",
      recordIds: ["SB-001", "SB-002"],
      returnHref,
    });

    expect(href).toContain("/sportsbook-bets?");
    expect(href).toContain("view=fee-review");
    expect(href).toContain("records=SB-001%2CSB-002");
    expect(href).toContain("feeMonth=2026-06");
    expect(href).toContain("return=%2Fprofiles%3Fprofile%3Dprofile-demo-001");
  });

  it("normalises duplicate and blank record ids", () => {
    expect(parseFeeReviewRecordIds("SB-001,, SB-002,SB-001")).toEqual(["SB-001", "SB-002"]);
  });

  it("resolves calendar-month bounds", () => {
    expect(getFeeReviewMonthBounds("2026-06")).toEqual({
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
    });
  });
});
