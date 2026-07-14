"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { apiBaseUrl } from "@/lib/api";
import { getAccountNamesByType, type AccountAuthorityRecord } from "@/lib/account-authorities";
import { StatusToast } from "@/components/status-toast";
import { fromDateTimeLocalValue, toDateTimeLocalValue } from "@/lib/date-format";
import {
  scrollToElementTopAfterRender,
  usePersistedBoolean,
  useToastDismiss,
  useTrackerRouteReselect,
} from "@/lib/ledger-ui";
import { getLookupValuesByType, type LookupValueRecord } from "@/lib/lookup-values";
import type { TableColumn } from "@/lib/tracker-modules";
import { formatDisplayDate } from "@/lib/tracker-summary";
import {
  filterTrackerRows,
  getTrackerPageCount,
  paginateTrackerRows,
} from "@/lib/tracker-table";
import type { TrackerRow } from "@/lib/tracker-types";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";
import {
  betTypeOptions,
  dedupeOptions,
  fixtureTypeOptions,
  getOfferTypeOptions,
  sportsbookResultOptions,
  sportsbookStatusOptions,
  sportsbookStrategyOptions,
} from "@/lib/workbook-options";

type ResultOption = {
  value: string;
  label: string;
};

type SportsbookRecord = {
  sportsbook_bet_id: string;
  profile_id: string;
  event_name: string;
  offer_text: string;
  bookmaker: string;
  offer_type: string;
  bet_type: string;
  offer_name: string;
  fixture_type: string;
  market: string;
  status: string;
  result: string;
  back_stake: string;
  back_odds: string;
  bonus_trigger: string;
  maximum_bonus: string;
  bonus_retention_rate: string;
  match_strategy: string;
  lay_odds_1: string;
  multi_lay_outcome_1_name: string;
  multi_lay_outcomes_json: string;
  lay_actual: string;
  lay_matched_stake_1: string;
  lay_commission_1: string;
  exchange_name: string;
  date_settled: string;
  user_notes: string;
  manual_override_value: string;
  manual_override_reason: string;
  created_at: string;
  updated_at: string;
  calculation_state: string;
  calculation_notes: string[];
  match_rating: string | null;
  reference_lay_stake_standard: string | null;
  reference_lay_stake_underlay: string | null;
  reference_lay_stake_overlay: string | null;
  calculated_liability_1: string | null;
  scenario_pnl_if_back_wins: string | null;
  scenario_pnl_if_lay_wins: string | null;
  scenario_pnl_if_outcome_2_wins: string | null;
  scenario_pnl_if_outcome_3_wins: string | null;
  projected_current_pnl: string | null;
  actual_net_pnl: string | null;
  final_net_pnl: string | null;
  reporting_value: string | null;
  lay_status: string;
  counts_as_open: boolean;
  is_overdue: boolean;
};

type SportsbookFormState = {
  sportsbook_bet_id?: string;
  event_name: string;
  offer_text: string;
  bookmaker: string;
  offer_type: string;
  bet_type: string;
  offer_name: string;
  fixture_type: string;
  market: string;
  status: string;
  result: string;
  back_stake: string;
  back_odds: string;
  bonus_trigger: string;
  maximum_bonus: string;
  bonus_retention_rate: string;
  match_strategy: string;
  lay_odds_1: string;
  multi_lay_outcome_1_name: string;
  multi_lay_outcomes_json: string;
  lay_actual: string;
  lay_matched_stake_1: string;
  lay_commission_1: string;
  exchange_name: string;
  date_settled: string;
  user_notes: string;
  manual_override_value: string;
  manual_override_reason: string;
};

type ExchangeCommissionRecord = {
  profile_id: string;
  exchange_name: string;
  commission_rate: string;
  created_at: string;
  updated_at: string;
};

type LayStakePreview = {
  suggested: string;
  modeLabel: string;
  note: string;
};

type WorkflowSummary = {
  title: string;
  description: string;
};

type ScenarioBranchLabel = {
  possible: string;
  settled: string;
};

type ScenarioBranchLabels = {
  backWinLabel: ScenarioBranchLabel;
  layWinLabel: ScenarioBranchLabel;
  outcome2Label: ScenarioBranchLabel | null;
  outcome3Label: ScenarioBranchLabel | null;
};

type OutcomeCardState = "possible" | "hit" | "missed";

type MultiLayOutcomeInput = {
  id: string;
  label: string;
  layOdds: string;
};

type MultiLayPlannerLeg = {
  key: string;
  label: string;
  layOdds: number;
  suggestedLay: string;
  liability: string;
  layReturnsAfterCommission: string;
};

type MultiLayPlannerSummary = {
  legs: MultiLayPlannerLeg[];
  noSelectionPnl: string;
  landedOutcomePnls: Array<{
    key: string;
    label: string;
    pnl: string;
  }>;
  currentValue: string;
  totalLiability: string;
};

type SportsbookCalculationPreview = {
  lay_commission_1: string | null;
  calculation_state: string;
  calculation_notes: string[];
  match_rating: string | null;
  reference_lay_stake_standard: string | null;
  reference_lay_stake_underlay: string | null;
  reference_lay_stake_overlay: string | null;
  calculated_liability_1: string | null;
  scenario_pnl_if_back_wins: string | null;
  scenario_pnl_if_lay_wins: string | null;
  scenario_pnl_if_outcome_2_wins: string | null;
  scenario_pnl_if_outcome_3_wins: string | null;
  projected_current_pnl: string | null;
  actual_net_pnl: string | null;
  final_net_pnl: string | null;
  reporting_value: string | null;
  lay_status: string;
  counts_as_open: boolean;
  is_overdue: boolean;
};

function getDisplayedValue(
  calculation: Pick<
    SportsbookCalculationPreview,
    "projected_current_pnl" | "final_net_pnl" | "reporting_value"
  > | null,
  fallback: Pick<
    SportsbookRecord,
    "projected_current_pnl" | "final_net_pnl" | "reporting_value"
  > | null
): string {
  return (
    calculation?.reporting_value ??
    calculation?.final_net_pnl ??
    calculation?.projected_current_pnl ??
    fallback?.reporting_value ??
    fallback?.final_net_pnl ??
    fallback?.projected_current_pnl ??
    "—"
  );
}

function getDisplayedValueLabel(
  calculation: Pick<
    SportsbookCalculationPreview,
    "projected_current_pnl" | "final_net_pnl" | "reporting_value"
  > | null,
  fallback: Pick<
    SportsbookRecord,
    "projected_current_pnl" | "final_net_pnl" | "reporting_value"
  > | null
): string {
  if (calculation?.final_net_pnl ?? fallback?.final_net_pnl) {
    return "Final value";
  }
  return "Current value";
}

function getCalculationValueSource(
  calculation: Pick<
    SportsbookCalculationPreview,
    "projected_current_pnl" | "final_net_pnl" | "reporting_value"
  > | null,
  fallback: Pick<
    SportsbookRecord,
    "projected_current_pnl" | "final_net_pnl" | "reporting_value"
  > | null
): string {
  if (calculation?.final_net_pnl ?? fallback?.final_net_pnl) {
    return "Settled/final or override-backed reporting value";
  }
  if (calculation?.projected_current_pnl ?? fallback?.projected_current_pnl) {
    return "Cash-first projected/current value for an open row";
  }
  return "Awaiting contract-backed value";
}

function getScenarioValue(
  calculation: Pick<
    SportsbookCalculationPreview,
    | "scenario_pnl_if_back_wins"
    | "scenario_pnl_if_lay_wins"
    | "scenario_pnl_if_outcome_2_wins"
    | "scenario_pnl_if_outcome_3_wins"
  > | null,
  fallback: Pick<
    SportsbookRecord,
    | "scenario_pnl_if_back_wins"
    | "scenario_pnl_if_lay_wins"
    | "scenario_pnl_if_outcome_2_wins"
    | "scenario_pnl_if_outcome_3_wins"
  > | null,
  key:
    | "scenario_pnl_if_back_wins"
    | "scenario_pnl_if_lay_wins"
    | "scenario_pnl_if_outcome_2_wins"
    | "scenario_pnl_if_outcome_3_wins"
): string {
  return calculation?.[key] ?? fallback?.[key] ?? "—";
}

const tableColumns: TableColumn[] = [
  { key: "sportsbook_bet_id", label: "Bet ID" },
  { key: "date_settled", label: "Settles" },
  { key: "bookmaker", label: "Bookmaker" },
  { key: "offer_name", label: "Offer name" },
  { key: "exchange_name", label: "Exchange" },
  { key: "status", label: "Status" },
  { key: "result", label: "Result" },
  { key: "offer_type", label: "Offer type" },
  { key: "event_name", label: "Event" },
  { key: "back_stake", label: "Back stake", align: "end" },
  { key: "back_odds", label: "Back odds", align: "end" },
  { key: "match_strategy", label: "Strategy" },
  { key: "lay_odds_1", label: "Lay odds", align: "end" },
  { key: "lay_commission_1", label: "Commission", align: "end" },
  { key: "projected_current_pnl", label: "Current value", align: "end" },
  { key: "final_net_pnl", label: "Final value", align: "end" },
  { key: "reporting_value", label: "Reporting value", align: "end" },
  { key: "calculated_liability_1", label: "Liability", align: "end" },
  { key: "lay_status", label: "Lay status" },
  { key: "calculation_state", label: "Calc state" },
];

function createBlankForm(): SportsbookFormState {
  return {
    event_name: "",
    offer_text: "",
    bookmaker: "",
    offer_type: "",
    bet_type: "",
    offer_name: "",
    fixture_type: "",
    market: "",
    status: "Prospecting",
    result: "Pending",
    back_stake: "",
    back_odds: "",
    bonus_trigger: "",
    maximum_bonus: "",
    bonus_retention_rate: "70",
    match_strategy: "Standard",
    lay_odds_1: "",
    multi_lay_outcome_1_name: "",
    multi_lay_outcomes_json: "[]",
    lay_actual: "",
    lay_matched_stake_1: "",
    lay_commission_1: "",
    exchange_name: "",
    date_settled: "",
    user_notes: "",
    manual_override_value: "",
    manual_override_reason: "",
  };
}

function recordToForm(record: SportsbookRecord): SportsbookFormState {
  return {
    sportsbook_bet_id: record.sportsbook_bet_id,
    event_name: record.event_name,
    offer_text: record.offer_text,
    bookmaker: record.bookmaker,
    offer_type: record.offer_type,
    bet_type: record.bet_type,
    offer_name: record.offer_name,
    fixture_type: record.fixture_type,
    market: record.market,
    status: record.status,
    result: record.result,
    back_stake: record.back_stake,
    back_odds: record.back_odds,
    bonus_trigger: record.bonus_trigger,
    maximum_bonus: record.maximum_bonus,
    bonus_retention_rate: record.bonus_retention_rate,
    match_strategy: record.match_strategy,
    lay_odds_1: record.lay_odds_1,
    multi_lay_outcome_1_name: record.multi_lay_outcome_1_name,
    multi_lay_outcomes_json: record.multi_lay_outcomes_json,
    lay_actual: record.lay_actual,
    lay_matched_stake_1: record.lay_matched_stake_1,
    lay_commission_1: record.lay_commission_1,
    exchange_name: record.exchange_name,
    date_settled: toDateTimeLocalValue(record.date_settled),
    user_notes: record.user_notes,
    manual_override_value: record.manual_override_value,
    manual_override_reason: record.manual_override_reason,
  };
}

function parseNumericInput(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPreviewMoney(value: number): string {
  return value.toFixed(2);
}

function createDefaultMultiLayOutcomes(): MultiLayOutcomeInput[] {
  return [
    { id: "outcome2", label: "Outcome 2", layOdds: "" },
  ];
}

function createDefaultMultiLayOutcomeLabel(): string {
  return "Outcome 1";
}

function getMultiLayOutcomeLabel(value: string): string {
  return value.trim() || createDefaultMultiLayOutcomeLabel();
}

function createMultiLayOutcomeId(index: number): string {
  return `outcome${index}`;
}

function serializeMultiLayOutcomes(outcomes: MultiLayOutcomeInput[]): string {
  return JSON.stringify(
    outcomes.map((outcome, index) => ({
      id: outcome.id || createMultiLayOutcomeId(index + 2),
      label: outcome.label,
      layOdds: outcome.layOdds,
    }))
  );
}

function parseMultiLayOutcomes(serialized: string): MultiLayOutcomeInput[] {
  try {
    const parsed = JSON.parse(serialized);
    if (!Array.isArray(parsed)) {
      return createDefaultMultiLayOutcomes();
    }

    const outcomes = parsed
      .map((entry, index) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }

        const record = entry as Partial<MultiLayOutcomeInput>;
        return {
          id:
            typeof record.id === "string" && record.id.trim()
              ? record.id
              : createMultiLayOutcomeId(index + 2),
          label: typeof record.label === "string" ? record.label : "",
          layOdds: typeof record.layOdds === "string" ? record.layOdds : "",
        };
      })
      .filter((entry): entry is MultiLayOutcomeInput => entry !== null);

    return outcomes.length > 0 ? outcomes : createDefaultMultiLayOutcomes();
  } catch {
    return createDefaultMultiLayOutcomes();
  }
}

async function copyToClipboard(value: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function getWorkflowSummary(formState: SportsbookFormState): WorkflowSummary {
  const offerLabel = formState.offer_type.trim() || "Offer type pending";
  const strategyLabel = formState.match_strategy.trim() || "Strategy pending";

  if (formState.offer_type === "Mug Bet" || formState.match_strategy === "No Lay") {
    return {
      title: `${offerLabel} + ${strategyLabel}`,
      description:
        "This workbook path is a no-lay sportsbook row. Exchange inputs stay hidden and the row resolves from back-side outcomes only.",
    };
  }

  if (formState.offer_type === "Double Delight / Hat-trick Heaven") {
    return {
      title: `${offerLabel} + ${strategyLabel}`,
      description:
        "This row uses the DDHH outcome tree, so sportsbook results must stay aligned to the specialised first-scorer branches.",
    };
  }

  if (
    formState.match_strategy === "Multilay" ||
    formState.match_strategy === "Multilay-Underlay"
  ) {
    return {
      title: `${offerLabel} + ${strategyLabel}`,
      description:
        "This is a multi-lay workbook path. Outcome names and lay odds are saved with the row, and the current-value panel resolves from the multi-outcome branch when enough data is present.",
    };
  }

  if (formState.match_strategy === "Custom" || formState.match_strategy === "Partial Lay") {
    return {
      title: `${offerLabel} + ${strategyLabel}`,
      description:
        "This workflow expects the Fund Manager to confirm the lay side explicitly rather than relying only on a standard suggestion.",
    };
  }

  return {
    title: `${offerLabel} + ${strategyLabel}`,
    description:
      "This is the standard sportsbook matching path. Enter the row in workbook order and use the suggestion panel to guide the lay side before saving.",
  };
}

function getSportsbookResultOptions(
  offerType: string,
  strategy: string,
  bonusTrigger: string
): ResultOption[] {
  if (offerType === "Double Delight / Hat-trick Heaven") {
    return [
      { value: "Pending", label: "Pending" },
      {
        value: "Outcome 1 Won",
        label: "Player scored first but no further goals",
      },
      {
        value: "Outcome 2 Won",
        label: "Player scored first and again (2 goals)",
      },
      {
        value: "Outcome 3 Won",
        label: "Player scored first and got a hat-trick",
      },
      {
        value: "Lay Won",
        label: "Player did not score first (lay won)",
      },
      { value: "Void", label: "Void" },
    ];
  }

  if (offerType === "Cashback" || offerType === "Refund") {
    const cashbackOptions: ResultOption[] = [
      { value: "Pending", label: "Pending" },
      { value: "Back Won", label: "Back won" },
      { value: "Lay Won", label: "Lay won" },
      { value: "Void", label: "Void" },
    ];
    if (bonusTrigger === "Back Wins") {
      cashbackOptions.splice(2, 0, { value: "Back Won + Cashback", label: "Back won + bonus/cashback" });
    } else {
      cashbackOptions.splice(3, 0, { value: "Lay Won + Cashback", label: "Lay won + bonus/cashback" });
    }
    return cashbackOptions;
  }

  if (offerType === "Mug Bet" || strategy === "No Lay") {
    return [
      { value: "Pending", label: "Pending" },
      { value: "Win", label: "Win" },
      { value: "Lose", label: "Lose" },
      { value: "Void", label: "Void" },
    ];
  }

  return sportsbookResultOptions.map((option) => ({
    value: option,
    label: option,
  }));
}

function getSportsbookResultLabel(
  offerType: string,
  strategy: string,
  bonusTrigger: string,
  result: string
): string {
  return (
    getSportsbookResultOptions(offerType, strategy, bonusTrigger).find((option) => option.value === result)?.label ??
    result
  );
}

function getScenarioBranchLabels(
  offerType: string,
  strategy: string,
  bonusTrigger: string,
  outcome1Label: string,
  extraOutcomes: MultiLayOutcomeInput[]
): ScenarioBranchLabels {
  if (offerType === "Double Delight / Hat-trick Heaven") {
    return {
      backWinLabel: {
        possible: "Player scores first but no further goals",
        settled: "Player scored first but no further goals",
      },
      layWinLabel: {
        possible: "Player does not score first",
        settled: "Player did not score first",
      },
      outcome2Label: {
        possible: "Player scores first and then scores again",
        settled: "Player scored first and then scored again",
      },
      outcome3Label: {
        possible: "Player scores first and gets a hat-trick",
        settled: "Player scored first and got a hat-trick",
      },
    };
  }

  if (offerType === "Cashback" || offerType === "Refund") {
    const triggerPossible =
      offerType === "Refund" ? "Bonus/refund trigger hits" : "Cashback trigger hits";
    const triggerSettled =
      offerType === "Refund" ? "Bonus/refund triggered" : "Cashback triggered";
    return {
      backWinLabel: {
        possible: "Back wins",
        settled: "Back won",
      },
      layWinLabel: {
        possible: "Lay wins",
        settled: "Lay won",
      },
      outcome2Label: {
        possible: triggerPossible,
        settled: triggerSettled,
      },
      outcome3Label: null,
    };
  }

  if (offerType === "Mug Bet" || strategy === "No Lay") {
    return {
      backWinLabel: {
        possible: "Back wins",
        settled: "Back won",
      },
      layWinLabel: {
        possible: "Back loses",
        settled: "Back lost",
      },
      outcome2Label: null,
      outcome3Label: null,
    };
  }

  if (strategy === "Multilay" || strategy === "Multilay-Underlay") {
    return {
      backWinLabel: {
        possible: outcome1Label.trim() || "Outcome 1 lands",
        settled: outcome1Label.trim() || "Outcome 1 landed",
      },
      layWinLabel: {
        possible: "Back loses",
        settled: "Back lost",
      },
      outcome2Label: {
        possible: extraOutcomes[0]?.label?.trim() || "Outcome 2 lands",
        settled: extraOutcomes[0]?.label?.trim() || "Outcome 2 landed",
      },
      outcome3Label:
        extraOutcomes.length > 1
          ? {
              possible: extraOutcomes[1]?.label?.trim() || "Outcome 3 lands",
              settled: extraOutcomes[1]?.label?.trim() || "Outcome 3 landed",
            }
          : null,
    };
  }

  return {
    backWinLabel: {
      possible: "Back wins",
      settled: "Back won",
    },
    layWinLabel: {
      possible: "Lay wins",
      settled: "Lay won",
    },
    outcome2Label: {
      possible: "Outcome 2 wins",
      settled: "Outcome 2 won",
    },
    outcome3Label: {
      possible: "Outcome 3 wins",
      settled: "Outcome 3 won",
    },
  };
}

function getScenarioBranchText(
  label: ScenarioBranchLabel | null,
  result: string
): string | null {
  if (!label) {
    return null;
  }
  return result === "Pending" ? label.possible : label.settled;
}

function getOutcomeCardState(
  result: string,
  key: "back" | "lay" | "outcome2" | "outcome3"
): OutcomeCardState {
  if (result === "Pending") {
    return "possible";
  }

  const hitKey =
    result === "Back Won" || result === "Win" || result === "Outcome 1 Won"
      ? "back"
      : result === "Lay Won" || result === "Lose" || result === "No Selection Won"
        ? "lay"
        : result === "Back Won + Cashback"
          ? "outcome2"
          : result === "Lay Won + Cashback"
            ? "outcome2"
            : result === "Outcome 2 Won"
              ? "outcome2"
              : result === "Outcome 3 Won"
                ? "outcome3"
                : null;

  if (hitKey === null) {
    return "possible";
  }

  return hitKey === key ? "hit" : "missed";
}

function getOutcomeCardLabel(state: OutcomeCardState): string {
  if (state === "hit") {
    return "Outcome hit";
  }
  if (state === "missed") {
    return "Outcome missed";
  }
  return "Possible outcome";
}

function formatExtraScenarioSummary(
  outcome2Label: string | null,
  outcome2Value: string | null | undefined,
  outcome3Label: string | null,
  outcome3Value: string | null | undefined
): string {
  const parts: string[] = [];

  if (outcome2Label) {
    parts.push(`${outcome2Label}: ${outcome2Value ?? "—"}`);
  }

  if (outcome3Label) {
    parts.push(`${outcome3Label}: ${outcome3Value ?? "—"}`);
  }

  return parts.join(" | ");
}

function applyOfferTypeDefaults(
  current: SportsbookFormState,
  nextOfferType: string
): SportsbookFormState {
  const previewStrategy =
    nextOfferType === "Mug Bet" || nextOfferType === "None"
      ? "No Lay"
      : current.match_strategy;
  const nextResultOptions = getSportsbookResultOptions(
    nextOfferType,
    previewStrategy,
    current.bonus_trigger
  );
  const nextResultValues = new Set(nextResultOptions.map((option) => option.value));
  const nextState: SportsbookFormState = {
    ...current,
    offer_type: nextOfferType,
    result: nextResultValues.has(current.result) ? current.result : "Pending",
  };

  if (nextOfferType === "Mug Bet" || nextOfferType === "None") {
    return {
      ...nextState,
      match_strategy: "No Lay",
      bet_type: current.bet_type || "Single",
      exchange_name: "",
      lay_odds_1: "",
      lay_actual: "",
      lay_matched_stake_1: "",
    };
  }

  if (nextOfferType === "Double Delight / Hat-trick Heaven") {
    return {
      ...nextState,
      bet_type: "First Goalscorer",
      fixture_type: current.fixture_type || "Football",
      market: current.market || "First Goalscorer",
    };
  }

  if (nextOfferType === "Bet Builder") {
    return {
      ...nextState,
      bet_type: "Bet Builder",
      market: current.market || "Bet Builder",
    };
  }

  if (nextOfferType === "Acca") {
    return {
      ...nextState,
      bet_type: "Accumulator / Multiple",
      market: current.market || "Accumulator / Multiple",
    };
  }

  if (nextOfferType === "Cashback" || nextOfferType === "Refund") {
    const bonusTrigger = current.bonus_trigger || "Lay Wins";
    const nextOptions = getSportsbookResultOptions(nextOfferType, current.match_strategy, bonusTrigger);
    const nextValues = new Set(nextOptions.map((option) => option.value));
    return {
      ...nextState,
      bonus_trigger: bonusTrigger,
      bonus_retention_rate: current.bonus_retention_rate || "70",
      result: nextValues.has(nextState.result) ? nextState.result : "Pending",
    };
  }

  return nextState;
}

function applyStrategyDefaults(
  current: SportsbookFormState,
  nextStrategy: string
): SportsbookFormState {
  const nextResultOptions = getSportsbookResultOptions(
    current.offer_type,
    nextStrategy,
    current.bonus_trigger
  );
  const nextResultValues = new Set(nextResultOptions.map((option) => option.value));

  if (nextStrategy === "No Lay") {
    return {
      ...current,
      match_strategy: nextStrategy,
      result: nextResultValues.has(current.result) ? current.result : "Pending",
      exchange_name: "",
      lay_odds_1: "",
      lay_actual: "",
      lay_matched_stake_1: "",
    };
  }

  return {
    ...current,
    match_strategy: nextStrategy,
    result: nextResultValues.has(current.result) ? current.result : "Pending",
  };
}

function applyResultDefaults(
  current: SportsbookFormState,
  nextResult: string
): SportsbookFormState {
  const nextStatus =
    nextResult === "Pending"
      ? current.status === "Settled" || current.status === "Void"
        ? "Placed"
        : current.status
      : nextResult === "Void"
        ? "Void"
        : "Settled";

  return {
    ...current,
    result: nextResult,
    status: nextStatus,
  };
}

function applyStatusDefaults(
  current: SportsbookFormState,
  nextStatus: string
): SportsbookFormState {
  if (nextStatus === "Prospecting" || nextStatus === "Not Placed" || nextStatus === "Placed") {
    return {
      ...current,
      status: nextStatus,
      result: "Pending",
    };
  }

  if (nextStatus === "Void" || nextStatus === "Cancelled") {
    return {
      ...current,
      status: nextStatus,
      result: "Void",
    };
  }

  return {
    ...current,
    status: nextStatus,
  };
}

function applyBetTypeDefaults(
  current: SportsbookFormState,
  nextBetType: string
): SportsbookFormState {
  if (nextBetType === "Bet Builder" && !current.market.trim()) {
    return {
      ...current,
      bet_type: nextBetType,
      market: "Bet Builder",
    };
  }

  if (nextBetType === "Accumulator / Multiple" && !current.market.trim()) {
    return {
      ...current,
      bet_type: nextBetType,
      market: "Accumulator / Multiple",
    };
  }

  return {
    ...current,
    bet_type: nextBetType,
  };
}

function getLayStakePreview(
  formState: SportsbookFormState,
  resolvedCommission: string
): LayStakePreview | null {
  const backStake = parseNumericInput(formState.back_stake);
  const backOdds = parseNumericInput(formState.back_odds);
  const layOdds = parseNumericInput(formState.lay_odds_1);
  const commission = parseNumericInput(resolvedCommission);

  if (formState.match_strategy === "No Lay") {
    return {
      suggested: "0.00",
      modeLabel: "No Lay",
      note: "Workbook parity: no-lay rows use zero lay stake.",
    };
  }

  if (backStake === null || backOdds === null) {
    return null;
  }

  if (formState.match_strategy === "Custom" || formState.match_strategy === "Partial Lay") {
    return {
      suggested: formState.lay_actual.trim() || "—",
      modeLabel: formState.match_strategy,
      note: "Workbook parity: custom and partial-lay rows rely on explicit lay actual values.",
    };
  }

  if (layOdds === null || commission === null) {
    return null;
  }

  let suggested: number | null = null;
  const note = "Workbook parity suggestion from the current strategy and resolved commission.";

  if (formState.match_strategy === "Standard") {
    const denominator = layOdds - commission;
    if (denominator !== 0) {
      suggested = (backStake * backOdds) / denominator;
    }
  } else if (formState.match_strategy === "Underlay") {
    const denominator = layOdds - 1;
    if (denominator !== 0) {
      suggested = (backStake * (backOdds - 1)) / denominator;
    }
  } else if (formState.match_strategy === "Overlay") {
    const denominator = 1 - commission;
    if (denominator !== 0) {
      suggested = backStake / denominator;
    }
  } else if (
    formState.match_strategy === "Multilay" ||
    formState.match_strategy === "Multilay-Underlay"
  ) {
    return {
      suggested: "—",
      modeLabel: formState.match_strategy,
      note: "Workbook multi-lay rows use the branch planner below to calculate each lay leg from the saved outcome names, lay odds, and resolved commission.",
    };
  }

  if (suggested === null || !Number.isFinite(suggested)) {
    return null;
  }

  return {
    suggested: formatPreviewMoney(suggested),
    modeLabel: formState.match_strategy,
    note,
  };
}

function hasPreviewInputsReady(
  formState: SportsbookFormState,
  resolvedCommission: string
): boolean {
  const hasBackInputs =
    parseNumericInput(formState.back_stake) !== null &&
    parseNumericInput(formState.back_odds) !== null;

  if (!hasBackInputs) {
    return false;
  }

  if (formState.match_strategy === "No Lay") {
    return true;
  }

  if (!formState.exchange_name.trim() || !resolvedCommission.trim()) {
    return false;
  }

  if (parseNumericInput(formState.lay_odds_1) === null) {
    return false;
  }

  if (
    (formState.match_strategy === "Custom" || formState.match_strategy === "Partial Lay") &&
    parseNumericInput(formState.lay_actual) === null
  ) {
    return false;
  }

  return true;
}

function getCalculatorGuidance(
  formState: SportsbookFormState,
  resolvedCommission: string
): string {
  if (
    parseNumericInput(formState.back_stake) === null ||
    parseNumericInput(formState.back_odds) === null
  ) {
    return "Enter back stake and back odds to unlock the workbook-style calculation preview.";
  }

  if (formState.match_strategy === "No Lay") {
    return "No-lay rows resolve from the back-side outcome only. Save the row once the back side is known.";
  }

  if (!formState.exchange_name.trim()) {
    return "Choose the exchange used for this row so the profile commission setting can be applied.";
  }

  if (!resolvedCommission.trim()) {
    return "Add this exchange commission in Settings before relying on contract-backed sportsbook money values.";
  }

  if (parseNumericInput(formState.lay_odds_1) === null) {
    return "Enter the first lay odds to see the workbook-style lay suggestion and current-value preview.";
  }

  if (
    (formState.match_strategy === "Custom" || formState.match_strategy === "Partial Lay") &&
    parseNumericInput(formState.lay_actual) === null
  ) {
    return `Enter lay actual for the ${formState.match_strategy.toLowerCase()} path before the contract-backed preview resolves.`;
  }

  return "Contract-backed sportsbook preview is ready.";
}

function getMultiLayPlannerSummary(
  formState: SportsbookFormState,
  resolvedCommission: string,
  outcome1Label: string,
  extraOutcomes: MultiLayOutcomeInput[]
): MultiLayPlannerSummary | null {
  if (
    formState.match_strategy !== "Multilay" &&
    formState.match_strategy !== "Multilay-Underlay"
  ) {
    return null;
  }

  const backStake = parseNumericInput(formState.back_stake);
  const backOdds = parseNumericInput(formState.back_odds);
  const layOdds1 = parseNumericInput(formState.lay_odds_1);
  const commission = parseNumericInput(resolvedCommission);

  if (backStake === null || backOdds === null || layOdds1 === null || commission === null) {
    return null;
  }

  const activeOdds = [
    {
      key: "outcome1",
      label: outcome1Label.trim() || "Outcome 1",
      layOdds: layOdds1,
    },
    ...extraOutcomes
      .map((outcome) => ({
        key: outcome.id,
        label: outcome.label.trim() || outcome.id.replace("outcome", "Outcome "),
        layOdds: parseNumericInput(outcome.layOdds),
      }))
      .filter((outcome) => outcome.layOdds !== null)
      .map((outcome) => ({
        key: outcome.key,
        label: outcome.label,
        layOdds: outcome.layOdds as number,
      })),
  ];

  if (activeOdds.length < 2) {
    return null;
  }

  const suggestedStakes =
    formState.match_strategy === "Multilay"
      ? activeOdds.map((outcome) => {
          const denominator = outcome.layOdds - commission;
          if (denominator === 0) {
            return null;
          }
          return (backStake * backOdds) / denominator;
        })
      : (() => {
          const denominator = activeOdds.reduce((sum, outcome) => {
            return sum + (1 - commission) / (outcome.layOdds - commission);
          }, 0);

          if (denominator === 0) {
            return activeOdds.map(() => null);
          }

          const baseAllocation = backStake / denominator;
          return activeOdds.map((outcome) => baseAllocation / (outcome.layOdds - commission));
        })();

  if (suggestedStakes.some((stake) => stake === null || !Number.isFinite(stake))) {
    return null;
  }

  const legs: MultiLayPlannerLeg[] = activeOdds.map((outcome, index) => {
    const suggestedLay = Number(suggestedStakes[index]);
    const liability = suggestedLay * (outcome.layOdds - 1);
    const layReturnsAfterCommission = suggestedLay * (1 - commission);

    return {
      key: outcome.key,
      label: outcome.label,
      layOdds: outcome.layOdds,
      suggestedLay: formatPreviewMoney(suggestedLay),
      liability: formatPreviewMoney(liability),
      layReturnsAfterCommission: formatPreviewMoney(layReturnsAfterCommission),
    };
  });

  const backProfit = backStake * (backOdds - 1);
  const totalReturns = legs.reduce(
    (sum, leg) => sum + (parseNumericInput(leg.layReturnsAfterCommission) ?? 0),
    0
  );
  const landedOutcomePnls = legs.map((leg) => {
    const liability = parseNumericInput(leg.liability) ?? 0;
    const ownReturns = parseNumericInput(leg.layReturnsAfterCommission) ?? 0;
    const basePnl = backProfit - liability + (totalReturns - ownReturns);

    let pnl = basePnl;
    if (formState.offer_type === "Double Delight / Hat-trick Heaven") {
      if (leg.key === "outcome2") {
        pnl = basePnl + backProfit;
      } else if (leg.key === "outcome3") {
        pnl = basePnl + backProfit * 2;
      }
    }

    return {
      key: leg.key,
      label: leg.label,
      pnl: formatPreviewMoney(pnl),
      numericPnl: pnl,
    };
  });
  const noSelectionPnl = -backStake + totalReturns;
  const currentCandidates = [
    noSelectionPnl,
    ...landedOutcomePnls.map((entry) => entry.numericPnl),
  ];

  const totalLiability = legs.reduce((sum, leg) => sum + (parseNumericInput(leg.liability) ?? 0), 0);

  return {
    legs,
    noSelectionPnl: formatPreviewMoney(noSelectionPnl),
    landedOutcomePnls: landedOutcomePnls.map(({ key, label, pnl }) => ({ key, label, pnl })),
    currentValue: formatPreviewMoney(Math.min(...currentCandidates)),
    totalLiability: formatPreviewMoney(totalLiability),
  };
}

function getPersistableSportsbookForm(
  formState: SportsbookFormState,
  options: {
    resolvedCommission: string;
    outcome1Label: string;
    extraOutcomes: MultiLayOutcomeInput[];
  }
): SportsbookFormState {
  const nextBaseState: SportsbookFormState = {
    ...formState,
    multi_lay_outcome_1_name: options.outcome1Label,
    multi_lay_outcomes_json: serializeMultiLayOutcomes(options.extraOutcomes),
  };
  const plannerSummary = getMultiLayPlannerSummary(
    nextBaseState,
    options.resolvedCommission,
    options.outcome1Label,
    options.extraOutcomes
  );

  if (
    plannerSummary === null ||
    (nextBaseState.match_strategy !== "Multilay" &&
      nextBaseState.match_strategy !== "Multilay-Underlay") ||
    nextBaseState.lay_actual.trim()
  ) {
    return nextBaseState;
  }

  const firstLeg = plannerSummary.legs[0];
  if (!firstLeg) {
    return formState;
  }

  return {
    ...nextBaseState,
    lay_actual: firstLeg.suggestedLay,
  };
}

export function SportsbookWorkflowShell({ profileId }: { profileId: string }) {
  const [rows, setRows] = useState<SportsbookRecord[]>([]);
  const [accountAuthorities, setAccountAuthorities] = useState<AccountAuthorityRecord[]>([]);
  const [exchangeSettings, setExchangeSettings] = useState<ExchangeCommissionRecord[]>([]);
  const [lookupValues, setLookupValues] = useState<LookupValueRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workflowVisible, setWorkflowVisible] = useState(false);
  const [editorExpanded, setEditorExpanded] = useState(true);
  const [tableCollapsed, setTableCollapsed] = usePersistedBoolean(
    `openforge-ledger-collapsed:${profileId}:sportsbook-bets`,
    false
  );
  const [formState, setFormState] = useState<SportsbookFormState>(createBlankForm);
  const [pristineFormState, setPristineFormState] = useState<SportsbookFormState>(createBlankForm);
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [previewCalculation, setPreviewCalculation] = useState<SportsbookCalculationPreview | null>(null);
  const [multiLayOutcomes, setMultiLayOutcomes] = useState<MultiLayOutcomeInput[]>(
    createDefaultMultiLayOutcomes
  );
  const [multiLayOutcome1Label, setMultiLayOutcome1Label] = useState(
    createDefaultMultiLayOutcomeLabel
  );
  const [isPending, startTransition] = useTransition();
  const editorRef = useRef<HTMLElement | null>(null);
  const pageSize = 10;
  const isDirty = useMemo(
    () =>
      JSON.stringify({
        ...formState,
        multi_lay_outcome_1_name: multiLayOutcome1Label,
        multi_lay_outcomes_json: serializeMultiLayOutcomes(multiLayOutcomes),
      }) !== JSON.stringify(pristineFormState),
    [formState, multiLayOutcome1Label, multiLayOutcomes, pristineFormState]
  );
  const confirmDiscardChanges = useUnsavedChangesGuard(isDirty);
  const clearStatusMessage = useCallback(() => setStatusMessage(""), []);

  useToastDismiss(statusMessage, clearStatusMessage);

  const revealEditor = useCallback(
    (options?: { expandLedger?: boolean }) => {
      setEditorExpanded(true);
      if (options?.expandLedger ?? true) {
        setTableCollapsed(false);
      }
      scrollToElementTopAfterRender(() => editorRef.current);
    },
    [setTableCollapsed]
  );

  useTrackerRouteReselect(() => {
    setWorkflowVisible(true);
    setTableCollapsed(false);
    setEditorExpanded(true);
    scrollToElementTopAfterRender(() => editorRef.current);
  });

  const loadRows = useCallback(
    async (preferredSelection?: string | null) => {
      const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to load sportsbook rows");
      }

      const nextRows = (await response.json()) as SportsbookRecord[];
      startTransition(() => {
        setRows(nextRows);
        const selected =
          preferredSelection &&
          nextRows.some((row) => row.sportsbook_bet_id === preferredSelection)
            ? preferredSelection
            : nextRows[0]?.sportsbook_bet_id ?? null;
        setSelectedId(selected);
        if (selected) {
          const activeRecord = nextRows.find((row) => row.sportsbook_bet_id === selected);
          if (activeRecord) {
            const nextFormState = recordToForm(activeRecord);
            setMultiLayOutcome1Label(getMultiLayOutcomeLabel(activeRecord.multi_lay_outcome_1_name));
            setMultiLayOutcomes(parseMultiLayOutcomes(activeRecord.multi_lay_outcomes_json));
            setFormState(nextFormState);
            setPristineFormState(nextFormState);
          }
          setWorkflowVisible(true);
        } else {
          const blankForm = createBlankForm();
          setMultiLayOutcomes(createDefaultMultiLayOutcomes());
          setMultiLayOutcome1Label(createDefaultMultiLayOutcomeLabel());
          setFormState(blankForm);
          setPristineFormState(blankForm);
          setWorkflowVisible(true);
        }
      });
    },
    [profileId, startTransition]
  );

  const loadExchangeSettings = useCallback(async () => {
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/exchange-commissions`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Unable to load exchange settings");
    }
    const nextRows = (await response.json()) as ExchangeCommissionRecord[];
    setExchangeSettings(nextRows);
  }, [profileId]);

  const loadAccountAuthorities = useCallback(async () => {
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/accounts`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Unable to load account authorities");
    }
    const nextRows = (await response.json()) as AccountAuthorityRecord[];
    setAccountAuthorities(nextRows);
  }, [profileId]);

  const loadLookupValues = useCallback(async () => {
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/lookup-values`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Unable to load workbook authority lists");
    }
    const nextRows = (await response.json()) as LookupValueRecord[];
    setLookupValues(nextRows);
  }, [profileId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void Promise.all([
        loadRows(),
        loadExchangeSettings(),
        loadAccountAuthorities(),
        loadLookupValues(),
      ]).catch((error: Error) => {
        setErrorMessage(error.message);
        setStatusMessage("Sportsbook workflow could not be loaded.");
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadAccountAuthorities, loadExchangeSettings, loadLookupValues, loadRows]);

  const bookmakerOptions = useMemo(
    () =>
      dedupeOptions([
        ...getAccountNamesByType(accountAuthorities, "Bookie"),
        ...getLookupValuesByType(lookupValues, "bookmaker"),
        ...rows.map((row) => row.bookmaker),
        formState.bookmaker,
      ]),
    [accountAuthorities, formState.bookmaker, lookupValues, rows]
  );

  const offerTypeOptions = useMemo(
    () => getOfferTypeOptions(formState.offer_type),
    [formState.offer_type]
  );

  const offerNameOptions = useMemo(() => {
    const workbookOfferNames = getLookupValuesByType(lookupValues, "offer_name");
    if (workbookOfferNames.length > 0) {
      return dedupeOptions([...workbookOfferNames, formState.offer_name]);
    }

    return dedupeOptions([...rows.map((row) => row.offer_name), formState.offer_name]);
  }, [formState.offer_name, lookupValues, rows]);

  const betTypeOptionsResolved = useMemo(
    () => dedupeOptions([...betTypeOptions, ...rows.map((row) => row.bet_type), formState.bet_type]),
    [formState.bet_type, rows]
  );

  const fixtureTypeOptionsResolved = useMemo(
    () =>
      dedupeOptions([
        ...fixtureTypeOptions,
        ...rows.map((row) => row.fixture_type),
        formState.fixture_type,
      ]),
    [formState.fixture_type, rows]
  );

  const exchangeOptions = useMemo(
    () =>
      dedupeOptions([
        ...exchangeSettings.map((row) => row.exchange_name),
        ...getAccountNamesByType(accountAuthorities, "Exchange"),
        ...getLookupValuesByType(lookupValues, "exchange"),
        ...rows.map((row) => row.exchange_name),
        formState.exchange_name,
      ]),
    [accountAuthorities, exchangeSettings, formState.exchange_name, lookupValues, rows]
  );

  const resolvedCommission = useMemo(() => {
    return (
      exchangeSettings.find((row) => row.exchange_name === formState.exchange_name)?.commission_rate ??
      ""
    );
  }, [exchangeSettings, formState.exchange_name]);

  const resultOptions = useMemo(
    () =>
      getSportsbookResultOptions(
        formState.offer_type,
        formState.match_strategy,
        formState.bonus_trigger
      ),
    [formState.bonus_trigger, formState.match_strategy, formState.offer_type]
  );

  const isNoLayStrategy = formState.match_strategy === "No Lay";
  const isMultiLayStrategy =
    formState.match_strategy === "Multilay" || formState.match_strategy === "Multilay-Underlay";
  const showsLayMatchedStake =
    formState.match_strategy === "Partial Lay" ||
    formState.match_strategy === "Custom" ||
    isMultiLayStrategy;
  const isDdhhOffer = formState.offer_type === "Double Delight / Hat-trick Heaven";
  const isCashbackOffer =
    formState.offer_type === "Cashback" || formState.offer_type === "Refund";
  const isRefundOffer = formState.offer_type === "Refund";
  const offerIdentityComplete = Boolean(
    formState.offer_type.trim() &&
      formState.event_name.trim() &&
      formState.bookmaker.trim()
  );

  const layStakePreview = useMemo(
    () => getLayStakePreview(formState, resolvedCommission),
    [formState, resolvedCommission]
  );

  const workflowSummary = useMemo(() => getWorkflowSummary(formState), [formState]);
  const selectedSportsbookRow = useMemo(
    () => rows.find((row) => row.sportsbook_bet_id === selectedId) ?? null,
    [rows, selectedId]
  );
  const isPreviewReady = useMemo(
    () => hasPreviewInputsReady(formState, resolvedCommission),
    [formState, resolvedCommission]
  );
  const previewFormState = useMemo(
    () =>
      getPersistableSportsbookForm(formState, {
        resolvedCommission,
        outcome1Label: multiLayOutcome1Label,
        extraOutcomes: multiLayOutcomes,
      }),
    [formState, multiLayOutcome1Label, multiLayOutcomes, resolvedCommission]
  );
  const calculatorGuidance = useMemo(
    () => getCalculatorGuidance(formState, resolvedCommission),
    [formState, resolvedCommission]
  );
  const scenarioBranchLabels = useMemo(
    () =>
      getScenarioBranchLabels(
        formState.offer_type,
        formState.match_strategy,
        formState.bonus_trigger,
        multiLayOutcome1Label,
        multiLayOutcomes
      ),
    [
      formState.bonus_trigger,
      formState.match_strategy,
      formState.offer_type,
      multiLayOutcome1Label,
      multiLayOutcomes,
    ]
  );
  const activePreviewCalculation = offerIdentityComplete ? previewCalculation : null;
  const activeSuggestedLay =
    formState.match_strategy === "Underlay" || formState.match_strategy === "Multilay-Underlay"
      ? activePreviewCalculation?.reference_lay_stake_underlay ??
        selectedSportsbookRow?.reference_lay_stake_underlay ??
        "—"
      : formState.match_strategy === "Multilay"
        ? activePreviewCalculation?.reference_lay_stake_standard ??
          selectedSportsbookRow?.reference_lay_stake_standard ??
          "—"
      : formState.match_strategy === "Overlay"
        ? activePreviewCalculation?.reference_lay_stake_overlay ??
          selectedSportsbookRow?.reference_lay_stake_overlay ??
          "—"
        : activePreviewCalculation?.reference_lay_stake_standard ??
          selectedSportsbookRow?.reference_lay_stake_standard ??
          "—";
  const multiLayPlannerSummary = useMemo(
    () =>
      getMultiLayPlannerSummary(
        formState,
        resolvedCommission,
        multiLayOutcome1Label,
        multiLayOutcomes
      ),
    [formState, resolvedCommission, multiLayOutcome1Label, multiLayOutcomes]
  );
  const showCalculationSummary =
    selectedSportsbookRow !== null ||
    (activePreviewCalculation !== null && activePreviewCalculation.calculation_state !== "incomplete");
  const hasExtraOutcomeScenarios = Boolean(
    activePreviewCalculation?.scenario_pnl_if_outcome_2_wins ||
      activePreviewCalculation?.scenario_pnl_if_outcome_3_wins ||
      selectedSportsbookRow?.scenario_pnl_if_outcome_2_wins ||
      selectedSportsbookRow?.scenario_pnl_if_outcome_3_wins
  );

  useEffect(() => {
    if (!offerIdentityComplete) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void fetch(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...previewFormState,
          lay_commission_1: "",
          date_settled: fromDateTimeLocalValue(previewFormState.date_settled),
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(await response.text());
          }
          return (await response.json()) as SportsbookCalculationPreview;
        })
        .then((payload) => setPreviewCalculation(payload))
        .catch(() => setPreviewCalculation(null));
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [offerIdentityComplete, previewFormState, profileId]);

  const filteredRows = useMemo(() => {
    const tableRows: TrackerRow[] = rows.map((row) => ({
      sportsbook_bet_id: row.sportsbook_bet_id,
      date_settled: formatDisplayDate(row.date_settled),
      bookmaker: row.bookmaker,
      offer_name: row.offer_name,
      exchange_name: row.exchange_name,
      status: row.status,
      result: getSportsbookResultLabel(
        row.offer_type,
        row.match_strategy,
        row.bonus_trigger,
        row.result
      ),
      offer_type: row.offer_type,
      event_name: row.event_name,
      back_stake: row.back_stake,
      back_odds: row.back_odds,
      match_strategy: row.match_strategy,
      lay_odds_1: row.lay_odds_1,
      lay_commission_1: row.lay_commission_1,
      projected_current_pnl: row.projected_current_pnl ?? "",
      final_net_pnl: row.final_net_pnl ?? "",
      reporting_value: row.reporting_value ?? "",
      calculated_liability_1: row.calculated_liability_1 ?? "",
      lay_status: row.lay_status,
      calculation_state: row.calculation_state,
    }));

    return filterTrackerRows(tableRows, tableColumns, query);
  }, [query, rows]);

  const pageCount = getTrackerPageCount(filteredRows.length, pageSize);
  const effectivePage = Math.min(currentPage, pageCount);
  const pagedRows = useMemo(
    () => paginateTrackerRows(filteredRows, effectivePage, pageSize),
    [effectivePage, filteredRows]
  );

  function selectRow(rowId: string, options?: { collapseTable?: boolean }) {
    if (rowId !== selectedId && isDirty && !confirmDiscardChanges()) {
      return;
    }
    const record = rows.find((entry) => entry.sportsbook_bet_id === rowId);
    if (!record) {
      return;
    }
    setSelectedId(rowId);
    setPreviewCalculation(null);
    const nextFormState = recordToForm(record);
    setMultiLayOutcomes(parseMultiLayOutcomes(record.multi_lay_outcomes_json));
    setMultiLayOutcome1Label(getMultiLayOutcomeLabel(record.multi_lay_outcome_1_name));
    setFormState(nextFormState);
    setPristineFormState(nextFormState);
    setErrorMessage("");
    setWorkflowVisible(true);
    setTableCollapsed(Boolean(options?.collapseTable));
    setStatusMessage(`Opened sportsbook bet ${rowId} for editing.`);
    revealEditor({ expandLedger: !options?.collapseTable });
  }

  function startNewRow() {
    if (isDirty && !confirmDiscardChanges()) {
      return;
    }
    setSelectedId(null);
    setWorkflowVisible(true);
    setTableCollapsed(true);
    setPreviewCalculation(null);
    setMultiLayOutcomes(createDefaultMultiLayOutcomes());
    setMultiLayOutcome1Label(createDefaultMultiLayOutcomeLabel());
    const blankForm = createBlankForm();
    setFormState(blankForm);
    setPristineFormState(blankForm);
    setErrorMessage("");
    setStatusMessage("New sportsbook bet ready. Complete the required fields, then save.");
    revealEditor({ expandLedger: false });
  }

  function canPersistForm(nextFormState: SportsbookFormState): boolean {
    return Boolean(nextFormState.event_name.trim() && nextFormState.bookmaker.trim());
  }

  async function persistForm(
    nextFormState: SportsbookFormState,
    options?: { autosaveLabel?: string; suppressMissingRequiredMessage?: boolean }
  ) {
    setErrorMessage("");
    const persistableFormState = getPersistableSportsbookForm(nextFormState, {
      resolvedCommission,
      outcome1Label: multiLayOutcome1Label,
      extraOutcomes: multiLayOutcomes,
    });

    if (!canPersistForm(persistableFormState)) {
      if (!options?.suppressMissingRequiredMessage) {
        setStatusMessage(
          "Autosave is waiting for the required sportsbook fields: event name and bookmaker."
        );
      }
      return;
    }

    const activeRowId = nextFormState.sportsbook_bet_id ?? selectedId;
    const isEditing = Boolean(activeRowId);
    const url = isEditing
      ? `${apiBaseUrl}/profiles/${profileId}/sportsbook-bets/${activeRowId}`
      : `${apiBaseUrl}/profiles/${profileId}/sportsbook-bets`;
    const method = isEditing ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...persistableFormState,
        lay_commission_1: "",
        date_settled: fromDateTimeLocalValue(persistableFormState.date_settled),
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      setErrorMessage(detail);
      return;
    }

    if (persistableFormState !== nextFormState) {
      setFormState(persistableFormState);
    }

    const saved = (await response.json()) as SportsbookRecord;
    await loadRows(saved.sportsbook_bet_id);
    setStatusMessage(
      options?.autosaveLabel
        ? `${options.autosaveLabel} autosaved for ${saved.sportsbook_bet_id}.`
        : isEditing
          ? `Updated sportsbook bet ${saved.sportsbook_bet_id}.`
          : `Created sportsbook bet ${saved.sportsbook_bet_id}.`
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await persistForm(formState);
  }

  async function applyDropdownChange(
    updater: (current: SportsbookFormState) => SportsbookFormState,
    autosaveLabel: string
  ) {
    const nextFormState = updater(formState);
    setFormState(nextFormState);
    await persistForm(nextFormState, {
      autosaveLabel,
      suppressMissingRequiredMessage: true,
    });
  }

  async function handleDeleteSelectedRow() {
    if (!selectedId) {
      return;
    }

    const confirmed = window.confirm(
      `Delete sportsbook row ${selectedId}? This will remove it from this profile tracker.`
    );
    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    const response = await fetch(`${apiBaseUrl}/profiles/${profileId}/sportsbook-bets/${selectedId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const detail = await response.text();
      setErrorMessage(detail || "Unable to delete sportsbook row");
      return;
    }

    await loadRows(null);
    setWorkflowVisible(false);
    setStatusMessage(`Deleted sportsbook bet ${selectedId}.`);
  }

  async function applySuggestedLayValue() {
    if (!activeSuggestedLay || activeSuggestedLay === "—") {
      return;
    }

    setFormState((current) => ({
      ...current,
      lay_actual: activeSuggestedLay,
    }));

    const copied = await copyToClipboard(activeSuggestedLay);
    setStatusMessage(
      copied
        ? `Applied suggested lay ${activeSuggestedLay} and copied it to the clipboard.`
        : `Applied suggested lay ${activeSuggestedLay}.`
    );
  }

  async function copyMultiLayStake(leg: MultiLayPlannerLeg) {
    const copied = await copyToClipboard(leg.suggestedLay);

    if (leg.key === "outcome1") {
      setFormState((current) => ({
        ...current,
        lay_actual: leg.suggestedLay,
      }));
      setStatusMessage(
        copied
          ? `Copied ${leg.label} lay ${leg.suggestedLay} and set it as the persisted lay actual for this row.`
          : `Set ${leg.label} lay ${leg.suggestedLay} as the persisted lay actual for this row.`
      );
      return;
    }

    setStatusMessage(
      copied
        ? `Copied ${leg.label} lay ${leg.suggestedLay}. The saved row will keep this branch's outcome name and lay odds for later review.`
        : `Prepared ${leg.label} lay ${leg.suggestedLay}. The saved row will keep this branch's outcome name and lay odds for later review.`
    );
  }

  function addMultiLayOutcome() {
    setMultiLayOutcomes((current) => {
      const nextIndex = current.length + 2;
      return [
        ...current,
        {
          id: createMultiLayOutcomeId(nextIndex),
          label: `Outcome ${nextIndex}`,
          layOdds: "",
        },
      ];
    });
  }

  function removeMultiLayOutcome(outcomeId: string) {
    setMultiLayOutcomes((current) => {
      if (current.length <= 1) {
        return current;
      }
      return current.filter((entry) => entry.id !== outcomeId);
    });
  }

  return (
    <section className="stack">
      <StatusToast message={statusMessage} onDismiss={clearStatusMessage} />
      <section className="content-panel stack">
        <div className="table-toolbar">
          <div className="stack">
            <span className="eyebrow">Sportsbook table</span>
          </div>
          <div className="tracker-nav">
            <button className="button-link" onClick={startNewRow} type="button">
              Add sportsbook row
            </button>
            <button
              aria-label={tableCollapsed ? "Expand ledger" : "Collapse ledger"}
              className="icon-button ledger-collapse-button"
              onClick={() => setTableCollapsed((current) => !current)}
              title={tableCollapsed ? "Expand ledger" : "Collapse ledger"}
              type="button"
            >
              {tableCollapsed ? "+" : "-"}
            </button>
          </div>
        </div>
        {!tableCollapsed ? (
          <>
            <div className="table-controls" aria-label="Sportsbook table controls">
              <label className="field-control">
                <span>Filter rows</span>
                <input
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search sportsbook rows"
                  type="search"
                  value={query}
                />
              </label>
            </div>
            {errorMessage ? (
              <p className="error-text" role="alert">
                {errorMessage}
              </p>
            ) : null}
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    {tableColumns.map((column) => (
                      <th
                        className={column.align === "end" ? "align-end" : undefined}
                        key={column.key}
                        scope="col"
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.length === 0 ? (
                    <tr>
                      <td className="empty-cell" colSpan={tableColumns.length}>
                        No sportsbook rows match the current filter.
                      </td>
                    </tr>
                  ) : (
                    pagedRows.map((row, index) => {
                      const rowId = String(row.sportsbook_bet_id);
                      const isSelected = selectedId === rowId;
                      return (
                        <tr
                          className={isSelected ? "is-selected-row" : undefined}
                          key={`${rowId}-${index}`}
                          onClick={() => selectRow(rowId)}
                          onDoubleClick={() => selectRow(rowId, { collapseTable: true })}
                        >
                          {tableColumns.map((column) => (
                            <td
                              className={column.align === "end" ? "align-end" : undefined}
                              key={column.key}
                            >
                              {row[column.key] || "—"}
                            </td>
                          ))}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="table-pagination" aria-label="Sportsbook pagination">
              <div className="table-status">Page {effectivePage} of {pageCount}</div>
              <div className="tracker-nav">
                <button
                  className="button-link"
                  disabled={effectivePage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  type="button"
                >
                  Previous
                </button>
                <button
                  className="button-link"
                  disabled={effectivePage === pageCount}
                  onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="lede">Table collapsed.</p>
        )}
      </section>

      {workflowVisible ? (
      <section className="content-panel stack workflow-editor-panel" ref={editorRef}>
        <div className="workflow-panel-header">
          <div className="stack">
            <span className="eyebrow">{selectedId ? "Edit sportsbook bet" : "Create sportsbook bet"}</span>
            <strong>{selectedId ?? "New sportsbook row"}</strong>
          </div>
          <button
            aria-expanded={editorExpanded}
            aria-label={editorExpanded ? "Collapse sportsbook form" : "Expand sportsbook form"}
            className="icon-button ledger-collapse-button"
            onClick={() => setEditorExpanded((current) => !current)}
            title={editorExpanded ? "Collapse sportsbook form" : "Expand sportsbook form"}
            type="button"
          >
            {editorExpanded ? "-" : "+"}
          </button>
        </div>
        {editorExpanded ? (
        <div className="workflow-editor-body">
        {showCalculationSummary ? (
          <section className="stat-strip" aria-label="Sportsbook calculation summary">
            <article className="stat-card">
              <span className="eyebrow">Calculation state</span>
              <strong>{activePreviewCalculation?.calculation_state ?? selectedSportsbookRow?.calculation_state ?? "—"}</strong>
              <p className="lede">
                Lay status: {activePreviewCalculation?.lay_status ?? selectedSportsbookRow?.lay_status ?? "—"}
              </p>
            </article>
            <article className="stat-card">
              <span className="eyebrow">
                {getDisplayedValueLabel(activePreviewCalculation, selectedSportsbookRow)}
              </span>
              <strong>{getDisplayedValue(activePreviewCalculation, selectedSportsbookRow)}</strong>
              <p className="lede">
                {getScenarioBranchText(scenarioBranchLabels.backWinLabel, formState.result)}: {activePreviewCalculation?.scenario_pnl_if_back_wins ?? selectedSportsbookRow?.scenario_pnl_if_back_wins ?? "—"}
              </p>
            </article>
            <article className="stat-card">
              <span className="eyebrow">Liability</span>
              <strong>{activePreviewCalculation?.calculated_liability_1 ?? selectedSportsbookRow?.calculated_liability_1 ?? "—"}</strong>
              <p className="lede">
                {getScenarioBranchText(scenarioBranchLabels.layWinLabel, formState.result)}: {activePreviewCalculation?.scenario_pnl_if_lay_wins ?? selectedSportsbookRow?.scenario_pnl_if_lay_wins ?? "—"}
              </p>
            </article>
            <article className="stat-card">
              <span className="eyebrow">{hasExtraOutcomeScenarios ? "Other outcomes" : "Final value"}</span>
              <strong>
                {hasExtraOutcomeScenarios
                  ? formatExtraScenarioSummary(
                      getScenarioBranchText(scenarioBranchLabels.outcome2Label, formState.result),
                      activePreviewCalculation?.scenario_pnl_if_outcome_2_wins ??
                        selectedSportsbookRow?.scenario_pnl_if_outcome_2_wins,
                      null,
                      null
                    )
                  : activePreviewCalculation?.final_net_pnl ?? selectedSportsbookRow?.final_net_pnl ?? "—"}
              </strong>
              <p className="lede">
                {hasExtraOutcomeScenarios
                  ? formatExtraScenarioSummary(
                      getScenarioBranchText(scenarioBranchLabels.outcome3Label, formState.result),
                      activePreviewCalculation?.scenario_pnl_if_outcome_3_wins ??
                        selectedSportsbookRow?.scenario_pnl_if_outcome_3_wins,
                      null,
                      null
                    ) || "—"
                  : `Overdue: ${(activePreviewCalculation?.is_overdue ?? selectedSportsbookRow?.is_overdue) ? "Yes" : "No"}`}
              </p>
            </article>
          </section>
        ) : null}
        <section className="stat-strip" aria-label="Sportsbook path summary">
          <article className="stat-card">
            <span className="eyebrow">Offer path</span>
            <strong>{formState.offer_name || formState.offer_type || "Offer pending"}</strong>
            <div className="summary-list">
              <p className="lede">
                <span className="summary-label">Offer type</span>
                <span>{formState.offer_type || "—"}</span>
              </p>
              <p className="lede">
                <span className="summary-label">Bookmaker</span>
                <span>{formState.bookmaker || "—"}</span>
              </p>
              <p className="lede">
                <span className="summary-label">Bet type</span>
                <span>{formState.bet_type || "—"}</span>
              </p>
              <p className="lede">
                <span className="summary-label">Strategy</span>
                <span>{formState.match_strategy || "—"}</span>
              </p>
            </div>
          </article>
          <article className="stat-card">
            <span className="eyebrow">Market scope</span>
            <strong>{formState.event_name || "Event pending"}</strong>
            <div className="summary-list">
              <p className="lede">
                <span className="summary-label">Fixture</span>
                <span>{formState.fixture_type || "—"}</span>
              </p>
              <p className="lede">
                <span className="summary-label">Market</span>
                <span>{formState.market || "—"}</span>
              </p>
              <p className="lede">
                <span className="summary-label">Exchange</span>
                <span>{formState.exchange_name || "—"}</span>
              </p>
              <p className="lede">
                <span className="summary-label">Settlement</span>
                <span>
                  {getSportsbookResultLabel(
                    formState.offer_type,
                    formState.match_strategy,
                    formState.bonus_trigger,
                    formState.result
                  ) || "—"}
                </span>
              </p>
            </div>
          </article>
        </section>
        <section
          className="stat-strip"
          aria-label={formState.result === "Pending" ? "Sportsbook possible outcomes" : "Sportsbook outcome review"}
        >
          <article className="stat-card">
            <span className="eyebrow">
              {getOutcomeCardLabel(getOutcomeCardState(formState.result, "back"))}
            </span>
            <strong>{getScenarioBranchText(scenarioBranchLabels.backWinLabel, formState.result)}</strong>
            <p className="lede">
              {getScenarioValue(
                activePreviewCalculation,
                selectedSportsbookRow,
                "scenario_pnl_if_back_wins"
              )}
            </p>
          </article>
          <article className="stat-card">
            <span className="eyebrow">
              {getOutcomeCardLabel(getOutcomeCardState(formState.result, "lay"))}
            </span>
            <strong>{getScenarioBranchText(scenarioBranchLabels.layWinLabel, formState.result)}</strong>
            <p className="lede">
              {getScenarioValue(
                activePreviewCalculation,
                selectedSportsbookRow,
                "scenario_pnl_if_lay_wins"
              )}
            </p>
          </article>
          {scenarioBranchLabels.outcome2Label ? (
            <article className="stat-card">
              <span className="eyebrow">
                {getOutcomeCardLabel(getOutcomeCardState(formState.result, "outcome2"))}
              </span>
              <strong>{getScenarioBranchText(scenarioBranchLabels.outcome2Label, formState.result)}</strong>
              <p className="lede">
                {getScenarioValue(
                  activePreviewCalculation,
                  selectedSportsbookRow,
                  "scenario_pnl_if_outcome_2_wins"
                )}
              </p>
            </article>
          ) : null}
          {scenarioBranchLabels.outcome3Label ? (
            <article className="stat-card">
              <span className="eyebrow">
                {getOutcomeCardLabel(getOutcomeCardState(formState.result, "outcome3"))}
              </span>
              <strong>{getScenarioBranchText(scenarioBranchLabels.outcome3Label, formState.result)}</strong>
              <p className="lede">
                {getScenarioValue(
                  activePreviewCalculation,
                  selectedSportsbookRow,
                  "scenario_pnl_if_outcome_3_wins"
                )}
              </p>
            </article>
          ) : null}
        </section>
        <form className="form-grid" onSubmit={(event) => void handleSubmit(event)}>
          <section className="content-subpanel stack field-span-2">
            <span className="eyebrow">Offer identity</span>
            <div className="form-grid">
              <label className="field-control">
                <span>Offer type</span>
                <select
                  onChange={(event) =>
                    void applyDropdownChange(
                      (current) => applyOfferTypeDefaults(current, event.target.value),
                      "Offer type change"
                    )
                  }
                  value={formState.offer_type}
                >
                  <option value="">Select offer type</option>
                  {offerTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Offer name</span>
                <select
                  onChange={(event) =>
                    void applyDropdownChange(
                      (current) => ({
                        ...current,
                        offer_name: event.target.value,
                        offer_text: event.target.value,
                      }),
                      "Offer name change"
                    )
                  }
                  value={formState.offer_name}
                >
                  <option value="">Select offer name</option>
                  {offerNameOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Event name</span>
                <input
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, event_name: event.target.value }))
                  }
                  required
                  value={formState.event_name}
                />
              </label>
              <label className="field-control">
                <span>Bookmaker</span>
                <select
                  onChange={(event) =>
                    void applyDropdownChange(
                      (current) => ({ ...current, bookmaker: event.target.value }),
                      "Bookmaker change"
                    )
                  }
                  required
                  value={formState.bookmaker}
                >
                  <option value="">Select bookmaker</option>
                  {bookmakerOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="content-subpanel stack field-span-2">
            <span className="eyebrow">Market context</span>
            <div className="form-grid">
              <label className="field-control">
                <span>Bet type</span>
                <select
                  onChange={(event) =>
                    void applyDropdownChange(
                      (current) => applyBetTypeDefaults(current, event.target.value),
                      "Bet type change"
                    )
                  }
                  value={formState.bet_type}
                >
                  <option value="">Select bet type</option>
                  {betTypeOptionsResolved.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Fixture type</span>
                <select
                  onChange={(event) =>
                    void applyDropdownChange(
                      (current) => ({ ...current, fixture_type: event.target.value }),
                      "Fixture type change"
                    )
                  }
                  value={formState.fixture_type}
                >
                  <option value="">Select fixture type</option>
                  {fixtureTypeOptionsResolved.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Market</span>
                <input
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, market: event.target.value }))
                  }
                  value={formState.market}
                />
              </label>
            </div>
          </section>

          <section className="content-subpanel stack field-span-2">
            <span className="eyebrow">Matching plan</span>
            <div className="form-grid">
              <label className="field-control">
                <span>Back stake</span>
                <input
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, back_stake: event.target.value }))
                  }
                  value={formState.back_stake}
                />
              </label>
              <label className="field-control">
                <span>Back odds</span>
                <input
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, back_odds: event.target.value }))
                  }
                  value={formState.back_odds}
                />
              </label>
              {isCashbackOffer ? (
                <label className="field-control">
                  <span>Bonus trigger</span>
                  <select
                    onChange={(event) =>
                      void applyDropdownChange(
                        (current) => {
                          const nextTrigger = event.target.value;
                          const nextResultOptions = getSportsbookResultOptions(
                            current.offer_type,
                            current.match_strategy,
                            nextTrigger
                          );
                          const nextResultValues = new Set(
                            nextResultOptions.map((option) => option.value)
                          );
                          return {
                            ...current,
                            bonus_trigger: nextTrigger,
                            result: nextResultValues.has(current.result)
                              ? current.result
                              : "Pending",
                          };
                        },
                        "Bonus trigger change"
                      )
                    }
                    value={formState.bonus_trigger}
                  >
                    <option value="Lay Wins">Bet loses / lay wins</option>
                    <option value="Back Wins">Bet wins / back wins</option>
                  </select>
                </label>
              ) : null}
              {isCashbackOffer ? (
                <label className="field-control">
                  <span>Maximum bonus</span>
                  <input
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        maximum_bonus: event.target.value,
                      }))
                    }
                    value={formState.maximum_bonus}
                  />
                </label>
              ) : null}
              {isRefundOffer ? (
                <label className="field-control">
                  <span>Bonus retention %</span>
                  <input
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        bonus_retention_rate: event.target.value,
                      }))
                    }
                    value={formState.bonus_retention_rate}
                  />
                </label>
              ) : null}
              <label className="field-control">
                <span>Strategy</span>
                <select
                  onChange={(event) =>
                    void applyDropdownChange(
                      (current) => applyStrategyDefaults(current, event.target.value),
                      "Strategy change"
                    )
                  }
                  value={formState.match_strategy}
                >
                  {sportsbookStrategyOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              {!isNoLayStrategy ? (
                <label className="field-control">
                  <span>Exchange</span>
                  <select
                    onChange={(event) =>
                      void applyDropdownChange(
                        (current) => ({ ...current, exchange_name: event.target.value }),
                        "Exchange change"
                      )
                    }
                    value={formState.exchange_name}
                  >
                    <option value="">Select exchange</option>
                    {exchangeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          </section>
          {isNoLayStrategy ? null : (
            <section className="content-subpanel stack field-span-2">
                <span className="eyebrow">Calculator panel</span>
                <strong>{workflowSummary.title}</strong>
                <div className="calculator-shell">
                  {!isMultiLayStrategy ? (
                    <>
                      <div className="calculator-band calculator-band-primary">
                        <label className="field-control">
                          <span>Lay odds 1</span>
                          <input
                            onChange={(event) =>
                              setFormState((current) => ({ ...current, lay_odds_1: event.target.value }))
                            }
                            value={formState.lay_odds_1}
                          />
                        </label>
                        <label className="field-control">
                          <span>Lay actual</span>
                          <input
                            onChange={(event) =>
                              setFormState((current) => ({ ...current, lay_actual: event.target.value }))
                            }
                            value={formState.lay_actual}
                          />
                        </label>
                        {showsLayMatchedStake ? (
                          <label className="field-control">
                            <span>Lay matched stake 1</span>
                            <input
                              onChange={(event) =>
                                setFormState((current) => ({
                                  ...current,
                                  lay_matched_stake_1: event.target.value,
                                }))
                              }
                              value={formState.lay_matched_stake_1}
                            />
                          </label>
                        ) : null}
                      </div>
                      <div className="calculator-band calculator-band-secondary">
                        <div className="calculator-panel-card">
                          <span className="eyebrow">Suggested lay</span>
                          {layStakePreview ? (
                            <div className="stack">
                              <strong>
                                {layStakePreview.modeLabel}: {layStakePreview.suggested}
                              </strong>
                              <div className="summary-list">
                                <p className="lede">
                                  <span className="summary-label">Standard</span>
                                  <span>{activePreviewCalculation?.reference_lay_stake_standard ?? selectedSportsbookRow?.reference_lay_stake_standard ?? "—"}</span>
                                </p>
                                <p className="lede">
                                  <span className="summary-label">Underlay</span>
                                  <span>{activePreviewCalculation?.reference_lay_stake_underlay ?? selectedSportsbookRow?.reference_lay_stake_underlay ?? "—"}</span>
                                </p>
                                <p className="lede">
                                  <span className="summary-label">Overlay</span>
                                  <span>{activePreviewCalculation?.reference_lay_stake_overlay ?? selectedSportsbookRow?.reference_lay_stake_overlay ?? "—"}</span>
                                </p>
                              </div>
                              <button
                                className="button-link"
                                disabled={activeSuggestedLay === "—"}
                                onClick={() => void applySuggestedLayValue()}
                                type="button"
                              >
                                Use suggested lay
                              </button>
                            </div>
                          ) : (
                            <p className="lede">{calculatorGuidance}</p>
                          )}
                        </div>
                        <div className="calculator-panel-card">
                          <span className="eyebrow">
                            {isDdhhOffer
                              ? "DD/HH results"
                              : isCashbackOffer
                                ? isRefundOffer
                                  ? "Bonus lock-in results"
                                  : "Cashback results"
                                : "Projected PnL"}
                          </span>
                          {isPreviewReady && activePreviewCalculation ? (
                            <div className="stack">
                              <strong>
                                {getDisplayedValueLabel(activePreviewCalculation, null)}:{" "}
                                {getDisplayedValue(activePreviewCalculation, null)}
                              </strong>
                              <p className="lede">
                                {getScenarioBranchText(scenarioBranchLabels.backWinLabel, formState.result)}: {activePreviewCalculation.scenario_pnl_if_back_wins ?? "—"}
                              </p>
                              <p className="lede">
                                {getScenarioBranchText(scenarioBranchLabels.layWinLabel, formState.result)}: {activePreviewCalculation.scenario_pnl_if_lay_wins ?? "—"}
                              </p>
                              {activePreviewCalculation.scenario_pnl_if_outcome_2_wins || activePreviewCalculation.scenario_pnl_if_outcome_3_wins ? (
                                <div className="summary-list">
                                  <p className="lede">
                                    <span className="summary-label">
                                      {getScenarioBranchText(scenarioBranchLabels.outcome2Label, formState.result) ?? "Outcome 2"}
                                    </span>
                                    <span>{activePreviewCalculation.scenario_pnl_if_outcome_2_wins ?? "—"}</span>
                                  </p>
                                  {getScenarioBranchText(scenarioBranchLabels.outcome3Label, formState.result) ? (
                                    <p className="lede">
                                      <span className="summary-label">
                                        {getScenarioBranchText(scenarioBranchLabels.outcome3Label, formState.result)}
                                      </span>
                                      <span>{activePreviewCalculation.scenario_pnl_if_outcome_3_wins ?? "—"}</span>
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}
                              {isRefundOffer ? (
                                <p className="lede">
                                  Retained bonus assumption:{" "}
                                  <strong>
                                    {formState.bonus_retention_rate || "70"}% of{" "}
                                    {formState.maximum_bonus || formState.back_stake || "0.00"}
                                  </strong>
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            <p className="lede">{calculatorGuidance}</p>
                          )}
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
                {isMultiLayStrategy ? (
                  <section className="content-subpanel stack">
                    <span className="eyebrow">Multi-lay planner</span>
                    <div className="stack">
                      <div className="calculator-outcome-row">
                        <label className="field-control">
                          <span>Outcome 1 name</span>
                          <input
                            onChange={(event) => setMultiLayOutcome1Label(event.target.value)}
                            value={multiLayOutcome1Label}
                          />
                        </label>
                        <label className="field-control">
                          <span>Outcome 1 lay odds</span>
                          <input
                            onChange={(event) =>
                              setFormState((current) => ({ ...current, lay_odds_1: event.target.value }))
                            }
                            value={formState.lay_odds_1}
                          />
                        </label>
                      </div>
                      {multiLayOutcomes.map((outcome, index) => (
                        <div className="calculator-outcome-row" key={outcome.id}>
                          <label className="field-control">
                            <span>{`Outcome ${index + 2} name`}</span>
                            <input
                              onChange={(event) =>
                                setMultiLayOutcomes((current) =>
                                  current.map((entry) =>
                                    entry.id === outcome.id
                                      ? { ...entry, label: event.target.value }
                                      : entry
                                  )
                                )
                              }
                              value={outcome.label}
                            />
                          </label>
                          <label className="field-control">
                            <span>{`Outcome ${index + 2} lay odds`}</span>
                            <input
                              onChange={(event) =>
                                setMultiLayOutcomes((current) =>
                                  current.map((entry) =>
                                    entry.id === outcome.id
                                      ? { ...entry, layOdds: event.target.value }
                                      : entry
                                  )
                                )
                              }
                              value={outcome.layOdds}
                            />
                          </label>
                          {multiLayOutcomes.length > 1 ? (
                            <button
                              className="button-link calculator-outcome-remove"
                              onClick={() => removeMultiLayOutcome(outcome.id)}
                              type="button"
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    <button className="button-link" onClick={addMultiLayOutcome} type="button">
                      Add outcome
                    </button>
                    {multiLayPlannerSummary ? (
                      <>
                        <div className="stack">
                          {multiLayPlannerSummary.legs.map((leg) => (
                            <p className="lede" key={leg.key}>
                              <strong>{leg.label}</strong>: At odds of {formatPreviewMoney(leg.layOdds)} your lay stake is {leg.suggestedLay}.{" "}
                              <button
                                className="button-link"
                                onClick={() => void copyMultiLayStake(leg)}
                                type="button"
                              >
                                Copy lay
                              </button>
                            </p>
                          ))}
                          <p className="lede">
                            Your total liability is <strong>{multiLayPlannerSummary.totalLiability}</strong>.
                          </p>
                          <p className="lede">
                            Your overall position is <strong>{multiLayPlannerSummary.noSelectionPnl}</strong> if your back bet loses.
                          </p>
                          {multiLayPlannerSummary.landedOutcomePnls.map((entry) => (
                            <p className="lede" key={`landed-${entry.key}`}>
                              Your overall position is <strong>{entry.pnl}</strong> if {entry.label} lands.
                            </p>
                          ))}
                          <p className="lede">
                            Conservative current value: <strong>{multiLayPlannerSummary.currentValue}</strong>.
                          </p>
                        </div>
                      </>
                    ) : null}
                  </section>
                ) : null}
              </section>
          )}
          <section className="content-subpanel stack field-span-2">
            <span className="eyebrow">Placement and settlement</span>
            <div className="form-grid">
              <label className="field-control">
                <span>Status</span>
                <select
                  onChange={(event) =>
                    void applyDropdownChange(
                      (current) => applyStatusDefaults(current, event.target.value),
                      "Status change"
                    )
                  }
                  value={formState.status}
                >
                  {sportsbookStatusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Result</span>
                <select
                  onChange={(event) =>
                    void applyDropdownChange(
                      (current) => applyResultDefaults(current, event.target.value),
                      "Result change"
                    )
                  }
                  value={formState.result}
                >
                  {resultOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Settles</span>
                <input
                  type="datetime-local"
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, date_settled: event.target.value }))
                  }
                  value={formState.date_settled}
                />
              </label>
            </div>
          </section>
          <details className="content-subpanel stack field-span-2">
            <summary className="eyebrow">Advanced controls</summary>
            {(
              selectedSportsbookRow?.calculation_notes.length ||
              (showCalculationSummary && activePreviewCalculation?.calculation_notes.length)
            ) ? (
              <section className="stack">
                <span className="eyebrow">Calculation notes</span>
                {(activePreviewCalculation?.calculation_notes.length
                  ? activePreviewCalculation.calculation_notes
                  : selectedSportsbookRow?.calculation_notes ?? []).map((note) => (
                    <p className="lede" key={note}>
                      {note}
                    </p>
                  ))}
              </section>
            ) : null}
            {showCalculationSummary ? (
              <section className="stack">
                <span className="eyebrow">Contract trace</span>
                <div className="meta-grid">
                  <dl>
                    <dt>Calculation state</dt>
                    <dd>{activePreviewCalculation?.calculation_state ?? selectedSportsbookRow?.calculation_state ?? "—"}</dd>
                  </dl>
                  <dl>
                    <dt>Displayed value source</dt>
                    <dd>{getCalculationValueSource(activePreviewCalculation, selectedSportsbookRow)}</dd>
                  </dl>
                  <dl>
                    <dt>Reporting figure shown</dt>
                    <dd>{getDisplayedValue(activePreviewCalculation, selectedSportsbookRow)}</dd>
                  </dl>
                  <dl>
                    <dt>Override audit</dt>
                    <dd>
                      {formState.manual_override_value.trim()
                        ? formState.manual_override_reason.trim()
                          ? "Manual override includes an audit reason."
                          : "Manual override now requires a reason and will stay review-required without one."
                        : "No manual override is active for this row."}
                    </dd>
                  </dl>
                </div>
              </section>
            ) : null}
            <div className="form-grid">
              <label className="field-control field-span-2">
                <span>Manual override value</span>
                <input
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      manual_override_value: event.target.value,
                    }))
                  }
                  value={formState.manual_override_value}
                />
              </label>
              <label className="field-control field-span-2">
                <span>Manual override reason</span>
                <input
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      manual_override_reason: event.target.value,
                    }))
                  }
                  value={formState.manual_override_reason}
                />
              </label>
              <label className="field-control field-span-2">
                <span>Notes</span>
                <textarea
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, user_notes: event.target.value }))
                  }
                  rows={5}
                  value={formState.user_notes}
                />
              </label>
            </div>
          </details>
          <div className="tracker-nav field-span-2">
            <button className="button-link" disabled={isPending} type="submit">
              {selectedId ? "Save sportsbook row" : "Create sportsbook row"}
            </button>
            {selectedId ? (
              <button className="button-link" onClick={() => void handleDeleteSelectedRow()} type="button">
                Delete sportsbook row
              </button>
            ) : null}
            <button className="button-link" onClick={startNewRow} type="button">
              Reset form
            </button>
          </div>
        </form>
        </div>
        ) : null}
      </section>
      ) : null}
    </section>
  );
}
