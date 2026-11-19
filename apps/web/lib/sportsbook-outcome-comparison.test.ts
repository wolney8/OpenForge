import { describe, expect, it } from "vitest";

import { sportsbookComparisonScenarios } from "./sportsbook-outcome-comparison";

const empty = { scenario_pnl_if_back_wins: null, scenario_pnl_if_lay_wins: null, scenario_pnl_if_outcome_2_wins: null, scenario_pnl_if_outcome_3_wins: null };

describe("Sportsbook Outcome Comparison scenario pairing", () => {
  it("keeps signed Standard and No Lay amounts with their own labels", () => {
    const source = { ...empty, scenario_pnl_if_back_wins: "14.40", scenario_pnl_if_lay_wins: "-10.00" };
    expect(sportsbookComparisonScenarios({ source, labels: { back: "Bookmaker wins", lay: "Exchange wins" } })).toEqual([
      { key: "back-wins", label: "Bookmaker wins", amount: "14.40" },
      { key: "lay-wins", label: "Exchange wins", amount: "-10.00" },
    ]);
    expect(sportsbookComparisonScenarios({ source, labels: { back: "Back wins", lay: "Back loses" } })[1]).toEqual(
      { key: "lay-wins", label: "Back loses", amount: "-10.00" },
    );
  });

  it("retains Cashback and Double Delight branches, including zero and losses", () => {
    const source = { scenario_pnl_if_back_wins: "-2.10", scenario_pnl_if_lay_wins: "1.75", scenario_pnl_if_outcome_2_wins: "0", scenario_pnl_if_outcome_3_wins: "8.20" };
    const cashback = sportsbookComparisonScenarios({ source, labels: { back: "Back wins", lay: "Lay wins", outcome2: "Cashback trigger hits" } });
    expect(cashback.map(({ label, amount }) => [label, amount])).toEqual([["Back wins", "-2.10"], ["Lay wins", "1.75"], ["Cashback trigger hits", "0"]]);
    const delight = sportsbookComparisonScenarios({ source, labels: { back: "Player scores first but no further goals", lay: "Player does not score first", outcome2: "Player scores first and then scores again", outcome3: "Player scores first and gets a hat-trick" } });
    expect(delight.map(({ label, amount }) => [label, amount])).toEqual([
      ["Player scores first but no further goals", "-2.10"], ["Player does not score first", "1.75"],
      ["Player scores first and then scores again", "0"], ["Player scores first and gets a hat-trick", "8.20"],
    ]);
  });

  it("uses every authoritative multi-lay outcome rather than truncating to flattened fields", () => {
    const actualMultiLay = [
      { key: "one", label: "Outcome 1", amount: "-4.00" },
      { key: "two", label: "Outcome 2", amount: "2.25" },
      { key: "three", label: "Outcome 3", amount: "3.50" },
      { key: "none", label: "No selection won", amount: "-1.20" },
    ];
    expect(sportsbookComparisonScenarios({ source: empty, labels: { back: "Back wins", lay: "Back loses" }, actualMultiLay })).toEqual(actualMultiLay);
  });
});
