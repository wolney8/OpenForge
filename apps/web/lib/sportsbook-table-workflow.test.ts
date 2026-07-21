import { describe, expect, it } from "vitest";
import {
  applyPlacementActionToState,
  filterPlacedPendingRowsInDateRange,
  getFinalizedLaySelectionFromPartialLegs,
  getSportsbookBackBetStatusBadge,
  getSportsbookIssueBadges,
  getSportsbookIssueTone,
  getSportsbookLifecycleBadge,
  getPartialLayExecutionSummary,
  getPartialLayReminderDefaultDueAt,
  getSportsbookPlacementMissingFields,
  getNextSportsbookTableSort,
  getSportsbookRowStateClassName,
  isSortableSportsbookColumn,
  type PlacementFormFields,
  sortSportsbookRows,
} from "./sportsbook-table-workflow";

describe("partial-lay reminder defaults", () => {
  it("defaults to two hours before settlement when that time is still ahead", () => {
    expect(
      getPartialLayReminderDefaultDueAt(
        "2026-07-22T20:00",
        new Date("2026-07-22T12:00")
      )
    ).toBe("2026-07-22T18:00");
  });

  it("falls back to one hour before settlement after the two-hour point passes", () => {
    expect(
      getPartialLayReminderDefaultDueAt(
        "2026-07-22T20:00",
        new Date("2026-07-22T18:30")
      )
    ).toBe("2026-07-22T19:00");
  });

  it("does not create a reminder for an already-settled row", () => {
    expect(
      getPartialLayReminderDefaultDueAt(
        "2026-07-22T20:00",
        new Date("2026-07-22T20:01")
      )
    ).toBe("");
  });
});

function createBaseFormState(overrides?: Partial<PlacementFormFields>): PlacementFormFields {
  return {
    status: "Prospecting",
    result: "Pending",
    match_strategy: "Standard",
    lay_actual: "",
    lay_matched_stake_1: "",
    ...overrides,
  };
}

describe("sportsbook placement actions", () => {
  it("marks back leg as placed and keeps pending settlement", () => {
    const result = applyPlacementActionToState({
      action: "back-placed",
      formState: createBaseFormState({ status: "Prospecting", result: "Mixed" }),
      isSettledReadOnly: false,
      suggestedLayStake: "",
    });

    expect(result.nextFormState).toEqual(
      createBaseFormState({
        status: "Placed",
        result: "Pending",
      })
    );
    expect(result.statusMessage).toBe("Marked back leg as placed and kept settlement pending.");
  });

  it("rejects lay placement actions for No Lay strategy", () => {
    const result = applyPlacementActionToState({
      action: "lay-fully-placed",
      formState: createBaseFormState({ match_strategy: "No Lay" }),
      isSettledReadOnly: false,
      suggestedLayStake: "4.50",
    });

    expect(result.nextFormState).toBeNull();
    expect(result.statusMessage).toBe("Lay placement actions are unavailable for No Lay rows.");
  });

  it("marks lay as fully placed using suggested stake when lay actual is empty", () => {
    const result = applyPlacementActionToState({
      action: "lay-fully-placed",
      formState: createBaseFormState({ lay_actual: "" }),
      isSettledReadOnly: false,
      suggestedLayStake: "3.20",
    });

    expect(result.nextFormState).toEqual(
      createBaseFormState({
        status: "Placed",
        result: "Pending",
        lay_actual: "3.20",
        lay_matched_stake_1: "3.20",
      })
    );
    expect(result.statusMessage).toBe("Marked lay as fully placed (3.20 matched).");
  });

  it("marks lay as partially placed and switches strategy to Partial Lay", () => {
    const result = applyPlacementActionToState({
      action: "lay-partially-placed",
      formState: createBaseFormState({ lay_actual: "7.56", match_strategy: "Standard" }),
      isSettledReadOnly: false,
      suggestedLayStake: "",
    });

    expect(result.nextFormState).toEqual(
      createBaseFormState({
        status: "Placed",
        result: "Pending",
        match_strategy: "Partial Lay",
        lay_actual: "7.56",
        lay_matched_stake_1: "3.78",
      })
    );
    expect(result.statusMessage).toBe("Marked lay as partially placed (3.78 matched).");
  });

  it("returns a guidance message when no lay stake can be inferred", () => {
    const result = applyPlacementActionToState({
      action: "lay-fully-placed",
      formState: createBaseFormState({ lay_actual: "" }),
      isSettledReadOnly: false,
      suggestedLayStake: "",
    });

    expect(result.nextFormState).toBeNull();
    expect(result.statusMessage).toBe("Enter lay odds/back inputs first so a lay stake can be inferred.");
  });

  it("does nothing in settled read-only mode", () => {
    const result = applyPlacementActionToState({
      action: "lay-fully-placed",
      formState: createBaseFormState({ lay_actual: "4.22" }),
      isSettledReadOnly: true,
      suggestedLayStake: "",
    });

    expect(result.nextFormState).toBeNull();
    expect(result.statusMessage).toBeNull();
  });
});

describe("partial lay execution summary", () => {
  it("uses explicit target when present and recommends the remaining stake", () => {
    const summary = getPartialLayExecutionSummary({
      explicitTargetLayStake: "10.00",
      suggestedTargetLayStake: "9.50",
      legs: [{ matchedStake: "3.25" }, { matchedStake: "2.75" }],
    });

    expect(summary).toEqual({
      targetLayStake: 10,
      matchedTotal: 6,
      remainingToMatch: 4,
      nextRecommendedStake: 4,
      hasReachedTarget: false,
      exceededTarget: false,
    });
  });

  it("falls back to suggested target when explicit lay actual is empty", () => {
    const summary = getPartialLayExecutionSummary({
      explicitTargetLayStake: "",
      suggestedTargetLayStake: "8.40",
      legs: [{ matchedStake: "1.10" }],
    });

    expect(summary.targetLayStake).toBeCloseTo(8.4, 6);
    expect(summary.matchedTotal).toBeCloseTo(1.1, 6);
    expect(summary.remainingToMatch).toBeCloseTo(7.3, 6);
    expect(summary.nextRecommendedStake).toBeCloseTo(7.3, 6);
    expect(summary.hasReachedTarget).toBe(false);
    expect(summary.exceededTarget).toBe(false);
  });

  it("marks target as reached when matched total equals or exceeds target", () => {
    const reached = getPartialLayExecutionSummary({
      explicitTargetLayStake: "6.00",
      suggestedTargetLayStake: "",
      legs: [{ matchedStake: "6.00" }],
    });
    const exceeded = getPartialLayExecutionSummary({
      explicitTargetLayStake: "6.00",
      suggestedTargetLayStake: "",
      legs: [{ matchedStake: "6.20" }],
    });

    expect(reached.hasReachedTarget).toBe(true);
    expect(reached.exceededTarget).toBe(false);
    expect(reached.nextRecommendedStake).toBe(0);

    expect(exceeded.hasReachedTarget).toBe(true);
    expect(exceeded.exceededTarget).toBe(true);
    expect(exceeded.remainingToMatch).toBeCloseTo(-0.2, 6);
    expect(exceeded.nextRecommendedStake).toBe(0);
  });
});

describe("partial lay finalized selection", () => {
  it("returns empty values when no final leg exists", () => {
    const selection = getFinalizedLaySelectionFromPartialLegs([
      { matchedStake: "2.00", layOdds: "3.1", exchangeName: "Smarkets", isFinal: false },
    ]);

    expect(selection).toEqual({
      hasFinalLeg: false,
      finalLegExchangeName: "",
      finalLegLayOdds: "",
    });
  });

  it("uses the latest final leg values when multiple final flags exist", () => {
    const selection = getFinalizedLaySelectionFromPartialLegs([
      { matchedStake: "2.00", layOdds: "3.1", exchangeName: "Smarkets", isFinal: true },
      { matchedStake: "1.20", layOdds: "3.2", exchangeName: "Matchbook", isFinal: true },
    ]);

    expect(selection).toEqual({
      hasFinalLeg: true,
      finalLegExchangeName: "Matchbook",
      finalLegLayOdds: "3.2",
    });
  });
});

describe("placed pending range filter", () => {
  it("keeps only placed + pending rows that settle within range and sorts by settle date", () => {
    const rows = [
      {
        sportsbook_bet_id: "SB-3",
        status: "Placed",
        result: "Pending",
        date_settled: "2026-07-07T12:00:00",
        created_at: "2026-07-01T09:00:00",
      },
      {
        sportsbook_bet_id: "SB-1",
        status: "Placed",
        result: "Pending",
        date_settled: "2026-07-06T12:00:00",
        created_at: "2026-07-03T09:00:00",
      },
      {
        sportsbook_bet_id: "SB-2",
        status: "Placed",
        result: "Back Won",
        date_settled: "2026-07-06T13:00:00",
        created_at: "2026-07-04T09:00:00",
      },
      {
        sportsbook_bet_id: "SB-4",
        status: "Prospecting",
        result: "Pending",
        date_settled: "2026-07-06T11:00:00",
        created_at: "2026-07-05T09:00:00",
      },
      {
        sportsbook_bet_id: "SB-5",
        status: "Placed",
        result: "Pending",
        date_settled: "",
        created_at: "2026-07-06T10:00:00",
      },
    ];

    const start = Date.parse("2026-07-06T00:00:00");
    const end = Date.parse("2026-07-07T23:59:59");

    const filtered = filterPlacedPendingRowsInDateRange(rows, start, end);

    expect(filtered.map((row) => row.sportsbook_bet_id)).toEqual(["SB-1", "SB-3"]);
  });
});

describe("sportsbook sort helpers", () => {
  it("identifies sortable columns", () => {
    expect(isSortableSportsbookColumn("bookmaker")).toBe(true);
    expect(isSortableSportsbookColumn("status")).toBe(true);
    expect(isSortableSportsbookColumn("event_name")).toBe(false);
  });

  it("cycles sort state asc -> desc -> none", () => {
    const first = getNextSportsbookTableSort(null, "bookmaker");
    const second = getNextSportsbookTableSort(first, "bookmaker");
    const third = getNextSportsbookTableSort(second, "bookmaker");

    expect(first).toEqual({ key: "bookmaker", direction: "asc" });
    expect(second).toEqual({ key: "bookmaker", direction: "desc" });
    expect(third).toBeNull();
  });

  it("sorts sportsbook rows by value and date with fallback ordering", () => {
    const rows = [
      {
        sportsbook_bet_id: "SB-1",
        bookmaker: "BBook",
        status: "Placed",
        result: "Pending",
        date_settled: "2026-07-07T12:00:00",
        created_at: "2026-07-03T09:00:00",
        reporting_value: "2.00",
        final_net_pnl: null,
        projected_current_pnl: null,
      },
      {
        sportsbook_bet_id: "SB-2",
        bookmaker: "ABook",
        status: "Prospecting",
        result: "Pending",
        date_settled: "2026-07-06T12:00:00",
        created_at: "2026-07-04T09:00:00",
        reporting_value: "1.00",
        final_net_pnl: null,
        projected_current_pnl: null,
      },
      {
        sportsbook_bet_id: "SB-3",
        bookmaker: "CBook",
        status: "Placed",
        result: "Pending",
        date_settled: "",
        created_at: "2026-07-05T09:00:00",
        reporting_value: null,
        final_net_pnl: null,
        projected_current_pnl: "0.50",
      },
    ];

    const byBookmaker = sortSportsbookRows(rows, { key: "bookmaker", direction: "asc" });
    expect(byBookmaker.map((row) => row.sportsbook_bet_id)).toEqual(["SB-2", "SB-1", "SB-3"]);

    const byValueDesc = sortSportsbookRows(rows, { key: "displayed_value", direction: "desc" });
    expect(byValueDesc.map((row) => row.sportsbook_bet_id)).toEqual(["SB-1", "SB-2", "SB-3"]);

    const byDateAsc = sortSportsbookRows(rows, { key: "date_settled", direction: "asc" });
    expect(byDateAsc.map((row) => row.sportsbook_bet_id)).toEqual(["SB-2", "SB-1", "SB-3"]);
  });
});

describe("sportsbook row state classes", () => {
  it("returns issue-driven row class tags only when action is needed", () => {
    expect(
      getSportsbookRowStateClassName({
        status: "Prospecting",
        result: "Pending",
        match_strategy: "Partial Lay",
        lay_status: "Partially Laid",
        counts_as_open: true,
        is_overdue: false,
        date_settled: "2026-07-08T12:00:00",
        back_stake: "10.00",
        back_odds: "2.5",
        lay_actual: "10.20",
        lay_odds_1: "2.6",
        exchange_name: "Smarkets",
      })
    ).toContain("row-state-issue-warning");

    expect(
      getSportsbookRowStateClassName({
        status: "Placed",
        result: "Pending",
        match_strategy: "Standard",
        lay_status: "Not Laid",
        counts_as_open: true,
        is_overdue: false,
        date_settled: "2026-07-08T12:00:00",
        back_stake: "10.00",
        back_odds: "2.5",
        lay_actual: "10.20",
        lay_odds_1: "2.6",
        exchange_name: "Smarkets",
      })
    ).toBe("");

    expect(
      getSportsbookRowStateClassName({
        status: "Placed",
        result: "Pending",
        match_strategy: "Standard",
        lay_status: "Partially Laid",
        counts_as_open: true,
        is_overdue: false,
        date_settled: "",
        back_stake: "10.00",
        back_odds: "2.5",
        lay_actual: "10.20",
        lay_odds_1: "",
        exchange_name: "Smarkets",
      })
    ).toContain("row-state-issue-warning");

    expect(
      getSportsbookRowStateClassName({
        status: "Placed",
        result: "Pending",
        match_strategy: "Standard",
        lay_status: "Fully Laid",
        counts_as_open: true,
        is_overdue: true,
        date_settled: "2026-07-08T12:00:00",
        back_stake: "10.00",
        back_odds: "2.5",
        lay_actual: "10.20",
        lay_odds_1: "2.6",
        exchange_name: "Smarkets",
      })
    ).toContain("row-state-issue-danger");
  });
});

describe("sportsbook placement completeness", () => {
  it("returns missing placed fields only when row requires placed workflow", () => {
    const missing = getSportsbookPlacementMissingFields({
      status: "Placed",
      result: "Pending",
      match_strategy: "Standard",
      lay_status: "Not Laid",
      date_settled: "",
      back_stake: "",
      back_odds: "2.5",
      lay_actual: "",
      lay_odds_1: "",
      exchange_name: "",
    });

    expect(missing).toEqual([
      "Back stake",
      "Settles",
      "Exchange",
      "Lay odds 1",
      "Lay actual",
      "Lay status",
    ]);
  });

  it("does not require lay fields for no-lay placed rows", () => {
    const missing = getSportsbookPlacementMissingFields({
      status: "Placed",
      result: "Pending",
      match_strategy: "No Lay",
      lay_status: "",
      date_settled: "2026-07-08T12:00:00",
      back_stake: "10.00",
      back_odds: "2.5",
      lay_actual: "",
      lay_odds_1: "",
      exchange_name: "",
    });

    expect(missing).toEqual([]);
  });
});

describe("sportsbook lifecycle badge", () => {
  it("returns scan-friendly lifecycle labels for common sportsbook states", () => {
    expect(
      getSportsbookLifecycleBadge({
        status: "Prospecting",
        result: "Pending",
        lay_status: "Not Laid",
      })
    ).toEqual({
      label: "Draft only",
      tone: "muted",
    });

    expect(
      getSportsbookLifecycleBadge({
        status: "Placed",
        result: "Pending",
        lay_status: "Not Laid",
      })
    ).toEqual({
      label: "Back placed only",
      tone: "warning",
    });

    expect(
      getSportsbookLifecycleBadge({
        status: "Placed",
        result: "Pending",
        lay_status: "Partially Laid",
      })
    ).toEqual({
      label: "Lay partially matched",
      tone: "partial",
    });

    expect(
      getSportsbookLifecycleBadge({
        status: "Placed",
        result: "Pending",
        lay_status: "Fully Laid",
      })
    ).toEqual({
      label: "Lay fully matched",
      tone: "positive",
    });

    expect(
      getSportsbookLifecycleBadge({
        status: "Free Bet Awarded",
        result: "Pending",
        lay_status: "Fully Laid",
      })
    ).toEqual({
      label: "Free bet awarded",
      tone: "positive",
    });
  });
});

describe("sportsbook back-bet status badge", () => {
  it("separates back placement state from lay state", () => {
    expect(
      getSportsbookBackBetStatusBadge({
        status: "Prospecting",
        result: "Pending",
      })
    ).toEqual({
      label: "Not Placed",
      tone: "muted",
    });

    expect(
      getSportsbookBackBetStatusBadge({
        status: "Placed",
        result: "Pending",
      })
    ).toEqual({
      label: "Back Placed",
      tone: "positive",
    });

    expect(
      getSportsbookBackBetStatusBadge({
        status: "Settled",
        result: "Back Won",
      })
    ).toEqual({
      label: "Back Placed",
      tone: "positive",
    });
  });
});

describe("sportsbook issue badges", () => {
  it("returns short action-oriented issues for sportsbook review", () => {
    expect(
      getSportsbookIssueBadges({
        status: "Prospecting",
        result: "Pending",
        date_settled: "",
        is_overdue: false,
      })
    ).toEqual([
      { label: "Back Unplaced", tone: "warning" },
      { label: "No Settle Date", tone: "warning" },
    ]);

    expect(
      getSportsbookIssueBadges({
        status: "Placed",
        result: "Pending",
        date_settled: "2026-07-08T12:00:00",
        is_overdue: true,
      })
    ).toEqual([{ label: "Outcome Needed", tone: "danger" }]);

    expect(
      getSportsbookIssueBadges({
        status: "Placed",
        result: "Pending",
        date_settled: "2026-07-20T18:00:00",
        is_overdue: false,
      })
    ).toEqual([]);
  });

  it("surfaces active partial-lay reminders with due-time priority", () => {
    const reminderRow = {
      status: "Placed",
      result: "Pending",
      date_settled: "2026-07-22T20:00:00Z",
      is_overdue: false,
      partial_lay_reminder_state: "Active",
      partial_lay_reminder_due_at: "2026-07-22T18:00:00Z",
    };

    expect(
      getSportsbookIssueBadges(reminderRow, Date.parse("2026-07-22T17:00:00Z"))
    ).toEqual([{ label: "Lay Recheck", tone: "warning" }]);
    expect(
      getSportsbookIssueBadges(reminderRow, Date.parse("2026-07-22T18:30:00Z"))
    ).toEqual([{ label: "Lay Recheck Overdue", tone: "danger" }]);
    expect(
      getSportsbookIssueBadges(
        { ...reminderRow, partial_lay_reminder_state: "Resolved" },
        Date.parse("2026-07-22T18:30:00Z")
      )
    ).toEqual([]);
  });
});

describe("sportsbook issue tone", () => {
  it("reduces issue rows to warning or danger for row-edge highlighting", () => {
    expect(
      getSportsbookIssueTone({
        status: "Prospecting",
        result: "Pending",
        date_settled: "",
        is_overdue: false,
      })
    ).toBe("warning");

    expect(
      getSportsbookIssueTone({
        status: "Placed",
        result: "Pending",
        date_settled: "2026-07-08T12:00:00",
        is_overdue: true,
      })
    ).toBe("danger");
  });
});
