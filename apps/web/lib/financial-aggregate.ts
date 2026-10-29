export type FinancialAggregateResult = {
  knownValue: number;
  knownCount: number;
  unknownCount: number;
  isComplete: boolean;
};

/**
 * Preserve authoritative known money without assigning a value to unknown rows.
 * Values are already governed currency outputs; this helper changes readiness,
 * not row-level calculation or rounding.
 */
export function aggregateFinancialValues(values: number[]): FinancialAggregateResult {
  let knownValue = 0;
  let knownCount = 0;
  let unknownCount = 0;

  for (const value of values) {
    if (Number.isFinite(value)) {
      knownValue += value;
      knownCount += 1;
    } else {
      unknownCount += 1;
    }
  }

  return {
    knownValue,
    knownCount,
    unknownCount,
    isComplete: unknownCount === 0,
  };
}

export function combineFinancialAggregates(
  aggregates: FinancialAggregateResult[],
): FinancialAggregateResult {
  return aggregates.reduce<FinancialAggregateResult>(
    (combined, aggregate) => ({
      knownValue: combined.knownValue + aggregate.knownValue,
      knownCount: combined.knownCount + aggregate.knownCount,
      unknownCount: combined.unknownCount + aggregate.unknownCount,
      isComplete: combined.isComplete && aggregate.isComplete,
    }),
    { knownValue: 0, knownCount: 0, unknownCount: 0, isComplete: true },
  );
}
