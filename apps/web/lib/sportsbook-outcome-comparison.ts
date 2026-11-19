/** Presentation-only pairing of existing scenario labels and governed amounts. */
export type SportsbookScenarioAmount = string | number | null | undefined;

export type SportsbookComparisonScenario = {
  key: string;
  label: string;
  amount: SportsbookScenarioAmount;
};

type ScenarioSource = {
  scenario_pnl_if_back_wins: SportsbookScenarioAmount;
  scenario_pnl_if_lay_wins: SportsbookScenarioAmount;
  scenario_pnl_if_outcome_2_wins: SportsbookScenarioAmount;
  scenario_pnl_if_outcome_3_wins: SportsbookScenarioAmount;
};

export function sportsbookComparisonScenarios(input: {
  source: ScenarioSource;
  labels: {
    back: string;
    lay: string;
    outcome2?: string | null;
    outcome3?: string | null;
  };
  actualMultiLay?: SportsbookComparisonScenario[] | null;
  plannedMultiLay?: SportsbookComparisonScenario[] | null;
}): SportsbookComparisonScenario[] {
  // The native actual/planned multi-lay authorities can expose more branches
  // than the four flattened source fields. Keep their own labels and totals.
  if (input.actualMultiLay?.length) return input.actualMultiLay;
  if (input.plannedMultiLay?.length) return input.plannedMultiLay;
  const candidates: SportsbookComparisonScenario[] = [
    { key: "back-wins", label: input.labels.back, amount: input.source.scenario_pnl_if_back_wins },
    { key: "lay-wins", label: input.labels.lay, amount: input.source.scenario_pnl_if_lay_wins },
    { key: "outcome-2", label: input.labels.outcome2 ?? "", amount: input.source.scenario_pnl_if_outcome_2_wins },
    { key: "outcome-3", label: input.labels.outcome3 ?? "", amount: input.source.scenario_pnl_if_outcome_3_wins },
  ];
  return candidates.filter((row) => row.label && row.amount !== null && row.amount !== undefined && row.amount !== "");
}
