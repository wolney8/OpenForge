export type ExtraPlaceLossBudgetState = {
  budget: number;
  remaining: number;
  spent: number;
  reached: boolean;
};

/**
 * An advisory weekly loss ceiling. It does not alter row values, fees, or reporting totals.
 */
export function getExtraPlaceLossBudgetState(
  budgetValue: string | null | undefined,
  qualifyingLoss: number,
): ExtraPlaceLossBudgetState {
  const parsedBudget = Number(budgetValue);
  const budget = Number.isFinite(parsedBudget) && parsedBudget > 0 ? parsedBudget : 15;
  const spent = Math.max(0, -qualifyingLoss);
  const remaining = Math.max(0, Math.round((budget - spent) * 100) / 100);
  return { budget, spent, remaining, reached: spent >= budget };
}
