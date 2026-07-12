export type PlacementAction = "back-placed" | "lay-fully-placed" | "lay-partially-placed";

export type PlacementFormFields = {
  status: string;
  result: string;
  match_strategy: string;
  lay_actual: string;
  lay_matched_stake_1: string;
};

export type PlacementActionResult<TFormState> = {
  nextFormState: TFormState | null;
  statusMessage: string | null;
};

export type PartialLayExecutionLeg = {
  matchedStake: string;
};

export type PartialLayExecutionLegMetadata = {
  matchedStake: string;
  exchangeName?: string;
  layOdds?: string;
  isFinal?: boolean;
};

export type PartialLayExecutionSummary = {
  targetLayStake: number | null;
  matchedTotal: number;
  remainingToMatch: number | null;
  nextRecommendedStake: number | null;
  hasReachedTarget: boolean;
  exceededTarget: boolean;
};

export type FinalizedLaySelection = {
  hasFinalLeg: boolean;
  finalLegExchangeName: string;
  finalLegLayOdds: string;
};

export type DateRangeFilterRow = {
  status: string;
  result: string;
  date_settled: string;
  created_at: string;
};

export type SportsbookSortKey = "date_settled" | "bookmaker" | "status" | "displayed_value";

export type SportsbookSortDirection = "asc" | "desc";

export type SportsbookTableSort = {
  key: SportsbookSortKey;
  direction: SportsbookSortDirection;
};

export type SortableSportsbookRow = DateRangeFilterRow & {
  bookmaker: string;
  reporting_value: string | null;
  final_net_pnl: string | null;
  projected_current_pnl: string | null;
};

export type RowStateClassifiableSportsbookRow = {
  status: string;
  result: string;
  match_strategy: string;
  lay_status: string;
  counts_as_open: boolean;
  is_overdue: boolean;
  date_settled: string;
  back_stake: string;
  back_odds: string;
  lay_actual: string;
  lay_odds_1: string;
  exchange_name: string;
};

export type SportsbookLifecycleBadge = {
  label: string;
  tone: "muted" | "warning" | "partial" | "positive" | "neutral";
};

export type SportsbookIssueBadge = {
  label: string;
  tone: "warning" | "danger";
};

export function getSportsbookPlacementMissingFields(
  row: Pick<
    RowStateClassifiableSportsbookRow,
    | "status"
    | "result"
    | "match_strategy"
    | "lay_status"
    | "date_settled"
    | "back_stake"
    | "back_odds"
    | "lay_actual"
    | "lay_odds_1"
    | "exchange_name"
  >
): string[] {
  const requiresPlacedPlan =
    row.status === "Placed" ||
    row.status === "Settled" ||
    row.status === "Free Bet Awarded" ||
    row.result !== "Pending";

  if (!requiresPlacedPlan) {
    return [];
  }

  const missing: string[] = [];

  if (!row.back_stake.trim()) {
    missing.push("Back stake");
  }

  if (!row.back_odds.trim()) {
    missing.push("Back odds");
  }

  if (!row.date_settled.trim()) {
    missing.push("Settles");
  }

  if (row.match_strategy !== "No Lay") {
    if (!row.exchange_name.trim()) {
      missing.push("Exchange");
    }

    if (!row.lay_odds_1.trim()) {
      missing.push("Lay odds 1");
    }

    if (!row.lay_actual.trim()) {
      missing.push("Lay actual");
    }

    if (!row.lay_status.trim() || row.lay_status === "Not Laid") {
      missing.push("Lay status");
    }
  }

  return missing;
}

export function getSportsbookLifecycleBadge(
  row: Pick<RowStateClassifiableSportsbookRow, "status" | "result" | "lay_status">
): SportsbookLifecycleBadge | null {
  const status = row.status.trim();
  const result = row.result.trim();
  const layStatus = row.lay_status.trim().toLowerCase();

  if (status === "Prospecting" || status === "Not Placed") {
    return {
      label: "Draft only",
      tone: "muted",
    };
  }

  if (status === "Settled" || result !== "Pending") {
    return {
      label: "Settled",
      tone: "positive",
    };
  }

  if (status === "Free Bet Awarded") {
    return {
      label: "Free bet awarded",
      tone: "positive",
    };
  }

  if (status !== "Placed") {
    return null;
  }

  if (layStatus.includes("part")) {
    return {
      label: "Lay partially matched",
      tone: "partial",
    };
  }

  if (layStatus.includes("fully")) {
    return {
      label: "Lay fully matched",
      tone: "positive",
    };
  }

  if (layStatus.includes("not laid") || !layStatus) {
    return {
      label: "Back placed only",
      tone: "warning",
    };
  }

  return null;
}

export function getSportsbookBackBetStatusBadge(
  row: Pick<RowStateClassifiableSportsbookRow, "status" | "result">
): SportsbookLifecycleBadge {
  if (row.status === "Prospecting" || row.status === "Not Placed") {
    return {
      label: "Not Placed",
      tone: "muted",
    };
  }

  if (row.status === "Settled" || row.result !== "Pending") {
    return {
      label: "Back Placed",
      tone: "positive",
    };
  }

  return {
    label: "Back Placed",
    tone: "positive",
  };
}

export function getSportsbookIssueBadges(
  row: Pick<RowStateClassifiableSportsbookRow, "status" | "result" | "date_settled" | "is_overdue">
): SportsbookIssueBadge[] {
  const issues: SportsbookIssueBadge[] = [];

  if (row.status === "Prospecting" || row.status === "Not Placed") {
    issues.push({
      label: "Back Unplaced",
      tone: "warning",
    });
  }

  if (!row.date_settled.trim()) {
    issues.push({
      label: "No Settle Date",
      tone: "warning",
    });
  }

  if (
    row.status === "Placed" &&
    row.result === "Pending" &&
    row.is_overdue &&
    row.date_settled.trim()
  ) {
    issues.push({
      label: "Outcome Needed",
      tone: "danger",
    });
  }

  return issues;
}

export function getSportsbookIssueTone(
  row: Pick<RowStateClassifiableSportsbookRow, "status" | "result" | "date_settled" | "is_overdue">
): "warning" | "danger" | null {
  const issues = getSportsbookIssueBadges(row);
  if (issues.length === 0) {
    return null;
  }

  if (issues.some((issue) => issue.tone === "danger")) {
    return "danger";
  }

  return "warning";
}

function parseNumericInput(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMoney(value: number): string {
  return value.toFixed(2);
}

function toComparableDate(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getPlacedState<TFormState extends PlacementFormFields>(formState: TFormState): TFormState {
  return {
    ...formState,
    status: "Placed",
    result: "Pending",
  };
}

export function getPartialLayExecutionSummary(options: {
  explicitTargetLayStake: string;
  suggestedTargetLayStake: string;
  legs: PartialLayExecutionLeg[];
}): PartialLayExecutionSummary {
  const explicitTarget = parseNumericInput(options.explicitTargetLayStake);
  const suggestedTarget = parseNumericInput(options.suggestedTargetLayStake);
  const targetLayStake =
    explicitTarget !== null && explicitTarget > 0
      ? explicitTarget
      : suggestedTarget !== null && suggestedTarget > 0
        ? suggestedTarget
        : null;

  const matchedTotal = options.legs.reduce((sum, leg) => {
    const nextMatched = parseNumericInput(leg.matchedStake);
    if (nextMatched === null || nextMatched <= 0) {
      return sum;
    }
    return sum + nextMatched;
  }, 0);

  if (targetLayStake === null) {
    return {
      targetLayStake: null,
      matchedTotal,
      remainingToMatch: null,
      nextRecommendedStake: null,
      hasReachedTarget: false,
      exceededTarget: false,
    };
  }

  const remainingToMatch = targetLayStake - matchedTotal;
  const nextRecommendedStake = Math.max(0, remainingToMatch);
  const hasReachedTarget = remainingToMatch <= 0;
  const exceededTarget = remainingToMatch < 0;

  return {
    targetLayStake,
    matchedTotal,
    remainingToMatch,
    nextRecommendedStake,
    hasReachedTarget,
    exceededTarget,
  };
}

export function getFinalizedLaySelectionFromPartialLegs(
  legs: PartialLayExecutionLegMetadata[]
): FinalizedLaySelection {
  const finalLeg = [...legs].reverse().find((leg) => Boolean(leg.isFinal));

  if (!finalLeg) {
    return {
      hasFinalLeg: false,
      finalLegExchangeName: "",
      finalLegLayOdds: "",
    };
  }

  return {
    hasFinalLeg: true,
    finalLegExchangeName: finalLeg.exchangeName?.trim() ?? "",
    finalLegLayOdds: finalLeg.layOdds?.trim() ?? "",
  };
}

export function applyPlacementActionToState<TFormState extends PlacementFormFields>(options: {
  action: PlacementAction;
  formState: TFormState;
  isSettledReadOnly: boolean;
  suggestedLayStake: string;
}): PlacementActionResult<TFormState> {
  const { action, formState, isSettledReadOnly, suggestedLayStake } = options;

  if (isSettledReadOnly) {
    return {
      nextFormState: null,
      statusMessage: null,
    };
  }

  const placedState = getPlacedState(formState);

  if (action === "back-placed") {
    return {
      nextFormState: placedState,
      statusMessage: "Marked back leg as placed and kept settlement pending.",
    };
  }

  if (formState.match_strategy === "No Lay") {
    return {
      nextFormState: null,
      statusMessage: "Lay placement actions are unavailable for No Lay rows.",
    };
  }

  const targetLayStake = parseNumericInput(formState.lay_actual) ?? parseNumericInput(suggestedLayStake);

  if (targetLayStake === null || targetLayStake <= 0) {
    return {
      nextFormState: null,
      statusMessage: "Enter lay odds/back inputs first so a lay stake can be inferred.",
    };
  }

  const appliedLayStake =
    action === "lay-partially-placed"
      ? Math.max(0.01, Number((targetLayStake * 0.5).toFixed(2)))
      : targetLayStake;

  const nextFormState: TFormState = {
    ...placedState,
    match_strategy:
      action === "lay-partially-placed" && placedState.match_strategy !== "Partial Lay"
        ? "Partial Lay"
        : placedState.match_strategy,
    lay_actual: placedState.lay_actual.trim() ? placedState.lay_actual : formatMoney(targetLayStake),
    lay_matched_stake_1: formatMoney(appliedLayStake),
  };

  return {
    nextFormState,
    statusMessage:
      action === "lay-partially-placed"
        ? `Marked lay as partially placed (${formatMoney(appliedLayStake)} matched).`
        : `Marked lay as fully placed (${formatMoney(appliedLayStake)} matched).`,
  };
}

export function filterPlacedPendingRowsInDateRange<T extends DateRangeFilterRow>(
  rows: T[],
  rangeStartTimestamp: number,
  rangeEndTimestamp: number
): T[] {
  return rows
    .filter((row) => {
      if (row.status !== "Placed" || row.result !== "Pending") {
        return false;
      }

      const settleTimestamp = toComparableDate(row.date_settled);
      if (settleTimestamp === null) {
        return false;
      }

      return settleTimestamp >= rangeStartTimestamp && settleTimestamp <= rangeEndTimestamp;
    })
    .sort((left, right) => {
      const leftSettles = toComparableDate(left.date_settled);
      const rightSettles = toComparableDate(right.date_settled);

      if (leftSettles === null && rightSettles === null) {
        const rightCreated = toComparableDate(right.created_at) ?? 0;
        const leftCreated = toComparableDate(left.created_at) ?? 0;
        return rightCreated - leftCreated;
      }

      if (leftSettles === null) {
        return 1;
      }

      if (rightSettles === null) {
        return -1;
      }

      return leftSettles - rightSettles;
    });
}

export function isSortableSportsbookColumn(key: string): key is SportsbookSortKey {
  return (
    key === "date_settled" ||
    key === "bookmaker" ||
    key === "status" ||
    key === "displayed_value"
  );
}

export function getNextSportsbookTableSort(
  current: SportsbookTableSort | null,
  key: SportsbookSortKey
): SportsbookTableSort | null {
  if (!current || current.key !== key) {
    return { key, direction: "asc" };
  }

  if (current.direction === "asc") {
    return { key, direction: "desc" };
  }

  return null;
}

export function sortSportsbookRows<T extends SortableSportsbookRow>(
  rows: T[],
  tableSort: SportsbookTableSort | null
): T[] {
  if (!tableSort) {
    return rows;
  }

  const nextRows = [...rows];
  nextRows.sort((left, right) => {
    if (tableSort.key === "displayed_value") {
      const leftValue =
        parseNumericInput(
          left.reporting_value ?? left.final_net_pnl ?? left.projected_current_pnl ?? ""
        ) ?? Number.NEGATIVE_INFINITY;
      const rightValue =
        parseNumericInput(
          right.reporting_value ?? right.final_net_pnl ?? right.projected_current_pnl ?? ""
        ) ?? Number.NEGATIVE_INFINITY;

      if (leftValue !== rightValue) {
        return tableSort.direction === "asc" ? leftValue - rightValue : rightValue - leftValue;
      }
    }

    if (tableSort.key === "date_settled") {
      const leftSettles = toComparableDate(left.date_settled);
      const rightSettles = toComparableDate(right.date_settled);

      if (leftSettles !== null && rightSettles !== null && leftSettles !== rightSettles) {
        return tableSort.direction === "asc" ? leftSettles - rightSettles : rightSettles - leftSettles;
      }

      if (leftSettles === null && rightSettles !== null) {
        return 1;
      }

      if (leftSettles !== null && rightSettles === null) {
        return -1;
      }
    }

    if (tableSort.key === "bookmaker" || tableSort.key === "status") {
      const leftValue = tableSort.key === "bookmaker" ? left.bookmaker : left.status;
      const rightValue = tableSort.key === "bookmaker" ? right.bookmaker : right.status;
      const textComparison = leftValue.localeCompare(rightValue, undefined, {
        sensitivity: "base",
      });

      if (textComparison !== 0) {
        return tableSort.direction === "asc" ? textComparison : -textComparison;
      }
    }

    const rightCreated = toComparableDate(right.created_at) ?? 0;
    const leftCreated = toComparableDate(left.created_at) ?? 0;
    return rightCreated - leftCreated;
  });

  return nextRows;
}

export function getSportsbookRowStateClassName(
  row: RowStateClassifiableSportsbookRow
): string {
  const classNames: string[] = [];
  const issueTone = getSportsbookIssueTone(row);

  if (issueTone === "warning") {
    classNames.push("row-state-issue-warning");
  }

  if (issueTone === "danger") {
    classNames.push("row-state-issue-danger");
  }

  return classNames.join(" ");
}
