import { describe, expect, it } from "vitest";
import {
  buildOperationalLedgerHref,
  countOperationalActions,
  getCasinoOperationalIssueBadges,
  readOperationalIssueQuery,
} from "./operational-actions";
import type { TrackerSummaryDataset } from "./tracker-summary";

const emptyDataset: TrackerSummaryDataset = {
  accounts: [],
  sportsbookBets: [],
  freeBets: [],
  casinoOffers: [],
  cashAdjustments: [],
  balanceSnapshots: [],
};

describe("operational action routing", () => {
  it("builds direct profile-ledger issue links", () => {
    expect(buildOperationalLedgerHref("PROFILE-001", "sportsbook")).toBe(
      "/profiles/PROFILE-001/tracker/sportsbook-bets?view=issues&issue=all-issues&source=profiles"
    );
    expect(buildOperationalLedgerHref("PROFILE-001", "free-bets", null)).toBe(
      "/profiles/PROFILE-001/tracker/free-bets"
    );
    expect(readOperationalIssueQuery("?view=issues&issue=outcome-needed")).toBe("outcome-needed");
    expect(readOperationalIssueQuery("?view=recent")).toBeNull();
  });

  it("counts actionable rows by ledger rather than combining them", () => {
    const dataset = {
      ...emptyDataset,
      sportsbookBets: [
        { status: "Placed", result: "Pending", date_settled: "2026-07-01", is_overdue: true },
      ],
      freeBets: [
        {
          status: "Available",
          result: "Pending",
          date_settled: "",
          expiry_datetime: "2026-07-17T12:00:00",
          is_overdue: false,
        },
      ],
      casinoOffers: [
        {
          status: "Prospecting",
          result: "Pending",
          date_settling: "",
          is_overdue: false,
          resolved_net_pnl: null,
        },
      ],
    } as TrackerSummaryDataset;

    expect(countOperationalActions(dataset, Date.parse("2026-07-16T12:00:00"))).toEqual({
      sportsbook: 1,
      freeBets: 1,
      casinoOffers: 1,
    });
  });

  it("keeps settled casino rows without a final value actionable across reports and ledgers", () => {
    expect(
      getCasinoOperationalIssueBadges({
        status: "Settled",
        result: "Win",
        date_settling: "2026-06-15T18:00:00",
        is_overdue: false,
        resolved_net_pnl: null,
      })
    ).toEqual([{ label: "Final Value Needed", tone: "danger" }]);
  });
});
