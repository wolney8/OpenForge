export const GUIDED_ENTRY_RULE_VERSION = "guided-entry-v1";

export type GuidedEntryFieldKey =
  | "offer"
  | "bookmaker"
  | "bet_type"
  | "offer_type"
  | "offer_name"
  | "fixture_type"
  | "event_name"
  | "back_stake"
  | "back_odds"
  | "exchange"
  | "lay_odds_1"
  | "lay_actual"
  | "multi_lay_outcomes"
  | "multi_lay_placements"
  | "settlement";

export type GuidedEntryState = "ready" | "review_required" | "complete";

export type GuidedEntryResult = {
  ruleVersion: typeof GUIDED_ENTRY_RULE_VERSION;
  state: GuidedEntryState;
  nextRequiredField: GuidedEntryFieldKey | null;
  requiredGroup: string | null;
  hiddenFields: GuidedEntryFieldKey[];
  message: string;
  autoFocus: false;
  pulsingAnimation: false;
  textCuePresent: true;
  firstInvalidField?: GuidedEntryFieldKey;
};

export type SportsbookGuidedEntryInput = {
  ledger: "sportsbook";
  action?: string;
  activeField?: GuidedEntryFieldKey;
  interaction?: string;
  completedFields?: GuidedEntryFieldKey[];
  requiredFields?: GuidedEntryFieldKey[];
  offer?: string;
  bookmaker?: string;
  betType?: string;
  offerType?: string;
  offerName?: string;
  fixtureType?: string;
  eventName?: string;
  backStake?: string;
  backOdds?: string;
  exchange?: string;
  layOdds1?: string;
  layActual?: string;
  strategy?: string;
  status?: string;
  result?: string;
  settlementDate?: string;
  multiLayOutcomes?: Array<{
    label?: string;
    name?: string;
    layOdds?: string;
    placedMatchedStake?: string;
    placementState?: "pending" | "placed";
  }>;
  prefersReducedMotion?: boolean;
};

function isFilled(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function isPositiveNumber(value: string | undefined): boolean {
  if (!isFilled(value)) {
    return false;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

function isMultiLayStrategy(strategy: string | undefined): boolean {
  return strategy === "Multilay" || strategy === "Multilay-Underlay" || strategy === "Multi Lay";
}

function needsSettlementDetails(input: SportsbookGuidedEntryInput): boolean {
  if (input.status !== "Settled" && (!input.result || input.result === "Pending")) {
    return false;
  }

  return !isFilled(input.settlementDate) || !isFilled(input.result) || input.result === "Pending";
}

function uniqueFields(fields: GuidedEntryFieldKey[]): GuidedEntryFieldKey[] {
  return Array.from(new Set(fields));
}

function getNextMissingFromCompletedFields(
  requiredFields: GuidedEntryFieldKey[],
  completedFields: GuidedEntryFieldKey[]
): GuidedEntryFieldKey | null {
  const completed = new Set(completedFields);
  return requiredFields.find((field) => !completed.has(field)) ?? null;
}

function fieldMessage(field: GuidedEntryFieldKey): string {
  switch (field) {
    case "offer":
      return "Next required: add the offer shown in the workbook flow.";
    case "bookmaker":
      return "Next required: choose the bookmaker for this sportsbook row.";
    case "bet_type":
      return "Next required: choose the bet type.";
    case "offer_type":
      return "Next required: choose the offer type.";
    case "offer_name":
      return "Next required: choose or enter the offer name.";
    case "fixture_type":
      return "Next required: choose the fixture type.";
    case "event_name":
      return "Next required: enter the event name.";
    case "back_stake":
      return "Next required: enter the back stake.";
    case "back_odds":
      return "Next required: enter the back odds.";
    case "exchange":
      return "Next required: choose the exchange.";
    case "lay_odds_1":
      return "Next required: enter lay odds.";
    case "lay_actual":
      return "Next required: enter the actual lay stake.";
    case "multi_lay_outcomes":
      return "Next required: complete the multi-lay outcome names and odds.";
    case "multi_lay_placements":
      return "Next required: copy or confirm each multi-lay branch placement.";
    case "settlement":
      return "Next required: confirm the settlement date and outcome.";
  }
}

function buildResult(
  state: GuidedEntryState,
  nextRequiredField: GuidedEntryFieldKey | null,
  hiddenFields: GuidedEntryFieldKey[],
  message: string,
  requiredGroup: string | null = null,
  firstInvalidField?: GuidedEntryFieldKey
): GuidedEntryResult {
  return {
    ruleVersion: GUIDED_ENTRY_RULE_VERSION,
    state,
    nextRequiredField,
    requiredGroup,
    hiddenFields: uniqueFields(hiddenFields),
    message,
    autoFocus: false,
    pulsingAnimation: false,
    textCuePresent: true,
    firstInvalidField,
  };
}

export function getSportsbookGuidedEntry(input: SportsbookGuidedEntryInput): GuidedEntryResult {
  const strategy = input.strategy || "Standard";
  const hiddenFields: GuidedEntryFieldKey[] = [];

  if (strategy === "No Lay") {
    hiddenFields.push("exchange", "lay_odds_1", "lay_actual");
  }

  if (isMultiLayStrategy(strategy)) {
    hiddenFields.push("lay_odds_1");
  }

  if (input.action === "save" && input.requiredFields?.length) {
    const firstInvalid = getNextMissingFromCompletedFields(
      input.requiredFields,
      input.completedFields ?? []
    );
    return buildResult(
      firstInvalid ? "ready" : "complete",
      firstInvalid,
      hiddenFields,
      firstInvalid ? fieldMessage(firstInvalid) : "Guided entry complete.",
      null,
      firstInvalid ?? undefined
    );
  }

  if (input.offerType === "Mug Bet" && isMultiLayStrategy(strategy)) {
    return buildResult(
      "review_required",
      null,
      hiddenFields,
      "Review required: Mug Bet and Multi Lay conflict. Choose a compatible strategy before continuing."
    );
  }

  const setupFields: Array<[GuidedEntryFieldKey, string | undefined]> = [
    ["offer", input.offer],
    ["bookmaker", input.bookmaker],
    ["bet_type", input.betType],
    ["offer_type", input.offerType],
    ["fixture_type", input.fixtureType],
    ["event_name", input.eventName],
  ];

  const missingSetup = setupFields.find(([, value]) => !isFilled(value));
  if (missingSetup) {
    return buildResult("ready", missingSetup[0], hiddenFields, fieldMessage(missingSetup[0]));
  }

  const missingBackField = [
    ["back_stake", input.backStake],
    ["back_odds", input.backOdds],
  ].find(([, value]) => !isFilled(value)) as [GuidedEntryFieldKey, string | undefined] | undefined;

  if (missingBackField) {
    return buildResult("ready", missingBackField[0], hiddenFields, fieldMessage(missingBackField[0]));
  }

  if (needsSettlementDetails(input)) {
    return buildResult("ready", "settlement", hiddenFields, fieldMessage("settlement"));
  }

  if (strategy === "No Lay") {
    return buildResult("complete", null, hiddenFields, "Guided entry complete.");
  }

  if (!isFilled(input.exchange)) {
    return buildResult("ready", "exchange", hiddenFields, fieldMessage("exchange"));
  }

  if (isMultiLayStrategy(strategy)) {
    const outcomes = input.multiLayOutcomes ?? [];
    const completedOutcomes = outcomes.filter(
      (outcome) => isFilled(outcome.label ?? outcome.name) && isFilled(outcome.layOdds)
    );
    if (completedOutcomes.length < 2) {
      return buildResult(
        "ready",
        "multi_lay_outcomes",
        hiddenFields,
        fieldMessage("multi_lay_outcomes"),
        "multi_lay_outcomes"
      );
    }
    const placedOutcomes = completedOutcomes.filter(
      (outcome) =>
        outcome.placementState === "placed" && isPositiveNumber(outcome.placedMatchedStake)
    );
    if (placedOutcomes.length < completedOutcomes.length) {
      return buildResult(
        "ready",
        "multi_lay_placements",
        hiddenFields,
        fieldMessage("multi_lay_placements"),
        "multi_lay_placements"
      );
    }
    return buildResult("complete", null, hiddenFields, "Guided entry complete.", "multi_lay_placements");
  }

  if (!isFilled(input.layOdds1)) {
    return buildResult("ready", "lay_odds_1", hiddenFields, fieldMessage("lay_odds_1"));
  }

  if ((strategy === "Custom" || strategy === "Partial Lay") && !isFilled(input.layActual)) {
    return buildResult("ready", "lay_actual", hiddenFields, fieldMessage("lay_actual"));
  }

  return buildResult("complete", null, hiddenFields, "Guided entry complete.");
}
